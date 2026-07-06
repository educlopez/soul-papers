"use client";

import { useCallback, useState } from "react";
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
 * exempt from the daily ritual state.
 */
export function ArchiveBrowser({ letters }: ArchiveBrowserProps) {
	const [openStory, setOpenStory] = useState<Story | null>(null);

	const handleOpen = useCallback((story: Story) => {
		markArchiveRead(story.slug);
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
							className="w-full text-left px-6 py-4 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
						>
							<span className="block font-serif text-lg text-neutral-900">{letter.title}</span>
							<span className="block text-sm text-neutral-500 mt-1">
								{letter.date} — {letter.author}
							</span>
						</button>
					</li>
				))}
			</ul>

			{openStory && <PaperLetter story={openStory} onClose={handleClose} />}
		</>
	);
}
