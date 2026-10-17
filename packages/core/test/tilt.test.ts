import { describe, expect, it } from "vitest";
import { TILT_LIMIT_DEGREES, Tilt } from "../src/tilt.js";

const DT = 1 / 60;

/** Drive a tilt with a constant pointer speed for `frames` frames. */
function drag(tilt: Tilt, speedX: number, frames: number) {
	let x = 0;
	let angle = 0;
	for (let f = 0; f < frames; f += 1) {
		x += speedX * DT;
		tilt.push(x, f * DT * 1000);
		angle = tilt.step(DT);
	}
	return angle;
}

describe("the tilt equation", () => {
	/**
	 * The specification's formula, checked at its own boundaries.
	 *
	 * `θ = -clamp(vx / vmax × 8°, -8°, +8°)`. The sign is the part that is easy to
	 * lose and easy to notice: a thing moving right leans left, the way a hanging
	 * object does when its support runs out ahead of it.
	 */
	it("negates the speed, so a rightward move leans left", () => {
		expect(Tilt.targetFor(450)).toBeLessThan(0);
		expect(Tilt.targetFor(-450)).toBeGreaterThan(0);
	});

	it("is proportional below the limit and clamped above it", () => {
		expect(Tilt.targetFor(0)).toBe(0);
		expect(Tilt.targetFor(450)).toBeCloseTo(-TILT_LIMIT_DEGREES / 2, 5);
		expect(Tilt.targetFor(900)).toBeCloseTo(-TILT_LIMIT_DEGREES, 5);
		// Ten times the speed is not ten times the angle.
		expect(Tilt.targetFor(9000)).toBeCloseTo(-TILT_LIMIT_DEGREES, 5);
	});

	it("never leaves the limit, whatever it is fed", () => {
		for (const speed of [1200, 5000, 1e6, -1e6]) {
			expect(Math.abs(Tilt.targetFor(speed))).toBeLessThanOrEqual(TILT_LIMIT_DEGREES);
		}
	});
});

describe("the tilt as a motion", () => {
	/**
	 * The lag is the section's whole point — "a plush sign hanging from a hook,
	 * with a light tail-drag when pulled". A rigid multiplication has no tail.
	 */
	it("lags the speed rather than following it exactly", () => {
		const tilt = new Tilt();
		const afterOneFrame = drag(tilt, 900, 1);
		const target = Tilt.targetFor(900);
		expect(Math.abs(afterOneFrame)).toBeLessThan(Math.abs(target) * 0.5);
		/*
		 * And it approaches without arriving, which is the spring and not a bug.
		 *
		 * A spring driven toward a moving target never reaches it; here the target
		 * is the speed, the speed decays every frame, and the two settle where the
		 * spring's pull equals the decay. Measured after 90 frames it sits around
		 * -7.2 against a -8 target, and *that gap is the tail* — a value that
		 * arrived exactly would be a lerp with extra steps.
		 */
		// Both negative, so "closer to zero" is the direction it stops short in.
		const settled = drag(new Tilt(), 900, 90);
		expect(Math.abs(settled)).toBeLessThan(Math.abs(target));
		expect(Math.abs(settled)).toBeGreaterThan(Math.abs(target) * 0.85);
	});

	/**
	 * `pointermove` fires only while the pointer moves, so a speed read from the
	 * last two events stays at its final value forever. The object would hang at
	 * an angle that nothing is holding it at.
	 */
	it("straightens when the pointer stops with no further events", () => {
		const tilt = new Tilt();
		drag(tilt, 900, 60);
		expect(Math.abs(tilt.angle)).toBeGreaterThan(4);
		tilt.release();
		let angle = tilt.angle;
		for (let f = 0; f < 120; f += 1) angle = tilt.step(DT);
		expect(Math.abs(angle)).toBeLessThan(0.5);
	});

	it("settles exactly to zero rather than near it", () => {
		const tilt = new Tilt();
		drag(tilt, 900, 30);
		tilt.release();
		// Two seconds is generous; the point is that it reaches zero and stays.
		let last = tilt.angle;
		for (let f = 0; f < 120; f += 1) last = tilt.step(DT);
		expect(last).toBe(0);
	});

	/**
	 * A touch device can emit two samples in the same millisecond. Dividing by a
	 * zero delta produces an infinity, and an infinity fed into the spring never
	 * comes back — the component would stay broken for the rest of the session.
	 */
	it("survives two samples at the same timestamp", () => {
		const tilt = new Tilt();
		tilt.push(0, 1000);
		tilt.push(500, 1000);
		const angle = tilt.step(DT);
		expect(Number.isFinite(angle)).toBe(true);
	});

	it("does not depend on the frame rate more than the physics allows", () => {
		/*
		 * Measured across 30 to 240 fps the same half-second gesture lands between
		 * -6.57 and -7.77, a spread of 1.2 degrees on an 8 degree limit.
		 *
		 * The residual is the semi-implicit integrator in `Spring`, which is stable
		 * at any step but not exact at large ones — and the alternative, a
		 * sub-stepping integrator, buys accuracy on a decorative tilt at the cost of
		 * a loop inside a loop that runs every frame. The bound is set to catch a
		 * regression, not to claim an exactness the physics does not have: a change
		 * that made the tilt frame-rate *dependent* would move this by several
		 * degrees, not by one.
		 */
		const slow = new Tilt();
		const fast = new Tilt();
		let slowAngle = 0;
		let fastAngle = 0;
		for (let f = 0; f < 30; f += 1) {
			slow.push(900 * (f / 30), (f / 30) * 1000);
			slowAngle = slow.step(1 / 30);
		}
		for (let f = 0; f < 120; f += 1) {
			fast.push(900 * (f / 120), (f / 120) * 1000);
			fastAngle = fast.step(1 / 120);
		}
		expect(Math.abs(slowAngle - fastAngle)).toBeLessThan(2);
	});
});
