import { describe, expect, it } from "vitest";
import {
	PLAYGROUND_COPY_EDGE,
	PLAYGROUND_FIELD,
	PLAYGROUND_FIELD_MARGIN,
	PLAYGROUND_VIEWPORTS,
	playgroundFieldScreenLeft,
} from "../src/index.js";

describe("playground field", () => {
	it("keeps the cloud to the right of the hero copy at every review size", () => {
		expect(PLAYGROUND_FIELD.boundsCenter?.[0]).toBeGreaterThan(0);
		expect(PLAYGROUND_FIELD.intensity ?? 1).toBeLessThan(1);
		expect(PLAYGROUND_FIELD.opacity ?? 1).toBeLessThan(0.5);
		expect(PLAYGROUND_FIELD.count).toBe(24_000);

		for (const [width, height] of PLAYGROUND_VIEWPORTS) {
			const left = playgroundFieldScreenLeft(width, height);
			expect(left).toBeGreaterThan(PLAYGROUND_COPY_EDGE);
			expect(left).toBeGreaterThanOrEqual(PLAYGROUND_FIELD_MARGIN);
		}
	});
});
