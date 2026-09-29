import type { ParticleSystemOptions } from "./system.js";

/**
 * Docs playground camera. The hero copy sits in the left half of this frame;
 * the field has to stay in the right half at every review resolution.
 */
export const PLAYGROUND_FIELD_CAMERA = {
	position: [0, 0.5, 13] as [number, number, number],
	target: [0, 0.3, 0] as [number, number, number],
	fov: 50,
};

/**
 * The centered 1180px page puts the hero copy's right edge at the viewport
 * center on 1280, 1440, 1920 and 2560. Particles must project to the right of
 * this, with margin for a sprite and a little bloom.
 */
export const PLAYGROUND_COPY_EDGE = 0.5;
export const PLAYGROUND_FIELD_MARGIN = 0.58;

export const PLAYGROUND_VIEWPORTS = [
	[1280, 720],
	[1440, 1000],
	[1920, 1080],
	[2560, 1440],
] as const;

/**
 * Right-hand cloud for the docs playground.
 *
 * The old field was a radius-8 sphere on the origin, additive, intensity 1.8.
 * That sphere crossed the copy column and the core blew out to white. This
 * one is the same count and the same colours, held in a smaller volume whose
 * silhouette stays right of the copy, at about a third of the old exposure.
 * `boundsCenter` is the constraint; a text-shadow would not be.
 */
export const PLAYGROUND_FIELD: ParticleSystemOptions = {
	count: 24_000,
	emitter: {
		shape: "sphere",
		position: [5.6, 0.15, 0],
		radius: 1.35,
		direction: [0, 0.15, 0],
		speed: 0.55,
		spread: 0.92,
	},
	forces: {
		gravity: [0, 0.04, 0],
		drag: 0.16,
		turbulence: 1.4,
		noiseScale: 0.34,
		noiseDrift: 0.2,
		vortex: 0.9,
		attractor: 0.45,
		attractorRadius: 4.5,
	},
	life: [4, 10],
	size: [0.028, 0.07],
	colors: ["#4de8d5", "#8d7bff", "#f778c8"],
	hotColor: "#fff4e8",
	hotAmount: 0.1,
	intensity: 0.62,
	opacity: 0.38,
	bounds: "sphere",
	boundsRadius: 2.1,
	boundsCenter: [5.6, 0.15, 0],
	blending: "additive",
};

export interface SphereScreenQuery {
	center: readonly [number, number, number];
	radius: number;
	eye: readonly [number, number, number];
	target: readonly [number, number, number];
	fov: number;
	width: number;
	height: number;
	/** Extra world radius for a sprite that sticks out of the volume. */
	sprite?: number;
}

type Vec3 = readonly [number, number, number];

function sub(a: Vec3, b: Vec3): [number, number, number] {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): [number, number, number] {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function norm(a: readonly [number, number, number]): [number, number, number] {
	const length = Math.hypot(a[0], a[1], a[2]) || 1;
	return [a[0] / length, a[1] / length, a[2] / length];
}

/**
 * Left edge of a sphere's silhouette, as a fraction of the viewport width
 * from the left. `1` is the right edge. A sphere that surrounds the camera
 * returns `0` — it covers the copy.
 */
export function sphereScreenLeft(query: SphereScreenQuery): number {
	const forward = norm(sub(query.target, query.eye));
	const right = norm(cross(forward, [0, 1, 0]));
	const up = cross(right, forward);
	const rel = sub(query.center, query.eye);
	const vx = dot(rel, right);
	const vy = dot(rel, up);
	const dist = dot(rel, forward);
	const reach = query.radius + (query.sprite ?? 0);
	if (!(dist > reach)) return 0;
	const alpha = Math.asin(Math.min(1, reach / Math.hypot(vx, vy, dist)));
	const theta = Math.atan2(vx, dist);
	const left = theta - alpha;
	const vertical = (query.fov * Math.PI) / 180;
	const horizontal =
		2 * Math.atan(Math.tan(vertical / 2) * (query.width / Math.max(query.height, 1)));
	const ndc = Math.tan(left) / Math.tan(horizontal / 2);
	return 0.5 + ndc / 2;
}

/** Screen-left of the playground cloud, including its largest sprite. */
export function playgroundFieldScreenLeft(width: number, height: number): number {
	const center = PLAYGROUND_FIELD.boundsCenter ?? [0, 0, 0];
	const radius = PLAYGROUND_FIELD.boundsRadius ?? 0;
	const sprite = PLAYGROUND_FIELD.size?.[1] ?? 0;
	return sphereScreenLeft({
		center,
		radius,
		sprite,
		eye: PLAYGROUND_FIELD_CAMERA.position,
		target: PLAYGROUND_FIELD_CAMERA.target,
		fov: PLAYGROUND_FIELD_CAMERA.fov,
		width,
		height,
	});
}
