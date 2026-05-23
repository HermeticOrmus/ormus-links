# ormus-links

Link intelligence PWA. Save URLs from any app's share sheet, and an AI extracts summaries, tags, insights, and action items automatically.

## What it does

1. **Share target** -- installed as a PWA, it appears in your phone's share sheet. Share a URL from any app and it's saved instantly.
2. **AI extraction** -- each link is fetched, parsed, and analyzed by Claude Haiku. You get a summary, type classification, key insights, suggested actions, and tags.
3. **X/Twitter support** -- tweets are extracted via FxTwitter (free, no API key needed) with full thread and quote context.
4. **Organize** -- filter by status (new/archived), search across all extracted content.

## Setup

```bash
git clone https://github.com/HermeticOrmus/ormus-links.git
cd ormus-links
npm install
cp .env.example .env
# Edit .env with your Anthropic API key
npm start
```

The server runs on port 3000 by default. Set `PORT` in `.env` to change it.

## Share target (Android/Chrome)

1. Open the app in Chrome on your phone
2. Tap the browser menu and "Install app" or "Add to home screen"
3. Once installed as a PWA, it appears in your share sheet
4. Share any URL from any app -- it's saved and processed automatically

The key mechanism is `share_target` in `manifest.json` -- the PWA registers as a share handler, POSTing shared URLs to `/share`.

## Auth

If you run this behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/), the server reads the `cf-access-authenticated-user-email` header to identify users. Map emails to display names via the `AUTH_MAP` env var.

Without Cloudflare Access, links are saved with author "unknown" (or you can pass `author` in the JSON body).

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/links` | Save a link `{ url, title?, text? }` |
| `GET` | `/api/links` | List links (query: `status`, `search`) |
| `GET` | `/api/links/:id` | Get single link |
| `PATCH` | `/api/links/:id` | Update status/tags `{ status?, tags? }` |
| `DELETE` | `/api/links/:id` | Delete a link |
| `POST` | `/api/links/:id/reprocess` | Re-run AI extraction |
| `GET` | `/api/links/stats` | Count by status |
| `POST` | `/share` | Share target endpoint (form-encoded) |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for link analysis |
| `PORT` | No | Server port (default: 3000) |
| `AI_MODEL` | No | Anthropic model (default: claude-haiku-4-5-20251001) |
| `AI_CONTEXT` | No | Describes your link-saving interests for better analysis |
| `AUTH_MAP` | No | Email-to-name mapping for Cloudflare Access |

## Storage

Links are stored as individual JSON files in `./links/`. Archived links move to `./links/archived/`. No database required.

## License

MIT

---

## Part of the Libre Open-Source Stack for Claude Code

This repository is part of a growing family of open-source toolkits for Claude Code, each focused on a specific lane:

- [LibreUIUX-Claude-Code](https://github.com/HermeticOrmus/LibreUIUX-Claude-Code) — UI/UX development (152 agents, 70 plugins, 76 commands, 74 skills)
- [LibreArch-Claude-Code](https://github.com/HermeticOrmus/LibreArch-Claude-Code) — Software architecture and system design
- [LibreCopy-Claude-Code](https://github.com/HermeticOrmus/LibreCopy-Claude-Code) — Technical writing and documentation engineering
- [LibreDevOps-Claude-Code](https://github.com/HermeticOrmus/LibreDevOps-Claude-Code) — DevOps engineering and infrastructure automation
- [LibreEmbed-Claude-Code](https://github.com/HermeticOrmus/LibreEmbed-Claude-Code) — Embedded systems, firmware, and IoT development
- [LibreFinTech-Claude-Code](https://github.com/HermeticOrmus/LibreFinTech-Claude-Code) — Financial technology development
- [LibreGEO-Claude-Code](https://github.com/HermeticOrmus/LibreGEO-Claude-Code) — AI-search optimization (ChatGPT, Perplexity, Gemini, Google AI Overviews)
- [LibreGameDev-Claude-Code](https://github.com/HermeticOrmus/LibreGameDev-Claude-Code) — Game development across Godot, Unity, Unreal
- [LibreMLOps-Claude-Code](https://github.com/HermeticOrmus/LibreMLOps-Claude-Code) — ML engineering and AI operations
- [LibreMobileDev-Claude-Code](https://github.com/HermeticOrmus/LibreMobileDev-Claude-Code) — Mobile app development (Flutter, React Native, native iOS, native Android)
- [LibreSecOps-Claude-Code](https://github.com/HermeticOrmus/LibreSecOps-Claude-Code) — Security operations

Star the family, not just one — that's how the suite stays coherent.
