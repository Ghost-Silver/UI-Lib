import { describe, expect, it } from "vitest";
import { type BMFont, createTextGeometry, sampleTextPoints } from "../src/text/layout.js";
import { magicParticleText } from "../src/text/msdf.js";

/**
 * A two-glyph font. Deliberately synthetic: there is no atlas in the
 * repository, and the layout code is pure enough to exercise without one. If a
 * real atlas ever lands, these cases should keep passing and a rendering case
 * should be added beside them.
 */
function font(): BMFont {
	return {
		common: { lineHeight: 24, base: 20, scaleW: 128, scaleH: 64 },
		info: { size: 24 },
		chars: [
			{ id: 65, x: 0, y: 0, width: 16, height: 20, xoffset: 0, yoffset: 20, xadvance: 18 },
			{ id: 66, x: 16, y: 0, width: 14, height: 20, xoffset: 1, yoffset: 20, xadvance: 16 },
		],
	};
}

describe("text layout", () => {
	describe("createTextGeometry", () => {
		it("emits one quad per known glyph", () => {
			const geometry = createTextGeometry("AB", font());
			expect(geometry.getAttribute("position").count).toBe(8);
			expect(geometry.getIndex()?.count).toBe(12);
		});

		it("skips characters the atlas does not carry", () => {
			// A missing glyph must not shift the ones after it or emit an empty
			// quad; `?` and spaces are common in real atlases.
			const geometry = createTextGeometry("A?B", font());
			expect(geometry.getAttribute("position").count).toBe(8);
		});

		it("keeps UVs inside the atlas", () => {
			const geometry = createTextGeometry("AB", font());
			const uv = geometry.getAttribute("uv");
			for (let i = 0; i < uv.count; i += 1) {
				expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
				expect(uv.getX(i)).toBeLessThanOrEqual(1);
				expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
				expect(uv.getY(i)).toBeLessThanOrEqual(1);
			}
		});

		it("advances by xadvance, so B starts after A", () => {
			const geometry = createTextGeometry("AB", font());
			const position = geometry.getAttribute("position");
			// First vertex of the second quad is index 4.
			expect(position.getX(4)).toBe(18 + 1);
		});

		it("drops a newline down by the line height", () => {
			const oneLine = createTextGeometry("A", font());
			const twoLines = createTextGeometry("A\nA", font());
			const top = oneLine.getAttribute("position").getY(0);
			const secondTop = twoLines.getAttribute("position").getY(4);
			expect(top - secondTop).toBe(24);
		});

		it("produces an empty geometry for text with no known glyphs", () => {
			const geometry = createTextGeometry("??", font());
			expect(geometry.getAttribute("position").count).toBe(0);
		});
	});

	describe("sampleTextPoints", () => {
		it("returns a flat xyz array", () => {
			const points = sampleTextPoints(createTextGeometry("AB", font()), 0.5);
			expect(points.length % 3).toBe(0);
			expect(points.length).toBeGreaterThan(0);
		});

		it("normalises into the unit box", () => {
			const points = sampleTextPoints(createTextGeometry("AB", font()), 0.5);
			for (let i = 0; i < points.length; i += 3) {
				expect(points[i]).toBeGreaterThanOrEqual(-0.5);
				expect(points[i]).toBeLessThanOrEqual(0.5);
				expect(points[i + 1]).toBeGreaterThanOrEqual(-0.5);
				expect(points[i + 1]).toBeLessThanOrEqual(0.5);
			}
		});

		it("returns nothing for an empty geometry", () => {
			expect(sampleTextPoints(createTextGeometry("??", font()), 0.5).length).toBe(0);
		});

		it("is not deterministic, and that is worth knowing", () => {
			// The scatter calls Math.random per point. Two calls therefore differ,
			// so nothing downstream may hash this cloud as an identity.
			const geometry = createTextGeometry("AB", font());
			const a = sampleTextPoints(geometry, 0.5);
			const b = sampleTextPoints(geometry, 0.5);
			expect(Array.from(a)).not.toEqual(Array.from(b));
		});
	});

	describe("magicParticleText", () => {
		it("refuses instead of silently doing nothing", async () => {
			// It used to resolve while passing two options no code reads, so a
			// caller got a handle and no text. A thrown error is the honest
			// contract until a cloud emitter exists.
			await expect(
				magicParticleText({} as HTMLElement, { text: "AB", fontUrl: "/font.json" }),
			).rejects.toThrow(/not implemented/);
		});

		it("says what to use instead", async () => {
			await expect(
				magicParticleText({} as HTMLElement, { text: "AB", fontUrl: "/font.json" }),
			).rejects.toThrow(/magicText/);
		});
	});
});
