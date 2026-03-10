#!/usr/bin/env bun
/**
 * F_SUBSTACK_MONITOR — Substack (and general RSS) monitoring flow
 *
 * Fetches new posts from configured Substack feeds, runs each through
 * P_SUBSTACK_POST (label/rate), and outputs a digest.
 *
 * Usage:
 *   bun F_SUBSTACK_MONITOR.ts
 *   bun F_SUBSTACK_MONITOR.ts --dry-run
 *   bun F_SUBSTACK_MONITOR.ts --min-rating A
 *   bun F_SUBSTACK_MONITOR.ts --output digest.md
 */

import { join, dirname } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { sendSlackDigest, type DigestItem } from "./slack-notify.ts";

const FLOW_DIR = dirname(import.meta.path);
const ACTIONS_DIR = join(FLOW_DIR, "../../ACTIONS");
const CONFIG_FILE = join(FLOW_DIR, "substack-feeds.json");

interface FeedConfig {
  substack_urls: string[];
  max_per_feed?: number;
  seen_file?: string;
}

async function loadConfig(): Promise<FeedConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    console.error(`Config not found at ${CONFIG_FILE}`);
    process.exit(1);
  }
}

const RATING_EMOJI: Record<string, string> = { S: "⭐", A: "🟢", B: "🟡", C: "🟠", D: "🔴" };
const RATING_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

interface ProcessedPost {
  url: string;
  title: string;
  feed_name: string;
  author: string;
  published: string;
  labels: string[];
  rating: string;
  quality_score: number;
  summary: string;
  bullet_points: string[];
  skip_reason?: string;
}

function formatDigest(posts: ProcessedPost[], date: string): string {
  const sorted = [...posts]
    .filter((p) => !p.skip_reason)
    .sort((a, b) => (RATING_ORDER[a.rating] ?? 5) - (RATING_ORDER[b.rating] ?? 5));

  const lines: string[] = [`# Substack Digest — ${date}`, ``, `${sorted.length} posts processed`, ``];

  for (const p of sorted) {
    const emoji = RATING_EMOJI[p.rating] || "⚪";
    lines.push(`## ${emoji} ${p.title}`);
    lines.push(`**Publication:** ${p.feed_name}${p.author ? ` | **Author:** ${p.author}` : ""} | **Rating:** ${p.rating} (${p.quality_score}/100) | **Published:** ${p.published.slice(0, 16)}`);
    lines.push(`**Tags:** ${p.labels.join(", ")}`);
    lines.push(`**URL:** ${p.url}`);
    lines.push(``);
    lines.push(p.summary);
    lines.push(``);
    for (const bp of p.bullet_points) lines.push(`- ${bp}`);
    lines.push(``, `---`, ``);
  }

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const minRating = args[args.indexOf("--min-rating") + 1] || null;
  const outputFile = args[args.indexOf("--output") + 1] || null;

  const config = await loadConfig();

  if (config.substack_urls.length === 0) {
    console.log(`No feeds configured. Add URLs to ${CONFIG_FILE}`);
    return;
  }

  const { runAction } = await import(join(ACTIONS_DIR, "lib/runner.v2.ts"));
  const { runPipeline } = await import(join(ACTIONS_DIR, "lib/pipeline-runner.ts"));

  // Auto-sync subscriptions from Substack account before fetching
  if (!dryRun) {
    const syncResult = await runAction("A_SYNC_SUBSTACK_SUBS", { config_file: CONFIG_FILE });
    if (syncResult.success) {
      const { added, removed } = syncResult.output as { added: string[]; removed: string[] };
      if (added.length > 0) console.error(`[F_SUBSTACK_MONITOR] Auto-added ${added.length} new subscription(s)`);
      if (removed.length > 0) console.error(`[F_SUBSTACK_MONITOR] Auto-removed ${removed.length} unsubscribed feed(s)`);
      // Reload config after sync
      const updated = JSON.parse(await readFile(CONFIG_FILE, "utf-8"));
      config.substack_urls = updated.substack_urls || [];
    } else {
      console.error(`[F_SUBSTACK_MONITOR] Subscription sync failed (${syncResult.error}) — using existing config`);
    }
  }

  console.error(`[F_SUBSTACK_MONITOR] Fetching ${config.substack_urls.length} feeds...`);

  const fetchResult = await runAction("A_FETCH_SUBSTACK_FEEDS", {
    substack_urls: config.substack_urls,
    seen_file: config.seen_file,
    max_per_feed: config.max_per_feed ?? 5,
  });

  if (!fetchResult.success) {
    console.error(`[F_SUBSTACK_MONITOR] Fetch failed: ${fetchResult.error}`);
    process.exit(1);
  }

  const { items } = fetchResult.output as { items: ProcessedPost[]; total_new: number };
  console.error(`[F_SUBSTACK_MONITOR] ${items.length} new posts found`);

  if (items.length === 0) { console.log("No new posts."); return; }

  if (dryRun) {
    for (const p of items) console.log(`- [${p.feed_name}] ${p.title}`);
    return;
  }

  const processed: ProcessedPost[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const post = items[i];
    console.error(`[F_SUBSTACK_MONITOR] [${i + 1}/${items.length}] ${post.title}`);

    const result = await runPipeline("P_SUBSTACK_POST", post);

    if (!result.success) {
      console.error(`  ↳ Failed: ${result.error}`);
      errors.push(`"${post.title}" — ${result.error}`);
      continue;
    }

    const out = result.output as ProcessedPost;

    if (minRating && (RATING_ORDER[out.rating] ?? 5) > (RATING_ORDER[minRating] ?? 5)) {
      console.error(`  ↳ Skip (rating ${out.rating} below ${minRating})`);
      continue;
    }

    console.error(`  ↳ ${out.rating} (${out.quality_score}/100) — ${out.labels.join(", ")}`);
    processed.push(out);
  }

  const date = new Date().toISOString().slice(0, 10);
  const digest = formatDigest(processed, date);

  if (outputFile) {
    await mkdir(dirname(outputFile), { recursive: true }).catch(() => {});
    await writeFile(outputFile, digest, "utf-8");
    console.error(`[F_SUBSTACK_MONITOR] Saved to ${outputFile}`);
  } else {
    console.log(digest);
  }

  // Slack digest
  if (!dryRun) {
    await sendSlackDigest({
      source: "Substack",
      totalFetched: items.length,
      totalProcessed: processed.length,
      items: processed.map((p): DigestItem => ({
        url: p.url,
        title: p.title,
        rating: p.rating,
        quality_score: p.quality_score,
        summary: p.summary,
        labels: p.labels,
        source_name: p.feed_name || p.author,
        skip_reason: p.skip_reason,
      })),
      errors,
    });
  }
}

main().catch((err) => { console.error("[F_SUBSTACK_MONITOR] Fatal:", err); process.exit(1); });
