#!/usr/bin/env bun
/**
 * F_YOUTUBE_MONITOR — YouTube channel monitoring flow
 *
 * Fetches new videos from configured channels, runs each through
 * P_YOUTUBE_VIDEO (transcript → label/rate), and outputs a digest.
 *
 * Usage:
 *   bun F_YOUTUBE_MONITOR.ts                     # run all channels
 *   bun F_YOUTUBE_MONITOR.ts --dry-run           # fetch only, skip transcript/AI
 *   bun F_YOUTUBE_MONITOR.ts --min-rating A      # only show A/S tier results
 *   bun F_YOUTUBE_MONITOR.ts --output digest.md  # save to file
 */

import { join, dirname } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { sendSlackDigest, type DigestItem } from "./slack-notify.ts";

const FLOW_DIR = dirname(import.meta.path);
const ACTIONS_DIR = join(FLOW_DIR, "../../ACTIONS");
const CONFIG_FILE = join(FLOW_DIR, "youtube-channels.json");

// ── Load channel config ──────────────────────────────────────────────────────

interface ChannelConfig {
  channel_ids: string[];
  max_per_channel?: number;
  seen_file?: string;
}

async function loadConfig(): Promise<ChannelConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    console.error(`Config not found at ${CONFIG_FILE}`);
    console.error(`Create it with: { "channel_ids": ["UCxxxxxx", "UCyyyyyy"] }`);
    process.exit(1);
  }
}

// ── Runner imports ────────────────────────────────────────────────────────────

async function getRunner() {
  const { runAction } = await import(join(ACTIONS_DIR, "lib/runner.v2.ts"));
  return { runAction };
}

async function getPipelineRunner() {
  const { runPipeline } = await import(join(ACTIONS_DIR, "lib/pipeline-runner.ts"));
  return { runPipeline };
}

// ── Output formatting ─────────────────────────────────────────────────────────

const RATING_EMOJI: Record<string, string> = {
  S: "⭐",
  A: "🟢",
  B: "🟡",
  C: "🟠",
  D: "🔴",
};

const RATING_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

interface ProcessedVideo {
  video_id: string;
  url: string;
  title: string;
  channel_name: string;
  published: string;
  transcript_source: string;
  labels: string[];
  rating: string;
  quality_score: number;
  summary: string;
  bullet_points: string[];
  skip_reason?: string;
}

function formatDigest(videos: ProcessedVideo[], date: string): string {
  const sorted = [...videos].sort(
    (a, b) => (RATING_ORDER[a.rating] ?? 5) - (RATING_ORDER[b.rating] ?? 5)
  );

  const lines: string[] = [
    `# YouTube Digest — ${date}`,
    ``,
    `${videos.length} videos processed`,
    ``,
  ];

  for (const v of sorted) {
    if (v.skip_reason) continue;

    const emoji = RATING_EMOJI[v.rating] || "⚪";
    lines.push(`## ${emoji} ${v.title}`);
    lines.push(`**Channel:** ${v.channel_name} | **Rating:** ${v.rating} (${v.quality_score}/100) | **Published:** ${v.published.slice(0, 10)}`);
    lines.push(`**Tags:** ${v.labels.join(", ")}`);
    lines.push(`**URL:** ${v.url}`);
    lines.push(``);
    lines.push(v.summary);
    lines.push(``);

    if (v.bullet_points.length > 0) {
      for (const bp of v.bullet_points) {
        lines.push(`- ${bp}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const minRating = args[args.indexOf("--min-rating") + 1] || null;
  const outputFile = args[args.indexOf("--output") + 1] || null;

  const config = await loadConfig();
  const { runAction } = await getRunner();
  const { runPipeline } = await getPipelineRunner();

  console.error(`[F_YOUTUBE_MONITOR] Fetching ${config.channel_ids.length} channels...`);

  // Stage 1: Fetch all new videos
  const fetchResult = await runAction("A_FETCH_YOUTUBE_FEEDS", {
    channel_ids: config.channel_ids,
    seen_file: config.seen_file,
    max_per_channel: config.max_per_channel ?? 5,
  });

  if (!fetchResult.success) {
    console.error(`[F_YOUTUBE_MONITOR] Fetch failed: ${fetchResult.error}`);
    process.exit(1);
  }

  const { items } = fetchResult.output as { items: ProcessedVideo[]; total_new: number };
  console.error(`[F_YOUTUBE_MONITOR] ${items.length} new videos found`);

  if (items.length === 0) {
    console.log("No new videos.");
    return;
  }

  if (dryRun) {
    for (const v of items) {
      console.log(`- [${v.channel_name}] ${v.title} (${v.published.slice(0, 10)})`);
    }
    return;
  }

  // Stage 2: Process each video through P_YOUTUBE_VIDEO pipeline
  const processed: ProcessedVideo[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const video = items[i];
    console.error(`[F_YOUTUBE_MONITOR] [${i + 1}/${items.length}] ${video.title}`);

    const result = await runPipeline("P_YOUTUBE_VIDEO", video);

    if (!result.success) {
      const msg = `"${video.title}" — ${result.error}`;
      console.error(`  ↳ Pipeline failed: ${result.error}`);
      errors.push(msg);
      continue;
    }

    const out = result.output as ProcessedVideo;

    if (minRating && (RATING_ORDER[out.rating] ?? 5) > (RATING_ORDER[minRating] ?? 5)) {
      console.error(`  ↳ Skip (rating ${out.rating} below ${minRating})`);
      continue;
    }

    console.error(`  ↳ ${out.rating} (${out.quality_score}/100) — ${out.labels.join(", ")}`);
    processed.push(out);
  }

  // Output digest
  const date = new Date().toISOString().slice(0, 10);
  const digest = formatDigest(processed, date);

  if (outputFile) {
    await mkdir(dirname(outputFile), { recursive: true }).catch(() => {});
    await writeFile(outputFile, digest, "utf-8");
    console.error(`[F_YOUTUBE_MONITOR] Saved to ${outputFile}`);
  } else {
    console.log(digest);
  }

  // Slack digest
  if (!dryRun) {
    await sendSlackDigest({
      source: "YouTube",
      totalFetched: items.length,
      totalProcessed: processed.length,
      items: processed.map((v): DigestItem => ({
        url: v.url,
        title: v.title,
        rating: v.rating,
        quality_score: v.quality_score,
        summary: v.summary,
        labels: v.labels,
        source_name: v.channel_name,
        skip_reason: v.skip_reason,
      })),
      errors,
    });
  }
}

main().catch((err) => {
  console.error("[F_YOUTUBE_MONITOR] Fatal error:", err);
  process.exit(1);
});
