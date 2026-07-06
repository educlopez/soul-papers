import { describe, expect, it } from "vitest";
import { getArchiveLetters, resolveTodaysLetter } from "@/lib/daily-letter";
import type { Story } from "@/lib/types";

function makeStory(overrides: Partial<Story>): Story {
	return {
		title: "Untitled",
		author: "Anonymous",
		date: "2026-01-01",
		tags: [],
		slug: "untitled",
		content: "Body.",
		...overrides,
	};
}

const now = new Date("2026-07-06T12:00:00Z"); // Madrid day: 2026-07-06

describe("resolveTodaysLetter", () => {
	it("returns the letter dated exactly today when one exists", () => {
		const stories = [
			makeStory({ slug: "past-one", date: "2026-06-01" }),
			makeStory({ slug: "today-letter", date: "2026-07-06" }),
			makeStory({ slug: "past-two", date: "2026-05-01" }),
		];
		expect(resolveTodaysLetter(stories, now)?.slug).toBe("today-letter");
	});

	it("falls back to a deterministic pick from the eligible (past-dated) pool when no letter matches today", () => {
		const stories = [
			makeStory({ slug: "a", date: "2026-03-01" }),
			makeStory({ slug: "b", date: "2026-03-10" }),
			makeStory({ slug: "c", date: "2026-03-05" }),
		];
		const first = resolveTodaysLetter(stories, now);
		const second = resolveTodaysLetter(stories, now);
		expect(first).not.toBeNull();
		// Deterministic: same inputs -> same output every call
		expect(first?.slug).toBe(second?.slug);
		// Must be one of the eligible past letters, never invented
		expect(["a", "b", "c"]).toContain(first?.slug);
	});

	it("never selects a future-dated letter", () => {
		const stories = [
			makeStory({ slug: "past", date: "2026-03-01" }),
			makeStory({ slug: "future", date: "2099-01-01" }),
		];
		// Run many "days" to make sure modulo rotation never lands on the future letter
		for (let i = 0; i < 30; i++) {
			const day = new Date(now.getTime() + i * 86_400_000);
			expect(resolveTodaysLetter(stories, day)?.slug).not.toBe("future");
		}
	});

	it("tiebreaks by slug when multiple letters share today's date", () => {
		const stories = [
			makeStory({ slug: "zeta", date: "2026-07-06" }),
			makeStory({ slug: "alpha", date: "2026-07-06" }),
		];
		expect(resolveTodaysLetter(stories, now)?.slug).toBe("alpha");
	});

	it("returns null when no eligible (non-future) letters exist", () => {
		const stories = [makeStory({ slug: "future", date: "2099-01-01" })];
		expect(resolveTodaysLetter(stories, now)).toBeNull();
	});
});

describe("getArchiveLetters", () => {
	it("excludes today's resolved letter and sorts the rest by date descending", () => {
		const stories = [
			makeStory({ slug: "today-letter", date: "2026-07-06" }),
			makeStory({ slug: "oldest", date: "2026-03-01" }),
			makeStory({ slug: "newest-past", date: "2026-06-01" }),
		];
		const archive = getArchiveLetters(stories, now);
		expect(archive.map((s) => s.slug)).toEqual(["newest-past", "oldest"]);
	});

	it("never includes future-dated letters", () => {
		const stories = [
			makeStory({ slug: "past", date: "2026-03-01" }),
			makeStory({ slug: "future", date: "2099-01-01" }),
		];
		const archive = getArchiveLetters(stories, now);
		expect(archive.map((s) => s.slug)).not.toContain("future");
	});
});
