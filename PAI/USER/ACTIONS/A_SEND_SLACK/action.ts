import type { ActionContext } from "../../../ACTIONS/lib/types.v2";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

interface Input {
  text: string;
  blocks?: unknown[];
  [key: string]: unknown;
}

interface Output {
  sent: boolean;
  [key: string]: unknown;
}

function loadWebhookUrl(): string | null {
  try {
    const envPath = join(homedir(), ".config/PAI/.env");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^SLACK_WEBHOOK_URL=(.+)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return process.env.SLACK_WEBHOOK_URL || null;
}

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { text, blocks, ...upstream } = input;
    const { fetch: fetchFn } = ctx.capabilities;
    if (!fetchFn) throw new Error("fetch capability required");

    const webhookUrl = loadWebhookUrl();
    if (!webhookUrl) {
      console.error("[A_SEND_SLACK] No SLACK_WEBHOOK_URL in ~/.config/PAI/.env — skipping");
      return { ...upstream, sent: false };
    }

    const body: Record<string, unknown> = { text };
    if (blocks?.length) body.blocks = blocks;

    const res = await fetchFn(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Slack webhook failed (${res.status}): ${err}`);
    }

    return { ...upstream, sent: true };
  },
};
