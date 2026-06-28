/**
 * Picks a random story slug from the pool, excluding already-read slugs.
 * Returns null if no stories are available.
 */
export function getRandomStory(allSlugs: string[], excludeSlugs: string[]): string | null {
	const available = allSlugs.filter((slug) => !excludeSlugs.includes(slug));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index];
}
