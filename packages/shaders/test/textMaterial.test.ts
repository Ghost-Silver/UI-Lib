import { DoubleSide, type MeshBasicNodeMaterial } from "three/webgpu";
import { describe, expect, it } from "vitest";
import type { TextAtlas } from "../src/text/textMaterial.js";
import { createTextMaterial, textPxRange } from "../src/text/textMaterial.js";

const atlas: TextAtlas = {
	// The shader is never evaluated in these tests; only the material's own
	// configuration is asserted, which is where both silent bugs lived.
	texture: null as unknown as TextAtlas["texture"],
	scaleW: 876,
	distanceRange: 2,
};

function material() {
	return createTextMaterial({ atlas, color: "#2a0f45" }) as MeshBasicNodeMaterial;
}

describe("text material", () => {
	/**
	 * The anti-aliasing width is the one number in this path that fails
	 * silently: too small and the edges alias, too large and the type is soft.
	 */
	describe("anti-aliasing width", () => {
		it("derives from the atlas width and the stored distance range", () => {
			expect(textPxRange({ scaleW: 876, distanceRange: 2 })).toBe(219);
		});

		it("is not the distance range itself", () => {
			// Passing `distanceRange` through is the intuitive mistake and makes
			// the text roughly `scaleW / 2` times too soft.
			const range = 2;
			expect(textPxRange({ scaleW: 876, distanceRange: range })).toBeGreaterThan(range * 10);
		});

		it("scales with the atlas, because the UV spans the whole sheet", () => {
			expect(textPxRange({ scaleW: 1024, distanceRange: 4 })).toBe(
				textPxRange({ scaleW: 512, distanceRange: 4 }) * 2,
			);
		});

		it("shrinks as the field gets fatter", () => {
			expect(textPxRange({ scaleW: 876, distanceRange: 2 })).toBe(
				textPxRange({ scaleW: 876, distanceRange: 8 }) * 4,
			);
		});
	});

	describe("configuration that failed silently once", () => {
		it("draws both faces", () => {
			// `createTextGeometry` winds its quads clockwise from +Z, so under
			// three's default `FrontSide` every glyph was culled. The mesh
			// existed, was in the scene, and was never drawn.
			expect(material().side).toBe(DoubleSide);
		});

		it("does not write depth", () => {
			// SDF glyphs overlap at their padded edges; writing depth lets one
			// quad's padding clip the next quad's stroke.
			expect(material().depthWrite).toBe(false);
		});

		it("keeps colour and coverage separate", () => {
			// Multiplying the colour by alpha in the shader *and* letting three's
			// `srcAlpha` blend do it again squares the coverage, which drains an
			// SDF's soft edge to a wash.
			const m = material();
			expect(m.colorNode).toBeDefined();
			expect(m.opacityNode).toBeDefined();
			// Distinct nodes: a single `colorNode` carrying alpha is the shape
			// that double-applied it.
			expect(m.colorNode).not.toBe(m.opacityNode);
		});
	});
});
