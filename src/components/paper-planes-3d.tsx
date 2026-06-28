"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface PaperPlanes3DProps {
	interactive: boolean;
	onPlaneClick: () => void;
	count?: number;
}

/**
 * Creates a 3D paper plane geometry from deformed boxes.
 * Adapted from Sanchez3/paperplanes.
 */
function createPlaneModel(): THREE.Group {
	const group = new THREE.Group();

	const mat = new THREE.MeshPhongMaterial({
		color: 0xfaf6f0,
		flatShading: true,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.92,
	});

	// Right fuselage — narrow width (z: 0.6 instead of 2)
	const rightBody = new THREE.BoxGeometry(14, 2, 0.6);
	const rbPos = rightBody.attributes.position;
	for (let i = 0; i < rbPos.count; i++) {
		const x = rbPos.getX(i);
		const y = rbPos.getY(i);
		const z = rbPos.getZ(i);
		if (x > 0) {
			rbPos.setY(i, y + (x / 7) * 1.5);
			rbPos.setZ(i, z * 0.3);
		}
		if (x < 0) {
			rbPos.setZ(i, z * 0.6);
		}
	}
	rightBody.computeVertexNormals();
	const rightMesh = new THREE.Mesh(rightBody, mat);
	rightMesh.position.set(0, -0.3, 0.15);
	group.add(rightMesh);

	// Left fuselage (mirror) — narrow width
	const leftBody = new THREE.BoxGeometry(14, 2, 0.6);
	const lbPos = leftBody.attributes.position;
	for (let i = 0; i < lbPos.count; i++) {
		const x = lbPos.getX(i);
		const y = lbPos.getY(i);
		const z = lbPos.getZ(i);
		if (x > 0) {
			lbPos.setY(i, y + (x / 7) * 1.5);
			lbPos.setZ(i, z * 0.3);
		}
		if (x < 0) {
			lbPos.setZ(i, z * 0.6);
		}
	}
	leftBody.computeVertexNormals();
	const leftMesh = new THREE.Mesh(leftBody, mat);
	leftMesh.position.set(0, -0.3, -0.15);
	group.add(leftMesh);

	// Right wing (thin, swept)
	const rightWing = new THREE.BoxGeometry(12, 0.05, 6);
	const rwPos = rightWing.attributes.position;
	for (let i = 0; i < rwPos.count; i++) {
		const x = rwPos.getX(i);
		const z = rwPos.getZ(i);
		if (z > 0) {
			rwPos.setX(i, x - z * 0.8);
		}
		if (x < -3 && z > 1) {
			rwPos.setZ(i, z * 0.5);
		}
	}
	rightWing.computeVertexNormals();
	const rwMesh = new THREE.Mesh(rightWing, mat);
	rwMesh.position.set(-1, 0.1, 3);
	group.add(rwMesh);

	// Left wing (mirror)
	const leftWing = new THREE.BoxGeometry(12, 0.05, 6);
	const lwPos = leftWing.attributes.position;
	for (let i = 0; i < lwPos.count; i++) {
		const x = lwPos.getX(i);
		const z = lwPos.getZ(i);
		if (z < 0) {
			lwPos.setX(i, x + z * 0.8);
		}
		if (x < -3 && z < -1) {
			lwPos.setZ(i, z * 0.5);
		}
	}
	leftWing.computeVertexNormals();
	const lwMesh = new THREE.Mesh(leftWing, mat);
	lwMesh.position.set(-1, 0.1, -3);
	group.add(lwMesh);

	// Scale down to reasonable size
	group.scale.setScalar(0.035);

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
			(Math.random() - 0.5) * 0.015,
			(Math.random() - 0.5) * 0.006,
			(Math.random() - 0.5) * 0.01,
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
		const maxSpeed = 0.03;
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
		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dirLight = new THREE.DirectionalLight(0xfff8e8, 1.5);
		dirLight.position.set(3, 4, 5);
		scene.add(dirLight);
		const backLight = new THREE.DirectionalLight(0xe8f0ff, 0.5);
		backLight.position.set(-2, -1, 3);
		scene.add(backLight);

		// --- Create planes ---
		const worldX = 4 * aspect;
		const worldY = 3;
		const worldZ = 3;
		const boids: Boid[] = [];
		const planeModels: THREE.Group[] = [];

		for (let i = 0; i < count; i++) {
			const boid = new Boid(worldX, worldY, worldZ);
			boids.push(boid);

			const model = createPlaneModel();
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
