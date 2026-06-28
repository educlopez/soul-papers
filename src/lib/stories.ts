import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Story, StoryMeta } from "./types";

const STORIES_DIR = path.join(process.cwd(), "content", "stories");

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

export function getAllStorySlugs(dir: string = STORIES_DIR): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".mdx"))
		.map((f) => f.replace(/\.mdx$/, ""))
		.sort();
}

export function getAllStories(dir: string = STORIES_DIR): Story[] {
	const slugs = getAllStorySlugs(dir);
	return slugs.map((slug) => {
		const filePath = path.join(dir, `${slug}.mdx`);
		const raw = fs.readFileSync(filePath, "utf-8");
		return parseStoryFile(raw, slug);
	});
}

export function getStoryBySlug(slug: string, dir: string = STORIES_DIR): Story | null {
	const filePath = path.join(dir, `${slug}.mdx`);
	if (!fs.existsSync(filePath)) return null;
	const raw = fs.readFileSync(filePath, "utf-8");
	return parseStoryFile(raw, slug);
}

export function getAllStoryMeta(dir: string = STORIES_DIR): StoryMeta[] {
	return getAllStories(dir).map(({ content, ...meta }) => meta);
}
