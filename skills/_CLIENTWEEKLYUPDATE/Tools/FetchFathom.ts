#!/usr/bin/env bun
/**
 * FetchFathom.ts - Fetch meeting transcripts from Fathom API
 *
 * Usage:
 *   bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchFathom.ts [options]
 *
 * Options:
 *   --days <n>    Days to look back (default: 7)
 *   --help        Show this help
 *
 * Requires: FATHOM_API_KEY env var
 *
 * Fathom API docs: https://developers.fathom.ai
 * Base URL: https://api.fathom.ai/external/v1
 * Auth: X-Api-Key header
 * Rate limit: 60 req/min
 */

// Load ~/.claude/.env if it exists
import { homedir } from "os";
import { join } from "path";
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

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`FetchFathom.ts — Fetch meeting transcripts from Fathom

Usage:
  bun FetchFathom.ts [--days n]

Options:
  --days <n>    Days to look back (default: 7)
  --help        Show this help

Requires: FATHOM_API_KEY environment variable`);
  process.exit(0);
}

const apiKey = process.env.FATHOM_API_KEY;
if (!apiKey) {
  console.error("❌ FATHOM_API_KEY environment variable is not set.");
  console.error("   Add to ~/.zshrc: export FATHOM_API_KEY=\"your-key-here\"");
  process.exit(1);
}

const daysIdx = args.indexOf("--days");
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : 7;

const since = new Date();
since.setDate(since.getDate() - days);
const until = new Date();

const createdAfter = since.toISOString();
const createdBefore = until.toISOString();

console.log(`🔍 Fetching Fathom meetings from last ${days} days...`);

try {
  const params = new URLSearchParams({
    include_transcript: "true",
    created_after: createdAfter,
    created_before: createdBefore,
  });

  const response = await fetch(
    `https://api.fathom.ai/external/v1/meetings?${params.toString()}`,
    {
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ Fathom API error ${response.status}: ${text}`);
    process.exit(1);
  }

  const data = await response.json() as {
    items?: Array<{
      recording_id: number;
      title: string;
      created_at: string;
      recording_start_time?: string;
      recording_end_time?: string;
      transcript?: Array<{
        speaker: { display_name: string; matched_calendar_invitee_email?: string };
        text: string;
        timestamp: string;
      }>;
    }>;
    next_cursor?: string | null;
  };

  const meetings = data.items ?? [];

  if (meetings.length === 0) {
    console.log(`📭 No meetings found in the last ${days} days.`);
    console.log(JSON.stringify({ meetings: [], count: 0, days }));
    process.exit(0);
  }

  console.log(`✅ Found ${meetings.length} meeting(s) since ${since.toDateString()}`);

  const output = meetings.map((m) => {
    let transcriptText = "";
    if (Array.isArray(m.transcript)) {
      transcriptText = m.transcript.map((t) => `${t.speaker.display_name}: ${t.text}`).join("\n");
    }

    // Calculate duration from timestamps
    let duration_minutes: number | null = null;
    if (m.recording_start_time && m.recording_end_time) {
      const start = new Date(m.recording_start_time).getTime();
      const end = new Date(m.recording_end_time).getTime();
      duration_minutes = Math.round((end - start) / 60000);
    }

    // Trim transcript to first 2000 chars to keep output manageable
    const trimmedTranscript = transcriptText.length > 2000
      ? transcriptText.slice(0, 2000) + "\n...[truncated]"
      : transcriptText;

    return {
      id: m.recording_id,
      title: m.title,
      date: m.created_at,
      duration_minutes,
      transcript: trimmedTranscript || "(no transcript available)",
    };
  });

  output.forEach((m) => {
    console.log(`  📅 ${m.title} (${new Date(m.date).toLocaleDateString()}, ${m.duration_minutes}min)`);
  });

  console.log("\n--- JSON OUTPUT ---");
  console.log(JSON.stringify({ meetings: output, count: output.length, days }));
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Fathom fetch failed: ${msg}`);
  process.exit(1);
}
