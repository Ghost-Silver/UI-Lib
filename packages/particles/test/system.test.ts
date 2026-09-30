import { describe, expect, it } from "vitest";
import { createParticleSystem, PARTICLE_DEFAULTS } from "../src/index.js";

describe("particle system", () => {
	it("builds a TSL compute + sprite graph without a DOM", () => {
		const system = createParticleSystem({ count: 128 });

		expect(system.count).toBe(128);
		expect(system.active).toBe(128);
		expect(system.trailLength).toBe(0);
		expect(system.object.name).toBe("ui-lib:particles");
		expect(system.object.children).toHaveLength(0);
		expect(system.material.isNodeMaterial).toBe(true);
		system.setActive(40);
		expect(system.active).toBe(40);
		expect(system.object.visible).toBe(true);
		system.setActive(0);
		expect(system.active).toBe(0);
		expect(system.object.visible).toBe(false);
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

		const trailed = createParticleSystem({ count: 32, trail: { length: 4, stride: 3 } });
		expect(trailed.trailLength).toBe(4);
		expect(trailed.materials).toHaveLength(2);
		expect(trailed.object.children).toHaveLength(1);
		trailed.setActive(8);
		expect(trailed.object.children[0]?.visible).toBe(true);
		trailed.setTrailOpacity(0);
		trailed.dispose();
	});
});
