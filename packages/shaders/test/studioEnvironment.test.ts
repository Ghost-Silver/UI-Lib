import { describe, expect, it } from "vitest";
import {
	STUDIO_ENVIRONMENT_PEAK,
	STUDIO_ENVIRONMENT_SIZE,
	studioEnvironment,
} from "../src/studioEnvironment.js";

/**
 * The probe is the brightness contract. A wash would milk the lens; a missing
 * pane would leave the reflection as the old scene smear.
 */
describe("studioEnvironment", () => {
	it("is one quiet room with a window above the floor", () => {
		const first = studioEnvironment();
		const again = studioEnvironment();
		expect(again).toBe(first);
		expect(first.image.width).toBe(STUDIO_ENVIRONMENT_SIZE.width);
		expect(first.image.height).toBe(STUDIO_ENVIRONMENT_SIZE.height);
		expect(first.flipY).toBe(false);

		const data = first.image.data as Uint8Array;
		const { width, height } = STUDIO_ENVIRONMENT_SIZE;
		let sum = 0;
		let peak = 0;
		let peakY = 0;
		let bright = 0;
		const brightCut = 0.16 * 255;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = (y * width + x) * 4;
				const lum = Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0);
				sum += lum;
				if (lum > peak) {
					peak = lum;
					peakY = y;
				}
				if (lum > brightCut) bright += 1;
			}
		}
		const pixels = width * height;
		expect(peak / 255).toBeLessThanOrEqual(STUDIO_ENVIRONMENT_PEAK + 1 / 255);
		expect(peak / 255).toBeGreaterThan(0.22);
		expect(sum / pixels / 255).toBeLessThan(0.05);
		expect(bright / pixels).toBeGreaterThan(0.015);
		expect(bright / pixels).toBeLessThan(0.14);
		expect(peakY / height).toBeGreaterThan(0.55);

		const floor = averageRows(data, width, 0, Math.floor(height * 0.08));
		expect(floor).toBeLessThan(0.04);

		const hero = normalize([-1.1, 0.16, 9.6]);
		const heroCentre = sample(data, width, height, hero);
		const heroPane = maxInCone(data, width, height, hero, 0.62);
		const horizon = sample(data, width, height, normalize([hero[0], -0.055, hero[2]]));
		expect(heroCentre).toBeLessThan(0.1);
		expect(heroPane).toBeGreaterThan(0.22);
		expect(horizon).toBeGreaterThan(heroCentre);
		expect(horizon).toBeGreaterThan(0.08);

		const cinema = normalize([0.2, 0.1, 12.4]);
		expect(maxInCone(data, width, height, cinema, 0.55)).toBeGreaterThan(0.18);
		const swung = normalize([1.85, 0.5, 8.4]);
		expect(maxInCone(data, width, height, swung, 0.5)).toBeGreaterThan(0.08);
	});
});

function averageRows(data: Uint8Array, width: number, y0: number, y1: number): number {
	let sum = 0;
	let count = 0;
	for (let y = y0; y < y1; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			sum += Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0);
			count += 1;
		}
	}
	return sum / Math.max(1, count) / 255;
}

function sample(
	data: Uint8Array,
	width: number,
	height: number,
	dir: [number, number, number],
): number {
	const u = Math.atan2(dir[2], dir[0]) / (Math.PI * 2) + 0.5;
	const v = Math.asin(Math.min(1, Math.max(-1, dir[1]))) / Math.PI + 0.5;
	const x = Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))));
	const y = Math.min(height - 1, Math.max(0, Math.round(v * (height - 1))));
	const index = (y * width + x) * 4;
	return Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0) / 255;
}

function maxInCone(
	data: Uint8Array,
	width: number,
	height: number,
	dir: [number, number, number],
	minDot: number,
): number {
	let peak = 0;
	const step = 8;
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const u = (x + 0.5) / width;
			const v = (y + 0.5) / height;
			const phi = (v - 0.5) * Math.PI;
			const theta = (u - 0.5) * Math.PI * 2;
			const cosPhi = Math.cos(phi);
			const sampleDir: [number, number, number] = [
				cosPhi * Math.cos(theta),
				Math.sin(phi),
				cosPhi * Math.sin(theta),
			];
			const align = sampleDir[0] * dir[0] + sampleDir[1] * dir[1] + sampleDir[2] * dir[2];
			if (align < minDot) continue;
			peak = Math.max(peak, sample(data, width, height, sampleDir));
		}
	}
	return peak;
}

function normalize(value: [number, number, number]): [number, number, number] {
	const len = Math.hypot(value[0], value[1], value[2]) || 1;
	return [value[0] / len, value[1] / len, value[2] / len];
}
