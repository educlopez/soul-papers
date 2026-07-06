"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface PaperPlanes3DProps {
	interactive: boolean;
	onPlaneClick: () => void;
	count?: number;
}

/**
 * Creates a 3D paper dart from explicit triangles: two swept delta wings
 * meeting at a center crease, plus a folded keel underneath.
 * Nose points +X (matches velocity-based orientation in the animation loop).
 */
function createPlaneModel(): THREE.Group {
	const group = new THREE.Group();

	const wingMat = new THREE.MeshPhongMaterial({
		color: 0xf5f0e8,
		flatShading: true,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.95,
	});
	const keelMat = new THREE.MeshPhongMaterial({
		color: 0xd4c5a9,
		flatShading: true,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.95,
	});

	// Shared vertices (unit-ish dart, ~1.1 long, ~1.0 wingspan)
	const nose: [number, number, number] = [0.6, 0, 0];
	const tailCrease: [number, number, number] = [-0.5, 0.04, 0];
	const tipLeft: [number, number, number] = [-0.5, 0.14, -0.5];
	const tipRight: [number, number, number] = [-0.5, 0.14, 0.5];
	const keelBottom: [number, number, number] = [-0.5, -0.22, 0];

	const triangle = (
		a: [number, number, number],
		b: [number, number, number],
		c: [number, number, number],
		material: THREE.Material,
	) => {
		const geo = new THREE.BufferGeometry();
		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute([...a, ...b, ...c], 3),
		);
		geo.computeVertexNormals();
		return new THREE.Mesh(geo, material);
	};

	// Wings: nose → tail crease → wingtip (slight dihedral, tips raised)
	group.add(triangle(nose, tailCrease, tipRight, wingMat));
	group.add(triangle(nose, tipLeft, tailCrease, wingMat));

	// Keel: vertical center fold under the wings
	group.add(triangle(nose, keelBottom, tailCrease, keelMat));

	// Invisible generous hit area — raycasting against the thin triangles alone
	// makes planes nearly impossible to click while they move
	const hitArea = new THREE.Mesh(
		new THREE.SphereGeometry(0.9),
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
	);
	group.add(hitArea);

	group.scale.setScalar(0.55);

	return group;
}

/**
 * Simple boid with slow, gentle flocking behavior.
 */
class Boid {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	private acceleration: THREE.Vector3;
	private worldSize: THREE.Vector3;

	constructor(worldX: number, worldY: number, worldZ: number) {
		this.position = new THREE.Vector3(
			(Math.random() - 0.5) * worldX * 1.5,
			(Math.random() - 0.5) * worldY,
			(Math.random() - 0.5) * worldZ,
		);
		this.velocity = new THREE.Vector3(
			(Math.random() - 0.5) * 0.007,
			(Math.random() - 0.5) * 0.003,
			(Math.random() - 0.5) * 0.005,
		);
		this.acceleration = new THREE.Vector3();
		this.worldSize = new THREE.Vector3(worldX, worldY, worldZ);
	}

	run(boids: Boid[]) {
		this.flock(boids);
		this.avoidWalls();
		this.move();
	}

	private flock(boids: Boid[]) {
		const alignment = new THREE.Vector3();
		const cohesion = new THREE.Vector3();
		const separation = new THREE.Vector3();
		let neighbors = 0;

		for (const other of boids) {
			if (other === this) continue;
			const dist = this.position.distanceTo(other.position);
			if (dist > 2) continue;

			alignment.add(other.velocity);
			cohesion.add(other.position);
			const diff = new THREE.Vector3().subVectors(this.position, other.position);
			diff.divideScalar(dist);
			separation.add(diff);
			neighbors++;
		}

		if (neighbors > 0) {
			alignment.divideScalar(neighbors).multiplyScalar(0.02);
			cohesion.divideScalar(neighbors).sub(this.position).multiplyScalar(0.005);
			separation.multiplyScalar(0.03);

			this.acceleration.add(alignment);
			this.acceleration.add(cohesion);
			this.acceleration.add(separation);
		}
	}

	private avoidWalls() {
		const margin = 0.5;
		const force = 0.01;
		const p = this.position;
		const w = this.worldSize;

		if (p.x > w.x - margin) this.acceleration.x -= force;
		if (p.x < -w.x + margin) this.acceleration.x += force;
		if (p.y > w.y - margin) this.acceleration.y -= force;
		if (p.y < -w.y + margin) this.acceleration.y += force;
		if (p.z > w.z - margin) this.acceleration.z -= force;
		if (p.z < -w.z + margin) this.acceleration.z += force;
	}

	private move() {
		this.velocity.add(this.acceleration);
		// Slow max speed for gentle floating
		const maxSpeed = 0.012;
		const speed = this.velocity.length();
		if (speed > maxSpeed) this.velocity.multiplyScalar(maxSpeed / speed);
		this.position.add(this.velocity);
		this.acceleration.set(0, 0, 0);
	}
}

export function PaperPlanes3D({
	interactive,
	onPlaneClick,
	count: countProp,
}: PaperPlanes3DProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const interactiveRef = useRef(interactive);
	const onClickRef = useRef(onPlaneClick);

	interactiveRef.current = interactive;
	onClickRef.current = onPlaneClick;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const count = countProp ?? (window.innerWidth < 768 ? 5 : 10);

		// --- Renderer ---
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);

		// --- Scene & Camera ---
		const scene = new THREE.Scene();
		const aspect = window.innerWidth / window.innerHeight;
		const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
		camera.position.z = 5;

		// --- Lighting ---
		scene.add(new THREE.AmbientLight(0xffffff, 0.85));
		const dirLight = new THREE.DirectionalLight(0xfff8e8, 1.5);
		dirLight.position.set(3, 4, 5);
		scene.add(dirLight);
		const backLight = new THREE.DirectionalLight(0xe8f0ff, 0.5);
		backLight.position.set(-2, -1, 3);
		scene.add(backLight);

		// --- Create planes ---
		const worldX = 4 * aspect;
		const worldY = 3;
		// Keep planes at least ~3 units from the camera (z=5) so none fills the screen
		const worldZ = 2;
		const boids: Boid[] = [];
		const planeModels: THREE.Group[] = [];

		for (let i = 0; i < count; i++) {
			const boid = new Boid(worldX, worldY, worldZ);
			boids.push(boid);

			const model = createPlaneModel();
			model.scale.multiplyScalar(0.8 + Math.random() * 0.4);
			model.position.copy(boid.position);
			scene.add(model);
			planeModels.push(model);
		}

		// --- Animation ---
		let frameId: number;

		const animate = () => {
			for (let i = 0; i < count; i++) {
				const boid = boids[i];
				boid.run(boids);

				const model = planeModels[i];
				model.position.copy(boid.position);

				// Orient plane along velocity
				const v = boid.velocity;
				if (v.length() > 0.001) {
					model.rotation.y = Math.atan2(-v.z, v.x);
					model.rotation.z = Math.asin(
						Math.max(-1, Math.min(1, v.y / v.length())),
					);
				}
			}

			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};
		animate();

		// --- Click (raycaster) ---
		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();

		const handlePointerDown = (e: PointerEvent) => {
			if (!interactiveRef.current) return;

			pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

			raycaster.setFromCamera(pointer, camera);
			const hits = raycaster.intersectObjects(
				planeModels.flatMap((m) => m.children),
			);

			if (hits.length > 0) {
				e.stopPropagation();
				onClickRef.current();
			}
		};
		canvas.addEventListener("pointerdown", handlePointerDown);

		// --- Resize ---
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};
		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(frameId);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("resize", handleResize);
			renderer.dispose();
			for (const m of planeModels) {
				m.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.geometry.dispose();
						(child.material as THREE.Material).dispose();
					}
				});
			}
		};
	}, [countProp]);

	return (
		<canvas
			ref={canvasRef}
			className={`fixed inset-0 z-10 ${interactive ? "cursor-pointer" : "cursor-default"}`}
			aria-label={
				interactive
					? "Paper planes — click one to read a story"
					: undefined
			}
			aria-hidden={!interactive}
		/>
	);
}
