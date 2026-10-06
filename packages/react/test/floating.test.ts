import { describe, expect, it } from "vitest";
import { computeFloatingPosition, getOppositeSide, parsePlacement } from "../src/floating.js";

describe("floating positioning engine", () => {
	it("parses placement into side and align", () => {
		expect(parsePlacement("top")).toEqual({ side: "top", align: "center" });
		expect(parsePlacement("bottom-start")).toEqual({ side: "bottom", align: "start" });
		expect(parsePlacement("left-end")).toEqual({ side: "left", align: "end" });
	});

	it("gets opposite side correctly", () => {
		expect(getOppositeSide("top")).toBe("bottom");
		expect(getOppositeSide("bottom")).toBe("top");
		expect(getOppositeSide("left")).toBe("right");
		expect(getOppositeSide("right")).toBe("left");
	});

	it("computes default top placement centered", () => {
		const anchor = { x: 200, y: 300, width: 100, height: 40 };
		const floating = { x: 0, y: 0, width: 80, height: 30 };
		const viewport = { x: 0, y: 0, width: 1000, height: 1000 };

		const result = computeFloatingPosition(anchor, floating, {
			placement: "top",
			offset: 10,
			viewport,
		});

		expect(result.side).toBe("top");
		expect(result.y).toBe(300 - 30 - 10); // 260
		expect(result.x).toBe(200 + (100 - 80) / 2); // 210
		expect(result.arrow?.side).toBe("bottom");
	});

	it("flips from top to bottom when overflowing top viewport", () => {
		const anchor = { x: 200, y: 10, width: 100, height: 40 };
		const floating = { x: 0, y: 0, width: 80, height: 50 };
		const viewport = { x: 0, y: 0, width: 1000, height: 1000 };

		const result = computeFloatingPosition(anchor, floating, {
			placement: "top",
			offset: 10,
			viewport,
		});

		// 10 - 50 - 10 = -50 < 8 padding -> flips to bottom
		expect(result.side).toBe("bottom");
		expect(result.y).toBe(10 + 40 + 10); // 60
		expect(result.arrow?.side).toBe("top");
	});

	it("flips from left to right when overflowing left viewport", () => {
		const anchor = { x: 10, y: 200, width: 60, height: 40 };
		const floating = { x: 0, y: 0, width: 100, height: 40 };
		const viewport = { x: 0, y: 0, width: 1000, height: 1000 };

		const result = computeFloatingPosition(anchor, floating, {
			placement: "left",
			offset: 10,
			viewport,
		});

		expect(result.side).toBe("right");
		expect(result.x).toBe(10 + 60 + 10); // 80
	});

	it("shifts overlay to stay within viewport bounds horizontally", () => {
		const anchor = { x: 2, y: 200, width: 20, height: 20 };
		const floating = { x: 0, y: 0, width: 100, height: 30 };
		const viewport = { x: 0, y: 0, width: 500, height: 500 };

		const result = computeFloatingPosition(anchor, floating, {
			placement: "top",
			padding: 10,
			viewport,
		});

		// Anchor center would place it at x = 2 + (20 - 100)/2 = -38
		// Shift should clamp to at least viewport.x + padding = 10
		expect(result.x).toBeGreaterThanOrEqual(10);
	});

	it("calculates arrow offset clamped within floating bounds", () => {
		const anchor = { x: 200, y: 300, width: 100, height: 40 };
		const floating = { x: 0, y: 0, width: 80, height: 30 };
		const viewport = { x: 0, y: 0, width: 1000, height: 1000 };

		const result = computeFloatingPosition(anchor, floating, {
			placement: "top",
			viewport,
		});

		expect(result.arrow?.x).toBeGreaterThanOrEqual(12);
		expect(result.arrow?.x).toBeLessThanOrEqual(floating.width - 12);
	});
});
