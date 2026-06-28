"use client";

import { gsap } from "gsap";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import * as THREE from "three";

export interface RevealMaskHandle {
	reveal: () => Promise<void>;
}

interface RevealMaskProps {
	/** Initial progress: 0 = fully hidden, 1 = fully revealed */
	initialProgress?: number;
}

// 3D Perlin noise (Stefan Gustavson) + reveal fragment shader
const fragmentShader = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;

//
// Classic Perlin 3D Noise (Stefan Gustavson)
//
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P){
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Organic noise displacement
  vec2 displacedUv = uv + cnoise(vec3(uv * 5.0, uTime * 0.1));
  float strength = cnoise(vec3(displacedUv * 5.0, uTime * 0.2));

  // Radial reveal from center
  float radialGradient = distance(uv, vec2(0.5)) * 12.5 - 7.0 * uProgress;
  strength += radialGradient;

  // Clamp and invert: 1 = visible, 0 = hidden
  strength = 1.0 - clamp(strength, 0.0, 1.0);

  // Fade in opacity during first 70% of progress
  float opacityProgress = smoothstep(0.0, 0.7, uProgress);

  // Output: paper color where hidden, transparent where revealed
  // This acts as an overlay that covers the video
  vec3 paperColor = vec3(0.98, 0.965, 0.94); // #FAF6F0
  float mask = 1.0 - (strength * opacityProgress);
  gl_FragColor = vec4(paperColor, mask);
}
`;

const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

/**
 * WebGL-powered reveal mask overlay.
 * Renders a paper-colored overlay that dissolves with organic Perlin noise edges.
 */
export const RevealMask = forwardRef<RevealMaskHandle, RevealMaskProps>(
	function RevealMask({ initialProgress = 0 }, ref) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const uniformsRef = useRef<{
			uProgress: THREE.Uniform<number>;
			uTime: THREE.Uniform<number>;
			uResolution: THREE.Uniform<THREE.Vector2>;
		} | null>(null);
		const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
		const frameRef = useRef<number>(0);
		const sceneRef = useRef<THREE.Scene | null>(null);
		const cameraRef = useRef<THREE.Camera | null>(null);

		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const renderer = new THREE.WebGLRenderer({
				canvas,
				alpha: true,
				premultipliedAlpha: false,
			});
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(window.innerWidth, window.innerHeight);
			rendererRef.current = renderer;

			const scene = new THREE.Scene();
			sceneRef.current = scene;

			// Fullscreen camera
			const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
			cameraRef.current = camera;

			const uniforms = {
				uProgress: new THREE.Uniform(initialProgress),
				uTime: new THREE.Uniform(0),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(
						window.innerWidth * Math.min(window.devicePixelRatio, 2),
						window.innerHeight * Math.min(window.devicePixelRatio, 2),
					),
				),
			};
			uniformsRef.current = uniforms;

			const material = new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				uniforms,
				transparent: true,
			});

			// Fullscreen quad
			const geometry = new THREE.PlaneGeometry(2, 2);
			const mesh = new THREE.Mesh(geometry, material);
			scene.add(mesh);

			// Render loop
			const clock = new THREE.Clock();
			const animate = () => {
				uniforms.uTime.value = clock.getElapsedTime();
				renderer.render(scene, camera);
				frameRef.current = requestAnimationFrame(animate);
			};
			animate();

			// Handle resize
			const onResize = () => {
				const dpr = Math.min(window.devicePixelRatio, 2);
				renderer.setSize(window.innerWidth, window.innerHeight);
				uniforms.uResolution.value.set(
					window.innerWidth * dpr,
					window.innerHeight * dpr,
				);
			};
			window.addEventListener("resize", onResize);

			return () => {
				cancelAnimationFrame(frameRef.current);
				window.removeEventListener("resize", onResize);
				renderer.dispose();
				geometry.dispose();
				material.dispose();
			};
		}, [initialProgress]);

		useImperativeHandle(
			ref,
			() => ({
				reveal: () =>
					new Promise<void>((resolve) => {
						if (!uniformsRef.current) {
							resolve();
							return;
						}
						const proxy = { progress: uniformsRef.current.uProgress.value };
						gsap.to(proxy, {
							progress: 1,
							duration: 2.5,
							ease: "power2.inOut",
							onUpdate: () => {
								if (uniformsRef.current) {
									uniformsRef.current.uProgress.value = proxy.progress;
								}
							},
							onComplete: resolve,
						});
					}),
			}),
			[],
		);

		return (
			<canvas
				ref={canvasRef}
				className="fixed inset-0 z-30 pointer-events-none"
				aria-hidden="true"
			/>
		);
	},
);
