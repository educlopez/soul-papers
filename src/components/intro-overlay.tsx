"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface IntroOverlayProps {
	onStart: () => void;
}

/** 3D floating paper sheets scene */
function useFloatingPapers(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
	const cleanupRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			50,
			window.innerWidth / window.innerHeight,
			0.1,
			100,
		);
		camera.position.z = 8;

		// Very bright lighting — papers must look white
		scene.add(new THREE.AmbientLight(0xffffff, 3.0));
		const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
		keyLight.position.set(3, 5, 4);
		scene.add(keyLight);
		const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
		fillLight.position.set(-4, -2, 3);
		scene.add(fillLight);

		// Handwriting fragments — short poetic phrases
		const handwritingLines = [
			["I remember the way", "the light fell on", "your hands that morning"],
			["Some days the sky", "feels closer than", "it should"],
			["She smiled at me", "like I was the only", "person left on earth"],
			["The coffee got cold", "but the conversation", "never did"],
			["I kept the letter", "folded in my pocket", "for three years"],
			["We danced in the", "kitchen at 2am", "barefoot and laughing"],
			["It was raining when", "I realized I was", "finally home"],
			["He left a note", "on the fridge that", "said everything"],
			["The garden grew", "wild after she left", "but so did I"],
			["Sometimes silence", "says more than", "a thousand words"],
			["Dear stranger,", "I hope today", "was kind to you"],
			["The train was late", "but I met you", "so it was worth it"],
			["I forgave myself", "on a Tuesday", "in November"],
			["You taught me that", "love is a verb", "not a feeling"],
		];

		// Generate paper texture on canvas — grain + ruled lines + handwriting
		function makePaperTexture(linesIndex: number): THREE.CanvasTexture {
			const c = document.createElement("canvas");
			c.width = 256;
			c.height = 360;
			const ctx = c.getContext("2d")!;

			// Base — almost pure white
			ctx.fillStyle = "#fefcfa";
			ctx.fillRect(0, 0, c.width, c.height);

			// Very subtle grain noise
			const imgData = ctx.getImageData(0, 0, c.width, c.height);
			for (let k = 0; k < imgData.data.length; k += 4) {
				const noise = (Math.random() - 0.5) * 6;
				imgData.data[k] += noise;
				imgData.data[k + 1] += noise;
				imgData.data[k + 2] += noise;
			}
			ctx.putImageData(imgData, 0, 0);

			// Faint ruled lines
			ctx.strokeStyle = "rgba(176, 160, 132, 0.12)";
			ctx.lineWidth = 0.5;
			for (let ly = 30; ly < c.height; ly += 18) {
				ctx.beginPath();
				ctx.moveTo(10, ly);
				ctx.lineTo(c.width - 10, ly);
				ctx.stroke();
			}

			// Left margin line
			ctx.strokeStyle = "rgba(190, 140, 140, 0.1)";
			ctx.lineWidth = 0.8;
			ctx.beginPath();
			ctx.moveTo(28, 0);
			ctx.lineTo(28, c.height);
			ctx.stroke();

			// Handwritten text — dark ink, clearly visible
			const lines = handwritingLines[linesIndex % handwritingLines.length];
			ctx.fillStyle = "rgba(40, 30, 20, 0.7)";
			ctx.font = "italic 16px Georgia, serif";

			const startY = 45 + Math.floor(Math.random() * 40);
			for (let li = 0; li < lines.length; li++) {
				const x = 34 + (Math.random() - 0.5) * 4;
				const y = startY + li * 18;
				// Slight random rotation per line for handwritten feel
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate((Math.random() - 0.5) * 0.03);
				ctx.fillText(lines[li], 0, 0);
				ctx.restore();
			}

			const tex = new THREE.CanvasTexture(c);
			tex.wrapS = THREE.ClampToEdgeWrapping;
			tex.wrapT = THREE.ClampToEdgeWrapping;
			return tex;
		}

		// Create paper sheets
		const count = window.innerWidth < 768 ? 8 : 14;
		const papers: {
			mesh: THREE.Mesh;
			basePos: THREE.Vector3;
			speedY: number;
			speedRot: THREE.Vector3;
			phaseX: number;
			phaseY: number;
			ampX: number;
			ampY: number;
		}[] = [];

		for (let i = 0; i < count; i++) {
			// Vary paper sizes — letter-like proportions
			const w = 0.5 + Math.random() * 0.6;
			const h = w * (1.3 + Math.random() * 0.3);
			// Higher segment count for smooth bending
			const geo = new THREE.PlaneGeometry(w, h, 8, 10);

			// Realistic paper deformation — fold + curl + crumple
			const pos = geo.attributes.position;
			const foldAngle = (Math.random() - 0.5) * 0.6;
			const curlStrength = 0.03 + Math.random() * 0.06;
			const crumpleFreq = 2 + Math.random() * 3;
			const crumpleAmp = 0.005 + Math.random() * 0.015;

			for (let j = 0; j < pos.count; j++) {
				const x = pos.getX(j);
				const y = pos.getY(j);

				// Main curl — paper curling at edges
				let z = Math.pow(Math.abs(x) / (w / 2), 2) * curlStrength;

				// Diagonal fold crease
				z += Math.max(0, (x * foldAngle + y * 0.2) * 0.05);

				// Micro crumples — tiny wrinkles
				z += Math.sin(x * crumpleFreq * 8 + i) * Math.sin(y * crumpleFreq * 6) * crumpleAmp;

				// Corner curl — one corner lifts
				if (i % 3 === 0) {
					const cx = w / 2;
					const cy = -h / 2;
					const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
					if (dist < 0.3) z += (0.3 - dist) * 0.15;
				}

				pos.setZ(j, z);
			}
			geo.computeVertexNormals();

			// Each paper gets its own texture + material
			const hasText = Math.random() > 0.2;
			const tex = hasText ? makePaperTexture(i) : null;

			const mat = new THREE.MeshPhongMaterial({
				color: 0xffffff,
				map: tex,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.4 + Math.random() * 0.35,
				specular: 0x444444,
				shininess: 8,
			});

			const mesh = new THREE.Mesh(geo, mat);
			const aspect = window.innerWidth / window.innerHeight;
			mesh.position.set(
				(Math.random() - 0.5) * 10 * aspect,
				(Math.random() - 0.5) * 7,
				(Math.random() - 0.5) * 5 - 1,
			);
			mesh.rotation.set(
				Math.random() * Math.PI,
				Math.random() * Math.PI,
				Math.random() * Math.PI,
			);

			// Cast subtle shadows on each other
			mesh.castShadow = true;
			mesh.receiveShadow = true;

			scene.add(mesh);
			papers.push({
				mesh,
				basePos: mesh.position.clone(),
				speedY: 0.08 + Math.random() * 0.12,
				speedRot: new THREE.Vector3(
					(0.02 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1),
					(0.01 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1),
					(0.015 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1),
				),
				phaseX: Math.random() * Math.PI * 2,
				phaseY: Math.random() * Math.PI * 2,
				ampX: 0.15 + Math.random() * 0.3,
				ampY: 0.1 + Math.random() * 0.25,
			});
		}

		// Animation
		const clock = new THREE.Clock();
		let frameId: number;

		const animate = () => {
			const t = clock.getElapsedTime();

			for (const p of papers) {
				// Gentle floating drift
				p.mesh.position.x = p.basePos.x + Math.sin(t * 0.08 + p.phaseX) * p.ampX;
				p.mesh.position.y = p.basePos.y + Math.sin(t * p.speedY + p.phaseY) * p.ampY;
				p.mesh.position.z = p.basePos.z + Math.sin(t * 0.05 + p.phaseX * 2) * 0.15;

				// Slow tumble
				p.mesh.rotation.x += p.speedRot.x * 0.004;
				p.mesh.rotation.y += p.speedRot.y * 0.003;
				p.mesh.rotation.z += p.speedRot.z * 0.002;
			}

			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};
		animate();

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};
		window.addEventListener("resize", handleResize);

		cleanupRef.current = () => {
			cancelAnimationFrame(frameId);
			window.removeEventListener("resize", handleResize);
			renderer.dispose();
			for (const p of papers) {
				p.mesh.geometry.dispose();
				(p.mesh.material as THREE.Material).dispose();
			}
		};

		return () => cleanupRef.current?.();
	}, [canvasRef]);

	return cleanupRef;
}

export function IntroOverlay({ onStart }: IntroOverlayProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const lineRef = useRef<HTMLDivElement>(null);
	const subtitleRef = useRef<HTMLParagraphElement>(null);
	const hintRef = useRef<HTMLSpanElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useFloatingPapers(canvasRef);

	// Staggered entrance animation
	useEffect(() => {
		const ctx = gsap.context(() => {
			const tl = gsap.timeline({ delay: 0.4 });

			// Canvas fades in
			tl.fromTo(
				canvasRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 1.5, ease: "power2.out" },
			);

			// Title fades up
			tl.fromTo(
				titleRef.current,
				{ opacity: 0, y: 25 },
				{ opacity: 1, y: 0, duration: 1, ease: "power3.out" },
				"-=1.0",
			);

			// Decorative line draws in
			tl.fromTo(
				lineRef.current,
				{ scaleX: 0, opacity: 0 },
				{ scaleX: 1, opacity: 1, duration: 0.7, ease: "power2.inOut" },
				"-=0.4",
			);

			// Subtitle fades up
			tl.fromTo(
				subtitleRef.current,
				{ opacity: 0, y: 15 },
				{ opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
				"-=0.2",
			);

			// Hint
			tl.fromTo(
				hintRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.5, ease: "power1.out" },
				"-=0.1",
			);

			// Button
			tl.fromTo(
				buttonRef.current,
				{ opacity: 0, y: 10 },
				{ opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
			);
		}, containerRef);

		return () => ctx.revert();
	}, []);

	const handleStart = () => {
		if (!containerRef.current) {
			onStart();
			return;
		}

		gsap.to(containerRef.current, {
			opacity: 0,
			duration: 0.8,
			ease: "power2.in",
			onComplete: onStart,
		});
	};

	return (
		<div
			ref={containerRef}
			className="fixed inset-0 z-40"
			style={{ backgroundColor: "rgba(250, 246, 240, 0.93)" }}
		>
			{/* 3D floating papers */}
			<canvas
				ref={canvasRef}
				className="absolute inset-0 opacity-0"
				aria-hidden="true"
			/>

			{/* Vignette */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background: "radial-gradient(ellipse at center, transparent 40%, rgba(139, 119, 85, 0.07) 100%)",
				}}
			/>

			{/* Text content */}
			<div className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-none">
				<h1
					ref={titleRef}
					className="font-handwriting text-7xl md:text-9xl text-neutral-900 mb-5 text-center leading-none opacity-0"
					style={{ letterSpacing: "-0.02em" }}
				>
					Soul Papers
				</h1>

				<div
					ref={lineRef}
					className="w-24 md:w-36 h-0.5 mb-7 opacity-0"
					style={{
						background: "linear-gradient(90deg, transparent, #8a7a60, transparent)",
						transformOrigin: "center",
					}}
				/>

				<p
					ref={subtitleRef}
					className="font-serif text-lg md:text-xl text-neutral-700 max-w-md text-center mb-3 leading-relaxed italic opacity-0"
				>
					Stories that remind us why the little things matter.
				</p>

				<span
					ref={hintRef}
					className="font-serif text-sm text-neutral-500 mb-14 opacity-0"
				>
					Click a paper plane. Read something beautiful.
				</span>

				<button
					ref={buttonRef}
					type="button"
					onClick={handleStart}
					className="group relative opacity-0 pointer-events-auto"
				>
					{/* Paper note button */}
					<div
						className="relative px-10 py-4 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-1"
						style={{
							background: "linear-gradient(135deg, #fefcfa 0%, #f5ece0 100%)",
							boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06), inset 0 0 12px rgba(139, 119, 85, 0.05)",
							borderRadius: "2px",
							transform: "rotate(1deg)",
						}}
					>
						{/* Tape strip at top */}
						<div
							className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-5 rounded-sm"
							style={{
								background: "linear-gradient(180deg, rgba(217, 200, 155, 0.6), rgba(217, 200, 155, 0.35))",
								backdropFilter: "blur(1px)",
							}}
						/>
						<span className="font-handwriting text-2xl text-neutral-700 group-hover:text-neutral-900 transition-colors">
							Unfold a story
						</span>
					</div>
				</button>
			</div>
		</div>
	);
}
