import { describe, expect, it } from "vitest";
import { stepSectionViewport, type ViewportCache } from "../src/sectionViewport.js";

describe("section viewport", () => {
	it("hides a collapse, then resizes and shows the same box again", () => {
		let cache: ViewportCache = { width: 800, height: 600, dpr: 2 };

		const held = stepSectionViewport(cache, { width: 800, height: 600, dpr: 2, tier: 2 });
		expect(held).toEqual({
			width: 800,
			height: 600,
			collapsed: false,
			visible: true,
			resize: false,
		});

		const collapsed = stepSectionViewport(cache, { width: 0, height: 0, dpr: 2, tier: 2 });
		expect(collapsed).toEqual({
			width: 0,
			height: 0,
			collapsed: true,
			visible: false,
			resize: false,
		});
		cache = { width: collapsed.width, height: collapsed.height, dpr: cache.dpr };

		const restored = stepSectionViewport(cache, { width: 800, height: 600, dpr: 2, tier: 2 });
		expect(restored.collapsed).toBe(false);
		expect(restored.visible).toBe(true);
		expect(restored.resize).toBe(true);
		cache = { width: restored.width, height: restored.height, dpr: 2 };

		const heldAgain = stepSectionViewport(cache, { width: 800, height: 600, dpr: 2, tier: 2 });
		expect(heldAgain.resize).toBe(false);
		expect(heldAgain.visible).toBe(true);
	});

	it("does not light a tier 0 canvas, and treats a partial collapse as zero", () => {
		const cache: ViewportCache = { width: 800, height: 600, dpr: 2 };
		expect(
			stepSectionViewport(cache, { width: 800, height: 600, dpr: 2, tier: 0 }).visible,
		).toBe(false);
		expect(
			stepSectionViewport(cache, { width: 800, height: 0.4, dpr: 2, tier: 3 }),
		).toMatchObject({
			collapsed: true,
			visible: false,
			width: 0,
			height: 0,
		});
	});
});
