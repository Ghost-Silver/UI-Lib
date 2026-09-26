export function clamp(v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
	return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, v: number): number {
	return a === b ? 0 : clamp01((v - a) / (b - a));
}

export function mapRange(
	v: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number,
) {
	return lerp(outMin, outMax, inverseLerp(inMin, inMax, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = inverseLerp(edge0, edge1, x);
	return t * t * (3 - 2 * t);
}

export function wrap(v: number, min: number, max: number): number {
	const range = max - min;
	return min + ((((v - min) % range) + range) % range);
}

/**
 * Frame-rate independent exponential smoothing.
 *
 * `lambda` is the "how fast" knob (higher = snappier). Unlike a raw
 * `lerp(a, b, 0.1)` this yields the same motion at 60 Hz and 144 Hz.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
	return lerp(target, current, Math.exp(-lambda * dt));
}

export const Easing = {
	linear: (t: number) => t,
	easeInQuad: (t: number) => t * t,
	easeOutQuad: (t: number) => t * (2 - t),
	easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	easeInCubic: (t: number) => t * t * t,
	easeOutCubic: (t: number) => 1 - (1 - t) ** 3,
	easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
	easeOutQuart: (t: number) => 1 - (1 - t) ** 4,
	easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
	easeOutQuint: (t: number) => 1 - (1 - t) ** 5,
	easeOutExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
	easeInOutExpo: (t: number) =>
		t === 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
	easeOutBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
	easeOutElastic: (t: number) =>
		t === 0 || t === 1
			? t
			: 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
} as const;

export type EasingName = keyof typeof Easing;

export interface SpringOptions {
	stiffness?: number;
	damping?: number;
	mass?: number;
	/** Distance+velocity below which the spring is considered settled. */
	precision?: number;
}

/**
 * A critically-tuneable damped spring integrated with fixed sub-steps, so it is
 * stable at any frame rate and settles exactly.
 */
export class Spring {
	value: number;
	target: number;
	velocity = 0;

	stiffness: number;
	damping: number;
	mass: number;
	private readonly precision: number;

	constructor(value = 0, options: SpringOptions = {}) {
		this.value = value;
		this.target = value;
		this.stiffness = options.stiffness ?? 170;
		this.damping = options.damping ?? 22;
		this.mass = options.mass ?? 1;
		this.precision = options.precision ?? 0.001;
	}

	get settled(): boolean {
		return (
			Math.abs(this.value - this.target) < this.precision &&
			Math.abs(this.velocity) < this.precision
		);
	}

	/** Jump to a value with no motion. */
	reset(value: number): void {
		this.value = value;
		this.target = value;
		this.velocity = 0;
	}

	step(dt: number): number {
		if (!(dt > 0)) return this.value;
		const steps = Math.min(8, Math.max(1, Math.ceil(dt / (1 / 120))));
		const h = dt / steps;
		for (let i = 0; i < steps; i++) {
			const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
			this.velocity += (force / this.mass) * h;
			this.value += this.velocity * h;
		}
		if (this.settled) {
			this.value = this.target;
			this.velocity = 0;
		}
		return this.value;
	}
}

/** Two-dimensional spring, used for cursor follow and magnetic UI. */
export class Spring2 {
	readonly x: Spring;
	readonly y: Spring;

	constructor(x = 0, y = 0, options: SpringOptions = {}) {
		this.x = new Spring(x, options);
		this.y = new Spring(y, options);
	}

	set target(v: { x: number; y: number }) {
		this.x.target = v.x;
		this.y.target = v.y;
	}

	get settled(): boolean {
		return this.x.settled && this.y.settled;
	}

	step(dt: number): { x: number; y: number } {
		return { x: this.x.step(dt), y: this.y.step(dt) };
	}
}

/* ------------------------------------------------------------------ noise -- */

function hash2(x: number, y: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
	return s - Math.floor(s);
}

/** Cheap 2D value noise in [0,1]. Mirrors the shader-side noise used by TSL. */
export function valueNoise2D(x: number, y: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	const u = xf * xf * (3 - 2 * xf);
	const v = yf * yf * (3 - 2 * yf);
	const a = hash2(xi, yi);
	const b = hash2(xi + 1, yi);
	const c = hash2(xi, yi + 1);
	const d = hash2(xi + 1, yi + 1);
	return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm2D(x: number, y: number, octaves = 4): number {
	let sum = 0;
	let amp = 0.5;
	let freq = 1;
	let norm = 0;
	for (let i = 0; i < octaves; i++) {
		sum += valueNoise2D(x * freq, y * freq) * amp;
		norm += amp;
		amp *= 0.5;
		freq *= 2;
	}
	return sum / norm;
}
