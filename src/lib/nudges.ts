export const NUDGES = [
	"Did this remind you of someone? Call them today.",
	"A letter like this starts with someone who dares to write. It could be you.",
	"Hold this moment a second longer before returning to the noise.",
	"If someone came to mind, tell them today — don't leave it for tomorrow.",
	"Sometimes a short message is enough to brighten someone's whole day.",
	"Let this letter remind you to hold the people near you a little tighter.",
] as const;

/**
 * Returns the nudge line to show after a letter closes: the letter's own
 * frontmatter override when set, otherwise a random line from the warm pool.
 */
export function getNudge(story: { nudge?: string }): string {
	if (story.nudge) return story.nudge;
	const index = Math.floor(Math.random() * NUDGES.length);
	return NUDGES[index];
}
