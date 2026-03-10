import type { ActionContext } from "../../../ACTIONS/lib/types.v2";

interface Input {
  transcript?: string;
  transcript_source?: string;
  content?: string;
  title?: string;
  channel_name?: string;
  author?: string;
  feed_name?: string;
  description?: string;
  [key: string]: unknown;
}

interface Output {
  labels: string[];
  rating: string;
  quality_score: number;
  summary: string;
  bullet_points: string[];
  skip_reason?: string;
  [key: string]: unknown;
}

const SYSTEM = `You are a content analyst. Given a YouTube video transcript (or description if transcript unavailable), analyze it and return JSON.

Rating scale:
- S: Must watch. Exceptional insight, novel ideas, changes how you think.
- A: High value. Solid content worth your time.
- B: Decent. Some useful content, not essential.
- C: Low value. Mostly surface-level or filler.
- D: Skip. No signal.

Return this exact JSON structure:
{
  "labels": ["tag1", "tag2", "tag3"],
  "rating": "A",
  "quality_score": 78,
  "summary": "2-3 sentence summary of what the video covers.",
  "bullet_points": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "skip_reason": null
}

Set skip_reason if the content is clearly not worth processing (ad, short clip, purely entertainment with no insight).
labels should be specific topic tags like "ai-agents", "rag", "business-strategy", not generic.`;

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { transcript, transcript_source, content, title, channel_name, author, feed_name, description, ...upstream } = input;
    const { llm } = ctx.capabilities;

    if (!llm) throw new Error("llm capability required");

    // If no transcript at all, return skip
    if (!transcript && !content && !description) {
      return {
        ...upstream,
        transcript,
        transcript_source,
        title,
        channel_name,
        description,
        labels: [],
        rating: "D",
        quality_score: 0,
        summary: "No transcript or description available.",
        bullet_points: [],
        skip_reason: "No content to analyze",
      };
    }

    const contentToAnalyze = transcript || content || description || "";
    // Truncate to ~8k chars to stay within token limits
    const truncated = contentToAnalyze.slice(0, 8000);

    const prompt = [
      title ? `Title: ${title}` : "",
      channel_name ? `Channel: ${channel_name}` : "",
      feed_name ? `Publication: ${feed_name}` : "",
      author ? `Author: ${author}` : "",
      transcript_source === "unavailable" ? "Note: No transcript available, using description." : "",
      "",
      truncated,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await llm(prompt, {
      system: SYSTEM,
      tier: "standard",
      json: true,
      maxTokens: 1024,
    });

    const parsed = (result.json as Partial<Output>) || {};

    return {
      ...upstream,
      transcript,
      transcript_source,
      content,
      title,
      channel_name,
      author,
      feed_name,
      description,
      labels: parsed.labels || [],
      rating: parsed.rating || "C",
      quality_score: parsed.quality_score ?? 50,
      summary: parsed.summary || "",
      bullet_points: parsed.bullet_points || [],
      skip_reason: parsed.skip_reason || undefined,
    };
  },
};
