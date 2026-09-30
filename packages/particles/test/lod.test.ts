import { describe, expect, it } from "vitest";
import { resolveParticleLod, resolveTrail, TRAIL_MAX } from "../src/index.js";

describe("particle lod", () => {
	it("keeps an authored field under the tier budget without growing the buffer", () => {
		expect(resolveParticleLod({ authored: 24_000, budget: 20_000, backend: "webgpu" })).toEqual(
			{ allocated: 24_000, active: 20_000 },
		);
		expect(
			resolveParticleLod({ authored: 9_000, budget: 1_000_000, backend: "webgpu" }),
		).toEqual({ allocated: 9_000, active: 9_000 });
	});

	it("treats auto as the budget, not a hidden million", () => {
		expect(
			resolveParticleLod({ authored: "auto", budget: 150_000, backend: "webgpu" }),
		).toEqual({
			allocated: 150_000,
			active: 150_000,
		});
		expect(
			resolveParticleLod({ authored: "auto", budget: 1_000_000, backend: "webgl2" }),
		).toEqual({
			allocated: 80_000,
			active: 80_000,
		});
		expect(resolveParticleLod({ authored: "auto", budget: 20_000, backend: "none" })).toEqual({
			allocated: 0,
			active: 0,
		});
	});

	it("stops the dispatch when the stage is hidden and keeps the buffer", () => {
		expect(
			resolveParticleLod({ authored: 9_000, budget: 150_000, backend: "webgpu", visible: 0 }),
		).toEqual({ allocated: 9_000, active: 0 });
		expect(resolveParticleLod({ authored: 10_000, budget: 0, backend: "webgl2" })).toEqual({
			allocated: 10_000,
			active: 0,
		});
		expect(
			resolveParticleLod({
				authored: 10_000,
				budget: 150_000,
				backend: "webgpu",
				visible: 0.5,
			}),
		).toEqual({ allocated: 10_000, active: 5_000 });
	});
});

describe("particle trail", () => {
	it("allocates nothing unless a length is asked for", () => {
		expect(resolveTrail(undefined).length).toBe(0);
		expect(resolveTrail(0).length).toBe(0);
		expect(resolveTrail({ length: 0 }).length).toBe(0);
	});

	it("clamps the history and keeps the stroke thinner than a lamp", () => {
		const trail = resolveTrail({ length: 40, stride: 0, opacity: 4, width: -1 });
		expect(trail.length).toBe(TRAIL_MAX);
		expect(trail.stride).toBe(1);
		expect(trail.opacity).toBe(1);
		expect(trail.width).toBe(0);
		expect(resolveTrail(6)).toMatchObject({ length: 6, opacity: 0.32 });
	});
});
