"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MUTED_KEY = "hpv_audio_muted";
const VOLUME_KEY = "hpv_audio_volume";

function loadPref<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw !== null ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function savePref(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// localStorage unavailable — ignore
	}
}

interface AudioControlsProps {
	/** Whether audio should be playing (scene is active, no letter open, etc.) */
	enabled?: boolean;
	/** Audio source URL — can be a static file or stream URL */
	musicSrc?: string;
}

export function AudioControls({
	enabled = true,
	musicSrc = "/audio/lofi-music.mp3",
}: AudioControlsProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isMuted, setIsMuted] = useState(true); // Start muted (browser policy)
	const [volume, setVolume] = useState(0.5);
	const [hasInteracted, setHasInteracted] = useState(false);

	// Load preferences on mount
	useEffect(() => {
		setIsMuted(loadPref(MUTED_KEY, true));
		setVolume(loadPref(VOLUME_KEY, 0.5));
	}, []);

	// Create and manage audio element
	useEffect(() => {
		if (!audioRef.current) {
			const audio = new Audio(musicSrc);
			audio.loop = true;
			audio.preload = "none";
			audioRef.current = audio;
		}

		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, [musicSrc]);

	// Sync audio state
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = volume;
		audio.muted = isMuted;

		if (hasInteracted && enabled && !isMuted) {
			audio.play().catch(() => {
				// Autoplay blocked — will retry on next interaction
			});
		} else {
			audio.pause();
		}
	}, [isMuted, volume, hasInteracted, enabled]);

	const toggleMute = useCallback(() => {
		setHasInteracted(true);
		setIsMuted((prev) => {
			const next = !prev;
			savePref(MUTED_KEY, next);
			return next;
		});
	}, []);

	const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const v = Number.parseFloat(e.target.value);
		setVolume(v);
		savePref(VOLUME_KEY, v);
		if (v > 0) {
			setIsMuted(false);
			savePref(MUTED_KEY, false);
			setHasInteracted(true);
		}
	}, []);

	return (
		<div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={isMuted ? 0 : volume}
				onChange={handleVolumeChange}
				className="w-20 accent-amber-200/80 h-1 opacity-60 hover:opacity-100 transition-opacity"
				aria-label="Volume"
			/>
			<button
				type="button"
				onClick={toggleMute}
				className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm hover:bg-black/50 transition-colors"
				aria-label={isMuted ? "Unmute audio" : "Mute audio"}
			>
				{isMuted ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-5 w-5"
						aria-hidden="true"
					>
						<path d="M11 5L6 9H2v6h4l5 4V5z" />
						<line x1="23" y1="9" x2="17" y2="15" />
						<line x1="17" y1="9" x2="23" y2="15" />
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-5 w-5"
						aria-hidden="true"
					>
						<path d="M11 5L6 9H2v6h4l5 4V5z" />
						<path d="M19.07 4.93a10 10 0 010 14.14" />
						<path d="M15.54 8.46a5 5 0 010 7.07" />
					</svg>
				)}
			</button>
		</div>
	);
}

/**
 * Plays a one-shot sound effect. Call from event handlers.
 */
export function playSfx(src: string): void {
	try {
		const audio = new Audio(src);
		audio.volume = 0.4;
		audio.play().catch(() => {
			// Sound effect blocked — non-critical, ignore
		});
	} catch {
		// Audio not supported — ignore
	}
}
