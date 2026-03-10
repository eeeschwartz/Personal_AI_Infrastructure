#!/usr/bin/env bun
/**
 * EnrichAndAlert.ts
 *
 * Wrapper around PAI/Tools/EnrichPendingItems.ts that sends a Slack alert
 * when items fail to score. Lives in PAI/USER/Tools so it survives upstream
 * PAI upgrades (PAI/Tools is installer-managed and will be overwritten).
 *
 * Usage: same as EnrichPendingItems.ts — just call this instead.
 *   bun EnrichAndAlert.ts
 *   bun EnrichAndAlert.ts --dry-run
 *   bun EnrichAndAlert.ts --limit 20
 *
 * Launchd plist: com.erikschwartz.openbrain-enrich.plist (this dir)
 */

import { join } from "path";
import { readFileSync } from "fs";
import { spawn } from "child_process";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, ".claude");
const UPSTREAM_TOOL = join(PAI_DIR, "PAI/Tools/EnrichPendingItems.ts");
const PAI_ENV_PATH = join(process.env.HOME!, ".config/PAI/.env");

function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch { /* ignore */ }
  return env;
}

async function sendSlack(webhook: string, text: string): Promise<void> {
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).catch(() => {}); // best-effort
}

async function main() {
  const args = process.argv.slice(2);

  // Collect output while also streaming it
  const lines: string[] = [];

  await new Promise<void>((resolve) => {
    const child = spawn("bun", [UPSTREAM_TOOL, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const collect = (data: Buffer) => {
      const text = data.toString();
      process.stderr.write(text);
      lines.push(...text.split("\n").filter(Boolean));
    };

    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    child.on("close", async (code) => {
      if (code !== 0) {
        const errors = lines.filter((l) => l.includes("✗"));
        const paiEnv = loadEnv(PAI_ENV_PATH);
        const webhook = paiEnv["SLACK_WEBHOOK_URL"];

        if (webhook) {
          const errorList = errors.length
            ? errors.map((e) => `• ${e.trim()}`).join("\n")
            : "• Unknown error — check log for details";

          await sendSlack(
            webhook,
            `⚠️ *OpenBrain enrich errors* (${errors.length} failed)\n${errorList}`
          );
        }
      }
      resolve();
    });
  });
}

main().catch((err) => {
  console.error("EnrichAndAlert fatal:", err);
  process.exit(1);
});
