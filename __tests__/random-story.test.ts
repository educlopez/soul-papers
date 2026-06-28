import { describe, expect, it } from "vitest";
import { getRandomStory } from "@/lib/random-story";

const allSlugs = ["a-letter-never-sent", "the-garden-in-winter", "the-stranger-on-the-train"];

describe("getRandomStory", () => {
	it("returns a slug from the pool", () => {
		const result = getRandomStory(allSlugs, []);
		expect(allSlugs).toContain(result);
	});

	it("excludes already-read slugs", () => {
		const exclude = ["a-letter-never-sent", "the-garden-in-winter"];
		const result = getRandomStory(allSlugs, exclude);
		expect(result).toBe("the-stranger-on-the-train");
	});

	it("returns null when all slugs are excluded", () => {
		const result = getRandomStory(allSlugs, allSlugs);
		expect(result).toBeNull();
	});

	it("returns null for empty pool", () => {
		const result = getRandomStory([], []);
		expect(result).toBeNull();
	});

	it("returns the only available slug when one remains", () => {
		const result = getRandomStory(allSlugs, ["a-letter-never-sent", "the-stranger-on-the-train"]);
		expect(result).toBe("the-garden-in-winter");
	});

	it("never returns an excluded slug over many iterations", () => {
		const exclude = ["a-letter-never-sent"];
		const results = new Set<string | null>();
		for (let i = 0; i < 100; i++) {
			results.add(getRandomStory(allSlugs, exclude));
		}
		expect(results.has("a-letter-never-sent")).toBe(false);
	});
});
