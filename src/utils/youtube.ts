/**
 * Extract a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/v/VIDEO_ID
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  // Try parsing as a URL
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Maybe it's just a bare video ID (11 chars, alphanumeric + _ -)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (hostname === "youtu.be") {
    const id = url.pathname.slice(1);
    return id.length === 11 ? id : null;
  }

  if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
    // /watch?v=VIDEO_ID
    const v = url.searchParams.get("v");
    if (v && v.length === 11) return v;

    // /embed/VIDEO_ID, /shorts/VIDEO_ID, /v/VIDEO_ID
    const match = url.pathname.match(/^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  }

  return null;
}
