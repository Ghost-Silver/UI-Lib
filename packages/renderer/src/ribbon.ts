import { smoothstep } from "@ui-lib/core";

/** Samples a pointer ribbon will keep. The geometry buffer is sized to this. */
export const TRAIL_CAPACITY = 48;

/** Seconds a sample stays after the hand has left it. Then the gesture is gone. */
export const TRAIL_LIFE = 0.46;

export interface TrailPoint {
	at: [number, number, number];
	age: number;
}

/**
 * Push a world sample. The head sticks to `point` until the pointer has moved
 * `spacing` units, then a new sample drops and the tail falls off.
 */
export function pushTrailSample(
	samples: [number, number, number][],
	point: readonly [number, number, number],
	length: number,
	spacing = 0.03,
): void {
	const cap = Math.max(2, Math.min(TRAIL_CAPACITY, Math.floor(length)));
	const next: [number, number, number] = [point[0], point[1], point[2]];
	const last = samples[samples.length - 1];
	if (!last) {
		samples.push(next);
		return;
	}
	const dx = next[0] - last[0];
	const dy = next[1] - last[1];
	const dz = next[2] - last[2];
	const gap = spacing > 0 ? spacing : 0.03;
	if (dx * dx + dy * dy + dz * dz < gap * gap) {
		last[0] = next[0];
		last[1] = next[1];
		last[2] = next[2];
	} else {
		samples.push(next);
	}
	if (samples.length > cap) samples.splice(0, samples.length - cap);
}

/** Gap between ribbon samples. A flick spaces them out; a still hand does not. */
export function trailSpacing(speed: number, base = 0.028): number {
	const gap = base > 0 ? base : 0.028;
	const motion = smoothstep(40, 900, Math.max(0, speed));
	return gap + motion * 0.045;
}

/** Head width. Caps at 1.4× so a fast move widens the gesture without a smear. */
export function trailWidth(base: number, speed: number): number {
	if (!(base > 0)) return 0;
	const motion = smoothstep(40, 900, Math.max(0, speed));
	return base * (1 + motion * 0.4);
}

/** 0 when the hand is still, 1 once the stroke is readable. The ribbon uses this. */
export function trailPresence(speed: number): number {
	return smoothstep(20, 160, Math.max(0, speed));
}

/**
 * Stick the head to `point`, drop a sample once the hand has moved `spacing`,
 * and age the rest. Expired samples fall off, so a stopped hand does not leave
 * a frozen line. Returns nothing; `samples` is updated in place.
 */
export function stepTrail(
	samples: TrailPoint[],
	point: readonly [number, number, number],
	dt: number,
	speed: number,
	length: number,
	life = TRAIL_LIFE,
): void {
	const cap = Math.max(2, Math.min(TRAIL_CAPACITY, Math.floor(length)));
	const spacing = trailSpacing(speed);
	const head = samples[samples.length - 1];
	if (!head) {
		samples.push({ at: [point[0], point[1], point[2]], age: 0 });
	} else {
		const dx = point[0] - head.at[0];
		const dy = point[1] - head.at[1];
		const dz = point[2] - head.at[2];
		if (dx * dx + dy * dy + dz * dz < spacing * spacing) {
			head.at[0] = point[0];
			head.at[1] = point[1];
			head.at[2] = point[2];
			head.age = 0;
		} else {
			samples.push({ at: [point[0], point[1], point[2]], age: 0 });
		}
	}
	const step = dt > 0 ? Math.min(dt, 1 / 20) : 0;
	const headIndex = samples.length - 1;
	for (let i = 0; i < headIndex; i++) {
		const sample = samples[i];
		if (sample) sample.age += step;
	}
	let write = 0;
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i];
		if (!sample) continue;
		if (i === headIndex || !(life > 0) || sample.age < life) samples[write++] = sample;
	}
	samples.length = write;
	if (samples.length > cap) samples.splice(0, samples.length - cap);
}

/**
 * Camera-facing ribbon. Two vertices per sample, tail width 0, head width
 * `width`. Consecutive sides stay the same direction so a turn does not flip
 * the strip. Returns the sample count written, or 0 when the buffer is short.
 */
export function writeRibbon(
	positions: Float32Array,
	points: readonly (readonly [number, number, number])[],
	camera: readonly [number, number, number],
	width: number,
): number {
	const count = points.length;
	if (count < 2 || !(width > 0) || positions.length < count * 6) return 0;
	let prevX = 0;
	let prevY = 1;
	let prevZ = 0;
	let hasPrev = false;
	for (let i = 0; i < count; i++) {
		const point = points[i];
		if (!point) return 0;
		const before = points[Math.max(0, i - 1)] ?? point;
		const after = points[Math.min(count - 1, i + 1)] ?? point;
		const tx = after[0] - before[0];
		const ty = after[1] - before[1];
		const tz = after[2] - before[2];
		const vx = point[0] - camera[0];
		const vy = point[1] - camera[1];
		const vz = point[2] - camera[2];
		let sx = ty * vz - tz * vy;
		let sy = tz * vx - tx * vz;
		let sz = tx * vy - ty * vx;
		let length = Math.hypot(sx, sy, sz);
		if (length < 1e-8) {
			const view = Math.hypot(vx, vy, vz);
			const ax = Math.abs(vx) < 0.9 * view ? 1 : 0;
			const ay = ax === 0 ? 1 : 0;
			sx = ay * vz;
			sy = -ax * vz;
			sz = ax * vy - ay * vx;
			length = Math.hypot(sx, sy, sz) || 1;
		}
		sx /= length;
		sy /= length;
		sz /= length;
		if (hasPrev && sx * prevX + sy * prevY + sz * prevZ < 0) {
			sx = -sx;
			sy = -sy;
			sz = -sz;
		}
		prevX = sx;
		prevY = sy;
		prevZ = sz;
		hasPrev = true;
		const half = width * (i / (count - 1)) * 0.5;
		sx *= half;
		sy *= half;
		sz *= half;
		const offset = i * 6;
		positions[offset] = point[0] - sx;
		positions[offset + 1] = point[1] - sy;
		positions[offset + 2] = point[2] - sz;
		positions[offset + 3] = point[0] + sx;
		positions[offset + 4] = point[1] + sy;
		positions[offset + 5] = point[2] + sz;
	}
	return count;
}

/** Triangle indices for a ribbon of `count` samples. Returns the index count. */
export function writeRibbonIndices(indices: Uint16Array, count: number): number {
	if (count < 2) return 0;
	const quads = count - 1;
	if (indices.length < quads * 6) return 0;
	let write = 0;
	for (let i = 0; i < quads; i++) {
		const a = i * 2;
		indices[write++] = a;
		indices[write++] = a + 1;
		indices[write++] = a + 2;
		indices[write++] = a + 1;
		indices[write++] = a + 3;
		indices[write++] = a + 2;
	}
	return write;
}

/**
 * Quadratic fade, tail at 0, head at `color * head`. Both vertices of a ring
 * match. `head` stays under 1 so an additive ribbon does not become a lamp.
 */
export function writeRibbonColors(
	colors: Float32Array,
	count: number,
	r: number,
	g: number,
	b: number,
	head = 0.42,
	ages?: readonly number[],
	life = TRAIL_LIFE,
): void {
	if (count < 2 || colors.length < count * 6) return;
	const gain = head > 0 ? head : 0;
	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		const age = ages?.[i] ?? 0;
		const remain = life > 0 ? Math.max(0, 1 - age / life) : 1;
		const fade = t * t * gain * remain;
		const cr = r * fade;
		const cg = g * fade;
		const cb = b * fade;
		const offset = i * 6;
		colors[offset] = cr;
		colors[offset + 1] = cg;
		colors[offset + 2] = cb;
		colors[offset + 3] = cr;
		colors[offset + 4] = cg;
		colors[offset + 5] = cb;
	}
}

/**
 * Camera-facing disc. Center is `rgb * gain`, rim is black, so an additive
 * draw reads as a soft point rather than a marble. Returns the vertex count.
 */
export function writeSoftDisc(
	positions: Float32Array,
	colors: Float32Array,
	center: readonly [number, number, number],
	camera: readonly [number, number, number],
	radius: number,
	rgb: readonly [number, number, number],
	gain: number,
	segments = 14,
): number {
	const count = Math.max(3, Math.floor(segments));
	const verts = count * 3;
	if (!(radius > 0) || positions.length < verts * 3 || colors.length < verts * 3) return 0;
	const vx = center[0] - camera[0];
	const vy = center[1] - camera[1];
	const vz = center[2] - camera[2];
	const view = Math.hypot(vx, vy, vz) || 1;
	const zx = vx / view;
	const zy = vy / view;
	const zz = vz / view;
	let rx = zz;
	let ry = 0;
	let rz = -zx;
	let right = Math.hypot(rx, ry, rz);
	if (right < 1e-5) {
		rx = 1;
		ry = 0;
		rz = 0;
		right = 1;
	}
	rx /= right;
	ry /= right;
	rz /= right;
	const ux = zy * rz - zz * ry;
	const uy = zz * rx - zx * rz;
	const uz = zx * ry - zy * rx;
	const cr = rgb[0] * (gain > 0 ? gain : 0);
	const cg = rgb[1] * (gain > 0 ? gain : 0);
	const cb = rgb[2] * (gain > 0 ? gain : 0);
	let write = 0;
	for (let i = 0; i < count; i++) {
		const a0 = (i / count) * Math.PI * 2;
		const a1 = ((i + 1) / count) * Math.PI * 2;
		const put = (angle: number, scale: number, brightness: number) => {
			const c = Math.cos(angle) * radius * scale;
			const s = Math.sin(angle) * radius * scale;
			positions[write] = center[0] + rx * c + ux * s;
			positions[write + 1] = center[1] + ry * c + uy * s;
			positions[write + 2] = center[2] + rz * c + uz * s;
			colors[write] = cr * brightness;
			colors[write + 1] = cg * brightness;
			colors[write + 2] = cb * brightness;
			write += 3;
		};
		put(0, 0, 1);
		put(a0, 1, 0);
		put(a1, 1, 0);
	}
	return verts;
}
