#!/usr/bin/env bun
/**
 * SetupGmailAuth.ts - One-time Gmail OAuth setup
 *
 * Usage:
 *   bun ~/.claude/skills/ClientWeeklyUpdate/Tools/SetupGmailAuth.ts
 *
 * Requires:
 *   GOOGLE_CLIENT_ID env var
 *   GOOGLE_CLIENT_SECRET env var
 *
 * See GmailSetup.md for Google Cloud Console setup instructions.
 *
 * This script:
 * 1. Opens a browser to the Google OAuth consent screen
 * 2. Starts a local server on port 3333 to receive the callback
 * 3. Exchanges the auth code for tokens
 * 4. Saves the refresh token to ~/.claude/PAI/USER/secrets/gmail-token.json
 */

import { createServer } from "http";
import { mkdir, writeFile } from "fs/promises";
import { exec } from "child_process";
import { homedir } from "os";
import { join } from "path";

// Load ~/.claude/.env if it exists (overrides shell env with file values)
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

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = join(homedir(), ".claude/PAI/USER/secrets/gmail-token.json");

if (!CLIENT_ID) {
  console.error("❌ GOOGLE_CLIENT_ID environment variable is not set.");
  console.error("   See ~/.claude/skills/ClientWeeklyUpdate/GmailSetup.md for instructions.");
  process.exit(1);
}

if (!CLIENT_SECRET) {
  console.error("❌ GOOGLE_CLIENT_SECRET environment variable is not set.");
  console.error("   See ~/.claude/skills/ClientWeeklyUpdate/GmailSetup.md for instructions.");
  process.exit(1);
}

// Build OAuth authorization URL
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("🔐 Gmail OAuth Setup");
console.log("━━━━━━━━━━━━━━━━━━━━");
console.log("");
console.log("Opening browser to Google consent screen...");
console.log(`Auth URL: ${authUrl.toString()}`);
console.log("");

// Open browser
exec(`open "${authUrl.toString()}"`);

// Start local callback server
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost:3333");

  if (url.pathname !== "/callback") {
    res.end("Waiting for OAuth callback...");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end(`<html><body><h2>❌ Authorization failed: ${error}</h2><p>You can close this window.</p></body></html>`);
    console.error(`❌ OAuth error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.end("<html><body><h2>❌ No auth code received</h2></body></html>");
    server.close();
    process.exit(1);
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${text}`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    if (!tokens.refresh_token) {
      throw new Error("No refresh_token in response. Try deleting the app access in your Google Account and re-running.");
    }

    // Save tokens to file
    await mkdir(join(homedir(), ".claude/PAI/USER/secrets"), { recursive: true });
    await writeFile(TOKEN_PATH, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expiry_date: Date.now() + tokens.expires_in * 1000,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }, null, 2));

    res.end("<html><body><h2>✅ Gmail authorized successfully!</h2><p>You can close this window and return to the terminal.</p></body></html>");

    console.log("✅ Gmail OAuth setup complete!");
    console.log(`📁 Token saved to: ${TOKEN_PATH}`);
    console.log("   You can now run the GenerateUpdate workflow.");

    server.close();
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.end(`<html><body><h2>❌ Error: ${msg}</h2></body></html>`);
    console.error(`❌ Setup failed: ${msg}`);
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log("⏳ Waiting for OAuth callback on http://localhost:3333/callback ...");
  console.log("   (If browser didn't open, copy the Auth URL above and paste it manually)");
});
