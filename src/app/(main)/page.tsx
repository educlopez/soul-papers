import { Scene } from "@/components/scene";
import { resolveTodaysLetter } from "@/lib/daily-letter";
import { getAllStories } from "@/lib/stories";

// The daily letter flips at Madrid midnight for every visitor — this page
// must not be statically cached across that boundary.
export const dynamic = "force-dynamic";

export default function HomePage() {
	const stories = getAllStories();
	const todaysLetter = resolveTodaysLetter(stories, new Date());
	return <Scene todaysLetter={todaysLetter} stories={stories} />;
}
