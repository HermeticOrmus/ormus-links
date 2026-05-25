<p align="center">
  <img src="https://ormus.solutions/mascot/golden_swan.gif" alt="ormus-links" width="128" style="image-rendering: pixelated;" />
</p>

<h1 align="center">ormus-links</h1>

<p align="center">
  <em>Link intelligence PWA — save, extract, and organize web content with AI</em>
</p>

<p align="center">
  <a href="https://github.com/HermeticOrmus/ormus-links/stargazers"><img src="https://img.shields.io/github/stars/HermeticOrmus/ormus-links?style=flat-square&color=aa8142" alt="Stars" /></a>
  <a href="https://github.com/HermeticOrmus/ormus-links/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HermeticOrmus/ormus-links?style=flat-square&color=aa8142" alt="License" /></a>
  <a href="https://github.com/HermeticOrmus/ormus-links/commits"><img src="https://img.shields.io/github/last-commit/HermeticOrmus/ormus-links?style=flat-square&color=aa8142" alt="Last Commit" /></a>
  <img src="https://img.shields.io/badge/Claude_Code-aa8142?style=flat-square&logo=anthropic&logoColor=white" alt="Claude Code" />
</p>

---
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

This repository is part of a growing family of open-source toolkits for Claude Code.

### Libre suite — comprehensive plugin bundles

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

### Skills mini-repos — single CLAUDE.md drop-ins

- [vibe-engineer-skills](https://github.com/HermeticOrmus/vibe-engineer-skills) — Direct AI codegen well (hypothesis → scope → validate → reject working-but-wrong)
- [markdown-discipline-skills](https://github.com/HermeticOrmus/markdown-discipline-skills) — Strip AI-slop from markdown (no em dashes, no marketing fluff)
- [shell-safety-skills](https://github.com/HermeticOrmus/shell-safety-skills) — `set -euo pipefail` discipline + 15 failure-mode examples
- [commit-standard-skills](https://github.com/HermeticOrmus/commit-standard-skills) — Ormus Commit Standard v1.0 + commit-msg hook + commitlint
- [unwoke-skills](https://github.com/HermeticOrmus/unwoke-skills) — Strip AI theater (ten sins to eliminate, symmetric engagement)
- [python-conventions-skills](https://github.com/HermeticOrmus/python-conventions-skills) — Modern Python 3.11+ (types, pathlib, async, ruff, mypy, uv)
- [typescript-conventions-skills](https://github.com/HermeticOrmus/typescript-conventions-skills) — TypeScript strict mode, discriminated unions, Result types
- [hermetic-laws-skills](https://github.com/HermeticOrmus/hermetic-laws-skills) — Seven Hermetic Principles applied to engineering
- [riper-workflow-skills](https://github.com/HermeticOrmus/riper-workflow-skills) — Research / Innovate / Plan / Execute / Review systematic dev
- [six-day-cycle-skills](https://github.com/HermeticOrmus/six-day-cycle-skills) — Sustainable shipping cadence with mandatory rest
- [token-optimization-skills](https://github.com/HermeticOrmus/token-optimization-skills) — Claude Code token + context optimization
- [osint-skills](https://github.com/HermeticOrmus/osint-skills) — OSINT research methodology (multi-wave investigative spiral)
- [calcinate-skills](https://github.com/HermeticOrmus/calcinate-skills) — Stage 1 of the Magnum Opus (burn project bloat)
- [claude-md-overhaul-skills](https://github.com/HermeticOrmus/claude-md-overhaul-skills) — Audit CLAUDE.md and MEMORY.md against caps
- [session-handoff-skills](https://github.com/HermeticOrmus/session-handoff-skills) — Session handoff + pickup discipline
- [naming-skills](https://github.com/HermeticOrmus/naming-skills) — Product naming methodology (mine the brand's vocabulary)
- [magnum-opus-skills](https://github.com/HermeticOrmus/magnum-opus-skills) — Seven-stage alchemy applied to project transformation

### Template source

- [andrej-karpathy-skills](https://github.com/HermeticOrmus/andrej-karpathy-skills) — the canonical single-file CLAUDE.md pattern (fork of jiayuan_jy's original)

Star the family, not just one — that's how the suite stays coherent.
