# Historia para Vivir — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** A minimalist daily story experience — two emotional stories per day, immersive full-screen reading, deterministic rotation based on UTC date.

**Architecture:** Next.js 16 App Router with static MDX content. No backend, no database. Stories stored as MDX files, parsed at build time. Daily rotation computed client-side via deterministic algorithm.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Framer Motion, MDX (@next/mdx + gray-matter + next-mdx-remote), pnpm, Biome

---

## File Map

All paths relative to `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/`.

```
historia-para-vivir/
├── content/
│   └── stories/
│       ├── the-stranger-on-the-train.mdx
│       ├── a-letter-never-sent.mdx
│       └── the-garden-in-winter.mdx
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: Inter font, metadata (no header)
│   │   ├── globals.css             # Tailwind CSS imports + custom styles
│   │   ├── (main)/
│   │   │   ├── layout.tsx          # Main layout: includes Header + pt-16 wrapper
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── about/
│   │   │   │   └── page.tsx        # About page
│   │   │   └── not-found.tsx       # 404 page
│   │   └── story/
│   │       └── [slug]/
│   │           ├── layout.tsx      # Story layout: no header, immersive
│   │           └── page.tsx        # Story view page (immersive)
│   ├── components/
│   │   ├── header.tsx              # Minimal nav header
│   │   ├── story-content.tsx       # MDX renderer component
│   │   ├── story-transition.tsx    # Framer Motion wrapper for story transitions
│   │   └── come-back-tomorrow.tsx  # Message shown after 2nd story
│   └── lib/
│       ├── stories.ts              # MDX parsing: getAllStories, getStoryBySlug
│       ├── daily-rotation.ts       # Deterministic daily story selection
│       └── types.ts                # Story type definitions
├── __tests__/
│   ├── daily-rotation.test.ts      # TDD tests for rotation logic
│   └── stories.test.ts             # TDD tests for MDX parsing
├── next.config.ts                  # Next.js config with MDX support
├── tsconfig.json                   # TypeScript config
├── biome.json                      # Biome linter config
├── package.json                    # Dependencies and scripts
├── pnpm-lock.yaml                  # Lock file (auto-generated)
└── .gitignore                      # Standard Next.js gitignore
```

### File Responsibilities

| File | Responsibility |
|------|---------------|
| `src/lib/types.ts` | `StoryMeta` and `Story` TypeScript interfaces |
| `src/lib/stories.ts` | Read MDX files from `content/stories/`, parse frontmatter with gray-matter, return typed story objects |
| `src/lib/daily-rotation.ts` | Given a date and list of story slugs, return today's 2 story slugs deterministically |
| `src/components/header.tsx` | Project name (link to `/`) + "About" link |
| `src/components/story-content.tsx` | Renders MDX content with `next-mdx-remote` |
| `src/components/story-transition.tsx` | Framer Motion `AnimatePresence` wrapper for page transitions |
| `src/components/come-back-tomorrow.tsx` | End-of-day message with gentle encouragement |
| `src/app/layout.tsx` | HTML shell, Inter font via next/font/google, global metadata (no header) |
| `src/app/(main)/layout.tsx` | Main route group layout: includes Header + `pt-16` content wrapper |
| `src/app/story/[slug]/layout.tsx` | Story-specific layout that omits the header for immersive reading |
| `src/app/(main)/page.tsx` | Welcome text + CTA button linking to first story of the day |
| `src/app/story/[slug]/page.tsx` | Full-screen story reader with next-story navigation |
| `src/app/(main)/about/page.tsx` | Project philosophy page |
| `src/app/(main)/not-found.tsx` | Friendly 404 |
| `content/stories/*.mdx` | Individual story files with frontmatter |

---

## Chunk 1: Project Scaffolding

### Step 1.1 — Initialize Next.js project

- [ ] Run the following from the project root:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint=false --app --src-dir --import-alias="@/*" --use-pnpm --turbopack
```

> **Expected:** Project files created. `package.json` exists with next, react, react-dom, typescript, tailwind.
> **Note:** If prompted about existing files, select "yes" to continue. The `docs/` folder will be preserved.

- [ ] Verify it works:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm dev
```

> **Expected:** Server starts at `http://localhost:3000`. Kill with Ctrl+C after verifying.

### Step 1.2 — Remove ESLint, install Biome

- [ ] Remove ESLint artifacts and install Biome:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
rm -f .eslintrc.json eslint.config.mjs
pnpm remove eslint eslint-config-next 2>/dev/null || true
pnpm add -D @biomejs/biome
```

- [ ] Create Biome config at `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "json": {
    "formatter": {
      "indentStyle": "space",
      "indentWidth": 2
    }
  }
}
```

- [ ] Add Biome scripts to `package.json`:

Add these to the `"scripts"` section in `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/package.json`:

```json
"lint": "biome check .",
"lint:fix": "biome check --fix .",
"format": "biome format --write ."
```

- [ ] Verify Biome works:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm lint
```

> **Expected:** Biome runs without crashing. May show warnings for default Next.js files — that's fine.

### Step 1.3 — Install additional dependencies

- [ ] Install all required packages:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm add framer-motion gray-matter next-mdx-remote
pnpm add -D @types/mdx
```

> **Expected:** All packages install successfully. `pnpm ls` shows them.

### Step 1.4 — Install Vitest for testing

- [ ] Install Vitest:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm add -D vitest
```

- [ ] Add test script to `package.json`:

Add to `"scripts"` in `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] Create Vitest config at `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		include: ["__tests__/**/*.test.ts"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
```

### Step 1.5 — Configure Tailwind CSS 4

- [ ] Replace the contents of `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Georgia", "Times New Roman", serif;
}

html {
  scroll-behavior: smooth;
}

body {
  @apply antialiased text-neutral-800 bg-white;
}

.prose {
  @apply max-w-none;
  @apply text-lg leading-relaxed;
  @apply text-neutral-700;
}

.prose p {
  @apply mb-6;
}

.prose h1 {
  @apply text-3xl font-bold mb-4 text-neutral-900;
}

.prose h2 {
  @apply text-2xl font-semibold mb-3 text-neutral-900;
}

.prose blockquote {
  @apply border-l-4 border-neutral-300 pl-4 italic text-neutral-600 my-6;
}

.prose em {
  @apply italic;
}

.prose strong {
  @apply font-semibold text-neutral-900;
}
```

### Step 1.6 — Update Next.js config

- [ ] Replace contents of `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	pageExtensions: ["ts", "tsx", "md", "mdx"],
};

export default nextConfig;
```

### Step 1.7 — Set up .gitignore

- [ ] Ensure `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/.gitignore` contains at minimum:

```
# dependencies
node_modules
.pnpm-store

# next.js
.next
out

# production
build

# misc
.DS_Store
*.pem

# env files
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### Step 1.8 — Create content directory

- [ ] Create the stories directory:

```bash
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/content/stories
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/__tests__
```

---

## Chunk 2: Type Definitions & Core Library (TDD)

### Step 2.1 — Define types

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/lib/types.ts`:

```ts
export interface StoryMeta {
	title: string;
	author: string;
	date: string;
	tags?: string[];
	slug: string;
}

export interface Story extends StoryMeta {
	content: string;
}
```

### Step 2.2 — TDD: Write daily rotation tests (RED)

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/__tests__/daily-rotation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getDailyStories } from "@/lib/daily-rotation";

const slugs = [
	"a-letter-never-sent",
	"the-garden-in-winter",
	"the-stranger-on-the-train",
];

describe("getDailyStories", () => {
	it("returns exactly 2 stories for a given date", () => {
		const result = getDailyStories(new Date("2026-03-16"), slugs);
		expect(result).toHaveLength(2);
	});

	it("returns the same stories for the same date (deterministic)", () => {
		const date = new Date("2026-03-16");
		const a = getDailyStories(date, slugs);
		const b = getDailyStories(date, slugs);
		expect(a).toEqual(b);
	});

	it("returns different stories for different dates", () => {
		const day1 = getDailyStories(new Date("2026-03-16"), slugs);
		const day2 = getDailyStories(new Date("2026-03-17"), slugs);
		// With 3 stories, consecutive days MUST differ
		expect(day1).not.toEqual(day2);
	});

	it("returns two distinct stories", () => {
		const result = getDailyStories(new Date("2026-03-16"), slugs);
		expect(result[0]).not.toEqual(result[1]);
	});

	it("handles pool smaller than 2 stories gracefully", () => {
		const single = getDailyStories(new Date("2026-03-16"), ["only-one"]);
		expect(single).toEqual(["only-one"]);
	});

	it("handles empty pool", () => {
		const empty = getDailyStories(new Date("2026-03-16"), []);
		expect(empty).toEqual([]);
	});

	it("wraps around when day index exceeds pool size", () => {
		// With 3 stories sorted alphabetically, test many dates to ensure no crash
		for (let i = 0; i < 100; i++) {
			const date = new Date(2026, 0, 1 + i);
			const result = getDailyStories(date, slugs);
			expect(result).toHaveLength(2);
			expect(slugs).toContain(result[0]);
			expect(slugs).toContain(result[1]);
		}
	});
});
```

- [ ] Run the test — it should FAIL:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm test
```

> **Expected:** Test fails with "Cannot find module '@/lib/daily-rotation'" or similar import error.

### Step 2.3 — Implement daily rotation (GREEN)

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/lib/daily-rotation.ts`:

```ts
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();
const MS_PER_DAY = 86_400_000;

/**
 * Returns today's story slugs based on deterministic rotation.
 * Algorithm: sort slugs alphabetically, compute day index from UTC date,
 * pick (dayIndex * 2) % total and (dayIndex * 2 + 1) % total.
 */
export function getDailyStories(date: Date, slugs: string[]): string[] {
	if (slugs.length === 0) return [];
	if (slugs.length === 1) return [slugs[0]];

	const sorted = [...slugs].sort();
	const total = sorted.length;
	const utcDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const dayIndex = Math.floor((utcDay - EPOCH) / MS_PER_DAY);

	const idx1 = ((dayIndex * 2) % total + total) % total;
	const idx2 = ((dayIndex * 2 + 1) % total + total) % total;

	return [sorted[idx1], sorted[idx2]];
}
```

- [ ] Run the test — it should PASS:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm test
```

> **Expected:** All 7 tests pass.

### Step 2.4 — TDD: Write story parsing tests (RED)

- [ ] Create a test fixture first. Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/__tests__/fixtures/test-story.mdx`:

```mdx
---
title: "Test Story"
author: "Test Author"
date: "2026-01-01"
tags: ["test"]
---

This is a test story body.

It has **bold** and *italic* text.
```

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/__tests__/stories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseStoryFile, getAllStorySlugs } from "@/lib/stories";
import path from "node:path";
import fs from "node:fs";

const fixtureDir = path.join(__dirname, "fixtures");
const fixtureFile = path.join(fixtureDir, "test-story.mdx");

describe("parseStoryFile", () => {
	it("parses frontmatter correctly", () => {
		const raw = fs.readFileSync(fixtureFile, "utf-8");
		const story = parseStoryFile(raw, "test-story");
		expect(story.title).toBe("Test Story");
		expect(story.author).toBe("Test Author");
		expect(story.date).toBe("2026-01-01");
		expect(story.tags).toEqual(["test"]);
		expect(story.slug).toBe("test-story");
	});

	it("extracts content body", () => {
		const raw = fs.readFileSync(fixtureFile, "utf-8");
		const story = parseStoryFile(raw, "test-story");
		expect(story.content).toContain("This is a test story body.");
		expect(story.content).toContain("**bold**");
	});
});

describe("getAllStorySlugs", () => {
	it("returns slugs from a directory of MDX files", () => {
		// We'll use the fixtures dir which has one .mdx file
		const slugs = getAllStorySlugs(fixtureDir);
		expect(slugs).toContain("test-story");
	});

	it("ignores non-mdx files", () => {
		const slugs = getAllStorySlugs(fixtureDir);
		// Only .mdx files should be included
		for (const slug of slugs) {
			expect(
				fs.existsSync(path.join(fixtureDir, `${slug}.mdx`))
			).toBe(true);
		}
	});
});
```

- [ ] Run the test — it should FAIL:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm test
```

> **Expected:** Fails with import error for `@/lib/stories`.

### Step 2.5 — Implement story parsing (GREEN)

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/lib/stories.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Story, StoryMeta } from "./types";

const STORIES_DIR = path.join(process.cwd(), "content", "stories");

/**
 * Parse a raw MDX file string into a Story object.
 */
export function parseStoryFile(raw: string, slug: string): Story {
	const { data, content } = matter(raw);
	return {
		title: data.title,
		author: data.author,
		date: data.date,
		tags: data.tags ?? [],
		slug,
		content: content.trim(),
	};
}

/**
 * Get all story slugs from a directory of .mdx files.
 */
export function getAllStorySlugs(dir: string = STORIES_DIR): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".mdx"))
		.map((f) => f.replace(/\.mdx$/, ""))
		.sort();
}

/**
 * Get all stories with full content.
 */
export function getAllStories(dir: string = STORIES_DIR): Story[] {
	const slugs = getAllStorySlugs(dir);
	return slugs.map((slug) => {
		const filePath = path.join(dir, `${slug}.mdx`);
		const raw = fs.readFileSync(filePath, "utf-8");
		return parseStoryFile(raw, slug);
	});
}

/**
 * Get a single story by slug.
 */
export function getStoryBySlug(
	slug: string,
	dir: string = STORIES_DIR,
): Story | null {
	const filePath = path.join(dir, `${slug}.mdx`);
	if (!fs.existsSync(filePath)) return null;
	const raw = fs.readFileSync(filePath, "utf-8");
	return parseStoryFile(raw, slug);
}

/**
 * Get metadata for all stories (without content).
 */
export function getAllStoryMeta(dir: string = STORIES_DIR): StoryMeta[] {
	return getAllStories(dir).map(({ content, ...meta }) => meta);
}
```

- [ ] Run the test — it should PASS:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm test
```

> **Expected:** All tests pass (rotation + stories).

---

## Chunk 3: Layout Shell & Components

### Step 3.1 — Create Header component

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/components/header.tsx`:

```tsx
import Link from "next/link";

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
			<nav className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
				<Link
					href="/"
					className="text-lg font-semibold text-neutral-900 hover:text-neutral-600 transition-colors"
				>
					Historia para Vivir
				</Link>
				<Link
					href="/about"
					className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
				>
					About
				</Link>
			</nav>
		</header>
	);
}
```

### Step 3.2 — Create StoryContent component

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/components/story-content.tsx`:

```tsx
import { MDXRemote } from "next-mdx-remote/rsc";

interface StoryContentProps {
	content: string;
	title: string;
	author: string;
}

export function StoryContent({ content, title, author }: StoryContentProps) {
	return (
		<article className="prose max-w-2xl mx-auto px-6">
			<header className="mb-12 text-center">
				<h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-4 leading-tight">
					{title}
				</h1>
				<p className="text-neutral-400 text-sm tracking-wide uppercase">
					by {author}
				</p>
			</header>
			<div className="font-serif text-xl leading-relaxed text-neutral-700">
				<MDXRemote source={content} />
			</div>
		</article>
	);
}
```

### Step 3.3 — Create StoryTransition component

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/components/story-transition.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StoryTransitionProps {
	children: ReactNode;
	slug: string;
}

export function StoryTransition({ children, slug }: StoryTransitionProps) {
	return (
		<motion.div
			key={slug}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}
```

### Step 3.4 — Create ComeBackTomorrow component

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/components/come-back-tomorrow.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function ComeBackTomorrow() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8, ease: "easeOut" }}
			className="min-h-screen flex items-center justify-center px-6"
		>
			<div className="text-center max-w-md">
				<p className="text-5xl mb-6">&#10024;</p>
				<h2 className="text-2xl font-serif font-bold text-neutral-900 mb-4">
					That&apos;s all for today
				</h2>
				<p className="text-neutral-500 text-lg leading-relaxed mb-8">
					Two stories, two moments of connection. Come back tomorrow for
					something new.
				</p>
				<Link
					href="/"
					className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
				>
					Back to Home
				</Link>
			</div>
		</motion.div>
	);
}
```

### Step 3.5 — Update Root Layout

- [ ] Replace the contents of `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: {
		default: "Historia para Vivir",
		template: "%s | Historia para Vivir",
	},
	description:
		"Two stories a day about the small things that change everything. Open a letter from a stranger.",
	openGraph: {
		title: "Historia para Vivir",
		description:
			"Two stories a day about the small things that change everything.",
		type: "website",
		locale: "en_US",
		siteName: "Historia para Vivir",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				{children}
			</body>
		</html>
	);
}
```

> **Note:** The Header is NOT included in the root layout. Story pages need an immersive, header-free experience. Instead, pages that need the header (Home, About, 404) include it directly via a `(main)` route group layout — see Step 3.5b.

### Step 3.5b — Create (main) route group layout with Header

The `(main)` route group wraps all non-story pages, providing the shared header.

- [ ] Create directory structure:

```bash
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/\(main\)
```

- [ ] Move `page.tsx`, `about/`, and `not-found.tsx` into `(main)/`:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app
mv page.tsx "(main)/page.tsx"
mv about "(main)/about"
mv not-found.tsx "(main)/not-found.tsx"
```

> **Note:** These moves happen after the files are created in Chunk 4. During implementation, create them directly inside `(main)/` instead.

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/(main)/layout.tsx`:

```tsx
import { Header } from "@/components/header";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Header />
			<main className="pt-16">{children}</main>
		</>
	);
}
```

---

## Chunk 4: Pages

### Step 4.1 — Home Page

- [ ] Create the `(main)` directory if it doesn't exist:

```bash
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/\(main\)
```

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/(main)/page.tsx` with:

```tsx
import Link from "next/link";
import { getAllStorySlugs } from "@/lib/stories";
import { getDailyStories } from "@/lib/daily-rotation";

export default function HomePage() {
	const allSlugs = getAllStorySlugs();
	const todayStories = getDailyStories(new Date(), allSlugs);
	const firstSlug = todayStories[0];

	return (
		<div className="min-h-screen flex items-center justify-center px-6">
			<div className="text-center max-w-lg">
				<h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-6 leading-tight">
					Historia para Vivir
				</h1>
				<p className="text-lg text-neutral-500 leading-relaxed mb-4">
					Two stories a day about the small things that change everything.
				</p>
				<p className="text-neutral-400 mb-10">
					Like opening a letter from a stranger who wanted to share something
					beautiful.
				</p>
				{firstSlug ? (
					<Link
						href={`/story/${firstSlug}`}
						className="inline-block px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-base font-medium"
					>
						Read Today&apos;s Stories
					</Link>
				) : (
					<p className="text-neutral-400 italic">
						Stories are coming soon...
					</p>
				)}
			</div>
		</div>
	);
}
```

### Step 4.2 — Story View Page

- [ ] Create directory:

```bash
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/story/\[slug\]
```

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/story/[slug]/layout.tsx`:

```tsx
export default function StoryLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div>{children}</div>;
}
```

> **Why:** The story route lives outside the `(main)` route group, so it inherits only the root layout (which has no header). This gives story pages a clean, immersive full-screen experience. The `(main)` route group layout (Step 3.5b) adds the Header for all other pages.

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/story/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getStoryBySlug, getAllStorySlugs } from "@/lib/stories";
import { getDailyStories } from "@/lib/daily-rotation";
import { StoryContent } from "@/components/story-content";
import { StoryTransition } from "@/components/story-transition";
import { ComeBackTomorrow } from "@/components/come-back-tomorrow";

interface StoryPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({
	params,
}: StoryPageProps): Promise<Metadata> {
	const { slug } = await params;
	const story = getStoryBySlug(slug);
	if (!story) return { title: "Story Not Found" };

	return {
		title: story.title,
		description: `A story by ${story.author} — Historia para Vivir`,
		openGraph: {
			title: story.title,
			description: `A story by ${story.author}`,
			type: "article",
		},
	};
}

export function generateStaticParams() {
	const slugs = getAllStorySlugs();
	return slugs.map((slug) => ({ slug }));
}

export default async function StoryPage({ params }: StoryPageProps) {
	const { slug } = await params;
	const story = getStoryBySlug(slug);
	if (!story) notFound();

	const allSlugs = getAllStorySlugs();
	const todayStories = getDailyStories(new Date(), allSlugs);

	// Determine position: is this story the first or second of today?
	const currentIndex = todayStories.indexOf(slug);
	const isLastStory = currentIndex === 1 || currentIndex === -1;
	const nextSlug = currentIndex === 0 ? todayStories[1] : null;

	return (
		<div className="min-h-screen py-16 md:py-24">
			<StoryTransition slug={slug}>
				<StoryContent
					content={story.content}
					title={story.title}
					author={story.author}
				/>

				<div className="max-w-2xl mx-auto px-6 mt-16 mb-12">
					{nextSlug ? (
						<div className="text-center">
							<Link
								href={`/story/${nextSlug}`}
								className="inline-block px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-base font-medium"
							>
								Next Story
							</Link>
						</div>
					) : isLastStory ? (
						<ComeBackTomorrow />
					) : (
						<div className="text-center">
							<Link
								href="/"
								className="text-neutral-400 hover:text-neutral-600 transition-colors text-sm"
							>
								&larr; Back to Home
							</Link>
						</div>
					)}
				</div>
			</StoryTransition>
		</div>
	);
}
```

### Step 4.4 — About Page

- [ ] Create directory:

```bash
mkdir -p /Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/\(main\)/about
```

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/(main)/about/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "About",
	description: "What Historia para Vivir is and why it exists.",
};

export default function AboutPage() {
	return (
		<div className="min-h-screen py-16 md:py-24">
			<div className="max-w-2xl mx-auto px-6">
				<h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-8 leading-tight">
					About
				</h1>

				<div className="space-y-6 text-lg text-neutral-600 leading-relaxed font-serif">
					<p>
						<strong className="text-neutral-900">Historia para Vivir</strong>{" "}
						is a collection of real stories about the small things that changed
						someone&apos;s life or perspective.
					</p>

					<p>
						Every day, two stories are selected for you. That&apos;s it. No
						infinite scroll, no algorithm chasing engagement. Just two moments
						of human connection.
					</p>

					<p>
						The stories are short — something you can read in two or three
						minutes. They&apos;re about gratitude, kindness, loss, surprise,
						love, and all the tiny moments we tend to overlook.
					</p>

					<p>
						Think of it as opening a personal letter from a stranger who wanted
						to share something beautiful with you.
					</p>

					<p className="text-neutral-400 text-base italic">
						Because sometimes the smallest things take up the most room in your
						heart.
					</p>
				</div>
			</div>
		</div>
	);
}
```

### Step 4.5 — 404 Page

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/src/app/(main)/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center px-6">
			<div className="text-center max-w-md">
				<h1 className="text-6xl font-serif font-bold text-neutral-200 mb-4">
					404
				</h1>
				<h2 className="text-xl font-semibold text-neutral-900 mb-4">
					Story not found
				</h2>
				<p className="text-neutral-500 mb-8">
					This story doesn&apos;t exist — but there are others waiting for you.
				</p>
				<Link
					href="/"
					className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
				>
					Go Home
				</Link>
			</div>
		</div>
	);
}
```

---

## Chunk 5: Sample Stories & Final Verification

### Step 5.1 — Create sample story 1

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/content/stories/the-stranger-on-the-train.mdx`:

```mdx
---
title: "The Stranger on the Train"
author: "Anonymous"
date: "2026-03-01"
tags: ["kindness", "gratitude"]
---

I was twenty-three and convinced the world owed me nothing good. I had just lost my job, my apartment lease was ending in two weeks, and I was riding the last train home with a bag of groceries I could barely afford.

Somewhere around the fourth stop, an older woman sat down across from me. She was carrying a small cloth bag and wore a coat that had clearly seen many winters. She looked at me — not through me, the way most people do on trains — but *at* me.

"You look like you're carrying something heavy," she said.

I laughed, holding up my grocery bag. "Just dinner."

She smiled. "That's not what I meant."

I don't know why, but I told her everything. The job. The apartment. The feeling that I was falling behind everyone I knew. She listened without interrupting, nodding occasionally, her hands folded over her cloth bag.

When I finished, she reached into her bag and pulled out a small, wrapped candy — the kind your grandmother might keep in a jar by the door.

"I can't fix any of that," she said, handing it to me. "But I can tell you that twenty years ago, I was sitting exactly where you are. Same train, same kind of night. And someone gave me one of these."

She stood up as the train slowed.

"It got better," she said. "It always does, if you let it."

I never saw her again. But I kept that candy wrapper in my wallet for years. Not because it was magic. Because someone, for three minutes on a Tuesday night, decided I was worth stopping for.

That was enough.
```

### Step 5.2 — Create sample story 2

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/content/stories/a-letter-never-sent.mdx`:

```mdx
---
title: "A Letter Never Sent"
author: "Maria L."
date: "2026-03-05"
tags: ["family", "forgiveness"]
---

My father and I didn't speak for seven years. It started over something so small I can barely remember it now — a comment at dinner, a door slammed too hard, and then silence that calcified into something neither of us knew how to break.

During those years, I wrote him letters. Dozens of them. I'd sit at my kitchen table on Sunday mornings, coffee going cold, and write everything I couldn't say out loud. About my new apartment. About the promotion. About the way autumn in the city reminded me of raking leaves together when I was small.

I never sent a single one.

Then one October morning, I got a call from my mother. He was in the hospital. Something with his heart.

I drove four hours without stopping. When I walked into his room, he was sitting up in bed, smaller than I remembered, wearing a hospital gown that made him look like someone else's father.

He looked at me and said: "I was going to call you tomorrow."

"You always say tomorrow," I whispered.

"I know," he said. And then, quieter: "I'm sorry."

Two words. Seven years dissolved in two words.

I sat beside his bed and we talked for hours — about nothing, about everything. At some point, he fell asleep mid-sentence, and I just sat there listening to the beep of the monitor, grateful for the most mundane sound in the world.

He recovered. We talk every Sunday now. I still write him letters sometimes, but now I send them.

The thing about forgiveness is that it doesn't require anyone to be right. It just requires someone to be brave enough to go first.
```

### Step 5.3 — Create sample story 3

- [ ] Create `/Users/eduardocalvolopez/Developer/local/historia-para-vivir/content/stories/the-garden-in-winter.mdx`:

```mdx
---
title: "The Garden in Winter"
author: "James K."
date: "2026-03-10"
tags: ["patience", "hope"]
---

When my wife passed, the first thing I stopped doing was tending the garden. It had been her domain — the roses, the herbs, the stubborn patch of lavender she talked to like a friend. I couldn't look at it without seeing her kneeling in the dirt, sun hat crooked, hands covered in soil, laughing at something only the plants seemed to understand.

So I let it go. Through summer, through fall, into winter. The weeds took over. The roses went wild. The lavender, against all odds, survived.

My neighbor's daughter, maybe eight or nine, started appearing at the fence every few days. She'd peer through the slats and ask questions.

"Why don't you water the flowers?"

"Are those roses dead?"

"My mom says gardens need love. Do you still love it?"

Kids don't know they're being profound. They just ask what they see.

One Saturday in February — cold, gray, unremarkable — she appeared at the fence again, this time holding a small pot with a single green shoot.

"It's a sunflower," she said. "You just put it in the dirt and wait."

I took the pot. I meant to set it on the porch and forget about it. Instead, I found myself outside with a spade, clearing a small patch near the lavender. Just enough room for one sunflower.

I watered it that evening. And the next. And the next.

By spring, I was on my knees in the dirt again. Not because the grief was gone — it wasn't. But because something in me remembered that growing things is what we do when we don't know what else to do.

The sunflower bloomed in June. It was enormous — almost absurdly tall, leaning slightly, bright yellow against the fence.

The girl clapped when she saw it.

"See?" she said. "It just needed someone to start."

She was right. Most things do.
```

### Step 5.4 — Remove default Next.js boilerplate

- [ ] Delete any leftover default Next.js files that are no longer needed:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
rm -f src/app/favicon.ico public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg 2>/dev/null || true
```

> **Note:** Keep `public/` directory. We'll leave favicon handling for later.

### Step 5.5 — Run all tests

- [ ] Verify all tests still pass:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm test
```

> **Expected:** All tests pass (daily rotation + story parsing).

### Step 5.6 — Run Biome

- [ ] Lint and format the project:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm lint:fix
```

> **Expected:** Biome fixes any formatting issues. No errors.

### Step 5.7 — Build the project

- [ ] Verify the project builds:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm build
```

> **Expected:** Build succeeds. Static pages generated for `/`, `/about`, `/story/[slug]` for each story.

### Step 5.8 — Visual verification

- [ ] Start the dev server and check each page:

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
pnpm dev
```

Verify in browser:
- `http://localhost:3000` — Home page with CTA button
- `http://localhost:3000/about` — About page with project philosophy
- Click "Read Today's Stories" — should navigate to a story
- Click "Next Story" — should navigate to second story
- After second story — should show "come back tomorrow" message
- `http://localhost:3000/story/nonexistent` — should show 404

> **Expected:** All pages render correctly with clean typography, transitions work.

### Step 5.9 — Initialize git repository

- [ ] Initialize git and make first commit (wait for user to confirm):

```bash
cd /Users/eduardocalvolopez/Developer/local/historia-para-vivir
git init
git add \
  .gitignore \
  biome.json \
  next.config.ts \
  package.json \
  pnpm-lock.yaml \
  tsconfig.json \
  vitest.config.ts \
  content/stories/ \
  src/app/ \
  src/components/ \
  src/lib/ \
  __tests__/
```

> **Note:** Do NOT commit yet. Wait for explicit user instruction.

---

## Summary Checklist

| Concern | Status |
|---------|--------|
| Next.js 16 App Router | Chunk 1 |
| TypeScript | Chunk 1 |
| Tailwind CSS 4 | Chunk 1 |
| Biome (linter/formatter) | Chunk 1 |
| Framer Motion | Chunk 3 |
| Type definitions | Chunk 2 |
| Daily rotation (TDD) | Chunk 2 |
| MDX parsing (TDD) | Chunk 2 |
| Layout shell + header | Chunk 3 |
| Home page | Chunk 4 |
| Story view page | Chunk 4 |
| About page | Chunk 4 |
| 404 page | Chunk 4 |
| OG tags / metadata | Chunks 3-4 |
| 3 sample stories | Chunk 5 |
| Framer Motion transitions | Chunk 3 |
| Build verification | Chunk 5 |
