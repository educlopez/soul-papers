import { getMadridDay } from "./time";

const STATE_KEY = "hpv_reading_state";
const ARCHIVE_KEY = "hpv_archive_history";
const SCHEMA_VERSION = 2;

interface ReadingStateV2 {
	date: string;
	/** Slug of today's ritual letter once read, or null if unread today. */
	today: string | null;
	v: 2;
}

// In-memory fallback when localStorage is unavailable
let memoryState: ReadingStateV2 = freshStateFor(getMadridDay());
let memoryArchive: string[] = [];
let useMemory = false;

function freshStateFor(date: string): ReadingStateV2 {
	return { date, today: null, v: SCHEMA_VERSION };
}

function tryGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		useMemory = true;
		return null;
	}
}

function trySetItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		useMemory = true;
	}
}

function isValidV2(value: unknown): value is ReadingStateV2 {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<ReadingStateV2>;
	return (
		candidate.v === SCHEMA_VERSION &&
		typeof candidate.date === "string" &&
		(candidate.today === null || typeof candidate.today === "string")
	);
}

function loadState(): ReadingStateV2 {
	const today = getMadridDay();

	if (useMemory) {
		if (memoryState.date !== today) {
			memoryState = freshStateFor(today);
		}
		return memoryState;
	}

	const raw = tryGetItem(STATE_KEY);
	if (!raw) {
		return freshStateFor(today);
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isValidV2(parsed) || parsed.date !== today) {
			return freshStateFor(today);
		}
		return parsed;
	} catch {
		return freshStateFor(today);
	}
}

function saveState(state: ReadingStateV2): void {
	if (useMemory) {
		memoryState = state;
		return;
	}
	trySetItem(STATE_KEY, JSON.stringify(state));
}

/**
 * Whether the visitor has already read today's (Madrid) ritual letter,
 * identified by slug. Replaces the old daily-cap counter.
 */
export function hasReadToday(slug: string): boolean {
	return loadState().today === slug;
}

/** Marks today's ritual letter as read for the current Madrid day. */
export function markTodayRead(slug: string): void {
	const state = loadState();
	saveState({ ...state, today: slug });
}

/**
 * Records that a past (archive) letter was read. Deliberately independent of
 * `hasReadToday` — browsing the archive never affects the daily ritual state.
 */
export function markArchiveRead(slug: string): void {
	if (useMemory) {
		if (!memoryArchive.includes(slug)) {
			memoryArchive.push(slug);
		}
		return;
	}

	const raw = tryGetItem(ARCHIVE_KEY);
	const history: string[] = raw ? JSON.parse(raw) : [];
	if (!history.includes(slug)) {
		history.push(slug);
		trySetItem(ARCHIVE_KEY, JSON.stringify(history));
	}
}

/** Returns the list of archive letter slugs the visitor has opened. */
export function getArchiveHistory(): string[] {
	if (useMemory) {
		return [...memoryArchive];
	}
	const raw = tryGetItem(ARCHIVE_KEY);
	return raw ? JSON.parse(raw) : [];
}

/**
 * Resets the in-memory fallback state. Exported for testing only.
 */
export function _resetForTesting(): void {
	memoryState = freshStateFor(getMadridDay());
	memoryArchive = [];
	useMemory = false;
}
