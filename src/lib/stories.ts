import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Story, StoryMeta } from "./types";

const STORIES_DIR = path.join(process.cwd(), "content", "stories");
const MDX_EXTENSION_REGEX = /\.mdx$/;

export function parseStoryFile(raw: string, slug: string): Story {
	const { data, content } = matter(raw);
	return {
		author: data.author,
		content: content.trim(),
		date: data.date,
		nudge: data.nudge,
		slug,
		tags: data.tags ?? [],
		tallyId: data.tallyId,
		title: data.title,
	};
}

export function getAllStorySlugs(dir: string = STORIES_DIR): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".mdx"))
		.map((f) => f.replace(MDX_EXTENSION_REGEX, ""))
		.sort();
}

/** Reads and parses every story in `dir`. A single malformed MDX file (e.g.
 * broken frontmatter from a bad ingestion) is skipped — logged and excluded
 * — rather than throwing and taking down every page that lists stories. */
export function getAllStories(dir: string = STORIES_DIR): Story[] {
	const slugs = getAllStorySlugs(dir);
	const stories: Story[] = [];
	for (const slug of slugs) {
		const filePath = path.join(dir, `${slug}.mdx`);
		try {
			const raw = fs.readFileSync(filePath, "utf-8");
			stories.push(parseStoryFile(raw, slug));
		} catch (error) {
			console.error(`Skipping malformed story file: ${filePath}`, error);
		}
	}
	return stories;
}

export function getStoryBySlug(slug: string, dir: string = STORIES_DIR): Story | null {
	const filePath = path.join(dir, `${slug}.mdx`);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	const raw = fs.readFileSync(filePath, "utf-8");
	return parseStoryFile(raw, slug);
}

export function getAllStoryMeta(dir: string = STORIES_DIR): StoryMeta[] {
	return getAllStories(dir).map(({ content, ...meta }) => meta);
}
