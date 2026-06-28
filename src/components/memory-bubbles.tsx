"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface MemoryBubblesProps {
	interactive: boolean;
	onBubbleClick: () => void;
	count?: number;
}

// --- Custom bubble shader ---

const bubbleVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 mvPos = viewMatrix * worldPos;

  vWorldPosition = worldPos.xyz;
  vViewPosition = -mvPos.xyz;
  vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);

  gl_Position = projectionMatrix * mvPos;
}
`;

const bubbleFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLightDir;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(L + V);

  // Fresnel — strong edge visibility, transparent center
  float fresnel = pow(1.0 - abs(dot(N, V)), 3.5);

  // Thin-film iridescence (wavelength-dependent path length)
  float cosTheta = abs(dot(N, V));
  float filmThickness = 250.0 + 150.0 * sin(uTime * 0.3 + vWorldPosition.x * 2.0 + vWorldPosition.y * 3.0);
  float delta = 2.0 * filmThickness * cosTheta;

  vec3 iridescence = vec3(
    0.5 + 0.5 * cos(delta * 0.0045 + 0.0),
    0.5 + 0.5 * cos(delta * 0.0045 + 2.094),
    0.5 + 0.5 * cos(delta * 0.0045 + 4.189)
  );

  // Specular highlights (two lights for depth)
  float spec1 = pow(max(dot(N, H), 0.0), 128.0);
  vec3 H2 = normalize(normalize(vec3(-2.0, -1.0, 3.0)) + V);
  float spec2 = pow(max(dot(N, H2), 0.0), 64.0);

  // Rim glow — soft white edge
  vec3 rimColor = vec3(1.0, 1.0, 1.0) * fresnel * 0.45;

  // Iridescence only on the rim area
  vec3 iriColor = iridescence * fresnel * 0.25;

  // Specular highlights — bright white spots
  vec3 specColor = vec3(1.0) * (spec1 * 0.8 + spec2 * 0.3);

  // Subtle environment color pick-up (fake reflection of sky)
  float upness = vWorldNormal.y * 0.5 + 0.5;
  vec3 envTint = mix(
    vec3(0.3, 0.5, 0.25),  // ground green
    vec3(0.5, 0.75, 1.0),  // sky blue
    upness
  ) * fresnel * 0.15;

  // Combine
  vec3 color = rimColor + iriColor + specColor + envTint;

  // Alpha: nearly invisible center, visible rim + specular
  float alpha = fresnel * 0.5 + (spec1 + spec2) * 0.7;
  alpha = clamp(alpha, 0.0, 0.75);

  gl_FragColor = vec4(color, alpha);
}
`;

// --- Bubble animation state ---

interface BubbleAnim {
	baseX: number;
	baseY: number;
	baseZ: number;
	radius: number;
	speedX: number;
	speedY: number;
	phaseX: number;
	phaseY: number;
	ampX: number;
	ampY: number;
}

function generateBubbles(count: number, aspect: number): BubbleAnim[] {
	const visibleH = 5.6;
	const visibleW = visibleH * aspect;

	return Array.from({ length: count }, () => ({
		baseX: (Math.random() - 0.5) * visibleW * 0.8,
		baseY: (Math.random() - 0.5) * visibleH * 0.8,
		baseZ: -1 + Math.random() * 2,
		radius: 0.1 + Math.random() * 0.18,
		speedX: 0.12 + Math.random() * 0.15,
		speedY: 0.08 + Math.random() * 0.12,
		phaseX: Math.random() * Math.PI * 2,
		phaseY: Math.random() * Math.PI * 2,
		ampX: 0.3 + Math.random() * 0.6,
		ampY: 0.2 + Math.random() * 0.5,
	}));
}

export function MemoryBubbles({
	interactive,
	onBubbleClick,
	count: countProp,
}: MemoryBubblesProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const interactiveRef = useRef(interactive);
	const onClickRef = useRef(onBubbleClick);

	interactiveRef.current = interactive;
	onClickRef.current = onBubbleClick;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const count = countProp ?? (window.innerWidth < 768 ? 6 : 12);
		const aspect = window.innerWidth / window.innerHeight;
		const bubbles = generateBubbles(count, aspect);

		// --- Renderer ---
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			premultipliedAlpha: false,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);

		// --- Scene & Camera ---
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
		camera.position.z = 6;

		// --- Bubble material ---
		const material = new THREE.ShaderMaterial({
			vertexShader: bubbleVertex,
			fragmentShader: bubbleFragment,
			uniforms: {
				uTime: { value: 0 },
				uLightDir: { value: new THREE.Vector3(3, 4, 5).normalize() },
			},
			transparent: true,
			depthWrite: false,
			side: THREE.FrontSide,
			blending: THREE.AdditiveBlending,
		});

		// --- Instanced Mesh ---
		const geometry = new THREE.SphereGeometry(1, 48, 48);
		const mesh = new THREE.InstancedMesh(geometry, material, count);
		scene.add(mesh);

		// --- Animation ---
		const dummy = new THREE.Object3D();
		const clock = new THREE.Clock();
		let frameId: number;

		const animate = () => {
			const t = clock.getElapsedTime();
			material.uniforms.uTime.value = t;

			for (let i = 0; i < count; i++) {
				const b = bubbles[i];
				const x = b.baseX + Math.sin(t * b.speedX + b.phaseX) * b.ampX;
				const y =
					b.baseY +
					Math.sin(t * b.speedY + b.phaseY) * b.ampY +
					Math.sin(t * 0.2 + b.phaseX * 2) * 0.1;
				const z = b.baseZ + Math.sin(t * 0.1 + b.phaseY) * 0.2;
				const scale = b.radius * (1 + Math.sin(t * 0.5 + b.phaseX) * 0.05);

				dummy.position.set(x, y, z);
				dummy.scale.setScalar(scale);
				dummy.updateMatrix();
				mesh.setMatrixAt(i, dummy.matrix);
			}
			mesh.instanceMatrix.needsUpdate = true;

			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};
		animate();

		// --- Raycaster for click ---
		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();

		const handleClick = (e: MouseEvent) => {
			if (!interactiveRef.current) return;

			pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

			raycaster.setFromCamera(pointer, camera);
			const hits = raycaster.intersectObject(mesh);

			if (hits.length > 0) {
				onClickRef.current();
			}
		};
		canvas.addEventListener("click", handleClick);

		// --- Resize ---
		const handleResize = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		};
		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(frameId);
			canvas.removeEventListener("click", handleClick);
			window.removeEventListener("resize", handleResize);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [countProp]);

	return (
		<canvas
			ref={canvasRef}
			className={`fixed inset-0 z-10 ${interactive ? "cursor-pointer" : "cursor-default"}`}
			aria-label={interactive ? "Memory bubbles — click one to read a story" : undefined}
			aria-hidden={!interactive}
		/>
	);
}
