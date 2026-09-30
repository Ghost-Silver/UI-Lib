import { sphereScreenLeft } from "./playgroundField.js";
import type { ParticleSystemOptions } from "./system.js";

/**
 * A rising field that sits to the right of a headline. Trails are on.
 * Intensity stays under the playground cloud so the stroke reads as ink,
 * not a lamp. The pointer eddy is a colour and a bend, not a brightness lift.
 */
export const WAKE_FIELD: ParticleSystemOptions = {
	count: 9_000,
	emitter: {
		shape: "box",
		position: [4.4, 0.15, 0],
		size: [1.35, 1.8, 0.35],
		direction: [0.08, 1, 0],
		speed: 0.55,
		spread: 0.42,
	},
	forces: {
		gravity: [0, 0.02, 0],
		drag: 0.2,
		wind: [0.04, 0.62, 0],
		turbulence: 0.28,
		noiseScale: 0.42,
		noiseDrift: 0.06,
		vortex: 0.08,
		attractor: 0,
		stir: 0.85,
		stirRadius: 1.7,
	},
	colors: ["#f4efe6", "#d9c4a4", "#8ea0ff"],
	hotColor: "#fff6ea",
	hotAmount: 0.06,
	stirColor: "#f0d8b4",
	stirTint: 0.28,
	speedReference: 1.2,
	size: [0.018, 0.04],
	intensity: 0.46,
	opacity: 0.5,
	life: [7, 12],
	bounds: "sphere",
	boundsRadius: 2.2,
	boundsCenter: [4.4, 0.25, 0],
	bounce: 0.16,
	blending: "additive",
	trail: { length: 7, stride: 6, opacity: 0.3, width: 0.012 },
};

export const WAKE_FIELD_CAMERA = {
	position: [0, 0.35, 11.5] as [number, number, number],
	target: [0.4, 0.15, 0] as [number, number, number],
	fov: 38,
};

/** Copy column ends near the middle. The cloud must start to the right of this. */
export const WAKE_COPY_EDGE = 0.5;

export function wakeFieldScreenLeft(width: number, height: number): number {
	const center = WAKE_FIELD.boundsCenter ?? [0, 0, 0];
	const radius = WAKE_FIELD.boundsRadius ?? 0;
	const sprite = WAKE_FIELD.size?.[1] ?? 0;
	return sphereScreenLeft({
		center,
		radius,
		sprite,
		eye: WAKE_FIELD_CAMERA.position,
		target: WAKE_FIELD_CAMERA.target,
		fov: WAKE_FIELD_CAMERA.fov,
		width,
		height,
	});
}
