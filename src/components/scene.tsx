"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCount, recordRead } from "@/lib/read-counter";
import { hasReadToday, markTodayRead } from "@/lib/reading-state";
import type { Story } from "@/lib/types";
// Audio disabled for now — no tracks shipped yet. Re-enable alongside playSfx in paper-letter.tsx.
// import { AudioControls } from "./audio-controls";
import { ConsequenceNudge } from "./consequence-nudge";
import { IntroOverlay } from "./intro-overlay";
import { PaperLetter } from "./paper-letter";
import { PaperPlanes3D } from "./paper-planes-3d";
import { RevealMask, type RevealMaskHandle } from "./reveal-mask";
import { VideoBackground } from "./video-background";

interface SceneProps {
	/** Today's global ritual letter (Europe/Madrid), resolved server-side. Null when no letter is eligible yet. */
	todaysLetter: Story | null;
	/** All stories pre-loaded at build time (used by the archive door / empty-state check). */
	stories: Story[];
}

export function Scene({ todaysLetter, stories }: SceneProps) {
	const [openStory, setOpenStory] = useState<Story | null>(null);
	const [isInteractive, setIsInteractive] = useState(true);
	const [showNudge, setShowNudge] = useState(false);
	const [showIntro, setShowIntro] = useState(true);
	const [readCount, setReadCount] = useState<number | null>(null);
	const revealRef = useRef<RevealMaskHandle>(null);

	// Reconcile reading state on mount (avoids SSR crash from accessing localStorage)
	useEffect(() => {
		if (todaysLetter && hasReadToday(todaysLetter.slug)) {
			setIsInteractive(false);
			setShowNudge(true);
			fetchCount(todaysLetter.slug).then(setReadCount);
		}
	}, [todaysLetter]);

	const handleStart = useCallback(async () => {
		// Intro text has faded out, now reveal the scene
		if (revealRef.current) {
			await revealRef.current.reveal();
		}
		setShowIntro(false);
	}, []);

	const handlePlaneClick = useCallback(() => {
		if (!todaysLetter || !isInteractive) return;
		setOpenStory(todaysLetter);
	}, [todaysLetter, isInteractive]);

	const handleLetterClose = useCallback(() => {
		if (todaysLetter) {
			markTodayRead(todaysLetter.slug);
			recordRead(todaysLetter.slug);
			fetchCount(todaysLetter.slug).then(setReadCount);
		}
		setOpenStory(null);
		setIsInteractive(false);
		setShowNudge(true);
	}, [todaysLetter]);

	// Empty state — no stories in content/, or nothing eligible yet
	if (stories.length === 0 || !todaysLetter) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-amber-50">
				<p className="text-xl font-serif text-neutral-500 italic">Stories are on their way...</p>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 overflow-hidden">
			{/* Layer 1: Video background (always renders behind everything) */}
			<VideoBackground />

			{/* Layer 2: 3D paper planes with flocking */}
			<PaperPlanes3D
				interactive={!showIntro && isInteractive && !openStory}
				onPlaneClick={handlePlaneClick}
			/>

			{/* Layer 3: WebGL reveal mask — paper overlay that dissolves organically */}
			<RevealMask ref={revealRef} initialProgress={showIntro ? 0 : 1} />

			{/* Layer 4: Intro overlay */}
			{showIntro && <IntroOverlay onStart={handleStart} />}

			{/* Layer 5: Paper letter overlay */}
			{openStory && <PaperLetter story={openStory} onClose={handleLetterClose} />}

			{/* Layer 6: Consequence nudge — shown once today's letter has been read */}
			{showNudge && !openStory && !showIntro && (
				<ConsequenceNudge story={todaysLetter} count={readCount} />
			)}

			{/* Audio controls — disabled until real tracks ship */}
			{/* <AudioControls enabled={!openStory && !showIntro} /> */}

			{/* Subtle About link */}
			<a
				href="/about"
				className="fixed bottom-6 left-6 z-50 text-xs text-white/40 hover:text-white/70 transition-colors"
			>
				About
			</a>
		</div>
	);
}
