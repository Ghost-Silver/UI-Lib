import { describe, expect, it } from "vitest";
import {
	beatLocal,
	beatWeight,
	revealWeight,
	sampleTrack,
	scrollProgress,
} from "../src/index.js";

describe("revealWeight", () => {
	it("waits out the delay, then arrives", () => {
		expect(revealWeight(0, 0, 0.2, 0.08, 0.7)).toBe(0);
		expect(revealWeight(1.2, 0, 0.2, 0.08, 0.7)).toBe(1);
	});

	it("holds later words behind earlier ones", () => {
		const early = revealWeight(0.35, 0, 0.1, 0.1, 0.4);
		const later = revealWeight(0.35, 3, 0.1, 0.1, 0.4);
		expect(early).toBeGreaterThan(later);
		expect(later).toBe(0);
	});

	it("snaps when the duration is not positive", () => {
		expect(revealWeight(0.19, 0, 0.2, 0, 0)).toBe(0);
		expect(revealWeight(0.2, 0, 0.2, 0, 0)).toBe(1);
	});
});

describe("scrollProgress", () => {
	it("is 0 when the track top is on the pin line", () => {
		expect(scrollProgress(0, 400, 100)).toBe(0);
	});

	it("is 1 after the track has travelled its scrollable distance", () => {
		expect(scrollProgress(-300, 400, 100)).toBe(1);
	});

	it("clamps before the track arrives and after it leaves", () => {
		expect(scrollProgress(40, 400, 100)).toBe(0);
		expect(scrollProgress(-800, 400, 100)).toBe(1);
	});

	it("treats a sticky offset as the pin line", () => {
		expect(scrollProgress(80, 400, 100, 80)).toBe(0);
		expect(scrollProgress(40, 400, 100, 80)).toBeCloseTo(40 / 300);
	});
});

describe("beats", () => {
	it("holds a plateau and fades at the edges", () => {
		expect(beatWeight(0.5, 0.2, 0.8, 0.1)).toBe(1);
		expect(beatWeight(0, 0.2, 0.8, 0.1)).toBe(0);
		expect(beatWeight(1, 0.2, 0.8, 0.1)).toBe(0);
		const edge = beatWeight(0.25, 0.2, 0.8, 0.1);
		expect(edge).toBeGreaterThan(0);
		expect(edge).toBeLessThan(1);
	});

	it("still peaks when fade is wider than the chapter", () => {
		expect(beatWeight(0.5, 0.4, 0.6, 0.5)).toBeCloseTo(1, 5);
	});

	it("maps a chapter to a local 0..1 clock", () => {
		expect(beatLocal(0.2, 0.2, 0.8)).toBe(0);
		expect(beatLocal(0.5, 0.2, 0.8)).toBeCloseTo(0.5);
		expect(beatLocal(0.9, 0.2, 0.8)).toBe(1);
	});
});

describe("sampleTrack", () => {
	const keys = [
		{ at: 0, value: [0, 10] },
		{ at: 1, value: [10, 0] },
	];

	it("holds outside the first and last key", () => {
		expect(sampleTrack(-1, keys)).toEqual([0, 10]);
		expect(sampleTrack(2, keys)).toEqual([10, 0]);
	});

	it("eases through the midpoint", () => {
		const mid = sampleTrack(0.5, keys);
		expect(mid[0]).toBeCloseTo(5);
		expect(mid[1]).toBeCloseTo(5);
	});

	it("returns an empty track for no keys", () => {
		expect(sampleTrack(0.4, [])).toEqual([]);
	});
});
