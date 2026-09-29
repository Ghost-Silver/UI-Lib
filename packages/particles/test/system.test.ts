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
			forces: { turbulence: 0.4, gravity: [0, -1, 0], stir: 1.2, stirRadius: 2.6 },
			colors: ["#fff", "#0ff", "#f0f"],
			stirColor: "#efe6b0",
			stirTint: 0,
			boundsCenter: [1, 0, 0],
		});
		expect(PARTICLE_DEFAULTS.stirTint).toBe(0);
		system.setStir(-1.5, 0.4, 0.2);
		system.setAttractor(0, 0, 0);
		expect(PARTICLE_DEFAULTS.forces.stir).toBe(0);
		expect(PARTICLE_DEFAULTS.forces.stirRadius).toBe(0);
		system.dispose();
	});
});
