export interface StoryMeta {
	title: string;
	author: string;
	date: string;
	tags?: string[];
	slug: string;
	/** Optional per-letter override for the post-close consequence nudge line. */
	nudge?: string;
	/** Tally submission id, present only on ingested (non-seed) letters. Used for dedup. */
	tallyId?: string;
}

export interface Story extends StoryMeta {
	content: string;
}
