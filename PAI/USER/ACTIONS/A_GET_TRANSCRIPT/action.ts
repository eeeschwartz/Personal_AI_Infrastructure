import type { ActionContext } from "../../../ACTIONS/lib/types.v2";

interface Input {
  url: string;
  video_id?: string;
  title?: string;
  channel_name?: string;
  published?: string;
  description?: string;
  [key: string]: unknown;
}

interface Output {
  transcript: string;
  transcript_source: "manual" | "auto" | "unavailable";
  [key: string]: unknown;
}

export default {
  async execute(input: Input, ctx: ActionContext): Promise<Output> {
    const { url, ...upstream } = input;
    const { shell } = ctx.capabilities;

    if (!shell) throw new Error("shell capability required");

    // Try yt-dlp to get subtitles (manual first, then auto-generated)
    // --write-subs --write-auto-subs --sub-langs en --skip-download -o /tmp/yt_transcript
    const tmpBase = `/tmp/yt_transcript_${Date.now()}`;

    // Try manual captions first
    let result = await shell(
      `yt-dlp --write-subs --sub-langs "en,en-US" --sub-format vtt --skip-download -o "${tmpBase}" "${url}" 2>&1`
    );

    let transcriptFile = `${tmpBase}.en.vtt`;
    let source: "manual" | "auto" | "unavailable" = "manual";

    // Check if manual sub exists
    const checkManual = await shell(`test -f "${transcriptFile}" && echo yes || echo no`);
    if (checkManual.stdout.trim() !== "yes") {
      // Try auto-generated captions
      result = await shell(
        `yt-dlp --write-auto-subs --sub-langs "en,en-US" --sub-format vtt --skip-download -o "${tmpBase}" "${url}" 2>&1`
      );
      transcriptFile = `${tmpBase}.en.vtt`;
      source = "auto";

      const checkAuto = await shell(`test -f "${transcriptFile}" && echo yes || echo no`);
      if (checkAuto.stdout.trim() !== "yes") {
        // No transcript available — use description as fallback
        await shell(`rm -f "${tmpBase}"* 2>/dev/null`);
        return {
          ...upstream,
          url,
          transcript: input.description || "",
          transcript_source: "unavailable",
        };
      }
    }

    // Parse VTT: strip timestamps and deduplicate lines
    const readResult = await shell(`cat "${transcriptFile}"`);
    await shell(`rm -f "${tmpBase}"* 2>/dev/null`);

    const transcript = parseVTT(readResult.stdout);

    return {
      ...upstream,
      url,
      transcript,
      transcript_source: source,
    };
  },
};

function parseVTT(vtt: string): string {
  const lines = vtt.split("\n");
  const seen = new Set<string>();
  const text: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip VTT header, timestamps, cue settings, empty lines
    if (!trimmed || trimmed === "WEBVTT" || trimmed.includes("-->") || /^\d+$/.test(trimmed)) continue;
    // Skip lines starting with NOTE or STYLE
    if (trimmed.startsWith("NOTE") || trimmed.startsWith("STYLE")) continue;
    // Strip inline VTT tags like <00:01:23.456><c>text</c>
    const cleaned = trimmed.replace(/<[^>]+>/g, "").trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    text.push(cleaned);
  }

  return text.join(" ").replace(/\s+/g, " ").trim();
}
