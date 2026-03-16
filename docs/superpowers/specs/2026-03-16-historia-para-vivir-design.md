# Historia para Vivir — Design Spec

## Overview

A minimalist web experience where two emotional stories are presented each day. Users read one story at a time in an immersive, full-screen format. The goal is to teach the importance of small things through real stories that changed someone's life or perspective.

Think of it as opening a personal letter from a stranger who wanted to share something beautiful.

## Target User

Someone having a bad day who wants to read something uplifting — a small pearl of human experience.

## Pages

### Home (`/`)
- Brief intro explaining what the project is
- CTA to start reading today's stories
- Clean, minimal layout

### Story View (`/story/[slug]`)
- Full-screen immersive experience — one story at a time
- Story content takes center stage (large typography, generous whitespace)
- "Next story" button to advance to the second story of the day
- After the second story: message indicating "come back tomorrow for more"

### About (`/about`)
- What the project is and why it exists
- The philosophy: importance of small things

### 404 Page
- Friendly message for invalid routes or story slugs
- Link back to home

## Navigation

- Minimal header: project name (links to home) + link to About
- No footer in MVP — keep it clean
- On the story view: header can be hidden/minimal to maximize immersion

## Story Data Model (MDX)

Each story is an MDX file in `/content/stories/`:

```mdx
---
title: "The Stranger on the Train"
author: "Anonymous"
date: "2026-03-16"
tags: ["gratitude", "kindness"]
---

Story body text here...
```

### Fields
- `title` (string, required) — story title
- `author` (string, required) — author name or "Anonymous"
- `date` (string, required) — publication date (ISO format)
- `tags` (string[], optional) — thematic tags (e.g., "gratitude", "family", "friendship")

### Slug Convention
The slug is derived from the MDX filename without extension: `the-stranger-on-the-train.mdx` maps to `/story/the-stranger-on-the-train`.

### Content Length
Recommended: 200–800 words per story. Short enough to read in 2–3 minutes, long enough to be meaningful.

## Daily Rotation

- Each day, 2 stories are deterministically selected based on the current date (UTC)
- Algorithm: compute a day index from the UTC date (days since epoch). Use `(dayIndex * 2) % totalStories` and `(dayIndex * 2 + 1) % totalStories` to pick 2 stories from the alphabetically sorted pool. This ensures deterministic, reproducible selection across all clients.
- When the pool is exhausted, stories recycle from the beginning
- Minimum content requirement: at least 2 stories must exist for the app to function. If fewer exist, show all available stories.
- No backend needed — pure logic based on UTC date + total story count

## Design

### Visual Style
- Minimalist neutral — clean white background
- Focus entirely on typography and content
- Large, readable serif or sans-serif font for story body
- Generous margins and line-height
- Subtle Framer Motion transitions between stories (fade or slide)

### Responsive
- Mobile-first — this is the kind of thing people read on their phone
- Desktop: constrained content width (max ~680px centered)

### Accessibility
- Semantic HTML (article, header, nav, main)
- Proper heading hierarchy
- Sufficient color contrast for readability

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Content | MDX files in `/content/stories/` |
| Deploy | Vercel (free tier) |
| Package Manager | pnpm |
| Linting | Biome |

## Content Pipeline

### Phase 1 (MVP — now)
- Stories are curated and added manually as MDX files by the project owner
- No submission system, no auth, no database

### Phase 2 (future, not implemented now)
- Open submissions with automatic moderation via Claude API
- Stories evaluated for: emotional relevance, spam detection, alignment with project purpose
- Approved stories published; rejected stories flagged for manual review

### Phase 3 (future, not implemented now)
- ElevenLabs integration for automatic narration of each story (if cost-effective)
- Multi-language support (next-intl, Claude API for translation)
- Custom domain and branding

## Language

- English only for MVP
- Spanish and other languages as future additions

## Out of Scope (MVP)

- Authentication
- Database
- User submissions
- Audio narration
- Multi-language
- Analytics
- SEO optimization beyond basics (basic OG tags per story are included)
- Comments or social features
