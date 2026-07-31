export interface StoryMeta {
	author: string;
	date: string;
	/** Optional per-letter override for the post-close consequence nudge line. */
	nudge?: string;
	slug: string;
	tags?: string[];
	/** Tally submission id, present only on ingested (non-seed) letters. Used for dedup. */
	tallyId?: string;
	title: string;
}

export interface Story extends StoryMeta {
	content: string;
}
