import { describe, expect, it } from "vitest";
import { getNudge, NUDGES } from "@/lib/nudges";

describe("getNudge", () => {
	it("returns the story's nudge override when set", () => {
		expect(getNudge({ nudge: "Llama a tu hermana hoy." })).toBe("Llama a tu hermana hoy.");
	});

	it("returns a value from the warm pool when no override is set", () => {
		const nudge = getNudge({});
		expect(NUDGES).toContain(nudge);
	});

	it("returns a value from the pool when nudge is an empty string", () => {
		const nudge = getNudge({ nudge: "" });
		expect(NUDGES).toContain(nudge);
	});

	it("returns nudges from the pool over many iterations", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 200; i++) {
			seen.add(getNudge({}));
		}
		expect(seen.size).toBeGreaterThanOrEqual(2);
	});
});

describe("NUDGES", () => {
	it("has at least 5 nudges", () => {
		expect(NUDGES.length).toBeGreaterThanOrEqual(5);
	});

	it("all nudges are non-empty strings", () => {
		for (const n of NUDGES) {
			expect(typeof n).toBe("string");
			expect(n.length).toBeGreaterThan(0);
		}
	});
});
