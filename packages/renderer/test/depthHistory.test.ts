import { describe, expect, it } from "vitest";
import { stepDepthHistory } from "../src/depthHistory.js";

describe("depth history", () => {
	it("does not reset or copy on gradient-only frames", () => {
		const step = stepDepthHistory({ live: false }, { usesPost: true, hasWorldObjects: false });
		expect(step).toEqual({ resetHistory: false, captureDepth: false, live: false });
	});

	it("resets once when the first world object appears, then keeps capturing", () => {
		const entered = stepDepthHistory(
			{ live: false },
			{ usesPost: true, hasWorldObjects: true },
		);
		expect(entered).toEqual({ resetHistory: true, captureDepth: true, live: true });

		const held = stepDepthHistory({ live: true }, { usesPost: true, hasWorldObjects: true });
		expect(held).toEqual({ resetHistory: false, captureDepth: true, live: true });
	});

	it("resets when world objects leave, and stays quiet while post is off", () => {
		const left = stepDepthHistory({ live: true }, { usesPost: true, hasWorldObjects: false });
		expect(left).toEqual({ resetHistory: true, captureDepth: false, live: false });

		const postOff = stepDepthHistory(
			{ live: true },
			{ usesPost: false, hasWorldObjects: true },
		);
		expect(postOff).toEqual({ resetHistory: false, captureDepth: false, live: false });
	});
});
