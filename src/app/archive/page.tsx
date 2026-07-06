import type { Metadata } from "next";
import { ArchiveBrowser } from "@/components/archive-browser";
import { Header } from "@/components/header";
import { getArchiveLetters } from "@/lib/daily-letter";
import { getAllStories } from "@/lib/stories";

// The archive's "past letters" boundary flips at Madrid midnight (it excludes
// whichever letter is showing today) — must not be statically cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Archive",
	description: "Past letters from Soul Papers.",
};

export default function ArchivePage() {
	const letters = getArchiveLetters(getAllStories(), new Date());

	return (
		<>
			<Header />
			<main className="pt-16">
				<div className="min-h-screen py-16 md:py-24">
					<div className="max-w-2xl mx-auto px-6">
						<h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-4 leading-tight">
							Archive
						</h1>
						<p className="text-neutral-500 mb-10">
							Letters from other days, in case you want to return to one.
						</p>
						<ArchiveBrowser letters={letters} />
					</div>
				</div>
			</main>
		</>
	);
}
