import { describe, expect, it } from "vitest";
import { WAKE_COPY_EDGE, WAKE_FIELD, wakeFieldScreenLeft } from "../src/index.js";

const VIEWPORTS = [
	[1280, 720],
	[1440, 1000],
	[1920, 1080],
	[2560, 1440],
] as const;

describe("wake field", () => {
	it("keeps the strokes to the right of the headline and does not raise intensity", () => {
		expect(WAKE_FIELD.intensity ?? 1).toBeLessThan(0.6);
		expect(WAKE_FIELD.trail).toBeTruthy();
		for (const [width, height] of VIEWPORTS) {
			expect(wakeFieldScreenLeft(width, height)).toBeGreaterThan(WAKE_COPY_EDGE);
		}
	});
});
