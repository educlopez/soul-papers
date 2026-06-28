"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface InspirationalQuoteProps {
	quote: string;
}

export function InspirationalQuote({ quote }: InspirationalQuoteProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (prefersReduced) {
			gsap.set(el, { opacity: 1 });
			return;
		}

		gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" });
	}, []);

	return (
		<div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
			<div ref={ref} className="max-w-md px-8 py-6 text-center opacity-0">
				<p className="text-xl md:text-2xl font-serif text-white leading-relaxed drop-shadow-lg">
					&ldquo;{quote}&rdquo;
				</p>
			</div>
		</div>
	);
}
