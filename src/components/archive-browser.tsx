"use client";

import { useCallback, useState } from "react";
import { recordRead } from "@/lib/read-counter";
import { markArchiveRead } from "@/lib/reading-state";
import type { Story } from "@/lib/types";
import { PaperLetter } from "./paper-letter";

interface ArchiveBrowserProps {
	letters: Story[];
}

/**
 * Client-side interactive piece of the /archive route: lets the visitor open
 * any past letter via the reused PaperLetter overlay. Opening a letter here
 * calls `markArchiveRead`, never `markTodayRead` — browsing the archive is
 * exempt from the daily ritual state. Also fires `recordRead` (fire-and-forget,
 * at most once per visitor per letter) so archive reads contribute to the
 * warm per-letter counter too.
 */
export function ArchiveBrowser({ letters }: ArchiveBrowserProps) {
	const [openStory, setOpenStory] = useState<Story | null>(null);

	const handleOpen = useCallback((story: Story) => {
		markArchiveRead(story.slug);
		recordRead(story.slug);
		setOpenStory(story);
	}, []);

	const handleClose = useCallback(() => {
		setOpenStory(null);
	}, []);

	if (letters.length === 0) {
		return <p className="text-neutral-400 italic">No past letters yet.</p>;
	}

	return (
		<>
			<ul className="space-y-4">
				{letters.map((letter) => (
					<li key={letter.slug}>
						<button
							type="button"
							onClick={() => handleOpen(letter)}
							className="w-full rounded-lg border border-neutral-200 px-6 py-4 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50"
						>
							<span className="block font-serif text-lg text-neutral-900">{letter.title}</span>
							<span className="mt-1 block text-neutral-500 text-sm">
								{letter.date} — {letter.author}
							</span>
						</button>
					</li>
				))}
			</ul>

			{openStory ? <PaperLetter story={openStory} onClose={handleClose} /> : null}
		</>
	);
}
