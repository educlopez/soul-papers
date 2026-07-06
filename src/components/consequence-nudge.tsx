"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { getNudge } from "@/lib/nudges";

const TALLY_FORM_URL = process.env.NEXT_PUBLIC_TALLY_URL || "https://tally.so/r/ODyJrk";

interface ConsequenceNudgeProps {
	story: { nudge?: string };
	/**
	 * Warm communal read count for this letter. Wired by the Counter slice
	 * (fetchCount); left undefined/null here keeps this component self-contained
	 * for v1 — the count line is simply omitted until it's available.
	 */
	count?: number | null;
}

/**
 * Post-close overlay: a brief consequence nudge, the "Leave your letter"
 * submission entry point, a warm return-tomorrow message, and a soft door
 * into the archive.
 */
export function ConsequenceNudge({ story, count = null }: ConsequenceNudgeProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const nudge = useRef(getNudge(story)).current;

	useEffect(() => {
		const el = cardRef.current;
		if (!el) return;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reducedMotion) {
			gsap.set(el, { opacity: 1, y: 0 });
			return;
		}

		gsap.fromTo(
			el,
			{ opacity: 0, y: 12 },
			{ opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
		);
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
			<div
				ref={cardRef}
				className="pointer-events-auto max-w-md w-full rounded-lg bg-amber-50/95 paper-texture px-8 py-10 text-center shadow-xl"
				style={{ opacity: 0 }}
			>
				<p className="font-handwriting text-2xl md:text-3xl text-neutral-700 mb-6 leading-snug">
					{nudge}
				</p>

				{count != null && count >= 3 && (
					<p className="text-sm text-neutral-500 mb-6 italic">
						this letter has kept {count} people company
					</p>
				)}

				<a
					href={TALLY_FORM_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm mb-5"
				>
					Leave your letter
				</a>

				<p className="text-neutral-400 text-sm mb-2">Come back tomorrow for another letter.</p>

				<a
					href="/archive"
					className="text-xs text-neutral-400 hover:text-neutral-600 underline transition-colors"
				>
					Or read one from days past
				</a>
			</div>
		</div>
	);
}
