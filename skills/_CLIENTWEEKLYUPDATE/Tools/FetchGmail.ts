#!/usr/bin/env bun
/**
 * FetchGmail.ts - Fetch Henderson-related email threads from Gmail
 *
 * Usage:
 *   bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchGmail.ts [options]
 *
 * Options:
 *   --query <q>   Gmail search query (default: "henderson OR josh sapp OR job master OR luke templin")
 *   --days <n>    Days to look back (default: 7)
 *   --help        Show this help
 *
 * Requires: Gmail token at ~/.claude/PAI/USER/secrets/gmail-token.json
 * Run SetupGmailAuth.ts first to generate the token.
 */

import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// Load ~/.claude/.env if it exists
const envFile = join(homedir(), ".claude/.env");
try {
  const text = await Bun.file(envFile).text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = val;
  }
} catch { /* .env not required */ }

const TOKEN_PATH = join(homedir(), ".claude/PAI/USER/secrets/gmail-token.json");

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`FetchGmail.ts — Fetch client email threads from Gmail

Usage:
  bun FetchGmail.ts [--query "search terms"] [--days n]

Requires: Gmail token from SetupGmailAuth.ts`);
  process.exit(0);
}

const queryIdx = args.indexOf("--query");
const daysIdx = args.indexOf("--days");
const searchQuery = queryIdx !== -1 ? args[queryIdx + 1] : "henderson OR \"josh sapp\" OR \"job master\" OR \"luke templin\"";
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : 7;

// Load token
let tokenData: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  client_id: string;
  client_secret: string;
};

try {
  const raw = await readFile(TOKEN_PATH, "utf8");
  tokenData = JSON.parse(raw);
} catch {
  console.error("❌ Gmail token not found. Run SetupGmailAuth.ts first:");
  console.error("   bun ~/.claude/skills/ClientWeeklyUpdate/Tools/SetupGmailAuth.ts");
  process.exit(1);
}

// Refresh access token if expired
async function getAccessToken(): Promise<string> {
  if (tokenData.expiry_date > Date.now() + 60_000) {
    return tokenData.access_token;
  }

  // Refresh
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokenData.refresh_token,
      client_id: tokenData.client_id,
      client_secret: tokenData.client_secret,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status}`);
  }

  const newTokens = await resp.json() as { access_token: string; expires_in: number };
  tokenData.access_token = newTokens.access_token;
  tokenData.expiry_date = Date.now() + newTokens.expires_in * 1000;

  // Save updated token
  await writeFile(TOKEN_PATH, JSON.stringify(tokenData, null, 2));

  return tokenData.access_token;
}

async function gmailGet(path: string, accessToken: string) {
  const resp = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`Gmail API ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

console.log(`🔍 Searching Gmail for "${searchQuery}" (last ${days} days)...`);

try {
  const accessToken = await getAccessToken();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const afterTimestamp = Math.floor(since.getTime() / 1000);

  const fullQuery = `${searchQuery} after:${afterTimestamp}`;

  // Search for threads
  const searchResult = await gmailGet(
    `/users/me/threads?q=${encodeURIComponent(fullQuery)}&maxResults=20`,
    accessToken
  ) as { threads?: Array<{ id: string; snippet: string }> };

  const threads = searchResult.threads ?? [];

  if (threads.length === 0) {
    console.log(`📭 No matching email threads in the last ${days} days.`);
    console.log(JSON.stringify({ threads: [], count: 0, query: searchQuery, days }));
    process.exit(0);
  }

  // Fetch details for each thread (subject + snippet only — no full body)
  const threadDetails = await Promise.all(
    threads.slice(0, 10).map(async (t) => {
      const detail = await gmailGet(
        `/users/me/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`,
        accessToken
      ) as {
        id: string;
        messages?: Array<{
          payload?: {
            headers?: Array<{ name: string; value: string }>;
          };
          snippet?: string;
        }>;
      };

      const firstMsg = detail.messages?.[0];
      const headers = firstMsg?.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      const date = headers.find((h) => h.name === "Date")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const snippet = firstMsg?.snippet ?? "";
      const messageCount = detail.messages?.length ?? 1;

      return { id: t.id, subject, date, from, snippet, messageCount };
    })
  );

  console.log(`✅ Found ${threadDetails.length} thread(s)`);
  threadDetails.forEach((t) => {
    console.log(`  📧 "${t.subject}" (${t.messageCount} messages)`);
  });

  console.log("\n--- JSON OUTPUT ---");
  console.log(JSON.stringify({ threads: threadDetails, count: threadDetails.length, query: searchQuery, days }));
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Gmail fetch failed: ${msg}`);
  process.exit(1);
}
