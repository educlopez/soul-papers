import { describe, expect, it } from "vitest";
import { getMadridDay, getMadridDayIndex } from "@/lib/time";

describe("getMadridDay", () => {
	it("returns YYYY-MM-DD for a plain UTC noon timestamp", () => {
		// Noon UTC is unambiguous in both CET (+1) and CEST (+2)
		expect(getMadridDay(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01-15");
		expect(getMadridDay(new Date("2026-07-06T12:00:00Z"))).toBe("2026-07-06");
	});

	it("rolls over to the next Madrid day during CET (winter, UTC+1)", () => {
		// 23:30 UTC in January is 00:30 the next day in Madrid (CET = UTC+1)
		expect(getMadridDay(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
	});

	it("rolls over to the next Madrid day during CEST (summer, UTC+2)", () => {
		// 22:30 UTC in July is 00:30 the next day in Madrid (CEST = UTC+2)
		expect(getMadridDay(new Date("2026-07-06T22:30:00Z"))).toBe("2026-07-07");
	});

	it("does not roll over before the Madrid midnight boundary", () => {
		// 20:30 UTC in July is 22:30 in Madrid (CEST) — still the same day
		expect(getMadridDay(new Date("2026-07-06T20:30:00Z"))).toBe("2026-07-06");
	});
});

describe("getMadridDayIndex", () => {
	it("returns an integer", () => {
		expect(Number.isInteger(getMadridDayIndex(new Date("2026-01-15T12:00:00Z")))).toBe(true);
	});

	it("is monotonic — consecutive Madrid days differ by exactly 1", () => {
		const day1 = getMadridDayIndex(new Date("2026-01-15T12:00:00Z"));
		const day2 = getMadridDayIndex(new Date("2026-01-16T12:00:00Z"));
		expect(day2 - day1).toBe(1);
	});

	it("is stable across a DST transition (still +1 per Madrid day)", () => {
		// Spain's spring-forward in 2026 is 2026-03-29
		const before = getMadridDayIndex(new Date("2026-03-28T12:00:00Z"));
		const after = getMadridDayIndex(new Date("2026-03-29T12:00:00Z"));
		expect(after - before).toBe(1);
	});

	it("returns the same index for two timestamps on the same Madrid day", () => {
		const early = getMadridDayIndex(new Date("2026-07-06T05:00:00Z"));
		const late = getMadridDayIndex(new Date("2026-07-06T20:00:00Z"));
		expect(early).toBe(late);
	});
});
