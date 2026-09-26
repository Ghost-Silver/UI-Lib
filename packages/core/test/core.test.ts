import { describe, expect, it } from "vitest";
import {
	Easing,
	QUALITY_PRESETS,
	QualityManager,
	Spring,
	clamp,
	damp,
	lerp,
	mapRange,
	scoreTier,
	smoothstep,
	wrap,
} from "../src/index.js";
import { Disposer } from "../src/lifecycle.js";
import { detectCapabilitiesSync } from "../src/device.js";

describe("math", () => {
	it("clamps, lerps and maps ranges", () => {
		expect(clamp(5, 0, 3)).toBe(3);
		expect(clamp(-5, 0, 3)).toBe(0);
		expect(lerp(0, 10, 0.25)).toBe(2.5);
		expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
		expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
		expect(wrap(-1, 0, 10)).toBe(9);
	});

	it("damp is frame-rate independent", () => {
		// One 100 ms step must land in the same place as ten 10 ms steps.
		let a = 0;
		a = damp(a, 1, 6, 0.1);
		let b = 0;
		for (let i = 0; i < 10; i++) b = damp(b, 1, 6, 0.01);
		expect(a).toBeCloseTo(b, 6);
	});

	it("easing stays in the unit range", () => {
		for (const fn of Object.values(Easing)) {
			expect(fn(0)).toBeGreaterThanOrEqual(-0.001);
			expect(fn(1)).toBeLessThanOrEqual(1.001);
			expect(Number.isFinite(fn(0.37))).toBe(true);
		}
	});
});

describe("Spring", () => {
	it("settles exactly on the target", () => {
		const spring = new Spring(0, { stiffness: 180, damping: 24 });
		spring.target = 10;
		for (let i = 0; i < 600; i++) spring.step(1 / 60);
		expect(spring.settled).toBe(true);
		expect(spring.value).toBe(10);
		expect(spring.velocity).toBe(0);
	});

	it("is stable at low frame rates", () => {
		const spring = new Spring(0, { stiffness: 200, damping: 20 });
		spring.target = 1;
		for (let i = 0; i < 200; i++) spring.step(1 / 10);
		expect(Number.isFinite(spring.value)).toBe(true);
		expect(Math.abs(spring.value - 1)).toBeLessThan(0.01);
	});
});

describe("quality", () => {
	it("scores a capable desktop as tier 3", () => {
		const tier = scoreTier({
			backend: "webgpu",
			webgpu: true,
			webgl2: true,
			cores: 12,
			memoryGB: 16,
			maxTextureSize: 16384,
			devicePixelRatio: 2,
			mobile: false,
			touch: false,
			reducedMotion: false,
			saveData: false,
		});
		expect(tier).toBe(3);
	});

	it("scores a machine with no GPU as tier 0", () => {
		const tier = scoreTier({
			backend: "none",
			webgpu: false,
			webgl2: false,
			cores: 8,
			memoryGB: 8,
			maxTextureSize: 0,
			devicePixelRatio: 2,
			mobile: false,
			touch: false,
			reducedMotion: false,
			saveData: false,
		});
		expect(tier).toBe(0);
		expect(QUALITY_PRESETS[0].allowPostFx).toBe(false);
	});

	it("degrades when frames get slow and recovers when they do not", () => {
		const manager = new QualityManager({ tier: 3, auto: true });
		expect(manager.tier).toBe(3);

		// 20 fps for a while → downgrade.
		for (let i = 0; i < 30 * 4; i++) manager.sample(1 / 20);
		expect(manager.tier).toBeLessThan(3);

		const floor = manager.tier;
		for (let i = 0; i < 30; i++) manager.sample(1 / 20);
		expect(manager.tier).toBe(floor);
		expect(manager.tier).toBeGreaterThanOrEqual(0);
	});

	it("honours a manual tier", () => {
		const manual = new QualityManager({ tier: 1, auto: true });
		expect(manual.tier).toBe(1);
		expect(manual.settings.dprCap).toBe(QUALITY_PRESETS[1].dprCap);
	});
});

describe("Disposer", () => {
	it("runs teardowns once, in reverse order", () => {
		const seen: string[] = [];
		const disposer = new Disposer();
		disposer.add(() => seen.push("a"));
		disposer.add({ dispose: () => seen.push("b") });
		disposer.dispose();
		disposer.dispose();
		expect(seen).toEqual(["b", "a"]);
	});

	it("immediately runs teardown added after disposal", () => {
		const disposer = new Disposer();
		disposer.dispose();
		let ran = false;
		disposer.add(() => {
			ran = true;
		});
		expect(ran).toBe(true);
	});
});

describe("device", () => {
	it("is SSR-safe", () => {
		const caps = detectCapabilitiesSync();
		expect(caps.backend).toBe("none");
		expect(caps.cores).toBeGreaterThanOrEqual(1);
	});
});
