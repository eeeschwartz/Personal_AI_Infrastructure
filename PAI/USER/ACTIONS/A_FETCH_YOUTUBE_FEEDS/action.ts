import type { ActionContext } from "../../../ACTIONS/lib/types.v2";
import { homedir } from "os";
import { join } from "path";

interface VideoItem {
  video_id: string;
  url: string;
  title: string;
  published: string;
  description: string;
  channel_name: string;
  channel_id: string;
}

interface Input {
  channel_ids: string[];
  seen_file?: string;
  max_per_channel?: number;
  [key: string]: unknown;
}

interface Output {
  items: VideoItem[];
  total_new: number;
  [key: string]: unknown;
}

function parseYouTubeRSS(xml: string, channelId: string): VideoItem[] {
  const items: VideoItem[] = [];

  // Channel title is the first <title> tag
  const channelName = xml.match(/<title>([^<]+)<\/title>/)?.[1] || channelId;

  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
    const url = entry.match(/href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] || "";
    // Description is CDATA wrapped
    const description = entry.match(/<media:description>([^<]*(?:<(?!\/media:description>)[^<]*)*)<\/media:description>/)?.[1]?.trim() || "";

    if (videoId && title && url) {
      items.push({
        video_id: videoId,
        url,
        title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'),
        published,
        description: description.slice(0, 500),
        channel_name: channelName,
        channel_id: channelId,
      });
    }
  }

  return items;
}

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { channel_ids, seen_file, max_per_channel = 5, ...upstream } = input;
    const { fetch: fetchFn, readFile, writeFile } = ctx.capabilities;

    if (!fetchFn) throw new Error("fetch capability required");
    if (!readFile) throw new Error("readFile capability required");
    if (!writeFile) throw new Error("writeFile capability required");

    const seenPath = seen_file || join(homedir(), ".claude/PAI/USER/FLOWS/youtube-seen.json");

    // Load seen video IDs
    let seen: Set<string>;
    try {
      const raw = await readFile(seenPath);
      seen = new Set(JSON.parse(raw));
    } catch {
      seen = new Set();
    }

    const allNew: VideoItem[] = [];

    for (const channelId of channel_ids) {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      try {
        const res = await fetchFn(rssUrl);
        if (!res.ok) {
          console.error(`[A_FETCH_YOUTUBE_FEEDS] Failed to fetch ${channelId}: ${res.status}`);
          continue;
        }

        const xml = await res.text();
        const videos = parseYouTubeRSS(xml, channelId);

        const newVideos = videos
          .filter((v) => !seen.has(v.video_id))
          .slice(0, max_per_channel);

        for (const v of newVideos) {
          seen.add(v.video_id);
          allNew.push(v);
        }

        console.error(`[A_FETCH_YOUTUBE_FEEDS] ${channelId}: ${newVideos.length} new of ${videos.length}`);
      } catch (err) {
        console.error(`[A_FETCH_YOUTUBE_FEEDS] Error fetching ${channelId}:`, err);
      }
    }

    // Persist updated seen list
    await writeFile(seenPath, JSON.stringify([...seen], null, 2));

    return {
      ...upstream,
      items: allNew,
      total_new: allNew.length,
    };
  },
};
