import { getMadridDay, getMadridDayIndex } from "./time";
import type { Story } from "./types";

function byDateThenSlugAsc(a: Story, b: Story): number {
	if (a.date !== b.date) {
		return a.date < b.date ? -1 : 1;
	}
	return a.slug.localeCompare(b.slug);
}

function eligiblePool(stories: Story[], today: string): Story[] {
	return stories.filter((s) => s.date <= today);
}

/**
 * Resolves the single global letter for "today" (Europe/Madrid), identical
 * for every visitor regardless of their local timezone.
 *
 * - If a letter is dated exactly today, it wins (tiebreak by slug if several
 *   share the date).
 * - Otherwise, falls back to a deterministic pick from the eligible pool
 *   (date <= today) via a fixed-epoch day-index modulo, so the same day
 *   always yields the same letter and a future-dated letter is never shown.
 * - Returns null when there is no eligible (non-future) letter at all.
 */
export function resolveTodaysLetter(stories: Story[], now: Date = new Date()): Story | null {
	const today = getMadridDay(now);
	const eligible = eligiblePool(stories, today);
	if (eligible.length === 0) {
		return null;
	}

	const exactMatches = eligible.filter((s) => s.date === today);
	if (exactMatches.length > 0) {
		return [...exactMatches].sort((a, b) => a.slug.localeCompare(b.slug))[0];
	}

	const sorted = [...eligible].sort(byDateThenSlugAsc);
	const index = getMadridDayIndex(now) % sorted.length;
	return sorted[index];
}

/**
 * Past letters available to browse, excluding whichever letter is currently
 * resolved as "today's" ritual letter. Never includes future-dated letters.
 * Sorted newest-first.
 */
export function getArchiveLetters(stories: Story[], now: Date = new Date()): Story[] {
	const today = getMadridDay(now);
	const todaysLetter = resolveTodaysLetter(stories, now);
	return eligiblePool(stories, today)
		.filter((s) => s.slug !== todaysLetter?.slug)
		.sort((a, b) => {
			if (a.date === b.date) {
				return 0;
			}
			return a.date < b.date ? 1 : -1;
		});
}
