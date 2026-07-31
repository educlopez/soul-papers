import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetForTesting,
	getArchiveHistory,
	hasReadToday,
	markArchiveRead,
	markTodayRead,
} from "@/lib/reading-state";
import { getMadridDay } from "@/lib/time";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] ?? null,
		removeItem: (key: string) => {
			delete store[key];
		},
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	};
})();

describe("reading-state", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.stubGlobal("localStorage", localStorageMock);
		_resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("hasReadToday", () => {
		it("returns false on first-ever visit (no prior localStorage entry)", () => {
			expect(hasReadToday("today-letter")).toBe(false);
		});

		it("returns true after markTodayRead for that slug", () => {
			markTodayRead("today-letter");
			expect(hasReadToday("today-letter")).toBe(true);
		});

		it("returns false for a different slug than the one marked read", () => {
			markTodayRead("today-letter");
			expect(hasReadToday("some-other-letter")).toBe(false);
		});

		it("resets to false when the stored Madrid day differs from today", () => {
			localStorageMock.setItem(
				"hpv_reading_state",
				JSON.stringify({ date: "2020-01-01", today: "old-letter", v: 2 })
			);
			expect(hasReadToday("old-letter")).toBe(false);
		});

		it("discards any non-v2 stored blob (pre-migration demo data)", () => {
			localStorageMock.setItem(
				"hpv_read_today",
				JSON.stringify({ date: getMadridDay(), slugs: ["demo-story"] })
			);
			localStorageMock.setItem(
				"hpv_reading_state",
				JSON.stringify({ date: getMadridDay(), slugs: ["demo-story"] }) // no v:2
			);
			expect(hasReadToday("demo-story")).toBe(false);
		});
	});

	describe("markTodayRead", () => {
		it("persists across calls to hasReadToday within the same Madrid day", () => {
			markTodayRead("letter-a");
			expect(hasReadToday("letter-a")).toBe(true);
			expect(hasReadToday("letter-a")).toBe(true);
		});

		it("overwrites the previously marked slug if called again with a different one", () => {
			markTodayRead("letter-a");
			markTodayRead("letter-b");
			expect(hasReadToday("letter-a")).toBe(false);
			expect(hasReadToday("letter-b")).toBe(true);
		});
	});

	describe("archive reads are exempt from the daily ritual state", () => {
		it("markArchiveRead does not affect hasReadToday for the ritual letter", () => {
			expect(hasReadToday("todays-letter")).toBe(false);
			markArchiveRead("some-past-letter");
			expect(hasReadToday("todays-letter")).toBe(false);
		});

		it("getArchiveHistory records archive reads", () => {
			markArchiveRead("past-one");
			markArchiveRead("past-two");
			expect(getArchiveHistory()).toEqual(["past-one", "past-two"]);
		});

		it("does not duplicate slugs in archive history", () => {
			markArchiveRead("past-one");
			markArchiveRead("past-one");
			expect(getArchiveHistory()).toEqual(["past-one"]);
		});
	});

	describe("in-memory fallback (localStorage unavailable)", () => {
		it("falls back to in-memory state without throwing", () => {
			vi.stubGlobal("localStorage", {
				getItem: () => {
					throw new Error("SecurityError");
				},
				removeItem: () => {
					throw new Error("SecurityError");
				},
				setItem: () => {
					throw new Error("SecurityError");
				},
			});

			expect(() => hasReadToday("story-1")).not.toThrow();
			expect(hasReadToday("story-1")).toBe(false);
			expect(() => markTodayRead("story-1")).not.toThrow();
			expect(hasReadToday("story-1")).toBe(true);
			expect(() => markArchiveRead("story-2")).not.toThrow();
			expect(getArchiveHistory()).toContain("story-2");
		});
	});
});
