import { describe, expect, it } from "vitest";
import { createParticleSystem, PARTICLE_DEFAULTS } from "../src/index.js";

describe("particle system", () => {
	it("builds a TSL compute + sprite graph without a DOM", () => {
		const system = createParticleSystem({ count: 128 });

		expect(system.count).toBe(128);
		expect(system.object.name).toBe("ui-lib:particles");
		expect(system.material.isNodeMaterial).toBe(true);
		expect(PARTICLE_DEFAULTS.count).toBeGreaterThan(1_000);

		system.update({
			forces: { turbulence: 0.4, gravity: [0, -1, 0] },
			colors: ["#fff", "#0ff", "#f0f"],
		});
		system.dispose();
	});
});
