const MADRID_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	day: "2-digit",
	month: "2-digit",
	timeZone: "Europe/Madrid",
	year: "numeric",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the current date in Europe/Madrid as YYYY-MM-DD, regardless of the
 * visitor's local timezone. This is the single source of "today" shared by
 * the server daily-letter resolver and the client reading-state.
 */
export function getMadridDay(now: Date = new Date()): string {
	// en-CA locale formats as YYYY-MM-DD
	return MADRID_DAY_FORMATTER.format(now);
}

/**
 * Returns a monotonically increasing integer day count anchored to a fixed
 * epoch, derived from the Europe/Madrid calendar day (not the raw UTC
 * timestamp). Used to seed the deterministic fallback rotation.
 */
export function getMadridDayIndex(now: Date = new Date()): number {
	const day = getMadridDay(now);
	return Math.floor(Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY);
}
