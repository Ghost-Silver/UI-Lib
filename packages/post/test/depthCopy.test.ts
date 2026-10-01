import { DepthFormat, DepthTexture, UnsignedIntType } from "three/webgpu";
import { describe, expect, it } from "vitest";
import {
	alignDepthHistory,
	assertDepthHistoryFormats,
	depthHistoryCompatible,
	framebufferCopyWouldFail,
} from "../src/index.js";

/**
 * The smallest renderer-shaped object `framebufferCopyWouldFail` reads: a
 * backend with a texture-format lookup, plus whichever render context three
 * would have left current.
 */
function stubRenderer(options: {
	formats: Map<object, string>;
	webgpu?: boolean;
	bound?: object | null;
	canvasFormat?: string | null;
}) {
	return {
		backend: {
			isWebGPUBackend: options.webgpu ?? true,
			get: (texture: object) => ({ texture: { format: options.formats.get(texture) } }),
			context:
				options.canvasFormat === undefined || options.canvasFormat === null
					? undefined
					: { getCurrentTexture: () => ({ format: options.canvasFormat }) },
		},
		_currentRenderContext: options.bound
			? { renderTarget: { textures: [options.bound] } }
			: null,
	};
}

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

describe("framebuffer copy guard", () => {
	const history = { name: "history" };
	const boundTexture = { name: "post-intermediate" };

	it("predicts the WebGPU refusal when the bound target is half-float", () => {
		// This is the shape that produced a warning on every frame: the post
		// chain finishes with an rgba16float target current while the colour
		// history is sized to the canvas.
		const renderer = stubRenderer({
			formats: new Map([
				[boundTexture, "rgba16float"],
				[history, "bgra8unorm"],
			]),
			bound: boundTexture,
		});
		expect(framebufferCopyWouldFail(renderer, history)).toBe(true);
	});

	it("allows the copy when the bound target matches", () => {
		const renderer = stubRenderer({
			formats: new Map([
				[boundTexture, "bgra8unorm"],
				[history, "bgra8unorm"],
			]),
			bound: boundTexture,
		});
		expect(framebufferCopyWouldFail(renderer, history)).toBe(false);
	});

	it("falls back to the presented canvas when nothing is bound", () => {
		const renderer = stubRenderer({
			formats: new Map([[history, "bgra8unorm"]]),
			bound: null,
			canvasFormat: "bgra8unorm",
		});
		expect(framebufferCopyWouldFail(renderer, history)).toBe(false);

		const mismatched = stubRenderer({
			formats: new Map([[history, "bgra8unorm"]]),
			bound: null,
			canvasFormat: "rgba16float",
		});
		expect(framebufferCopyWouldFail(mismatched, history)).toBe(true);
	});

	it("never blocks the copy on the WebGL backend", () => {
		// WebGL copies through `copyTexSubImage2D`, which converts between
		// internal formats, so a mismatch is not a refusal there.
		const renderer = stubRenderer({
			formats: new Map([
				[boundTexture, "rgba16float"],
				[history, "bgra8unorm"],
			]),
			bound: boundTexture,
			webgpu: false,
		});
		expect(framebufferCopyWouldFail(renderer, history)).toBe(false);
	});

	it("attempts the copy when a format cannot be read", () => {
		const renderer = stubRenderer({
			formats: new Map([[history, "bgra8unorm"]]),
			bound: boundTexture,
		});
		expect(framebufferCopyWouldFail(renderer, history)).toBe(false);
	});
});
