import { describe, expect, it } from "vitest";
import { textPxRange } from "../src/text/textMaterial.js";

/**
 * The anti-aliasing width is the one number in the text path that fails
 * silently: too small and the glyph edges alias, too large and the type is
 * soft, and neither raises an error. These pin the derivation.
 */
describe("text anti-aliasing width", () => {
	it("derives from the atlas width and the stored distance range", () => {
		// The shipped atlas: 696 texels wide, field spanning 4 texels either
		// side of the edge.
		expect(textPxRange({ scaleW: 696, distanceRange: 4 })).toBe(87);
	});

	it("is not the distance range itself", () => {
		// Passing `distanceRange` straight through is the intuitive mistake and
		// gives text roughly `scaleW / 2` times too soft. Guard the confusion
		// rather than the formula.
		const range = 4;
		const correct = textPxRange({ scaleW: 696, distanceRange: range });
		expect(correct).not.toBe(range);
		expect(correct).toBeGreaterThan(range * 10);
	});

	it("scales with the atlas, because the UV spans the whole sheet", () => {
		// A wider atlas spreads the same field over more UV, so the width in UV
		// terms shrinks and `pxRange` has to grow to compensate.
		const narrow = textPxRange({ scaleW: 512, distanceRange: 4 });
		const wide = textPxRange({ scaleW: 1024, distanceRange: 4 });
		expect(wide).toBe(narrow * 2);
	});

	it("shrinks as the field gets fatter", () => {
		// A larger range means `sigDist` changes more slowly per texel, so less
		// width is needed to cover one screen pixel.
		const thin = textPxRange({ scaleW: 696, distanceRange: 2 });
		const fat = textPxRange({ scaleW: 696, distanceRange: 8 });
		expect(thin).toBe(fat * 4);
	});
});
