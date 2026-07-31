import type { Metadata } from "next";
import { ArchiveBrowser } from "@/components/archive-browser";
import { Header } from "@/components/header";
import { getArchiveLetters } from "@/lib/daily-letter";
import { getAllStories } from "@/lib/stories";

// The archive's "past letters" boundary flips at Madrid midnight (it excludes
// whichever letter is showing today) — must not be statically cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	description: "Past letters from Soul Papers.",
	title: "Archive",
};

export default function ArchivePage() {
	const letters = getArchiveLetters(getAllStories(), new Date());

	return (
		<>
			<Header />
			<main className="pt-16">
				<div className="min-h-screen py-16 md:py-24">
					<div className="mx-auto max-w-2xl px-6">
						<h1 className="mb-4 font-bold font-serif text-4xl text-neutral-900 leading-tight md:text-5xl">
							Archive
						</h1>
						<p className="mb-10 text-neutral-500">
							Letters from other days, in case you want to return to one.
						</p>
						<ArchiveBrowser letters={letters} />
					</div>
				</div>
			</main>
		</>
	);
}
