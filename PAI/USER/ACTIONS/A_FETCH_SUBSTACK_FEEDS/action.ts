import type { ActionContext } from "../../../ACTIONS/lib/types.v2";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

interface PostItem {
  url: string;
  post_id: string;
  title: string;
  content: string;
  author: string;
  published: string;
  feed_name: string;
  access: "free" | "paid";
}

interface Input {
  substack_urls: string[];
  seen_file?: string;
  max_per_feed?: number;
  [key: string]: unknown;
}

interface Output {
  items: PostItem[];
  total_new: number;
  [key: string]: unknown;
}

// Load SUBSTACK_SID from PAI env file
function loadSubstackSid(): string | null {
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

function toBaseUrl(url: string): string {
  return url.replace(/\/$/, "").replace(/\/feed$/, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ").trim();
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

// Fetch via Substack API (authenticated, returns full paid content)
async function fetchViaApi(
  baseUrl: string,
  sid: string,
  limit: number,
  fetchFn: typeof fetch
): Promise<PostItem[]> {
  const apiUrl = `${baseUrl}/api/v1/posts?limit=${limit}`;
  const res = await fetchFn(apiUrl, {
    headers: {
      Cookie: `substack.sid=${sid}`,
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) throw new Error(`API ${res.status}`);

  const data = await res.json() as any[];
  const hostname = new URL(baseUrl).hostname.replace(/\.substack\.com$/, "");
  const feedName = data[0]?.publishedBylines?.[0]?.publicationUsers?.[0]?.publication?.name || hostname;

  return data.map((post: any) => {
    const bodyHtml = post.body_html || post.truncated_body_text || "";
    const content = bodyHtml.startsWith("<") ? stripHtml(bodyHtml) : bodyHtml;
    const author = post.publishedBylines?.map((b: any) => b.name).join(", ") || "";
    const post_id = post.slug || post.id?.toString() || post.canonical_url;

    return {
      url: post.canonical_url || `${baseUrl}/p/${post.slug}`,
      post_id,
      title: post.title || "",
      content: content.slice(0, 10000),
      author,
      published: post.post_date || "",
      feed_name: feedName,
      access: post.audience === "everyone" ? "free" : "paid",
    };
  });
}

// Fetch via RSS (unauthenticated, free content only)
async function fetchViaRss(
  baseUrl: string,
  fetchFn: typeof fetch
): Promise<PostItem[]> {
  const feedUrl = `${baseUrl}/feed`;
  const res = await fetchFn(feedUrl);
  if (!res.ok) throw new Error(`RSS ${res.status}`);

  const xml = await res.text();
  const items: PostItem[] = [];
  const feedName = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([^<\]]+)/i)?.[1]?.trim() || "Unknown";
  const itemBlocks = xml.split(/<item[\s>]/i).slice(1);

  for (const block of itemBlocks) {
    const title = stripHtml(extractTag(block, "title"));
    const url = extractTag(block, "link") || block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || "";
    const author = extractTag(block, "author") || extractTag(block, "dc:creator") || "";
    const rawContent = extractTag(block, "content:encoded") || extractTag(block, "description");

    if (!url || !title) continue;

    const post_id = url.replace(/^https?:\/\/[^/]+/, "").replace(/[^a-z0-9-]/gi, "-");
    const content = stripHtml(rawContent);
    // Substack paywalled posts have very short content in RSS
    const access = content.length < 500 ? "paid" : "free";

    items.push({ url, post_id, title, content: content.slice(0, 10000), author, published: pubDate, feed_name: feedName, access });
  }

  return items;
}

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { substack_urls, seen_file, max_per_feed = 5, ...upstream } = input;
    const { fetch: fetchFn, readFile, writeFile } = ctx.capabilities;

    if (!fetchFn) throw new Error("fetch capability required");
    if (!readFile) throw new Error("readFile capability required");
    if (!writeFile) throw new Error("writeFile capability required");

    const sid = loadSubstackSid();
    if (sid) {
      console.error("[A_FETCH_SUBSTACK_FEEDS] Using authenticated API (full paid content)");
    } else {
      console.error("[A_FETCH_SUBSTACK_FEEDS] No SUBSTACK_SID found — using RSS (free posts only)");
    }

    const seenPath = seen_file || join(homedir(), ".claude/PAI/USER/FLOWS/substack-seen.json");
    let seen: Set<string>;
    try {
      const raw = await readFile(seenPath);
      seen = new Set(JSON.parse(raw));
    } catch {
      seen = new Set();
    }

    const allNew: PostItem[] = [];

    for (const rawUrl of substack_urls) {
      const baseUrl = toBaseUrl(rawUrl);

      try {
        let posts: PostItem[];

        if (sid) {
          try {
            posts = await fetchViaApi(baseUrl, sid, max_per_feed * 2, fetchFn);
          } catch (apiErr) {
            console.error(`[A_FETCH_SUBSTACK_FEEDS] API failed for ${baseUrl} (${apiErr}), falling back to RSS`);
            posts = await fetchViaRss(baseUrl, fetchFn);
          }
        } else {
          posts = await fetchViaRss(baseUrl, fetchFn);
        }

        const newPosts = posts.filter((p) => !seen.has(p.post_id)).slice(0, max_per_feed);

        for (const p of newPosts) {
          seen.add(p.post_id);
          allNew.push(p);
        }

        console.error(`[A_FETCH_SUBSTACK_FEEDS] ${baseUrl}: ${newPosts.length} new (${newPosts.filter(p => p.access === "paid").length} paid)`);
      } catch (err) {
        console.error(`[A_FETCH_SUBSTACK_FEEDS] Error fetching ${baseUrl}:`, err);
      }
    }

    await writeFile(seenPath, JSON.stringify([...seen], null, 2));

    return { ...upstream, items: allNew, total_new: allNew.length };
  },
};
