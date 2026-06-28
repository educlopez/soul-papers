import { describe, expect, it } from "vitest";
import { getRandomQuote, QUOTES } from "@/lib/quotes";

describe("getRandomQuote", () => {
	it("returns a string", () => {
		const quote = getRandomQuote();
		expect(typeof quote).toBe("string");
	});

	it("returns a quote from the pool", () => {
		const quote = getRandomQuote();
		expect(QUOTES).toContain(quote);
	});

	it("returns quotes from the pool over many iterations", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 200; i++) {
			seen.add(getRandomQuote());
		}
		// Should have seen at least 2 different quotes
		expect(seen.size).toBeGreaterThanOrEqual(2);
	});
});

describe("QUOTES", () => {
	it("has at least 5 quotes", () => {
		expect(QUOTES.length).toBeGreaterThanOrEqual(5);
	});

	it("all quotes are non-empty strings", () => {
		for (const q of QUOTES) {
			expect(typeof q).toBe("string");
			expect(q.length).toBeGreaterThan(0);
		}
	});
});
