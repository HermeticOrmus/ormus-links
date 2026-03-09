import express from "express";
import { readdir, readFile, writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const STATIC = join(__dir, "static");
const LINKS = join(__dir, "links");
const ARCHIVED = join(__dir, "links", "archived");
const PORT = parseInt(process.env.PORT || "3000", 10);

await mkdir(LINKS, { recursive: true });
await mkdir(ARCHIVED, { recursive: true });

// --- Auth: map email to identity ---
// Configure via AUTH_MAP env var: "email1:name1,email2:name2"
// Or use Cloudflare Access header (cf-access-authenticated-user-email)
const EMAIL_TO_IDENTITY = {};
if (process.env.AUTH_MAP) {
  for (const pair of process.env.AUTH_MAP.split(",")) {
    const [email, name] = pair.split(":");
    if (email && name) EMAIL_TO_IDENTITY[email.trim()] = name.trim();
  }
}

function getAuthor(req) {
  const email = req.headers["cf-access-authenticated-user-email"];
  if (email && EMAIL_TO_IDENTITY[email]) return EMAIL_TO_IDENTITY[email];
  if (email) return email.split("@")[0];
  return req.body?.author || "unknown";
}

// --- Generate link ID from timestamp ---
function generateId() {
  const ts = new Date()
    .toISOString()
    .replace(/[:.T]/g, "-")
    .slice(0, 19);
  return `link-${ts}`;
}

// --- Detect X/Twitter URLs ---
const TWITTER_PATTERN = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;

function isTwitterUrl(url) {
  return TWITTER_PATTERN.test(url);
}

function extractTweetId(url) {
  const match = url.match(TWITTER_PATTERN);
  return match ? match[1] : null;
}

// --- Fetch tweet content via FxTwitter (free, no API key) ---
async function fetchTweetContent(url) {
  const tweetId = extractTweetId(url);
  if (!tweetId) return null;

  // Primary: FxTwitter API
  try {
    const res = await fetch(`https://api.fxtwitter.com/i/status/${tweetId}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      const tweet = data.tweet;
      if (tweet) {
        const author = tweet.author || {};
        const quote = tweet.quote;

        let text = `@${author.screen_name || "unknown"} (${author.name || ""}):\n${tweet.text || ""}`;
        if (quote) {
          text += `\n\nQuoted @${quote.author?.screen_name || "unknown"}:\n${quote.text || ""}`;
        }

        const og = {
          site_name: "X (formerly Twitter)",
          title: `${author.name} (@${author.screen_name})`,
          description: tweet.text?.slice(0, 200),
          image: tweet.media?.photos?.[0]?.url || author.avatar_url,
        };

        console.log(`FxTwitter fetched: ${tweetId} by @${author.screen_name}`);
        return {
          title: `${author.name} on X: "${tweet.text?.slice(0, 60)}..."`,
          text,
          og,
          tweetData: {
            author: author.name,
            handle: author.screen_name,
            text: tweet.text,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            views: tweet.views,
            media: tweet.media?.all?.map(m => ({ type: m.type, url: m.url })) || [],
            quote: quote ? { author: quote.author?.screen_name, text: quote.text } : null,
            date: tweet.created_at,
          },
        };
      }
    }
  } catch (err) {
    console.error(`FxTwitter failed for ${tweetId}:`, err.message?.slice(0, 100));
  }

  // Fallback: Twitter Syndication API
  try {
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=x`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        const user = data.user || {};
        const text = `@${user.screen_name || "unknown"} (${user.name || ""}):\n${data.text}`;

        console.log(`Syndication fetched: ${tweetId} by @${user.screen_name}`);
        return {
          title: `${user.name} on X`,
          text,
          og: { site_name: "X (formerly Twitter)" },
          tweetData: {
            author: user.name,
            handle: user.screen_name,
            text: data.text,
            likes: data.favorite_count,
            date: data.created_at,
          },
        };
      }
    }
  } catch (err) {
    console.error(`Syndication failed for ${tweetId}:`, err.message?.slice(0, 100));
  }

  // Last resort: oEmbed
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = await res.json();
      const match = data.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const text = match?.[1]?.replace(/<[^>]+>/g, " ").trim();
      if (text) {
        console.log(`oEmbed fetched: ${tweetId} by ${data.author_name}`);
        return {
          title: `${data.author_name} on X`,
          text: `${data.author_name}:\n${text}`,
          og: { site_name: "X (formerly Twitter)" },
        };
      }
    }
  } catch (err) {
    console.error(`oEmbed failed for ${tweetId}:`, err.message?.slice(0, 100));
  }

  return null;
}

// --- Fetch page content and OG tags ---
async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkIntel/1.0)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return { title: null, text: "", og: {} };

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : null;

    // Extract OG tags
    const og = {};
    const ogPattern = /<meta\s+(?:property|name)=["']og:(\w+)["']\s+content=["']([^"']*)["']/gi;
    let ogMatch;
    while ((ogMatch = ogPattern.exec(html)) !== null) {
      og[ogMatch[1]] = ogMatch[2];
    }
    // Also try reversed attribute order
    const ogPattern2 = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']og:(\w+)["']/gi;
    while ((ogMatch = ogPattern2.exec(html)) !== null) {
      og[ogMatch[2]] = ogMatch[1];
    }

    // Strip HTML to text
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Cap at ~4000 chars for AI processing
    if (text.length > 4000) text = text.slice(0, 4000) + "...";

    return { title, text, og };
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err.message?.slice(0, 200));
    return { title: null, text: "", og: {} };
  }
}

// --- Sanitize text for JSON (fix unpaired surrogates from emoji) ---
function sanitizeText(str) {
  if (!str) return "";
  // Remove lone surrogates (unpaired high/low) that break JSON
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
            .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

// --- Process link through AI ---
// Uses Anthropic Claude API by default. Set ANTHROPIC_API_KEY env var.
// Customize the analysis prompt via AI_CONTEXT env var.
async function processWithAI(url, pageTitle, pageText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("No ANTHROPIC_API_KEY — skipping AI processing");
    return null;
  }

  if (!pageText || pageText.length < 50) {
    console.warn(`Insufficient page content for ${url} (${pageText?.length || 0} chars)`);
    return null;
  }

  const context = process.env.AI_CONTEXT || "general web content, articles, tools, and references";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Analyze this web page. The user saves links related to ${context}.

URL: ${url}
Title: ${sanitizeText(pageTitle || "Unknown")}
Page content: ${sanitizeText(pageText)}

Return ONLY valid JSON (no markdown, no code fences):
{
  "summary": "1-2 sentence summary of what this is",
  "type": "repo|article|tool|thread|tutorial|video|docs|other",
  "insights": ["key takeaway 1", "key takeaway 2"],
  "actions": ["thing to try or install", "workflow to adopt"],
  "tags": ["tag1", "tag2", "tag3"],
  "relevance": "Why this is useful"
}`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`AI processing failed (${response.status}):`, err.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Parse JSON from response (handle possible markdown fences)
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const intel = JSON.parse(cleaned);
    console.log(`AI processed: ${url} -> ${intel.type} (${intel.tags?.join(", ")})`);
    return intel;
  } catch (err) {
    console.error(`AI processing error for ${url}:`, err.message?.slice(0, 200));
    return null;
  }
}

// --- Full link processing pipeline ---
async function processLink(linkPath) {
  try {
    const raw = await readFile(linkPath, "utf-8");
    const link = JSON.parse(raw);

    if (link.processed) return; // Already done

    let title, text, og;

    // Use FxTwitter for X/Twitter URLs
    if (isTwitterUrl(link.url)) {
      const tweet = await fetchTweetContent(link.url);
      if (tweet) {
        title = tweet.title;
        text = tweet.text;
        og = tweet.og;
        if (tweet.tweetData) link.tweetData = tweet.tweetData;
      } else {
        title = null; text = ""; og = {};
      }
    } else {
      ({ title, text, og } = await fetchPageContent(link.url));
    }

    link.title = title || link.title || link.url;
    link.og = og;

    const intel = await processWithAI(link.url, link.title, text);

    if (intel) {
      link.intel = intel;
      link.processed = true;
      link.processed_at = new Date().toISOString();
    } else {
      link.processed = false;
      link.process_error = "AI processing returned no result";
    }

    await writeFile(linkPath, JSON.stringify(link, null, 2));
    console.log(`Link processed: ${link.id} (${link.processed ? "success" : "partial"})`);
  } catch (err) {
    console.error(`processLink error:`, err.message?.slice(0, 200));
  }
}

// --- Read all links from disk ---
async function readLinks(includeArchived = false) {
  const files = await readdir(LINKS);
  const links = [];

  for (const f of files) {
    if (!f.startsWith("link-") || !f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await readFile(join(LINKS, f), "utf-8"));
      links.push(data);
    } catch {}
  }

  if (includeArchived) {
    try {
      const archivedFiles = await readdir(ARCHIVED);
      for (const f of archivedFiles) {
        if (!f.startsWith("link-") || !f.endsWith(".json")) continue;
        try {
          const data = JSON.parse(await readFile(join(ARCHIVED, f), "utf-8"));
          links.push(data);
        } catch {}
      }
    } catch {}
  }

  links.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
  return links;
}

// --- Find link file by ID ---
async function findLinkPath(id) {
  const mainPath = join(LINKS, `${id}.json`);
  try {
    await stat(mainPath);
    return mainPath;
  } catch {}

  const archivedPath = join(ARCHIVED, `${id}.json`);
  try {
    await stat(archivedPath);
    return archivedPath;
  } catch {}

  return null;
}

// ============================================================
// Express App
// ============================================================

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static files ---
app.use("/static", express.static(STATIC));
app.get("/", (_, res) => res.sendFile(join(STATIC, "index.html")));
app.get("/manifest.json", (_, res) => res.sendFile(join(STATIC, "manifest.json")));
app.get("/sw.js", (_, res) => {
  res.type("application/javascript").sendFile(join(STATIC, "sw.js"));
});

// --- Identity ---
app.get("/api/me", (req, res) => {
  const email = req.headers["cf-access-authenticated-user-email"] || "";
  const identity = EMAIL_TO_IDENTITY[email] || email.split("@")[0] || "unknown";
  res.json({ identity, email });
});

// --- Share target (POST from Android share sheet) ---
app.post("/share", (req, res) => {
  const url = req.body.url || req.body.text || "";
  const title = req.body.title || "";
  const author = getAuthor(req);

  if (!url) return res.redirect("/?error=no-url");

  // Extract URL from text if it contains mixed content
  const urlMatch = url.match(/https?:\/\/[^\s]+/);
  const cleanUrl = urlMatch ? urlMatch[0] : url.trim();
  const note = urlMatch && url !== cleanUrl ? url.replace(cleanUrl, "").trim() : "";

  const id = generateId();
  const link = {
    id,
    url: cleanUrl,
    title: title || cleanUrl,
    text: note,
    author,
    created: new Date().toISOString(),
    status: "new",
    processed: false,
  };

  const linkPath = join(LINKS, `${id}.json`);
  writeFile(linkPath, JSON.stringify(link, null, 2))
    .then(() => {
      console.log(`Shared link saved: ${id} -> ${cleanUrl} by ${author}`);
      // Process in background
      processLink(linkPath).catch(err =>
        console.error(`Background processing failed for ${id}:`, err.message)
      );
      res.redirect("/?saved=true");
    })
    .catch(err => {
      console.error("Share save error:", err.message);
      res.redirect("/?error=save-failed");
    });
});

// --- Save link (JSON API) ---
app.post("/api/links", (req, res) => {
  const { url, title, text } = req.body;
  const author = getAuthor(req);

  if (!url) return res.status(400).json({ error: "url is required" });

  const id = generateId();
  const link = {
    id,
    url: url.trim(),
    title: title || url.trim(),
    text: text || "",
    author,
    created: new Date().toISOString(),
    status: "new",
    processed: false,
  };

  const linkPath = join(LINKS, `${id}.json`);
  writeFile(linkPath, JSON.stringify(link, null, 2))
    .then(() => {
      console.log(`API link saved: ${id} -> ${url} by ${author}`);
      // Process in background
      processLink(linkPath).catch(err =>
        console.error(`Background processing failed for ${id}:`, err.message)
      );
      res.json({ status: "saved", id, url: link.url });
    })
    .catch(err => {
      res.status(500).json({ error: "Save failed: " + err.message });
    });
});

// --- List links ---
app.get("/api/links", async (req, res) => {
  const { status, search } = req.query;

  const includeArchived = status === "all" || status === "archived";
  let links = await readLinks(includeArchived);

  // Filter by status
  if (status === "new") {
    links = links.filter(l => l.status === "new");
  } else if (status === "pulled") {
    links = links.filter(l => l.status === "pulled");
  } else if (status === "archived") {
    links = links.filter(l => l.status === "archived");
  } else if (status !== "all") {
    // Default: non-archived
    links = links.filter(l => l.status !== "archived");
  }

  // Search across url, title, tags, insights, summary
  if (search) {
    const q = search.toLowerCase();
    links = links.filter(l => {
      const haystack = [
        l.url,
        l.title,
        l.text,
        l.intel?.summary,
        l.intel?.relevance,
        ...(l.intel?.tags || []),
        ...(l.intel?.insights || []),
        ...(l.intel?.actions || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  res.json(links);
});

// --- Link stats ---
app.get("/api/links/stats", async (req, res) => {
  const all = await readLinks(true);
  const counts = { new: 0, pulled: 0, archived: 0, total: all.length, processed: 0, unprocessed: 0 };

  for (const l of all) {
    if (l.status === "new") counts.new++;
    else if (l.status === "pulled") counts.pulled++;
    else if (l.status === "archived") counts.archived++;
    if (l.processed) counts.processed++;
    else counts.unprocessed++;
  }

  res.json(counts);
});

// --- Single link detail ---
app.get("/api/links/:id", async (req, res) => {
  const linkPath = await findLinkPath(req.params.id);
  if (!linkPath) return res.status(404).json({ error: "Not found" });

  const link = JSON.parse(await readFile(linkPath, "utf-8"));
  res.json(link);
});

// --- Update link ---
app.patch("/api/links/:id", async (req, res) => {
  const linkPath = await findLinkPath(req.params.id);
  if (!linkPath) return res.status(404).json({ error: "Not found" });

  const link = JSON.parse(await readFile(linkPath, "utf-8"));
  const { status, tags } = req.body;

  if (status) link.status = status;
  if (tags && Array.isArray(tags)) {
    if (!link.intel) link.intel = {};
    link.intel.tags = tags;
  }

  // Move to/from archived directory based on status
  if (status === "archived" && !linkPath.includes("/archived/")) {
    const newPath = join(ARCHIVED, `${link.id}.json`);
    await writeFile(newPath, JSON.stringify(link, null, 2));
    await unlink(linkPath);
    console.log(`Archived: ${link.id}`);
  } else if (status !== "archived" && linkPath.includes("/archived/")) {
    const newPath = join(LINKS, `${link.id}.json`);
    await writeFile(newPath, JSON.stringify(link, null, 2));
    await unlink(linkPath);
    console.log(`Unarchived: ${link.id}`);
  } else {
    await writeFile(linkPath, JSON.stringify(link, null, 2));
  }

  res.json({ status: "updated", link });
});

// --- Delete link ---
app.delete("/api/links/:id", async (req, res) => {
  const linkPath = await findLinkPath(req.params.id);
  if (!linkPath) return res.status(404).json({ error: "Not found" });

  await unlink(linkPath);
  console.log(`Deleted: ${req.params.id}`);
  res.json({ status: "deleted", id: req.params.id });
});

// --- Reprocess link ---
app.post("/api/links/:id/reprocess", async (req, res) => {
  const linkPath = await findLinkPath(req.params.id);
  if (!linkPath) return res.status(404).json({ error: "Not found" });

  // Reset processing state
  const link = JSON.parse(await readFile(linkPath, "utf-8"));
  link.processed = false;
  delete link.intel;
  delete link.process_error;
  await writeFile(linkPath, JSON.stringify(link, null, 2));

  // Re-process in background
  processLink(linkPath).catch(err =>
    console.error(`Reprocess failed for ${link.id}:`, err.message)
  );

  res.json({ status: "reprocessing", id: link.id });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Link intelligence server running on http://0.0.0.0:${PORT}`);
});
