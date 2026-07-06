import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCount, recordRead } from "@/lib/read-counter";

// Mock localStorage (same pattern as reading-state.test.ts)
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

describe("read-counter", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.stubGlobal("localStorage", localStorageMock);
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe("recordRead", () => {
		it("POSTs to the letter route on first read of a slug", () => {
			recordRead("a-letter-never-sent");

			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith(
				"/api/letters/a-letter-never-sent",
				expect.objectContaining({ method: "POST", keepalive: true }),
			);
		});

		it("does not POST again for the same slug on a subsequent call (once per visitor per letter)", () => {
			recordRead("a-letter-never-sent");
			recordRead("a-letter-never-sent");

			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it("POSTs independently for a different slug", () => {
			recordRead("a-letter-never-sent");
			recordRead("the-garden-in-winter");

			expect(fetch).toHaveBeenCalledTimes(2);
		});

		it("persists the counted-set across calls via localStorage", () => {
			recordRead("a-letter-never-sent");

			const raw = localStorageMock.getItem("hpv_counted");
			expect(raw).not.toBeNull();
			expect(JSON.parse(raw as string)).toContain("a-letter-never-sent");
		});

		it("never throws when localStorage is unavailable", () => {
			vi.stubGlobal("localStorage", {
				getItem: () => {
					throw new Error("SecurityError");
				},
				setItem: () => {
					throw new Error("SecurityError");
				},
			});

			expect(() => recordRead("a-letter-never-sent")).not.toThrow();
		});

		it("does not POST when localStorage is unavailable (fails closed against over-counting)", () => {
			const fetchMock = vi.fn(() => Promise.resolve());
			vi.stubGlobal("fetch", fetchMock);
			vi.stubGlobal("localStorage", {
				getItem: () => {
					throw new Error("SecurityError");
				},
				setItem: () => {
					throw new Error("SecurityError");
				},
			});

			recordRead("a-letter-never-sent");
			recordRead("a-letter-never-sent");

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("never throws when fetch rejects (fire-and-forget swallow)", () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() => Promise.reject(new Error("network down"))),
			);

			expect(() => recordRead("a-letter-never-sent")).not.toThrow();
		});

		it("never throws when fetch itself throws synchronously", () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() => {
					throw new Error("network down");
				}),
			);

			expect(() => recordRead("a-letter-never-sent")).not.toThrow();
		});
	});

	describe("fetchCount", () => {
		it("returns the count from a successful response", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() =>
					Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ count: 7 }),
					}),
				),
			);

			await expect(fetchCount("a-letter-never-sent")).resolves.toBe(7);
			expect(fetch).toHaveBeenCalledWith("/api/letters/a-letter-never-sent");
		});

		it("returns null when the response is not ok", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() =>
					Promise.resolve({
						ok: false,
						json: () => Promise.resolve({ count: null }),
					}),
				),
			);

			await expect(fetchCount("a-letter-never-sent")).resolves.toBeNull();
		});

		it("returns null when the payload count is not a number", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() =>
					Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ count: null }),
					}),
				),
			);

			await expect(fetchCount("a-letter-never-sent")).resolves.toBeNull();
		});

		it("returns null when fetch rejects, without throwing", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(() => Promise.reject(new Error("network down"))),
			);

			await expect(fetchCount("a-letter-never-sent")).resolves.toBeNull();
		});
	});
});
