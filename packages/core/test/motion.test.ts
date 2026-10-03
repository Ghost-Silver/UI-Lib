import { describe, expect, it } from "vitest";
import {
	createSpring,
	MOTION_PRESETS,
	type MotionSpec,
	settleTime,
	specToSpring,
	springToSpec,
} from "../src/motion.js";

/**
 * Springs as physics rather than as feel.
 *
 * The point of this module is that a motion has a *meaning* — a damping ratio
 * and a frequency — rather than a pair of constants someone arrived at by
 * dragging a slider. These tests hold it to that: the conversion has to be
 * exact in both directions, the presets have to land where the literature says
 * they should, and a spring built from a spec has to actually behave like one.
 */

/** Step a spring to rest and report what happened. */
function simulate(spec: MotionSpec, seconds = 3, dt = 1 / 240) {
	const spring = createSpring(0, spec);
	spring.target = 1;
	let peak = 0;
	/** Sign changes in velocity, which is one overshoot each. */
	let crossings = 0;
	let previous = 0;
	for (let t = 0; t < seconds; t += dt) {
		const v = spring.step(dt);
		peak = Math.max(peak, v);
		const velocity = v - previous;
		if (
			previous !== 0 &&
			Math.sign(velocity) !== Math.sign(previous) &&
			Math.abs(velocity) > 1e-6
		) {
			crossings += 1;
		}
		previous = velocity;
	}
	return { peak, crossings, spring };
}

describe("spec conversion", () => {
	it("round-trips exactly", () => {
		for (const spec of Object.values(MOTION_PRESETS)) {
			const options = specToSpring(spec);
			const back = springToSpec({
				stiffness: options.stiffness!,
				damping: options.damping!,
				mass: options.mass,
			});
			expect(back.damping).toBeCloseTo(spec.damping, 9);
			expect(back.frequency).toBeCloseTo(spec.frequency, 9);
		}
	});

	it("uses the definition of the damping ratio", () => {
		// zeta = c / (2 sqrt(km)), checked against the formula rather than against
		// the implementation, because it is the one equation the module is about.
		const spec: MotionSpec = { damping: 0.6, frequency: 20, mass: 2 };
		const { stiffness, damping, mass } = specToSpring(spec);
		expect(damping).toBeCloseTo(2 * 0.6 * Math.sqrt(stiffness! * mass!), 9);
		expect(stiffness).toBeCloseTo(2 * 20 * 20, 9);
	});
});

describe("the presets", () => {
	it("land in the band that reads as elastic", () => {
		// Below roughly 0.4 a control rings long enough to look broken; above
		// 0.85 it stops reading as soft at all. Only the idle motion is allowed
		// out, because an idle motion is not being aimed at anything.
		for (const [name, spec] of Object.entries(MOTION_PRESETS)) {
			if (name === "float") continue;
			expect(spec.damping, `${name} is outside the elastic band`).toBeGreaterThanOrEqual(0.4);
			expect(spec.damping, `${name} is outside the elastic band`).toBeLessThanOrEqual(0.85);
		}
	});

	it("produces the stiffness a button and a badge are specified at", () => {
		// The bands are not invented here; they are the ones the design system
		// documents, and the first version of these presets overshot them by
		// nearly a factor of two because frequency and stiffness were confused.
		const press = specToSpring(MOTION_PRESETS.press);
		expect(press.stiffness!).toBeGreaterThanOrEqual(320);
		expect(press.stiffness!).toBeLessThanOrEqual(380);

		const badge = specToSpring(MOTION_PRESETS.badge);
		expect(badge.stiffness!).toBeGreaterThanOrEqual(400);
		expect(badge.stiffness!).toBeLessThanOrEqual(500);

		const pop = specToSpring(MOTION_PRESETS.pop);
		expect(pop.stiffness!).toBeGreaterThanOrEqual(180);
		expect(pop.stiffness!).toBeLessThanOrEqual(220);
	});

	it("actually overshoots where it is supposed to and not where it is not", () => {
		// The behaviour the ratios predict, measured rather than assumed.
		expect(simulate(MOTION_PRESETS.press).peak).toBeGreaterThan(1);
		expect(simulate(MOTION_PRESETS.pop).peak).toBeGreaterThan(1.04);
		expect(simulate(MOTION_PRESETS.settle).peak).toBeLessThan(1.01);
		expect(simulate(MOTION_PRESETS.float).peak).toBeLessThan(1.001);
	});

	it("settles within the time the envelope predicts", () => {
		for (const spec of Object.values(MOTION_PRESETS)) {
			const budget = settleTime(spec);
			const { spring } = simulate(spec, budget + 0.2);
			expect(spring.settled, `did not settle within ${budget}s`).toBe(true);
		}
	});

	it("is stable at any frame rate", () => {
		// Fixed sub-steps exist so a spring does not explode on a slow frame or
		// go subtly wrong on a fast one. Both ends are checked, including a
		// deliberately absurd dt.
		for (const dt of [1 / 240, 1 / 60, 1 / 20, 0.5]) {
			const spring = createSpring(0, "pop");
			spring.target = 1;
			for (let i = 0; i < 200; i += 1) spring.step(dt);
			expect(Number.isFinite(spring.value), `diverged at dt=${dt}`).toBe(true);
			expect(spring.value, `wrong at dt=${dt}`).toBeGreaterThan(0.9);
			expect(spring.value, `overshot badly at dt=${dt}`).toBeLessThan(1.15);
		}
	});

	it("carries velocity across a re-aim, so an interruption is continuous", () => {
		const spring = createSpring(0, "pop");
		spring.target = 1;
		for (let i = 0; i < 20; i += 1) spring.step(1 / 120);
		const speed = Math.abs(spring.velocity);
		expect(speed).toBeGreaterThan(0);
		// Re-aim mid-flight. The value must not jump, and the spring must not
		// forget it was already moving.
		const before = spring.value;
		spring.target = -1;
		expect(spring.value).toBe(before);
		expect(Math.abs(spring.velocity)).toBe(speed);
	});
});

describe("settleTime", () => {
	it("shrinks as the motion gets snappier", () => {
		const slow = settleTime({ damping: 0.5, frequency: 8 });
		const fast = settleTime({ damping: 0.5, frequency: 30 });
		expect(fast).toBeLessThan(slow);
	});

	it("accounts for damping as well as speed", () => {
		// Two motions of the same frequency, one ringing far longer than the
		// other. Reporting only frequency would call them equal.
		const ringing = settleTime({ damping: 0.4, frequency: 20 });
		const damped = settleTime({ damping: 0.9, frequency: 20 });
		expect(damped).toBeLessThan(ringing);
	});

	it("stays finite for a degenerate spec", () => {
		expect(Number.isFinite(settleTime({ damping: 0, frequency: 0 }))).toBe(true);
	});
});
