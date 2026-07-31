"use client";

import { gsap } from "gsap";
import { type ReactNode, type RefObject, useCallback, useImperativeHandle, useRef } from "react";

export interface CanvasMaskHandle {
	/** Animate mask from current size to fully open */
	reveal: () => Promise<void>;
}

interface CanvasMaskProps {
	children: ReactNode;
	/** Initial mask size percentage: 0 = hidden, 100 = full */
	initialSize?: number;
}

/**
 * Wraps content in an organic watercolor-style mask using the SVG.
 * Animates by scaling the SVG mask from small to full size.
 */
export const CanvasMask = function CanvasMask({
	children,
	initialSize = 100,
	ref,
}: CanvasMaskProps & { ref?: RefObject<CanvasMaskHandle | null> }) {
	const maskRef = useRef<HTMLDivElement>(null);

	const updateMaskSize = useCallback((size: number) => {
		if (!maskRef.current) {
			return;
		}
		const val = `${size}% ${size}%`;
		maskRef.current.style.maskSize = val;
		maskRef.current.style.webkitMaskSize = val;
	}, []);

	// Set initial mask on mount
	const maskCallbackRef = useCallback(
		(node: HTMLDivElement | null) => {
			(maskRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
			if (node) {
				updateMaskSize(initialSize);
			}
		},
		[initialSize, updateMaskSize]
	);

	useImperativeHandle(
		ref,
		() => ({
			reveal: () =>
				new Promise<void>((resolve) => {
					const proxy = { size: initialSize };
					gsap.to(proxy, {
						duration: 2.5,
						ease: "power2.inOut",
						onComplete: resolve,
						onUpdate: () => updateMaskSize(proxy.size),
						size: 100,
					});
				}),
		}),
		[initialSize, updateMaskSize]
	);

	return (
		<div className="fixed inset-0">
			{/* Paper canvas texture background */}
			<div
				className="absolute inset-0"
				style={{
					backgroundColor: "#FAF6F0",
					backgroundImage:
						"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
				}}
			/>

			{/* Masked content area — always uses the watercolor SVG */}
			<div
				ref={maskCallbackRef}
				className="absolute inset-0"
				style={{
					maskImage: "url(/svg/canvas-mask.svg)",
					maskPosition: "center",
					maskRepeat: "no-repeat",
					WebkitMaskImage: "url(/svg/canvas-mask.svg)",
					WebkitMaskPosition: "center",
					WebkitMaskRepeat: "no-repeat",
				}}
			>
				{children}
			</div>
		</div>
	);
};
