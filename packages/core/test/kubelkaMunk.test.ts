import { describe, expect, it } from "vitest";
import {
	mixPigments,
	mixToCss,
	PROCESS_PIGMENTS,
	parseHex,
	pigmentFromHex,
	reflectanceFromKS,
} from "../src/kubelkaMunk.js";

/**
 * Kubelka-Munk mixing, and the property that justifies the whole module.
 *
 * Pigment is a subtractive absorbing medium; RGB interpolation is an emission
 * model. The difference is not subtle and it is not a matter of taste — it is
 * measurable, and the measurement below is why a watercolour wash mixed with
 * `color-mix` is grey no matter how its parameters are tuned.
 */
describe("reflectanceFromKS", () => {
	it("returns 1 for a pigment that absorbs nothing", () => {
		expect(reflectanceFromKS(0, 1)).toBeCloseTo(1, 6);
	});

	it("falls toward 0 as absorption dominates", () => {
		const samples = [0.5, 2, 8, 40].map((ratio) => reflectanceFromKS(ratio, 1));
		for (let i = 1; i < samples.length; i += 1) {
			expect(samples[i]!).toBeLessThan(samples[i - 1]!);
		}
		expect(samples.at(-1)!).toBeLessThan(0.05);
	});

	it("matches the closed form it is documented against", () => {
		// R = 1 + K/S - sqrt((K/S)^2 + 2K/S), recomputed here rather than trusted,
		// because a sign is the one thing that hides for months. Evaluated at a
		// large thickness, where the layer is effectively infinite — at a finite
		// one the backing shows through and the equation genuinely differs, which
		// is what the next test is about.
		for (const ratio of [0.1, 0.75, 1.3, 5]) {
			const expected = 1 + ratio - Math.sqrt(ratio * ratio + 2 * ratio);
			expect(reflectanceFromKS(ratio, 1, 1, 1e6)).toBeCloseTo(expected, 6);
		}
	});

	it("is finite at thickness 0 rather than NaN", () => {
		// `coth` diverges there and `cosh(0)/sinh(0)` is `1/0`. A NaN would
		// propagate as a black colour with nothing reporting it.
		expect(Number.isFinite(reflectanceFromKS(1.2, 1, 1, 0))).toBe(true);
	});

	it("lets a thin layer show the backing through", () => {
		// Against white paper a thin film reflects more than a thick one; enough
		// pigment eventually stops changing.
		const thin = reflectanceFromKS(1.2, 1, 1, 0.05);
		const thick = reflectanceFromKS(1.2, 1, 1, 8);
		expect(thin).toBeGreaterThan(thick);
		expect(reflectanceFromKS(1.2, 1, 1, 8)).toBeCloseTo(reflectanceFromKS(1.2, 1, 1, 400), 3);
		// And over a dark backing the relationship inverts, because a thin film
		// no longer hides what is under it.
		expect(reflectanceFromKS(1.2, 1, 0.05, 0.05)).toBeLessThan(
			reflectanceFromKS(1.2, 1, 0.05, 8),
		);
	});
});

describe("pigment mixing", () => {
	const cyan = PROCESS_PIGMENTS.cyan;
	const yellow = PROCESS_PIGMENTS.yellow;

	it("keeps far more saturation than interpolating in RGB", () => {
		// The claim the module exists for. Saturation is (max-min)/max on the
		// sRGB values, and the gap on blue-and-yellow is large enough that it is
		// not a judgement call.
		const km = mixPigments([cyan, yellow]);
		const linear = [0, 1, 2].map((i) => {
			const a = reflectanceFromKS(cyan.k[i]!, cyan.s[i]!);
			const b = reflectanceFromKS(yellow.k[i]!, yellow.s[i]!);
			return (a + b) / 2;
		});
		const saturation = (c: readonly number[]) => {
			const max = Math.max(...c);
			return max === 0 ? 0 : (max - Math.min(...c)) / max;
		};
		// The RGB comparison has to happen after the same transfer function, or
		// it is comparing an sRGB triple against a linear one.
		const encode = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
		expect(saturation(km)).toBeGreaterThan(saturation(linear.map(encode)) * 2);
	});

	it("adds in K/S space, which is the only place the addition holds", () => {
		// Two half-strength layers must equal one full-strength layer of the same
		// pigment. That is what linearity buys, and it is what makes a stack of
		// washes reorderable.
		const half = { k: cyan.k, s: cyan.s, concentration: 0.5 } as const;
		const twoHalves = mixPigments([half, half]);
		const oneFull = mixPigments([cyan]);
		for (let i = 0; i < 3; i += 1) {
			expect(twoHalves[i]!).toBeCloseTo(oneFull[i]!, 6);
		}
	});

	it("gives a real green where RGB interpolation gives mud", () => {
		// A loose bound on the hue, not on the exact value: the point is that the
		// result is green-dominant and not a neutral.
		const [r, g, b] = mixPigments([cyan, yellow]).map((v) =>
			v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055,
		);
		// Measured, not chosen: the mix comes out at rgb(145, 172, 134), so the
		// green channel leads by 0.148 in normalised terms. The bound sits just
		// under that — a threshold picked to have headroom would not fail if the
		// model regressed.
		expect(g!).toBeGreaterThan(r!);
		expect(g!).toBeGreaterThan(b!);
		expect(g! - Math.min(r!, b!)).toBeGreaterThan(0.14);
	});

	it("is order independent", () => {
		expect(mixPigments([cyan, yellow])).toEqual(mixPigments([yellow, cyan]));
	});

	it("gets darker as thickness grows, and then stops", () => {
		// Convergence is reached at about 10 for these pigments; 3 is still on
		// the way there, which the first version of this asserted it was not.
		const at = (thickness: number) =>
			mixPigments([cyan, yellow], { thickness }).reduce((a, b) => a + b, 0);
		expect(at(0.2)).toBeGreaterThan(at(1));
		expect(at(1)).toBeGreaterThan(at(3));
		expect(at(3)).toBeGreaterThan(at(10));
		expect(at(10)).toBeCloseTo(at(100), 6);
	});
});

describe("colour parsing", () => {
	it("reads six and three digit hex", () => {
		expect(parseHex("#b79cf5")).toEqual([0xb7, 0x9c, 0xf5]);
		expect(parseHex("fff")).toEqual([255, 255, 255]);
	});

	it("derives a pigment that reproduces its own swatch exactly", () => {
		// A swatch in must come back out, and *exactly* — a palette is what the
		// rest of the system is built on, so a few levels of drift here is a few
		// levels of drift everywhere.
		//
		// Compared at infinite thickness, because that is what the inversion
		// solves for: the swatch is the colour of the pigment without a backing
		// showing through it.
		for (const hex of ["#b79cf5", "#ffc2dc", "#9ad9ff", "#a2edce"]) {
			const back = mixToCss([pigmentFromHex(hex)], { thickness: 1e6 });
			const [r, g, b] = parseHex(hex);
			const got = back.match(/\d+/g)?.map(Number) ?? [];
			expect(got[0]!, `${hex} red`).toBe(r);
			expect(got[1]!, `${hex} green`).toBe(g);
			expect(got[2]!, `${hex} blue`).toBe(b);
		}
	});

	it("emits a CSS colour that carries alpha when asked", () => {
		expect(mixToCss([PROCESS_PIGMENTS.cyan], { alpha: 0.4 })).toMatch(/\/ 0\.4\)$/);
		expect(mixToCss([PROCESS_PIGMENTS.cyan])).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
	});
});
