import { Hono } from "hono";
import { extractVideoId } from "./utils/youtube";
import { generateId } from "./utils/ids";
import { createPage } from "./pages/create";
import { watchPage } from "./pages/watch";

type Bindings = {
  LINKS: KVNamespace;
  ANTHROPIC_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Home / create page
app.get("/", (c) => c.html(createPage()));

// Handle form submission
app.post("/create", async (c) => {
  const body = await c.req.parseBody();
  const rawUrl = (body.url as string) || "";
  const label = ((body.label as string) || "").trim() || undefined;

  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    return c.html(
      createPage({ error: "Could not find a valid YouTube video ID in that URL." }),
      400
    );
  }

  const id = generateId();
  await c.env.LINKS.put(id, JSON.stringify({ videoId, label }));

  const origin = new URL(c.req.url).origin;
  const shareUrl = `${origin}/w/${id}`;

  return c.html(createPage({ url: shareUrl }));
});

// Watch page
app.get("/w/:id", async (c) => {
  const id = c.req.param("id");
  const raw = await c.env.LINKS.get(id);
  if (!raw) {
    return c.text("Link not found", 404);
  }
  const entry = JSON.parse(raw) as { videoId: string; label?: string };
  return c.html(watchPage(entry.videoId, entry.label));
});

// API: suggest a spoiler-free label from a YouTube URL
app.post("/api/suggest-label", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  const videoId = extractVideoId(url);
  if (!videoId) {
    return c.json({ error: "Invalid YouTube URL" }, 400);
  }

  // Fetch title via YouTube oEmbed (no API key needed)
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const oembedRes = await fetch(oembedUrl);
  if (!oembedRes.ok) {
    return c.json({ error: "Could not fetch video info" }, 502);
  }
  const oembed = await oembedRes.json() as { title: string };
  const originalTitle = oembed.title;

  // Ask Claude to rewrite the title without spoilers
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: just return the original title if no API key
    return c.json({ label: originalTitle, original: originalTitle });
  }

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Rewrite this YouTube video title into a short, spoiler-free label. Rules:
- Remove ALL athlete/player/team names — just describe the event generically
- Remove any results, outcomes, winners, scores, or placements
- Include the event name, discipline, and year if possible
- Format like: "Women's 1500m — USATF Indoor Championships 2026"
- Keep it under 60 characters
- Return ONLY the rewritten title, nothing else

Original title: ${originalTitle}`,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    // Fallback to original title on API error
    return c.json({ label: originalTitle, original: originalTitle });
  }

  const claudeData = await claudeRes.json() as {
    content: Array<{ type: string; text: string }>;
  };
  const suggested = claudeData.content?.[0]?.text?.trim() || originalTitle;

  return c.json({ label: suggested, original: originalTitle });
});

// API: create link (for programmatic use)
app.post("/api/create", async (c) => {
  const { url, label } = await c.req.json<{ url: string; label?: string }>();
  const videoId = extractVideoId(url);
  if (!videoId) {
    return c.json({ error: "Invalid YouTube URL" }, 400);
  }
  const id = generateId();
  await c.env.LINKS.put(id, JSON.stringify({ videoId, label: label?.trim() || undefined }));
  const origin = new URL(c.req.url).origin;
  return c.json({ id, url: `${origin}/w/${id}` });
});

export default app;
