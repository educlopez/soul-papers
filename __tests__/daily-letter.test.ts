import { describe, expect, it } from "vitest";
import { getArchiveLetters, resolveTodaysLetter } from "@/lib/daily-letter";
import type { Story } from "@/lib/types";

function makeStory(overrides: Partial<Story>): Story {
	return {
		author: "Anonymous",
		content: "Body.",
		date: "2026-01-01",
		slug: "untitled",
		tags: [],
		title: "Untitled",
		...overrides,
	};
}

const now = new Date("2026-07-06T12:00:00Z"); // Madrid day: 2026-07-06

describe("resolveTodaysLetter", () => {
	it("returns the letter dated exactly today when one exists", () => {
		const stories = [
			makeStory({ date: "2026-06-01", slug: "past-one" }),
			makeStory({ date: "2026-07-06", slug: "today-letter" }),
			makeStory({ date: "2026-05-01", slug: "past-two" }),
		];
		expect(resolveTodaysLetter(stories, now)?.slug).toBe("today-letter");
	});

	it("falls back to a deterministic pick from the eligible (past-dated) pool when no letter matches today", () => {
		const stories = [
			makeStory({ date: "2026-03-01", slug: "a" }),
			makeStory({ date: "2026-03-10", slug: "b" }),
			makeStory({ date: "2026-03-05", slug: "c" }),
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
			makeStory({ date: "2026-03-01", slug: "past" }),
			makeStory({ date: "2099-01-01", slug: "future" }),
		];
		// Run many "days" to make sure modulo rotation never lands on the future letter
		for (let i = 0; i < 30; i++) {
			const day = new Date(now.getTime() + i * 86_400_000);
			expect(resolveTodaysLetter(stories, day)?.slug).not.toBe("future");
		}
	});

	it("tiebreaks by slug when multiple letters share today's date", () => {
		const stories = [
			makeStory({ date: "2026-07-06", slug: "zeta" }),
			makeStory({ date: "2026-07-06", slug: "alpha" }),
		];
		expect(resolveTodaysLetter(stories, now)?.slug).toBe("alpha");
	});

	it("returns null when no eligible (non-future) letters exist", () => {
		const stories = [makeStory({ date: "2099-01-01", slug: "future" })];
		expect(resolveTodaysLetter(stories, now)).toBeNull();
	});
});

describe("getArchiveLetters", () => {
	it("excludes today's resolved letter and sorts the rest by date descending", () => {
		const stories = [
			makeStory({ date: "2026-07-06", slug: "today-letter" }),
			makeStory({ date: "2026-03-01", slug: "oldest" }),
			makeStory({ date: "2026-06-01", slug: "newest-past" }),
		];
		const archive = getArchiveLetters(stories, now);
		expect(archive.map((s) => s.slug)).toEqual(["newest-past", "oldest"]);
	});

	it("never includes future-dated letters", () => {
		const stories = [
			makeStory({ date: "2026-03-01", slug: "past" }),
			makeStory({ date: "2099-01-01", slug: "future" }),
		];
		const archive = getArchiveLetters(stories, now);
		expect(archive.map((s) => s.slug)).not.toContain("future");
	});
});
