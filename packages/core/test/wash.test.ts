import { describe, expect, it } from "vitest";
import { createWash, describeWash, paperNoise } from "../src/wash.js";

/**
 * The wash generator, and the one property that matters most about it.
 *
 * A wash is drawn from a seed, which means it has to be **reproducible**: the
 * same seed must give the same mark on a server render and on the client, and
 * across re-renders, or a page of them will reshuffle while the user is looking
 * at it. That is the assertion below that everything else depends on.
 */
describe("createWash", () => {
	it("is reproducible from its seed", () => {
		const a = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7 });
		const b = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7 });
		expect(b.resolved).toEqual(a.resolved);
		expect(b.style).toEqual(a.style);
	});

	it("gives different seeds genuinely different marks", () => {
		const arcs = (seed: number) => createWash({ hue: "#b79cf5", seed }).resolved.arcs;
		expect(arcs(7)).not.toEqual(arcs(8));
		// Not a token difference: at least one arc has to move substantially, or
		// a page of washes reads as one shape repeated.
		const drift = arcs(7).map((a, i) => Math.abs(a - arcs(11)[i]!));
		expect(Math.max(...drift)).toBeGreaterThan(0.2);
	});

	it("never produces an even deposit", () => {
		// An even sequence of arcs reads as a mechanical ring. Every seed has to
		// clear this, not just the one that was looked at.
		for (let seed = 0; seed < 40; seed += 1) {
			const { arcs } = createWash({ hue: "#b79cf5", weight: 0.8, seed }).resolved;
			const spread = Math.max(...arcs) - Math.min(...arcs);
			expect(spread, `seed ${seed} came out too even`).toBeGreaterThan(0.15);
		}
	});

	it("keeps every arc inside the range the mask can express", () => {
		for (let seed = 0; seed < 40; seed += 1) {
			const { arcs } = createWash({ hue: "#b79cf5", weight: 1, seed }).resolved;
			for (const arc of arcs) {
				expect(arc).toBeGreaterThan(0);
				expect(arc).toBeLessThanOrEqual(1);
			}
		}
	});

	it("says what it resolved, so a wrong mark can be diagnosed", () => {
		const summary = describeWash(createWash({ hue: "#b79cf5", weight: 0.9, seed: 7 }));
		expect(summary).toContain("dry");
		expect(summary).toContain("weight 0.90");
		expect(summary).toContain("opacity");
	});

	it("gets softer the wetter it is, and that is the only difference", () => {
		const wet = createWash({ hue: "#b79cf5", state: "wet" }).resolved.blur;
		const drying = createWash({ hue: "#b79cf5", state: "drying" }).resolved.blur;
		const dry = createWash({ hue: "#b79cf5", state: "dry" }).resolved.blur;
		expect(wet).toBeGreaterThan(drying);
		expect(drying).toBeGreaterThan(dry);
	});

	it("builds a rim that varies around the circle", () => {
		const mask = createWash({ hue: "#b79cf5", seed: 3 }).style["--wash-deposit-mask"]!;
		expect(mask).toContain("conic-gradient");
		// Five arcs means five alpha stops.
		expect(mask.match(/rgb\(0 0 0 \//g)?.length).toBe(5);
	});
});

describe("paperNoise", () => {
	it("gives two layers whose periods do not line up", () => {
		// The property that matters, and the first version of this test got it
		// wrong: it asserted neither tile size was divisible by ten. That is not
		// the failure — a single round number is harmless and seed 4 produces
		// one at 360px. The failure was both layers sharing a period, which puts
		// their seams on top of each other and makes a visible grid.
		for (let seed = 0; seed < 30; seed += 1) {
			const [coarse, fine] = paperNoise(seed).sizes.split(", ");
			expect(coarse, `seed ${seed} shares a period`).not.toBe(fine);
		}
	});

	it("moves both layers with the seed, so two pages are not the same sheet", () => {
		expect(paperNoise(1).sizes).not.toBe(paperNoise(2).sizes);
		expect(paperNoise(1).image).not.toBe(paperNoise(2).image);
	});

	it("emits real turbulence rather than a gradient", () => {
		expect(paperNoise(1).image).toContain("feTurbulence");
		expect(paperNoise(1).image.match(/feTurbulence/g)?.length).toBe(2);
	});
});

describe("the ground", () => {
	it("fills the surface with the mark's own pigment", () => {
		const wash = createWash({ hue: "#b79cf5", weight: 0.9, seed: 11 });
		const body = String(wash.style["--wash-body"]);
		const ground = String(wash.style["--wash-ground"]);

		// The same two colours, in the same order.
		const colours = (value: string) => value.match(/rgba?\([^)]+\)/g) ?? [];
		expect(colours(ground).length).toBeGreaterThanOrEqual(2);
		for (const colour of new Set(colours(ground))) {
			expect(colours(body), `${colour} is not in the mark's body`).toContain(colour);
		}
	});

	it("does not fade out before its own edge", () => {
		const wash = createWash({ hue: "#b79cf5", weight: 0.9, seed: 11 });
		const body = String(wash.style["--wash-body"]);
		const ground = String(wash.style["--wash-ground"]);

		// A mark ends transparent before the box does — that is what makes it a
		// stroke. A ground must not, or a wide surface gets a dark border around a
		// lighter middle, which is what a table looked like.
		expect(body, "the mark should fade out").toContain("transparent");
		expect(ground, "the ground should not fade out").not.toContain("transparent");

		// And it should reach past the edge rather than stopping at it.
		const extent = Number(ground.match(/radial-gradient\(([\d.]+)%/)?.[1] ?? 0);
		expect(extent).toBeGreaterThanOrEqual(100);
	});

	it("is reproduced from the same seed, like every other value", () => {
		const first = createWash({ hue: "#b79cf5", weight: 0.9, seed: 5 }).style["--wash-ground"];
		const second = createWash({ hue: "#b79cf5", weight: 0.9, seed: 5 }).style["--wash-ground"];
		expect(first).toBe(second);
	});
});
