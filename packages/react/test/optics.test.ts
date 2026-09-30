import { describe, expect, it } from "vitest";
import {
	CINEMA_LENS_ENVIRONMENT,
	FIELD_LOOKS,
	fieldOptions,
	GLASS_LOOKS,
	LENS_LOOKS,
	resolveLensLook,
} from "../src/looks.js";
import { magneticOffset } from "../src/magneticMath.js";

describe("magnetic offset", () => {
	it("is zero on the centre, outside the radius, and at the edge", () => {
		expect(magneticOffset({ x: 0, y: 0 }, { x: 0, y: 0 }, 100, 1)).toEqual({ x: 0, y: 0 });
		expect(magneticOffset({ x: 140, y: 0 }, { x: 0, y: 0 }, 100, 1)).toEqual({ x: 0, y: 0 });
		expect(magneticOffset({ x: 100, y: 0 }, { x: 0, y: 0 }, 100, 1)).toEqual({ x: 0, y: 0 });
		expect(magneticOffset({ x: 20, y: 0 }, { x: 0, y: 0 }, 0, 1)).toEqual({ x: 0, y: 0 });
	});

	it("closes part of the gap and never overshoots the pointer", () => {
		const offset = magneticOffset({ x: 40, y: 0 }, { x: 0, y: 0 }, 100, 0.5);
		expect(offset.x).toBeGreaterThan(0);
		expect(offset.x).toBeLessThan(40);
		expect(offset.y).toBe(0);
	});
});

describe("optics looks", () => {
	it("keeps the hot optic available and the default under it", () => {
		expect(LENS_LOOKS.flare.coreStrength).toBe(1);
		expect(LENS_LOOKS.crystal.coreStrength).toBeLessThan(1);
		expect(LENS_LOOKS.crystal.specular).toBeLessThan(LENS_LOOKS.flare.specular);
		expect(resolveLensLook("crystal", { specular: undefined }).specular).toBe(
			LENS_LOOKS.crystal.specular,
		);
		expect(resolveLensLook("ember", { caustic: 0.01 }).caustic).toBe(0.01);
		expect(resolveLensLook("ember", { caustic: 0.01 }).tint).toBe(LENS_LOOKS.ember.tint);
		expect(LENS_LOOKS.crystal.environment).toBeGreaterThan(CINEMA_LENS_ENVIRONMENT);
		expect(LENS_LOOKS.flare.environment).toBeGreaterThan(LENS_LOOKS.crystal.environment);
		expect(LENS_LOOKS.ice.environment).toBeLessThan(LENS_LOOKS.crystal.environment);
		expect(CINEMA_LENS_ENVIRONMENT).toBeLessThan(0.5);
		expect(resolveLensLook("flare", { environment: CINEMA_LENS_ENVIRONMENT }).environment).toBe(
			CINEMA_LENS_ENVIRONMENT,
		);
		expect(GLASS_LOOKS.product.environment).toBeLessThan(LENS_LOOKS.crystal.environment);
		expect(GLASS_LOOKS.cinema.environment).toBeLessThan(GLASS_LOOKS.product.environment);
		expect(GLASS_LOOKS.cinema.environment).toBeLessThanOrEqual(CINEMA_LENS_ENVIRONMENT);
		expect(GLASS_LOOKS.quiet.environment).toBeLessThan(GLASS_LOOKS.cinema.environment);
		expect(GLASS_LOOKS.pill.environment).toBeLessThanOrEqual(GLASS_LOOKS.cinema.environment);
	});

	it("merges a field look without dropping the emitter shape", () => {
		const mote = fieldOptions("mote", {
			intensity: 0.4,
			emitter: { position: [1, 2, 3] },
		});
		expect(mote.intensity).toBe(0.4);
		expect(mote.emitter?.shape).toBe("sphere");
		expect(mote.emitter?.radius).toBe(FIELD_LOOKS.mote.emitter?.radius);
		expect(mote.emitter?.position).toEqual([1, 2, 3]);
		expect(mote.forces?.attractor).toBe(FIELD_LOOKS.mote.forces?.attractor);
		expect(FIELD_LOOKS.mote.count).toBe(1_400);
		expect(FIELD_LOOKS.spark.count).toBe(64);
		expect(asCount(FIELD_LOOKS.quiet.count)).toBeLessThan(asCount(FIELD_LOOKS.mote.count));
		expect(FIELD_LOOKS.quiet.intensity).toBeLessThan(FIELD_LOOKS.mote.intensity ?? 1);
		expect(FIELD_LOOKS.cursor.intensity ?? 1).toBeLessThanOrEqual(
			FIELD_LOOKS.quiet.intensity ?? 1,
		);
		expect(asCount(FIELD_LOOKS.cursor.count)).toBeGreaterThan(asCount(FIELD_LOOKS.quiet.count));
		expect(GLASS_LOOKS.cursor.environment).toBeLessThan(GLASS_LOOKS.cinema.environment);
		expect(GLASS_LOOKS.cursor.pointerStrength).toBeGreaterThan(
			GLASS_LOOKS.quiet.pointerStrength,
		);
		expect(GLASS_LOOKS.cursor.pointerStrength).toBeLessThanOrEqual(
			GLASS_LOOKS.cinema.pointerStrength,
		);
		expect(FIELD_LOOKS.aurora.forces?.attractor).toBe(0);
		expect(FIELD_LOOKS.aurora.forces?.stir ?? 0).toBeGreaterThan(0);
		expect(FIELD_LOOKS.aurora.forces?.stirRadius ?? 0).toBeGreaterThan(1);
		expect(FIELD_LOOKS.aurora.count ?? 0).toBeGreaterThan(8_000);
		expect(FIELD_LOOKS.aurora.count ?? 0).toBeLessThan(80_000);
		expect(FIELD_LOOKS.aurora.intensity ?? 1).toBeLessThanOrEqual(0.52);
		expect(FIELD_LOOKS.aurora.stirTint ?? 0).toBeGreaterThan(0);
		expect(FIELD_LOOKS.aurora.stirTint ?? 1).toBeLessThanOrEqual(1);
		expect(GLASS_LOOKS.veil.environment).toBeLessThanOrEqual(GLASS_LOOKS.cinema.environment);
	});

	it("keeps the registration panes as mix scales, not a retune of the other looks", () => {
		expect(GLASS_LOOKS.product.refraction).toBe(36);
		expect(GLASS_LOOKS.quiet.frost).toBe(6);
		expect(GLASS_LOOKS.press.refraction).toBeGreaterThan(GLASS_LOOKS.product.refraction);
		expect(GLASS_LOOKS.press.dispersion).toBeGreaterThan(GLASS_LOOKS.cinema.dispersion);
		expect(GLASS_LOOKS.press.frost).toBeLessThan(GLASS_LOOKS.quiet.frost);
		expect(GLASS_LOOKS.milk.frost).toBeGreaterThan(GLASS_LOOKS.press.frost * 8);
		expect(GLASS_LOOKS.milk.dispersion).toBeLessThan(GLASS_LOOKS.press.dispersion);
		expect(GLASS_LOOKS.press.environment).toBeLessThanOrEqual(0.5);
		expect(GLASS_LOOKS.milk.environment).toBeLessThan(GLASS_LOOKS.press.environment);
		expect(GLASS_LOOKS.press.environment).toBeLessThanOrEqual(1);
		expect(GLASS_LOOKS.milk.environment).toBeGreaterThan(0);
	});
});

function asCount(value: number | "auto" | undefined): number {
	if (typeof value !== "number") {
		throw new Error(`expected a numeric particle count, got ${String(value)}`);
	}
	return value;
}
