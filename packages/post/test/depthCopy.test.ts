import { DepthFormat, DepthTexture, UnsignedIntType } from "three/webgpu";
import { describe, expect, it } from "vitest";
import {
	alignDepthHistory,
	assertDepthHistoryFormats,
	depthHistoryCompatible,
} from "../src/index.js";

describe("depth history copy", () => {
	it("aligns the history to the world depth instead of the canvas format", () => {
		const source = new DepthTexture(1280, 720);
		source.name = "world";
		const history = new DepthTexture(1, 1);
		history.type = UnsignedIntType;

		const version = history.version;
		expect(alignDepthHistory(history, source)).toBe(true);
		expect(history.image.width).toBe(1280);
		expect(history.image.height).toBe(720);
		expect(history.format).toBe(source.format);
		expect(history.format).toBe(DepthFormat);
		expect(history.type).toBe(source.type);
		expect(depthHistoryCompatible(history, source)).toBe(true);
		expect(history.version).toBe(version + 1);

		expect(alignDepthHistory(history, source)).toBe(false);
		expect(history.version).toBe(version + 1);

		source.dispose();
		history.dispose();
	});

	it("throws when the GPU formats would make the copy a no-op", () => {
		expect(() => assertDepthHistoryFormats("rgba16float", "bgra8unorm")).toThrow(/rgba16float/);
		expect(() => assertDepthHistoryFormats("depth24plus", "depth24plus")).not.toThrow();
		expect(() => assertDepthHistoryFormats(null, "depth24plus")).not.toThrow();
	});
});
