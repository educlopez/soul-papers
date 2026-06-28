"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaneConfig } from "./paper-plane";
import { PaperPlane } from "./paper-plane";

interface PaperPlanesProps {
	interactive: boolean;
	onPlaneClick: () => void;
}

function generatePlanes(count: number): PlaneConfig[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		delay: Math.random() * 4,
		duration: 12 + Math.random() * 8, // 12-20s per pass
		scale: 0.8 + Math.random() * 0.5, // 0.8-1.3
		yOffset: Math.random(), // 0-1 normalized
		reverse: Math.random() > 0.5,
	}));
}

export function PaperPlanes({ interactive, onPlaneClick }: PaperPlanesProps) {
	const [planes, setPlanes] = useState<PlaneConfig[]>([]);
	const [reducedMotion, setReducedMotion] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Check reduced motion preference
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);
		const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
		mq.addEventListener("change", handler);

		// Generate planes client-side only (avoids hydration mismatch from Math.random)
		const count = window.innerWidth < 768 ? 5 : 10;
		setPlanes(generatePlanes(count));

		return () => {
			mq.removeEventListener("change", handler);
		};
	}, []);

	const handlePlaneClick = useCallback(
		(_id: number, _element: HTMLElement) => {
			if (!interactive) return;
			onPlaneClick();
		},
		[interactive, onPlaneClick],
	);

	return (
		<div ref={containerRef} className="fixed inset-0 z-10 pointer-events-none">
			<div className="pointer-events-auto h-full w-full">
				{planes.map((plane) => (
					<PaperPlane
						key={plane.id}
						config={plane}
						interactive={interactive}
						reducedMotion={reducedMotion}
						onClick={handlePlaneClick}
					/>
				))}
			</div>
		</div>
	);
}
