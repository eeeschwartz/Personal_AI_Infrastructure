import type { ActionContext } from "../../../ACTIONS/lib/types.v2";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

interface SubstackSubscription {
  publication_id: number;
  membership_state: string; // "free_signup" | "subscribed" | "founding"
}

interface SubstackPublication {
  id: number;
  name: string;
  subdomain: string;
  custom_domain: string | null;
}

interface Input {
  config_file?: string;
  paid_only?: boolean;
  [key: string]: unknown;
}

interface Output {
  added: string[];
  removed: string[];
  total: number;
  [key: string]: unknown;
}

function loadSid(): string | null {
  try {
    const envPath = join(homedir(), ".config/PAI/.env");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^SUBSTACK_SID=(.+)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return process.env.SUBSTACK_SID || null;
}

function pubToUrl(pub: SubstackPublication): string {
  if (pub.custom_domain) return `https://${pub.custom_domain}`;
  return `https://${pub.subdomain}.substack.com`;
}

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { config_file, paid_only = false, ...upstream } = input;
    const { fetch: fetchFn, readFile, writeFile } = ctx.capabilities;

    if (!fetchFn) throw new Error("fetch capability required");
    if (!readFile) throw new Error("readFile capability required");
    if (!writeFile) throw new Error("writeFile capability required");

    const sid = loadSid();
    if (!sid) throw new Error("SUBSTACK_SID not found in ~/.config/PAI/.env");

    const configPath = config_file || join(homedir(), ".claude/PAI/USER/FLOWS/substack-feeds.json");

    // Fetch live subscriptions from Substack
    const res = await fetchFn("https://substack.com/api/v1/subscriptions", {
      headers: {
        Cookie: `substack.sid=${sid}`,
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("SUBSTACK_SID is invalid or expired — grab a fresh one from substack.com DevTools");
      throw new Error(`Substack API error: ${res.status}`);
    }

    const data = await res.json() as {
      subscriptions: SubstackSubscription[];
      publications: SubstackPublication[];
    };

    // Build map of publication_id → publication
    const pubById = new Map(data.publications.map((p) => [p.id, p]));

    // Filter subscriptions
    const activeSubs = data.subscriptions.filter((s) => {
      if (paid_only) return s.membership_state === "subscribed" || s.membership_state === "founding";
      return true;
    });

    // Build live URL set
    const liveUrls = new Set<string>();
    for (const sub of activeSubs) {
      const pub = pubById.get(sub.publication_id);
      if (pub) liveUrls.add(pubToUrl(pub));
    }

    // Load current config
    let currentConfig: Record<string, unknown> = {};
    try {
      const raw = await readFile(configPath);
      currentConfig = JSON.parse(raw);
    } catch {
      currentConfig = {};
    }

    const currentUrls: string[] = (currentConfig.substack_urls as string[]) || [];
    const currentSet = new Set(currentUrls);

    // Diff
    const added = [...liveUrls].filter((u) => !currentSet.has(u));
    const removed = currentUrls.filter((u) => !liveUrls.has(u));

    // Write updated config (preserve all other keys like seen_file, max_per_feed)
    const newUrls = [...liveUrls].sort();
    const updatedConfig = {
      ...currentConfig,
      substack_urls: newUrls,
    };

    await writeFile(configPath, JSON.stringify(updatedConfig, null, 2));

    // Log changes
    if (added.length > 0) console.error(`[A_SYNC_SUBSTACK_SUBS] Added: ${added.join(", ")}`);
    if (removed.length > 0) console.error(`[A_SYNC_SUBSTACK_SUBS] Removed: ${removed.join(", ")}`);
    if (added.length === 0 && removed.length === 0) console.error("[A_SYNC_SUBSTACK_SUBS] No changes");

    return {
      ...upstream,
      added,
      removed,
      total: newUrls.length,
    };
  },
};
