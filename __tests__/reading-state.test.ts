import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetForTesting,
	canReadMore,
	getReadingState,
	getReadToday,
	markAsRead,
	recycleIfNeeded,
	resetIfNewDay,
} from "@/lib/reading-state";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

function todayUTC(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

describe("reading-state", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.stubGlobal("localStorage", localStorageMock);
		_resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getReadingState", () => {
		it("returns empty state when localStorage is empty", () => {
			const state = getReadingState();
			expect(state.date).toBe(todayUTC());
			expect(state.slugs).toEqual([]);
		});

		it("returns stored state when localStorage has data for today", () => {
			const today = todayUTC();
			localStorageMock.setItem(
				"hpv_read_today",
				JSON.stringify({ date: today, slugs: ["test-story"] }),
			);
			const state = getReadingState();
			expect(state.date).toBe(today);
			expect(state.slugs).toEqual(["test-story"]);
		});

		it("resets state when localStorage has data for a different day", () => {
			localStorageMock.setItem(
				"hpv_read_today",
				JSON.stringify({ date: "2020-01-01", slugs: ["old-story"] }),
			);
			const state = getReadingState();
			expect(state.date).toBe(todayUTC());
			expect(state.slugs).toEqual([]);
		});
	});

	describe("markAsRead", () => {
		it("adds slug to today's reads", () => {
			markAsRead("test-story");
			const state = getReadingState();
			expect(state.slugs).toContain("test-story");
		});

		it("adds to history", () => {
			markAsRead("test-story");
			const history = JSON.parse(localStorageMock.getItem("hpv_read_history") ?? "[]");
			expect(history).toContain("test-story");
		});

		it("does not duplicate slugs in today's reads", () => {
			markAsRead("test-story");
			markAsRead("test-story");
			const state = getReadingState();
			expect(state.slugs.filter((s: string) => s === "test-story")).toHaveLength(1);
		});
	});

	describe("canReadMore", () => {
		it("returns true when no stories read today", () => {
			expect(canReadMore()).toBe(true);
		});

		it("returns true when 1 story read today", () => {
			markAsRead("story-1");
			expect(canReadMore()).toBe(true);
		});

		it("returns false when 2 stories read today", () => {
			markAsRead("story-1");
			markAsRead("story-2");
			expect(canReadMore()).toBe(false);
		});
	});

	describe("getReadToday", () => {
		it("returns empty array initially", () => {
			expect(getReadToday()).toEqual([]);
		});

		it("returns slugs read today", () => {
			markAsRead("story-1");
			markAsRead("story-2");
			expect(getReadToday()).toEqual(["story-1", "story-2"]);
		});
	});

	describe("resetIfNewDay", () => {
		it("resets when date has changed", () => {
			localStorageMock.setItem(
				"hpv_read_today",
				JSON.stringify({ date: "2020-01-01", slugs: ["old"] }),
			);
			resetIfNewDay();
			const state = getReadingState();
			expect(state.slugs).toEqual([]);
			expect(state.date).toBe(todayUTC());
		});

		it("does not reset when date is current", () => {
			markAsRead("today-story");
			resetIfNewDay();
			const state = getReadingState();
			expect(state.slugs).toContain("today-story");
		});
	});

	describe("recycleIfNeeded", () => {
		it("resets history when all stories have been read", () => {
			const allSlugs = ["story-a", "story-b", "story-c"];
			markAsRead("story-a");
			markAsRead("story-b");
			markAsRead("story-c");
			const historyBefore = JSON.parse(localStorageMock.getItem("hpv_read_history") ?? "[]");
			expect(historyBefore).toEqual(["story-a", "story-b", "story-c"]);

			recycleIfNeeded(allSlugs);
			const historyAfter = JSON.parse(localStorageMock.getItem("hpv_read_history") ?? "[]");
			expect(historyAfter).toEqual([]);
		});

		it("does not reset history when some stories are unread", () => {
			const allSlugs = ["story-a", "story-b", "story-c"];
			markAsRead("story-a");
			markAsRead("story-b");

			recycleIfNeeded(allSlugs);
			const history = JSON.parse(localStorageMock.getItem("hpv_read_history") ?? "[]");
			expect(history).toEqual(["story-a", "story-b"]);
		});

		it("does nothing for empty allSlugs", () => {
			markAsRead("story-a");
			recycleIfNeeded([]);
			const history = JSON.parse(localStorageMock.getItem("hpv_read_history") ?? "[]");
			expect(history).toEqual(["story-a"]);
		});
	});

	describe("in-memory fallback", () => {
		it("works when localStorage throws", () => {
			vi.stubGlobal("localStorage", {
				getItem: () => {
					throw new Error("SecurityError");
				},
				setItem: () => {
					throw new Error("SecurityError");
				},
				removeItem: () => {
					throw new Error("SecurityError");
				},
			});

			// Should not throw — falls back to in-memory
			expect(canReadMore()).toBe(true);
			markAsRead("story-1");
			expect(getReadToday()).toContain("story-1");
			expect(canReadMore()).toBe(true);
			markAsRead("story-2");
			expect(canReadMore()).toBe(false);
		});
	});
});
