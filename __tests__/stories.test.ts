import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllStorySlugs, parseStoryFile } from "@/lib/stories";

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
		const slugs = getAllStorySlugs(fixtureDir);
		expect(slugs).toContain("test-story");
	});

	it("ignores non-mdx files", () => {
		const slugs = getAllStorySlugs(fixtureDir);
		for (const slug of slugs) {
			expect(fs.existsSync(path.join(fixtureDir, `${slug}.mdx`))).toBe(true);
		}
	});
});
