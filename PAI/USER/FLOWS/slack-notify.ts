/**
 * Shared Slack notification helper for PAI monitor flows.
 * Sends end-of-run digest for S/A-tier items + error alerts.
 */

import { join, dirname } from "path";

const ACTIONS_DIR = join(dirname(import.meta.path), "../../ACTIONS");

const RATING_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const RATING_EMOJI: Record<string, string> = { S: "⭐", A: "🟢", B: "🟡", C: "🟠", D: "🔴" };

export interface DigestItem {
  url: string;
  title: string;
  rating: string;
  quality_score: number;
  summary: string;
  labels: string[];
  source_name: string; // channel_name or feed_name
  skip_reason?: string;
}

export interface DigestOptions {
  source: "YouTube" | "Substack";
  totalFetched: number;
  totalProcessed: number;
  items: DigestItem[];
  errors: string[];
  minRatingForSlack?: string; // default "A"
}

function buildBlocks(opts: DigestOptions): unknown[] {
  const minRating = opts.minRatingForSlack ?? "A";
  const notable = opts.items
    .filter((i) => !i.skip_reason && (RATING_ORDER[i.rating] ?? 5) <= (RATING_ORDER[minRating] ?? 1))
    .sort((a, b) => (RATING_ORDER[a.rating] ?? 5) - (RATING_ORDER[b.rating] ?? 5));

  const icon = opts.source === "YouTube" ? "📺" : "📰";
  const blocks: unknown[] = [];

  // Header
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `${icon} ${opts.source} Digest`, emoji: true },
  });

  // Summary line
  const summaryParts = [`${opts.totalFetched} new, ${opts.totalProcessed} analyzed`];
  if (notable.length > 0) summaryParts.push(`*${notable.length} worth reading*`);
  if (opts.errors.length > 0) summaryParts.push(`⚠️ ${opts.errors.length} error(s)`);

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: summaryParts.join(" · ") },
  });

  if (notable.length === 0 && opts.errors.length === 0) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: "_Nothing notable this run._" } });
    return blocks;
  }

  if (notable.length > 0) blocks.push({ type: "divider" });

  // One section per notable item
  for (const item of notable) {
    const emoji = RATING_EMOJI[item.rating] || "⚪";
    const tags = item.labels.slice(0, 4).join(", ");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `${emoji} *<${item.url}|${item.title}>*`,
          `_${item.source_name}_ · ${item.rating} (${item.quality_score}/100)${tags ? ` · ${tags}` : ""}`,
          item.summary,
        ].join("\n"),
      },
    });
  }

  // Errors section
  if (opts.errors.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⚠️ *Errors:*\n${opts.errors.map((e) => `• ${e}`).join("\n")}`,
      },
    });
  }

  return blocks;
}

export async function sendSlackDigest(opts: DigestOptions): Promise<void> {
  const minRating = opts.minRatingForSlack ?? "A";
  const notable = opts.items.filter(
    (i) => !i.skip_reason && (RATING_ORDER[i.rating] ?? 5) <= (RATING_ORDER[minRating] ?? 1)
  );

  // Skip if nothing to say and no errors
  if (notable.length === 0 && opts.errors.length === 0) {
    console.error("[slack-notify] Nothing notable, skipping Slack notification");
    return;
  }

  const { runAction } = await import(join(ACTIONS_DIR, "lib/runner.v2.ts"));

  const icon = opts.source === "YouTube" ? "📺" : "📰";
  const fallbackText = notable.length > 0
    ? `${icon} ${opts.source}: ${notable.length} item(s) worth reading`
    : `${icon} ${opts.source}: ${opts.errors.length} error(s)`;

  const result = await runAction("A_SEND_SLACK", {
    text: fallbackText,
    blocks: buildBlocks(opts),
  });

  if (result.success && (result.output as any)?.sent) {
    console.error(`[slack-notify] Sent digest (${notable.length} notable items)`);
  } else if (!(result.output as any)?.sent) {
    console.error("[slack-notify] Skipped (no webhook URL configured)");
  } else {
    console.error("[slack-notify] Failed:", result.error);
  }
}
