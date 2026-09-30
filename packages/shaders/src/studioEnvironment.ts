import {
	ClampToEdgeWrapping,
	DataTexture,
	LinearFilter,
	LinearSRGBColorSpace,
	RepeatWrapping,
	RGBAFormat,
	UnsignedByteType,
} from "three/webgpu";

/**
 * Working-linear ceiling for the shared probe. A full-strength sample of the
 * pane stays under the product bloom threshold; the walls are far below it.
 */
export const STUDIO_ENVIRONMENT_PEAK = 0.32;

export const STUDIO_ENVIRONMENT_SIZE = { width: 512, height: 256 } as const;

type V3 = [number, number, number];

/** Typical product-hero reflection: camera minus look-at, at rest. */
const HERO_REFLECT = normalize([-1.1, 0.16, 9.6]);

/**
 * Warm pane, up and to the left of that reflection, so the optical centre
 * stays a window onto the page and the catchlight sits on the glass.
 */
const KEY = normalize([HERO_REFLECT[0] - 0.36, HERO_REFLECT[1] + 0.55, HERO_REFLECT[2]]);

/** Cooler, dimmer pane for the orbit that swings the camera the other way. */
const FILL = normalize([0.55, 0.24, 0.8]);

const WARM: V3 = [1, 0.78, 0.52];
const COOL: V3 = [0.62, 0.76, 0.9];
const HORIZON: V3 = [1, 0.72, 0.46];

let cached: DataTexture | null = null;

/**
 * One quiet studio, shared by every lens.
 *
 * Looks scale it. Pages do not pass a cubemap. The image is an equirect
 * matched to three's `equirectUV`: v = 0 is -Y, and row 0 is that bottom
 * because `flipY` is false on both backends. Values are working-linear.
 */
export function studioEnvironment(): DataTexture {
	if (cached) return cached;
	const { width, height } = STUDIO_ENVIRONMENT_SIZE;
	const keyFrame = tilt(basis(KEY), 0.14);
	const fillFrame = basis(FILL);
	const rgb: V3 = [0, 0, 0];
	const linear = new Float32Array(width * height * 3);

	for (let y = 0; y < height; y++) {
		const v = (y + 0.5) / height;
		for (let x = 0; x < width; x++) {
			const dir = directionFromUv((x + 0.5) / width, v);
			shade(dir, keyFrame, fillFrame, rgb);
			const index = (y * width + x) * 3;
			linear[index] = rgb[0];
			linear[index + 1] = rgb[1];
			linear[index + 2] = rgb[2];
		}
	}
	// One texel of wrap-aware blur. TAA jitters the lens; a hard pane shimmers.
	const soft = blur(linear, width, height);
	const data = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const src = (y * width + x) * 3;
			const dither = (hash(x, y) - 0.5) / 255;
			const index = (y * width + x) * 4;
			data[index] = quantize((soft[src] ?? 0) + dither);
			data[index + 1] = quantize((soft[src + 1] ?? 0) + dither);
			data[index + 2] = quantize((soft[src + 2] ?? 0) + dither);
			data[index + 3] = 255;
		}
	}

	const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
	texture.name = "ui-lib:studio";
	texture.wrapS = RepeatWrapping;
	texture.wrapT = ClampToEdgeWrapping;
	texture.magFilter = LinearFilter;
	texture.minFilter = LinearFilter;
	texture.generateMipmaps = false;
	texture.flipY = false;
	texture.colorSpace = LinearSRGBColorSpace;
	texture.needsUpdate = true;
	cached = texture;
	return texture;
}

/** Just below the resting cameras, so the line sits under the optic, not through it. */
const HORIZON_Y = -0.055;

function shade(
	dir: V3,
	keyFrame: { right: V3; up: V3 },
	fillFrame: { right: V3; up: V3 },
	out: V3,
): void {
	const y = dir[1];
	// Pole stays near black. A warm bounce just under the horizon is the floor.
	const pole = smoothstep(-0.2, -0.92, y);
	const bounce = Math.exp(-(y + 0.14) * (y + 0.14) * 28) * (1 - pole);
	out[0] = 0.016 + bounce * 0.05;
	out[1] = 0.012 + bounce * 0.032;
	out[2] = 0.009 + bounce * 0.018;

	const ceiling = smoothstep(0.28, 0.82, y);
	addScaled(out, COOL, ceiling * 0.04);

	const horizon = Math.exp(-(y - HORIZON_Y) * (y - HORIZON_Y) * 1400) * 0.15;
	addScaled(out, HORIZON, horizon);

	const keyAlign = Math.max(0, dot(dir, KEY));
	addScaled(out, WARM, keyAlign ** 14 * 0.04);

	const keyOuter = rect(dir, KEY, keyFrame, 0.48, 0.34, 0.1);
	const keyInner = rect(dir, KEY, keyFrame, 0.3, 0.2, 0.07);
	const keyUp = rect(dir, KEY, keyFrame, 0.18, 0.1, 0.05);
	addScaled(out, WARM, keyOuter * 0.2 + keyInner * 0.08 + keyUp * 0.04);

	const mullion = rect(dir, KEY, keyFrame, 0.045, 0.36, 0.02);
	const sash = rect(dir, KEY, keyFrame, 0.5, 0.04, 0.018);
	const cut = mullion * 0.16 + sash * 0.11;
	out[0] = Math.max(0, out[0] - cut);
	out[1] = Math.max(0, out[1] - cut * 0.85);
	out[2] = Math.max(0, out[2] - cut * 0.6);

	const fillPane = rect(dir, FILL, fillFrame, 0.34, 0.22, 0.08);
	addScaled(out, COOL, fillPane * 0.18);

	out[0] = Math.min(STUDIO_ENVIRONMENT_PEAK, out[0]);
	out[1] = Math.min(STUDIO_ENVIRONMENT_PEAK, out[1]);
	out[2] = Math.min(STUDIO_ENVIRONMENT_PEAK, out[2]);
}

function rect(
	dir: V3,
	center: V3,
	frame: { right: V3; up: V3 },
	halfW: number,
	halfH: number,
	feather: number,
): number {
	const facing = dot(dir, center);
	if (facing < 0.2) return 0;
	const x = dot(dir, frame.right) / facing;
	const y = dot(dir, frame.up) / facing;
	const dx = Math.abs(x) - halfW;
	const dy = Math.abs(y) - halfH;
	const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
	const inside = Math.min(Math.max(dx, dy), 0);
	return smoothstep(feather, 0, outside + inside);
}

function tilt(frame: { right: V3; up: V3 }, radians: number): { right: V3; up: V3 } {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	const right = normalize([
		frame.right[0] * c + frame.up[0] * s,
		frame.right[1] * c + frame.up[1] * s,
		frame.right[2] * c + frame.up[2] * s,
	]);
	const up = normalize([
		frame.up[0] * c - frame.right[0] * s,
		frame.up[1] * c - frame.right[1] * s,
		frame.up[2] * c - frame.right[2] * s,
	]);
	return { right, up };
}

function blur(source: Float32Array, width: number, height: number): Float32Array {
	const out = new Float32Array(source.length);
	for (let y = 0; y < height; y++) {
		const y0 = y === 0 ? 0 : y - 1;
		const y1 = y === height - 1 ? y : y + 1;
		for (let x = 0; x < width; x++) {
			const x0 = (x + width - 1) % width;
			const x1 = (x + 1) % width;
			let r = 0;
			let g = 0;
			let b = 0;
			for (const yy of [y0, y, y1]) {
				for (const xx of [x0, x, x1]) {
					const index = (yy * width + xx) * 3;
					r += source[index] ?? 0;
					g += source[index + 1] ?? 0;
					b += source[index + 2] ?? 0;
				}
			}
			const dest = (y * width + x) * 3;
			out[dest] = r / 9;
			out[dest + 1] = g / 9;
			out[dest + 2] = b / 9;
		}
	}
	return out;
}

function basis(center: V3): { right: V3; up: V3 } {
	const hint: V3 = Math.abs(center[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
	const right = normalize(cross(hint, center));
	const up = normalize(cross(center, right));
	return { right, up };
}

function directionFromUv(u: number, v: number): V3 {
	const phi = (v - 0.5) * Math.PI;
	const theta = (u - 0.5) * Math.PI * 2;
	const cosPhi = Math.cos(phi);
	return [cosPhi * Math.cos(theta), Math.sin(phi), cosPhi * Math.sin(theta)];
}

function addScaled(out: V3, color: V3, amount: number): void {
	out[0] += color[0] * amount;
	out[1] += color[1] * amount;
	out[2] += color[2] * amount;
}

function quantize(channel: number): number {
	const clamped = Math.min(STUDIO_ENVIRONMENT_PEAK, Math.max(0, channel));
	return Math.round(clamped * 255);
}

function hash(x: number, y: number): number {
	const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return n - Math.floor(n);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

function dot(a: V3, b: V3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: V3, b: V3): V3 {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function lengthOf(value: V3): number {
	return Math.hypot(value[0], value[1], value[2]);
}

function normalize(value: V3): V3 {
	const len = lengthOf(value) || 1;
	return [value[0] / len, value[1] / len, value[2] / len];
}
