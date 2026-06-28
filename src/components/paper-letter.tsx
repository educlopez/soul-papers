"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { playSfx } from "./audio-controls";
import { StoryContent } from "./story-content";

interface PaperLetterProps {
	story: {
		content: string;
		title: string;
		author: string;
	};
	onClose: () => void;
}

export function PaperLetter({ story, onClose }: PaperLetterProps) {
	const letterRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLButtonElement>(null);
	const foldTopRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useRef(false);

	useEffect(() => {
		reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}, []);

	// Unfold animation on mount
	useEffect(() => {
		const el = letterRef.current;
		const overlay = overlayRef.current;
		const foldTop = foldTopRef.current;
		if (!el || !overlay) return;

		playSfx("/audio/paper-unfold.mp3");

		if (reducedMotion.current) {
			gsap.set(el, { opacity: 1, scale: 1, rotateX: 0 });
			gsap.set(overlay, { opacity: 1 });
			if (foldTop) gsap.set(foldTop, { rotateX: 180, opacity: 0 });
			return;
		}

		// Start state: small, folded
		gsap.set(el, {
			opacity: 0,
			scale: 0.3,
			rotateX: 45,
			rotateZ: -1,
			transformPerspective: 1200,
			transformOrigin: "center center",
		});
		gsap.set(overlay, { opacity: 0 });
		if (foldTop) gsap.set(foldTop, { rotateX: 0, opacity: 1 });

		const tl = gsap.timeline();

		// Backdrop + letter unfold together — one continuous motion
		tl.to(overlay, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0);

		tl.to(
			el,
			{
				opacity: 1,
				scale: 1,
				rotateX: 0,
				rotateZ: 0,
				duration: 0.8,
				ease: "back.out(1.2)",
			},
			0.1,
		);

		// Fold flap opens concurrently near the end
		if (foldTop) {
			tl.to(
				foldTop,
				{
					rotateX: 180,
					opacity: 0,
					duration: 0.35,
					ease: "power2.inOut",
				},
				0.5,
			);
		}
	}, []);

	const handleClose = useCallback(() => {
		const el = letterRef.current;
		const overlay = overlayRef.current;
		if (!el || !overlay) {
			onClose();
			return;
		}

		playSfx("/audio/paper-close.mp3");

		if (reducedMotion.current) {
			onClose();
			return;
		}

		const tl = gsap.timeline({ onComplete: onClose });

		// Fold back
		tl.to(el, {
			scale: 0.4,
			rotateX: 50,
			rotateZ: -1,
			y: 30,
			opacity: 0,
			duration: 0.5,
			ease: "power3.in",
			transformPerspective: 1200,
			transformOrigin: "center bottom",
		});

		// Fade out overlay
		tl.to(overlay, { opacity: 0, duration: 0.25 }, "-=0.25");
	}, [onClose]);

	// Close on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handleClose]);

	return (
		<>
			{/* Backdrop overlay */}
			<button
				ref={overlayRef}
				type="button"
				className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm opacity-0 border-none cursor-default"
				onClick={handleClose}
				tabIndex={-1}
				aria-label="Close story"
			/>

			{/* Letter container */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none">
				<div
					ref={letterRef}
					className="letter-scroll paper-texture paper-edges relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-sm pointer-events-auto"
					style={{ transformStyle: "preserve-3d" }}
					role="dialog"
					aria-modal="true"
					aria-label={`Story: ${story.title}`}
				>
					{/* Decorative fold flap at top */}
					<div
						ref={foldTopRef}
						className="absolute top-0 left-0 right-0 h-6 z-20 pointer-events-none"
						style={{
							background: "linear-gradient(to bottom, #ede5d5, #f5ece0)",
							transformOrigin: "top center",
							backfaceVisibility: "hidden",
						}}
					/>

					{/* Subtle close hint — top right corner fold */}
					<button
						type="button"
						onClick={handleClose}
						className="absolute top-0 right-0 z-30 w-12 h-12 cursor-pointer group"
						aria-label="Close story"
					>
						{/* Corner fold triangle */}
						<svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
							<path
								d="M48 0 L48 48 L0 0 Z"
								fill="#ede5d5"
								className="group-hover:fill-[#e0d5c0] transition-colors"
							/>
							<line
								x1="32"
								y1="8"
								x2="38"
								y2="14"
								stroke="#b0a084"
								strokeWidth="1.5"
								strokeLinecap="round"
								className="opacity-50 group-hover:opacity-80 transition-opacity"
							/>
							<line
								x1="35"
								y1="5"
								x2="41"
								y2="11"
								stroke="#b0a084"
								strokeWidth="1.5"
								strokeLinecap="round"
								className="opacity-50 group-hover:opacity-80 transition-opacity"
							/>
						</svg>
					</button>

					{/* Content area with ruled lines */}
					<div className="paper-ruled pt-10 pb-10">
						<StoryContent content={story.content} title={story.title} author={story.author} />
					</div>

					{/* Bottom edge: subtle torn/aged effect */}
					<div
						className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
						style={{
							background:
								"linear-gradient(to bottom, transparent, rgba(139, 119, 85, 0.06))",
						}}
					/>
				</div>
			</div>
		</>
	);
}
