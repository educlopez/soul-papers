import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllStories, getAllStorySlugs, parseStoryFile } from "@/lib/stories";

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

	it("reads optional nudge and tallyId frontmatter fields when present", () => {
		const raw = [
			"---",
			'title: "Overridden Nudge"',
			'author: "Test Author"',
			'date: "2026-01-02"',
			'nudge: "Llama a tu hermana hoy."',
			'tallyId: "abc123"',
			"---",
			"",
			"Body text.",
		].join("\n");
		const story = parseStoryFile(raw, "overridden-nudge");
		expect(story.nudge).toBe("Llama a tu hermana hoy.");
		expect(story.tallyId).toBe("abc123");
	});

	it("leaves nudge and tallyId undefined when absent from frontmatter", () => {
		const raw = fs.readFileSync(fixtureFile, "utf-8");
		const story = parseStoryFile(raw, "test-story");
		expect(story.nudge).toBeUndefined();
		expect(story.tallyId).toBeUndefined();
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

describe("getAllStories", () => {
	let corruptDir: string;

	beforeEach(() => {
		corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), "soul-papers-stories-"));
		fs.writeFileSync(
			path.join(corruptDir, "good-letter.mdx"),
			[
				"---",
				'title: "Good Letter"',
				'author: "Someone"',
				'date: "2026-01-01"',
				"---",
				"",
				"Body.",
			].join("\n"),
		);
		// Unclosed double-quoted YAML scalar — gray-matter/js-yaml throws on parse.
		fs.writeFileSync(
			path.join(corruptDir, "bad-letter.mdx"),
			["---", 'title: "Broken', 'author: "Someone"', "---", "", "Body."].join("\n"),
		);
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		fs.rmSync(corruptDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it("skips a malformed MDX file, logs its filename, and still returns the good stories", () => {
		let stories: ReturnType<typeof getAllStories> = [];
		expect(() => {
			stories = getAllStories(corruptDir);
		}).not.toThrow();

		expect(stories).toHaveLength(1);
		expect(stories[0].title).toBe("Good Letter");
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("bad-letter.mdx"),
			expect.anything(),
		);
	});
});
