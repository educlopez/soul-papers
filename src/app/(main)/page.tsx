import { Scene } from "@/components/scene";
import { getAllStories } from "@/lib/stories";

export default function HomePage() {
	const stories = getAllStories();
	return <Scene stories={stories} />;
}
