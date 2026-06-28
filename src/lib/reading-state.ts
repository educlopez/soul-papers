const DAILY_KEY = "hpv_read_today";
const HISTORY_KEY = "hpv_read_history";
const MAX_DAILY_READS = 999; // TODO: restore to 2 after demo

export interface ReadingState {
	date: string;
	slugs: string[];
}

// In-memory fallback when localStorage is unavailable
let memoryState: ReadingState = { date: getTodayUTC(), slugs: [] };
let memoryHistory: string[] = [];
let useMemory = false;

function getTodayUTC(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
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

export function getReadingState(): ReadingState {
	if (useMemory) {
		if (memoryState.date !== getTodayUTC()) {
			memoryState = { date: getTodayUTC(), slugs: [] };
		}
		return { ...memoryState };
	}

	const raw = tryGetItem(DAILY_KEY);
	if (!raw) {
		const fresh: ReadingState = { date: getTodayUTC(), slugs: [] };
		trySetItem(DAILY_KEY, JSON.stringify(fresh));
		return fresh;
	}

	try {
		const parsed: ReadingState = JSON.parse(raw);
		if (parsed.date !== getTodayUTC()) {
			const fresh: ReadingState = { date: getTodayUTC(), slugs: [] };
			trySetItem(DAILY_KEY, JSON.stringify(fresh));
			return fresh;
		}
		return parsed;
	} catch {
		const fresh: ReadingState = { date: getTodayUTC(), slugs: [] };
		trySetItem(DAILY_KEY, JSON.stringify(fresh));
		return fresh;
	}
}

export function markAsRead(slug: string, allSlugs?: string[]): void {
	const state = getReadingState();
	if (state.slugs.includes(slug)) return;

	state.slugs.push(slug);

	if (useMemory) {
		memoryState = state;
		if (!memoryHistory.includes(slug)) {
			memoryHistory.push(slug);
		}
		if (allSlugs) recycleIfNeeded(allSlugs);
		return;
	}

	trySetItem(DAILY_KEY, JSON.stringify(state));

	// Update history
	const historyRaw = tryGetItem(HISTORY_KEY);
	const history: string[] = historyRaw ? JSON.parse(historyRaw) : [];
	if (!history.includes(slug)) {
		history.push(slug);
		trySetItem(HISTORY_KEY, JSON.stringify(history));
	}

	if (allSlugs) recycleIfNeeded(allSlugs);
}

/**
 * Resets read history when all stories have been read, so the cycle can start fresh.
 */
export function recycleIfNeeded(allSlugs: string[]): void {
	if (allSlugs.length === 0) return;

	if (useMemory) {
		const allRead = allSlugs.every((s) => memoryHistory.includes(s));
		if (allRead) memoryHistory = [];
		return;
	}

	const historyRaw = tryGetItem(HISTORY_KEY);
	const history: string[] = historyRaw ? JSON.parse(historyRaw) : [];
	const allRead = allSlugs.every((s) => history.includes(s));
	if (allRead) {
		trySetItem(HISTORY_KEY, JSON.stringify([]));
	}
}

export function canReadMore(): boolean {
	const state = getReadingState();
	return state.slugs.length < MAX_DAILY_READS;
}

export function getReadToday(): string[] {
	return getReadingState().slugs;
}

export function resetIfNewDay(): void {
	// getReadingState already handles date checking and resetting
	getReadingState();
}

/**
 * Resets the in-memory fallback state. Exported for testing only.
 */
export function _resetForTesting(): void {
	memoryState = { date: getTodayUTC(), slugs: [] };
	memoryHistory = [];
	useMemory = false;
}
