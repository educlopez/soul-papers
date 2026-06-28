"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRandomQuote } from "@/lib/quotes";
import { getRandomStory } from "@/lib/random-story";
import { canReadMore, getReadToday, markAsRead, resetIfNewDay } from "@/lib/reading-state";
import type { Story } from "@/lib/types";
import { AudioControls } from "./audio-controls";
import { InspirationalQuote } from "./inspirational-quote";
import { IntroOverlay } from "./intro-overlay";
import { PaperLetter } from "./paper-letter";
import { PaperPlanes3D } from "./paper-planes-3d";
import { RevealMask, type RevealMaskHandle } from "./reveal-mask";
import { VideoBackground } from "./video-background";

interface SceneProps {
	/** All stories pre-loaded at build time */
	stories: Story[];
}

export function Scene({ stories }: SceneProps) {
	const [openStory, setOpenStory] = useState<Story | null>(null);
	const [isInteractive, setIsInteractive] = useState(true);
	const [quote, setQuote] = useState<string | null>(null);
	const [showIntro, setShowIntro] = useState(true);
	const revealRef = useRef<RevealMaskHandle>(null);

	// Reconcile reading state on mount (avoids SSR crash from accessing localStorage)
	useEffect(() => {
		resetIfNewDay();
		if (!canReadMore()) {
			setIsInteractive(false);
			setQuote(getRandomQuote());
		}
	}, []);

	const allSlugs = stories.map((s) => s.slug);

	const handleStart = useCallback(async () => {
		// Intro text has faded out, now reveal the scene
		if (revealRef.current) {
			await revealRef.current.reveal();
		}
		setShowIntro(false);
	}, []);

	const handlePlaneClick = useCallback(
		() => {
			resetIfNewDay();
			if (!canReadMore()) {
				setIsInteractive(false);
				setQuote(getRandomQuote());
				return;
			}

			const readToday: string[] = []; // TODO: restore to getReadToday() after demo
			const slug = getRandomStory(allSlugs, readToday);
			if (!slug) return;

			const story = stories.find((s) => s.slug === slug);
			if (!story) return;

			markAsRead(slug);
			setOpenStory(story);

			// Check if this was the last allowed read
			if (!canReadMore()) {
				setIsInteractive(false);
				setQuote(getRandomQuote());
			}
		},
		[allSlugs, stories],
	);

	const handleLetterClose = useCallback(() => {
		setOpenStory(null);
	}, []);

	// Empty state — no stories in content/
	if (stories.length === 0) {
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
			<PaperPlanes3D interactive={!showIntro && isInteractive && !openStory} onPlaneClick={handlePlaneClick} />

			{/* Layer 3: Inspirational quote (shown after daily limit) */}
			{quote && !openStory && !showIntro && <InspirationalQuote quote={quote} />}

			{/* Layer 4: WebGL reveal mask — paper overlay that dissolves organically */}
			<RevealMask ref={revealRef} initialProgress={showIntro ? 0 : 1} />

			{/* Layer 5: Intro overlay */}
			{showIntro && <IntroOverlay onStart={handleStart} />}

			{/* Layer 6: Paper letter overlay */}
			{openStory && <PaperLetter story={openStory} onClose={handleLetterClose} />}

			{/* Audio controls */}
			<AudioControls enabled={!openStory && !showIntro} />

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
