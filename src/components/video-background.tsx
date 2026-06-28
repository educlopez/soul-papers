"use client";

import { useEffect, useRef, useState } from "react";

export function VideoBackground() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [videoError, setVideoError] = useState(false);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// On mobile or video error, show static image
	if (isMobile || videoError) {
		return (
			<div
				className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
				style={{ backgroundImage: "url(/images/lofi-bg.png)" }}
				aria-hidden="true"
			>
				<div className="absolute inset-0 bg-amber-900/20" />
			</div>
		);
	}

	return (
		<div className="fixed inset-0 -z-10" aria-hidden="true">
			<video
				ref={videoRef}
				autoPlay
				loop
				muted
				playsInline
				onError={() => setVideoError(true)}
				className="h-full w-full object-cover"
			>
				<source src="/video/lofi-bg.mp4" type="video/mp4" />
			</video>
			<div className="absolute inset-0 bg-amber-900/20" />
		</div>
	);
}
