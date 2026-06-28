"use client";

import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useEffect, useRef } from "react";

gsap.registerPlugin(MotionPathPlugin);

export interface PlaneConfig {
	id: number;
	/** Delay before animation starts (seconds) */
	delay: number;
	/** Animation duration (seconds) */
	duration: number;
	/** Scale factor */
	scale: number;
	/** Y offset for flight path variation */
	yOffset: number;
	/** Whether flight direction is reversed */
	reverse: boolean;
}

interface PaperPlaneProps {
	config: PlaneConfig;
	interactive: boolean;
	reducedMotion: boolean;
	onClick: (id: number, element: HTMLElement) => void;
}

export function PaperPlane({ config, interactive, reducedMotion, onClick }: PaperPlaneProps) {
	const planeRef = useRef<HTMLDivElement>(null);
	const tweenRef = useRef<gsap.core.Tween | null>(null);

	useEffect(() => {
		const el = planeRef.current;
		if (!el || reducedMotion) return;

		const viewportW = window.innerWidth;
		const viewportH = window.innerHeight;

		// Generate curved flight path across screen
		const startX = config.reverse ? viewportW + 100 : -100;
		const endX = config.reverse ? -100 : viewportW + 100;
		const midX = viewportW / 2 + (Math.random() - 0.5) * viewportW * 0.3;
		const baseY = viewportH * 0.2 + config.yOffset * viewportH * 0.5;
		const midY = baseY + (Math.random() - 0.5) * viewportH * 0.15;

		const path = [
			{ x: startX, y: baseY },
			{ x: midX * 0.4, y: midY - 40 },
			{ x: midX, y: midY },
			{ x: midX + (endX - midX) * 0.5, y: midY + 30 },
			{ x: endX, y: baseY + 20 },
		];

		tweenRef.current = gsap.to(el, {
			motionPath: {
				path,
				autoRotate: true,
				curviness: 1.5,
			},
			duration: config.duration,
			delay: config.delay,
			repeat: -1,
			ease: "none",
		});

		return () => {
			tweenRef.current?.kill();
		};
	}, [config, reducedMotion]);

	// For reduced motion: static centered position
	const staticStyle = reducedMotion
		? {
				transform: `scale(${config.scale})`,
				left: `${15 + config.id * 12}%`,
				top: `${20 + config.yOffset * 40}%`,
			}
		: { transform: `scale(${config.scale})` };

	const handleClick = () => {
		if (!interactive || !planeRef.current) return;
		onClick(config.id, planeRef.current);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is dynamically "button" when aria-label is set
		<div
			ref={planeRef}
			className={`absolute ${interactive ? "cursor-pointer" : "cursor-default opacity-60"}`}
			style={staticStyle}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			role={interactive ? "button" : "presentation"}
			tabIndex={interactive ? 0 : -1}
			aria-label={interactive ? "Paper plane — click to read a story" : undefined}
			aria-hidden={!interactive}
		>
			{/* Inline SVG for the paper plane */}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 64 64"
				fill="none"
				className="h-12 w-12 md:h-10 md:w-10 drop-shadow-md"
				aria-hidden="true"
			>
				<path
					d="M4 32L28 28L60 4L36 36L28 28"
					fill="#F5F0E8"
					stroke="#D4C5A9"
					strokeWidth="1.5"
					strokeLinejoin="round"
				/>
				<path
					d="M28 28L60 4L36 36"
					fill="#EDE6D6"
					stroke="#D4C5A9"
					strokeWidth="1"
					strokeLinejoin="round"
				/>
				<path
					d="M28 28L36 36L24 56L28 28"
					fill="#E8E0D0"
					stroke="#D4C5A9"
					strokeWidth="1.5"
					strokeLinejoin="round"
				/>
				<path d="M28 28L32 44" stroke="#D4C5A9" strokeWidth="0.75" opacity="0.5" />
			</svg>
		</div>
	);
}
