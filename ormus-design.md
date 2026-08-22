# Ormus Design System

> Japanese Minimalism meets Swiss Engineering.
> Design tokens and principles for Ormus personal tools (recorder, links, analyst, notes, invoicer, presentations, polls).
> **When editing any file in this repository, respect these conventions.**

## Brand Identity

- **Philosophy**: Japanese Minimalism + Swiss Engineering
- **Feel**: Calm, precise, breathing. The interface disappears; the work stays.
- **Header format**: Minimal. Tool name in small caps. Hermetic mark optional.

## Core Principles

1. **One action path** — Remove decisions. Auto-send, auto-save, auto-transcribe. Undo > confirm.
2. **The interface should breathe** — Idle states animate gently (breathing waveforms, subtle pulses). Dead UIs feel broken.
3. **Haptic precision** — Tactile feedback on key interactions (record, send, toggle). Short vibrations (10-15ms) on mobile.
4. **Information hierarchy** — The primary action dominates. Secondary controls hide in panels/menus. Never clutter the main view.
5. **Human labels** — "Mar 6, 3:42 PM" not `rec-2026-03-06-15-42.webm`. Timestamps over filenames. Names over IDs.
6. **Toasts at the edge** — Notifications at the bottom, out of the way. Never center-screen.
7. **Auth is invisible** — Cloudflare Access or Firebase handles identity. No login forms, no user selectors. The system knows who you are.
8. **Smaller > bigger** — Buttons, fonts, spacing — always try one size smaller first. Density with clarity.

## Color Tokens (CSS Variables)

```css
:root {
  /* Backgrounds */
  --obsidian: #0B0B0D;    /* Page background */
  --surface: #111114;     /* Cards, panels */
  --surface2: #1a1a1f;    /* Borders, hover, secondary surfaces */

  /* Accents */
  --gold: #D29E3D;        /* Primary accent, Diego's energy */
  --copper: #C87A3B;      /* Active/recording states */
  --teal: #2ecc71;        /* Secondary accent, Laura's energy */

  /* Text */
  --parchment: #FAF6F0;   /* Primary text */
  --muted: #555;          /* Secondary text */

  /* Status */
  --danger: #c0392b;      /* Errors, destructive actions */
}
```

### When to Use Which Accent

- **`--gold`**: Primary action, important state, Diego-associated content
- **`--copper`**: Active recording, in-progress operation, warning (distinct from danger)
- **`--teal`**: Secondary actions, Laura-associated content, success confirmations
- **`--danger`**: Only for destructive or error states. Never for warnings.

## Typography

- **Font family**: System UI or a humanist sans (Inter, SF Pro, Outfit are all acceptable)
- **Hierarchy**: Use size and weight sparingly. Most interfaces need only 3 sizes: primary (16px), secondary (13px), caption (11px).
- **Weight**: 400 default, 500 for labels, 600 for emphasis. Avoid 700+ (too loud).

## Spacing

- **Unit**: 4px base, multiply in increments of 4 (4, 8, 12, 16, 24, 32)
- **Rule of thumb**: Density = 8px padding on controls. Breathing = 16-24px between sections. Never 0px between related items.

## Layout Principles

1. **Single primary action** — Every screen has ONE thing the user is here to do. That action dominates. Everything else is secondary.
2. **Generous negative space around focused elements** — Breathing room amplifies the thing you're looking at.
3. **Mobile-first for tools** — Recorder, Links, Notes are mobile-first. Invoicer, Analyst, Presentations are desktop-first.
4. **PWA-friendly** — All tools should work as installed PWAs where possible. Minimal chrome.

## Component Patterns

### Recording button (breathing)

```html
<button class="record-btn" aria-label="Record">
  <span class="record-pulse"></span>
</button>
```

When idle, pulse animates at 2s intervals. When recording, becomes `--copper` and pulses faster (0.8s).

### Timestamp label

Always show human-readable timestamps: `Mar 6, 3:42 PM` not `2026-03-06T15:42:00Z`. Use the user's local timezone.

### Toast notification

```html
<div class="toast" role="status">
  <span class="toast-icon"></span>
  Recording saved
</div>
```

Position: bottom, centered horizontally, 16px from edge. Auto-dismiss after 3s. Never blocks the main action.

## Behavioral Rules

- **No emojis** unless the user explicitly requested them
- **No confirm dialogs for reversible actions** — "Did you mean to...?" is almost always wrong. Just do it, offer undo.
- **No loading spinners for <500ms operations** — show optimistic UI instead
- **No notifications that require dismissal** — all notifications should auto-dismiss
- **No ads, no tracking, no dark patterns** — this is the Hermetic Gold Hat rule. Empower, don't extract.
- **Always use `textContent`, not `innerHTML`** when rendering user data — XSS prevention
- **Always use the user's local timezone** for displayed timestamps

## Authentication

Two patterns depending on the tool:

1. **Cloudflare Access (CF headers)**: For tools on `*.ormus.solutions` that are private to Diego + Laura. Server reads `cf-access-authenticated-user-email`.
2. **Firebase Auth**: For tools that need public-facing Google Sign-In (Polls, etc.). Use project `alqvimia-auth`, client ID `1007328858412-fstvrq7qbkehm7s6umeqlvqpvu0sktq9.apps.googleusercontent.com`.

Never build a custom login form.

## Mobile

Ormus mobile tools prioritize:
- Thumb-reachable primary actions (bottom of screen)
- Minimal chrome (edge-to-edge content)
- PWA installability (manifest.json, service worker)
- Haptic feedback on key taps

## What This Replaces

This file replaces ad-hoc decisions about Ormus tool styling. Before creating new components, check that they honor these tokens. Before adding a new color variable, check that one of the existing ones wouldn't serve.

**When AI agents edit files in this repo, they should read this file first.**
