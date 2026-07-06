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
	const wobbleRef = useRef<gsap.core.Tween | null>(null);

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

		// Subtle banking wobble on the plane itself, independent of path autoRotate
		const svg = el.querySelector("svg");
		if (svg) {
			wobbleRef.current = gsap.fromTo(
				svg,
				{ rotation: -5 },
				{
					rotation: 5,
					duration: 1.2 + Math.random() * 0.8,
					yoyo: true,
					repeat: -1,
					ease: "sine.inOut",
				},
			);
		}

		return () => {
			tweenRef.current?.kill();
			wobbleRef.current?.kill();
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
			{/* Paper dart seen from above, pre-rotated so the nose faces right (0°) for motionPath autoRotate */}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 115 76"
				fill="none"
				className="w-12 md:w-10 h-auto drop-shadow-md"
				aria-hidden="true"
			>
				<g transform="translate(0 76) rotate(-90)">
					<path d="M37.8242 115L75.6468 0H47.2793L37.8242 115Z" fill="#F5F0E8" />
					<path d="M37.8223 115L-0.000293732 0H28.3672L37.8223 115Z" fill="#EFE8D9" />
					<path d="M37.8223 115V10L28.3672 0L37.8223 115Z" fill="#E8E0D0" />
					<path d="M37.8232 115V10L47.2783 0L37.8232 115Z" fill="#D4C5A9" />
				</g>
			</svg>
		</div>
	);
}
