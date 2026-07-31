const COUNTED_KEY = "hpv_counted";

/**
 * Returns the counted-set, or null when storage is unusable. Callers must
 * fail CLOSED on null (skip the INCR): without dedup state, repeat reads
 * would inflate the counter — under-counting is the acceptable direction.
 */
function getCountedSet(): Set<string> | null {
	try {
		const raw = localStorage.getItem(COUNTED_KEY);
		return raw ? new Set(JSON.parse(raw)) : new Set();
	} catch {
		return null;
	}
}

function saveCountedSet(counted: Set<string>): void {
	try {
		localStorage.setItem(COUNTED_KEY, JSON.stringify([...counted]));
	} catch {
		// Silent degrade — worst case this visitor's INCR isn't deduped next time.
	}
}

/**
 * Records a read for `slug`, fire-and-forget. INCR happens at most once per
 * visitor per letter (tracked via a localStorage counted-set) — repeat reads
 * of the same letter by the same visitor don't inflate the warm counter.
 * Never throws and never blocks the reading experience.
 */
export function recordRead(slug: string): void {
	try {
		const counted = getCountedSet();
		if (counted === null || counted.has(slug)) {
			return;
		}

		counted.add(slug);
		saveCountedSet(counted);

		fetch(`/api/letters/${encodeURIComponent(slug)}`, {
			keepalive: true,
			method: "POST",
		}).catch(() => {
			// Silent degrade — the counter service failing must never surface to the visitor.
		});
	} catch {
		// Silent degrade.
	}
}

/**
 * Reads the current warm count for `slug`. Returns null on any failure
 * (network error, non-2xx response, malformed payload) — callers must treat
 * null the same as "no count yet" and omit the line.
 */
export async function fetchCount(slug: string): Promise<number | null> {
	try {
		const res = await fetch(`/api/letters/${encodeURIComponent(slug)}`);
		if (!res.ok) {
			return null;
		}
		const data = await res.json();
		return typeof data.count === "number" ? data.count : null;
	} catch {
		return null;
	}
}
