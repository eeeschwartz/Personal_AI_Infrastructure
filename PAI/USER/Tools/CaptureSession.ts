#!/usr/bin/env bun
/**
 * CaptureSession.ts
 *
 * Captures completed PAI Algorithm sessions (PRDs) directly to OpenBrain.
 * Bypasses OpenClaw entirely — PAI → OpenBrain directly.
 *
 * Usage:
 *   bun CaptureSession.ts                          # capture most recent PRD
 *   bun CaptureSession.ts --slug 20260310-130000_* # capture by slug pattern
 *   bun CaptureSession.ts --path /path/to/PRD.md   # capture specific PRD
 *   bun CaptureSession.ts --all                    # capture all uncaptured PRDs
 *   bun CaptureSession.ts --dry-run                # show what would be captured
 *
 * Marks captured PRDs with metadata.openbrain_captured=true in a sidecar file.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import { glob } from "glob";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, ".claude");
const MEMORY_WORK_DIR = join(PAI_DIR, "MEMORY/WORK");
const ENV_PATH = join(process.env.HOME!, "code/openbrain/.env.local");

const OPENBRAIN_URL =
  "https://hnokjyfbwlgrjcdryfhj.supabase.co/functions/v1/open-brain-mcp";
const OPENBRAIN_KEY = "b24fb784524094942cc34f083f6d8079528f8a6056054937276dac60299ce151";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PRDFrontmatter {
  task: string;
  slug: string;
  effort: string;
  phase: string;
  progress: string;
  mode: string;
  started: string;
  updated: string;
  iteration?: string;
}

interface CapturePayload {
  content: string;
  source_type: string;
  title?: string;
  summary?: string;
  author?: string;
}

// ---------------------------------------------------------------------------
// Parse PRD
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): PRDFrontmatter | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm as unknown as PRDFrontmatter;
}

function extractPRDContent(raw: string): string {
  // Strip frontmatter, return body
  return raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

function buildCapturePayload(prdPath: string): CapturePayload | null {
  let raw: string;
  try {
    raw = readFileSync(prdPath, "utf-8");
  } catch {
    console.error(`Cannot read ${prdPath}`);
    return null;
  }

  const fm = parseFrontmatter(raw);
  if (!fm) {
    console.error(`No frontmatter in ${prdPath}`);
    return null;
  }

  // Only capture completed sessions
  if (fm.phase !== "complete" && fm.phase !== "learn") {
    return null; // Skip in-progress
  }

  const body = extractPRDContent(raw);
  const [passedStr, totalStr] = (fm.progress || "0/0").split("/");
  const passed = parseInt(passedStr) || 0;
  const total = parseInt(totalStr) || 0;

  // Build summary from frontmatter
  const summary = [
    `PAI Algorithm session: ${fm.task}`,
    `Effort: ${fm.effort} | Phase: ${fm.phase} | Progress: ${fm.progress}`,
    total > 0 ? `${passed}/${total} criteria passed (${Math.round((passed / total) * 100)}%)` : "",
    `Started: ${fm.started}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    content: `# ${fm.task}\n\n${body}`,
    source_type: "pai-session",
    title: fm.task,
    summary,
    author: "PAI Algorithm",
  };
}

// ---------------------------------------------------------------------------
// OpenBrain MCP client (direct HTTP, no SDK needed)
// ---------------------------------------------------------------------------

async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; text: string }> {
  const baseUrl = `${OPENBRAIN_URL}?key=${OPENBRAIN_KEY}`;

  // Step 1: Initialize session
  const initRes = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "pai-capture-session", version: "1.0" },
      },
    }),
  });

  if (!initRes.ok) {
    return { success: false, text: `Init failed: ${initRes.status} ${initRes.statusText}` };
  }

  const sessionId = initRes.headers.get("mcp-session-id");

  // Step 2: Send initialized notification (required by protocol)
  if (sessionId) {
    await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }).catch(() => {}); // best-effort
  }

  // Step 3: Call the tool
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const callRes = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!callRes.ok) {
    return { success: false, text: `Tool call failed: ${callRes.status} ${callRes.statusText}` };
  }

  // StreamableHTTP may return SSE or JSON
  const contentType = callRes.headers.get("content-type") || "";
  let responseText = "";

  if (contentType.includes("text/event-stream")) {
    // Parse SSE stream
    const text = await callRes.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.result?.content?.[0]?.text) {
            responseText = data.result.content[0].text;
          } else if (data.error) {
            return { success: false, text: data.error.message || "Tool error" };
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } else {
    const data = await callRes.json();
    if (data.result?.content?.[0]?.text) {
      responseText = data.result.content[0].text;
    } else if (data.error) {
      return { success: false, text: data.error.message || "Tool error" };
    }
  }

  return { success: true, text: responseText || "Captured." };
}

// ---------------------------------------------------------------------------
// Sidecar: track which PRDs have been captured
// ---------------------------------------------------------------------------

function sidecarPath(prdPath: string): string {
  return join(dirname(prdPath), ".openbrain-captured");
}

function isCaptured(prdPath: string): boolean {
  return existsSync(sidecarPath(prdPath));
}

function markCaptured(prdPath: string, itemInfo: string): void {
  writeFileSync(
    sidecarPath(prdPath),
    `${new Date().toISOString()} | ${itemInfo}\n`,
    "utf-8"
  );
}

// ---------------------------------------------------------------------------
// Find PRDs to capture
// ---------------------------------------------------------------------------

function findLatestPRD(): string | null {
  try {
    const slugDirs = readdirSync(MEMORY_WORK_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();

    for (const slug of slugDirs) {
      const prdPath = join(MEMORY_WORK_DIR, slug, "PRD.md");
      if (existsSync(prdPath)) return prdPath;
    }
  } catch {
    // ignore
  }
  return null;
}

function findAllUncapturedPRDs(): string[] {
  try {
    const slugDirs = readdirSync(MEMORY_WORK_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    return slugDirs
      .map((slug) => join(MEMORY_WORK_DIR, slug, "PRD.md"))
      .filter((p) => existsSync(p) && !isCaptured(p));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function captureOne(prdPath: string, dryRun: boolean): Promise<boolean> {
  const payload = buildCapturePayload(prdPath);
  const slug = basename(dirname(prdPath));

  if (!payload) {
    console.log(`  ⏭  ${slug} — skipped (not complete or unreadable)`);
    return false;
  }

  if (isCaptured(prdPath)) {
    console.log(`  ✓  ${slug} — already captured`);
    return false;
  }

  console.log(`  ⟳  ${slug}`);
  console.log(`     Title: ${payload.title}`);
  console.log(`     Summary: ${payload.summary}`);

  if (dryRun) {
    console.log(`     [dry-run] would capture to OpenBrain`);
    return false;
  }

  const result = await callMCPTool("capture_item", payload);

  if (result.success) {
    console.log(`     ✅ ${result.text}`);
    markCaptured(prdPath, result.text);
    return true;
  } else {
    console.error(`     ❌ ${result.text}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const captureAll = args.includes("--all");
  const pathIdx = args.indexOf("--path");
  const slugIdx = args.indexOf("--slug");

  console.log("🧠 PAI → OpenBrain session capture");
  if (dryRun) console.log("   [dry-run mode]");
  console.log("");

  let prdPaths: string[] = [];

  if (pathIdx !== -1 && args[pathIdx + 1]) {
    prdPaths = [args[pathIdx + 1]];
  } else if (slugIdx !== -1 && args[slugIdx + 1]) {
    const pattern = join(MEMORY_WORK_DIR, args[slugIdx + 1], "PRD.md");
    prdPaths = await glob(pattern);
  } else if (captureAll) {
    prdPaths = findAllUncapturedPRDs();
    console.log(`Found ${prdPaths.length} uncaptured sessions.\n`);
  } else {
    // Default: most recent
    const latest = findLatestPRD();
    if (latest) prdPaths = [latest];
  }

  if (prdPaths.length === 0) {
    console.log("No PRDs found to capture.");
    process.exit(0);
  }

  let captured = 0;
  for (const p of prdPaths) {
    const ok = await captureOne(p, dryRun);
    if (ok) captured++;
  }

  console.log(`\nDone. ${captured} session(s) captured to OpenBrain.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
