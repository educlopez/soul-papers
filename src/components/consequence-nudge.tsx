"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { getNudge } from "@/lib/nudges";

const TALLY_FORM_URL = process.env.NEXT_PUBLIC_TALLY_URL || "https://tally.so/r/ODyJrk";

interface ConsequenceNudgeProps {
	/**
	 * Warm communal read count for this letter, from `fetchCount` (Counter
	 * slice). The line only renders when `count >= 3` (ADR-5 threshold) — a
	 * brand-new or lightly-read letter omits it entirely rather than showing a
	 * cold "1 persona".
	 */
	count?: number | null;
	story: { nudge?: string };
}

/**
 * Post-close overlay: a brief consequence nudge, the warm per-letter read
 * count (once it clears the threshold), the "Leave your letter" submission
 * entry point, a warm return-tomorrow message, and a soft door into the
 * archive.
 */
export function ConsequenceNudge({ story, count = null }: ConsequenceNudgeProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const countRef = useRef<HTMLParagraphElement>(null);
	const nudge = useRef(getNudge(story)).current;
	// Only shown once the letter has kept enough people company — avoids a lonely "1 persona".
	const showCount = count !== null && count >= 3;

	useEffect(() => {
		const el = cardRef.current;
		if (!el) {
			return;
		}

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reducedMotion) {
			gsap.set(el, { opacity: 1, y: 0 });
			return;
		}

		gsap.fromTo(
			el,
			{ opacity: 0, y: 12 },
			{ duration: 0.25, ease: "power2.out", opacity: 1, y: 0 }
		);
	}, []);

	// The count arrives asynchronously (after fetchCount resolves), often once the
	// card is already visible — fade it in on its own rather than popping in.
	useEffect(() => {
		if (!showCount) {
			return;
		}
		const el = countRef.current;
		if (!el) {
			return;
		}

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reducedMotion) {
			gsap.set(el, { opacity: 1, y: 0 });
			return;
		}

		gsap.fromTo(el, { opacity: 0, y: 8 }, { duration: 0.2, ease: "power2.out", opacity: 1, y: 0 });
	}, [showCount]);

	return (
		<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
			<div
				ref={cardRef}
				className="paper-texture pointer-events-auto w-full max-w-md rounded-lg bg-amber-50/95 px-8 py-10 text-center shadow-xl"
				style={{ opacity: 0 }}
			>
				<p className="mb-6 font-handwriting text-2xl text-neutral-700 leading-snug md:text-3xl">
					{nudge}
				</p>

				{showCount ? (
					<p ref={countRef} className="mb-6 text-neutral-500 text-sm italic" style={{ opacity: 0 }}>
						this letter has kept {count} people company
					</p>
				) : null}

				<a
					href={TALLY_FORM_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="mb-5 inline-block rounded-lg bg-neutral-900 px-6 py-3 text-sm text-white transition-colors hover:bg-neutral-700"
				>
					Leave your letter
				</a>

				<p className="mb-2 text-neutral-400 text-sm">Come back tomorrow for another letter.</p>

				<a
					href="/archive"
					className="text-neutral-400 text-xs underline transition-colors hover:text-neutral-600"
				>
					Or read one from days past
				</a>
			</div>
		</div>
	);
}
