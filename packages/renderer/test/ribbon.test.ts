import { describe, expect, it } from "vitest";
import { approachPoint, defaultPointerDistance, stirBreath } from "../src/pointerDistance.js";
import {
	pushTrailSample,
	stepTrail,
	TRAIL_CAPACITY,
	TRAIL_LIFE,
	type TrailPoint,
	trailPresence,
	trailSpacing,
	trailWidth,
	writeRibbon,
	writeRibbonColors,
	writeRibbonIndices,
	writeSoftDisc,
} from "../src/ribbon.js";

function widthAt(positions: Float32Array, index: number): number {
	const o = index * 6;
	return Math.hypot(
		(positions[o + 3] ?? 0) - (positions[o] ?? 0),
		(positions[o + 4] ?? 0) - (positions[o + 1] ?? 0),
		(positions[o + 5] ?? 0) - (positions[o + 2] ?? 0),
	);
}

describe("pointer ribbon", () => {
	it("tapers from a zero tail to the requested head width", () => {
		const points = [
			[0, 0, 0],
			[0.4, 0, 0],
			[0.8, 0.1, 0],
		] as const;
		const positions = new Float32Array(points.length * 6);
		const count = writeRibbon(positions, points, [0, 0, 8], 0.2);
		expect(count).toBe(3);
		expect(widthAt(positions, 0)).toBeCloseTo(0, 5);
		expect(widthAt(positions, 2)).toBeCloseTo(0.2, 5);
		expect(widthAt(positions, 1)).toBeGreaterThan(0);
		expect(widthAt(positions, 1)).toBeLessThan(0.2);
	});

	it("does not flip the strip when the path turns back", () => {
		const points = [
			[0, 0, 0],
			[0.3, 0.2, 0],
			[0.1, 0.5, 0],
			[-0.2, 0.7, 0.1],
			[-0.4, 0.4, 0],
		] as const;
		const positions = new Float32Array(points.length * 6);
		writeRibbon(positions, points, [0, 0, 6], 0.1);
		let prev: [number, number, number] | null = null;
		for (let i = 0; i < points.length; i++) {
			const o = i * 6;
			const side: [number, number, number] = [
				(positions[o + 3] ?? 0) - (positions[o] ?? 0),
				(positions[o + 4] ?? 0) - (positions[o + 1] ?? 0),
				(positions[o + 5] ?? 0) - (positions[o + 2] ?? 0),
			];
			if (prev && Math.hypot(...side) > 1e-6 && Math.hypot(...prev) > 1e-6) {
				const dot = side[0] * prev[0] + side[1] * prev[1] + side[2] * prev[2];
				expect(dot).toBeGreaterThanOrEqual(-1e-6);
			}
			prev = side;
		}
	});

	it("refuses a short buffer and a single sample", () => {
		expect(
			writeRibbon(
				new Float32Array(6),
				[
					[0, 0, 0],
					[1, 0, 0],
				],
				[0, 0, 4],
				0.1,
			),
		).toBe(0);
		expect(writeRibbon(new Float32Array(12), [[0, 0, 0]], [0, 0, 4], 0.1)).toBe(0);
		expect(writeRibbonIndices(new Uint16Array(6), 1)).toBe(0);
	});

	it("writes one quad per span and fades the tail to black", () => {
		const indices = new Uint16Array(12);
		expect(writeRibbonIndices(indices, 3)).toBe(12);
		expect(Array.from(indices)).toEqual([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]);
		const colors = new Float32Array(18);
		writeRibbonColors(colors, 3, 1, 0.5, 0.25, 0.4);
		expect(colors[0]).toBe(0);
		expect(colors[15]).toBeCloseTo(0.4, 5);
		expect(colors[16]).toBeCloseTo(0.2, 5);
		expect(colors[17]).toBeCloseTo(0.1, 5);
	});

	it("sticks the head, then drops the tail at the cap", () => {
		const samples: [number, number, number][] = [];
		pushTrailSample(samples, [0, 0, 0], 4, 0.05);
		pushTrailSample(samples, [0.01, 0, 0], 4, 0.05);
		expect(samples).toHaveLength(1);
		expect(samples[0]).toEqual([0.01, 0, 0]);
		pushTrailSample(samples, [0.2, 0, 0], 4, 0.05);
		pushTrailSample(samples, [0.4, 0, 0], 4, 0.05);
		pushTrailSample(samples, [0.6, 0, 0], 4, 0.05);
		pushTrailSample(samples, [0.8, 0, 0], 4, 0.05);
		expect(samples).toHaveLength(4);
		expect(samples[0]?.[0]).toBeCloseTo(0.2, 5);
		expect(samples[3]?.[0]).toBeCloseTo(0.8, 5);
		expect(TRAIL_CAPACITY).toBeGreaterThanOrEqual(16);
	});

	it("melts a stopped gesture and keeps the head", () => {
		const samples: TrailPoint[] = [];
		stepTrail(samples, [0, 0, 0], 1 / 60, 0, 8);
		stepTrail(samples, [0.2, 0, 0], 1 / 60, 400, 8);
		expect(samples).toHaveLength(2);
		expect(samples[1]?.age).toBe(0);
		for (let i = 0; i < 40; i++) stepTrail(samples, [0.2, 0, 0], 1 / 60, 0, 8);
		expect(samples).toHaveLength(1);
		expect(samples[0]?.at[0]).toBeCloseTo(0.2, 5);
		expect(samples[0]?.age).toBe(0);
		expect(trailPresence(0)).toBe(0);
		expect(trailPresence(400)).toBe(1);
		expect(TRAIL_LIFE).toBeLessThan(0.6);
		const colors = new Float32Array(18);
		writeRibbonColors(colors, 3, 1, 1, 1, 0.4, [TRAIL_LIFE, TRAIL_LIFE * 0.5, 0]);
		expect(colors[0]).toBe(0);
		expect(colors[6]).toBeLessThan(0.4 * 0.25);
		expect(colors[15]).toBeCloseTo(0.4, 5);
	});

	it("widens an eddy only while the hand is moving", () => {
		expect(stirBreath(0, 1.35, 2.6)).toEqual({ stir: 1.35, radius: 2.6 });
		expect(stirBreath(-20, 1.35, 2.6).radius).toBe(2.6);
		const flick = stirBreath(2000, 1.35, 2.6);
		expect(flick.stir).toBeGreaterThan(1.35);
		expect(flick.stir).toBeLessThanOrEqual(1.35 * 1.28);
		expect(flick.radius).toBeGreaterThan(2.6);
		expect(flick.radius).toBeLessThanOrEqual(2.6 * 1.35);
	});

	it("approaches a point without overshooting or jumping a stalled frame", () => {
		expect(approachPoint([0, 0, 0], [10, 0, 0], 0)).toEqual([0, 0, 0]);
		const step = approachPoint([0, 0, 0], [10, 0, 0], 1 / 60);
		expect(step[0]).toBeGreaterThan(0);
		expect(step[0]).toBeLessThan(10);
		const stall = approachPoint([0, 0, 0], [10, 0, 0], 4);
		expect(stall[0]).toBeLessThan(3);
	});

	it("widens a flick and leaves a still hand at the base width", () => {
		expect(trailSpacing(0)).toBeCloseTo(0.028, 5);
		expect(trailSpacing(2000)).toBeGreaterThan(trailSpacing(0));
		expect(trailSpacing(2000)).toBeLessThan(0.08);
		expect(trailWidth(0.08, 0)).toBeCloseTo(0.08, 5);
		expect(trailWidth(0.08, 2000)).toBeCloseTo(0.08 * 1.4, 4);
		expect(trailWidth(0, 400)).toBe(0);
		expect(defaultPointerDistance([0, 0, 10], [0, 0, 0])).toBeCloseTo(10, 5);
		expect(defaultPointerDistance([0, 0, 0.2], [0, 0, 0])).toBe(8);
	});

	it("draws a soft disc on the point, dark at the rim", () => {
		const positions = new Float32Array(14 * 9);
		const colors = new Float32Array(14 * 9);
		const count = writeSoftDisc(
			positions,
			colors,
			[1, 2, 3],
			[1, 2, 9],
			0.2,
			[1, 0.5, 0.25],
			0.4,
			14,
		);
		expect(count).toBe(42);
		expect(positions[0]).toBeCloseTo(1, 5);
		expect(positions[1]).toBeCloseTo(2, 5);
		expect(positions[2]).toBeCloseTo(3, 5);
		expect(colors[0]).toBeCloseTo(0.4, 5);
		expect(colors[3]).toBe(0);
		const rim = Math.hypot(
			(positions[3] ?? 0) - 1,
			(positions[4] ?? 0) - 2,
			(positions[5] ?? 0) - 3,
		);
		expect(rim).toBeCloseTo(0.2, 4);
		expect(
			writeSoftDisc(
				new Float32Array(3),
				new Float32Array(3),
				[0, 0, 0],
				[0, 0, 1],
				0.2,
				[1, 1, 1],
				1,
			),
		).toBe(0);
	});
});
