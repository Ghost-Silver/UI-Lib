import { DataTexture, RGBAFormat, UnsignedByteType } from "three/webgpu";
import { describe, expect, it } from "vitest";
import { createGradientBackdropMaterial, createLiquidGlassMaterial } from "../src/index.js";

/**
 * Node-side smoke tests.
 *
 * These cannot compile WGSL/GLSL (that needs a real device), but building the
 * TSL graph eagerly exercises every node call, which is where mistakes in this
 * kind of code actually live — a misspelled method, a wrong swizzle, an
 * arity error.
 */
describe("createLiquidGlassMaterial", () => {
	it("builds a graph with colour and opacity nodes", () => {
		const material = createLiquidGlassMaterial({ size: [640, 480], radius: 32 });
		expect(material.colorNode).toBeTruthy();
		expect(material.opacityNode).toBeTruthy();
		expect(material.transparent).toBe(true);
		expect(material.depthWrite).toBe(false);
		expect(material.uniforms.size.value.x).toBe(640);
		expect(material.uniforms.size.value.y).toBe(480);
		expect(material.uniforms.radius.value).toBe(32);
	});

	it("builds with every supported blur tap count", () => {
		for (const blurTaps of [1, 5, 8, 12]) {
			const material = createLiquidGlassMaterial({ blurTaps });
			expect(material.colorNode).toBeTruthy();
		}
	});

	it("patches options through update()", () => {
		const material = createLiquidGlassMaterial();
		material.update({
			refraction: 91,
			dispersion: 0.42,
			roughness: 0.8,
			tint: "#ff0088",
			lightDirection: [0.5, -0.25],
			shift: [2, -3],
		});
		expect(material.uniforms.refraction.value).toBe(91);
		expect(material.uniforms.dispersion.value).toBeCloseTo(0.42, 6);
		expect(material.uniforms.roughness.value).toBeCloseTo(0.8, 6);
		expect(material.uniforms.tint.value.getHexString()).toBe("ff0088");
		expect(material.uniforms.lightDirection.value.x).toBe(0.5);
		expect(material.uniforms.shift.value.y).toBe(-3);
	});

	it("shares time/resolution uniforms across materials", () => {
		const a = createLiquidGlassMaterial();
		const b = createLiquidGlassMaterial(
			{},
			{
				time: a.uniforms.time,
				resolution: a.uniforms.resolution,
				pointer: a.uniforms.pointer,
			},
		);
		a.uniforms.time.value = 12.5;
		expect(b.uniforms.time.value).toBe(12.5);
	});

	it("repoints the backdrop texture without rebuilding", () => {
		const material = createLiquidGlassMaterial({ blurTaps: 5 });
		const texture = new DataTexture(
			new Uint8Array([255, 0, 0, 255]),
			1,
			1,
			RGBAFormat,
			UnsignedByteType,
		);
		expect(() => material.setBackdrop(texture)).not.toThrow();
		expect(material.usesPlaceholderBackdrop).toBe(true);
	});
});

describe("createGradientBackdropMaterial", () => {
	it("builds and updates", () => {
		const material = createGradientBackdropMaterial({ aspect: 1.6, speed: 0.4 });
		expect(material.colorNode).toBeTruthy();
		expect(material.uniforms.aspect.value).toBeCloseTo(1.6, 6);
		material.update({ colors: ["#000000", "#111111", "#222222", "#333333"], vignette: 0.8 });
		expect(material.uniforms.color0.value.getHexString()).toBe("000000");
		expect(material.uniforms.vignette.value).toBeCloseTo(0.8, 6);
	});
});
