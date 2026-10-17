import { DataTexture, RGBAFormat, UnsignedByteType } from "three/webgpu";
import { describe, expect, it } from "vitest";
import {
	createGradientBackdropMaterial,
	createLiquidGlassMaterial,
	createWorldLensMaterial,
} from "../src/index.js";

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
		expect(material.uniforms.pointerVelocity.value.length()).toBe(0);
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
		expect(material.uniforms.environment.value).toBeCloseTo(0.28, 6);
		material.update({ environment: 3 });
		expect(material.uniforms.environment.value).toBe(1);
		material.update({ environment: -1 });
		expect(material.uniforms.environment.value).toBe(0);
		const room = new DataTexture(
			new Uint8Array([1, 2, 3, 255]),
			1,
			1,
			RGBAFormat,
			UnsignedByteType,
		);
		material.update({ environmentMap: room, environment: 0.15 });
		expect(material.environmentMap).toBe(room);
		expect(material.uniforms.environment.value).toBeCloseTo(0.15, 6);
		material.update({ environmentMap: null });
		expect(material.environmentMap).not.toBe(room);
		room.dispose();
	});

	it("dispatches and cycles dynamic fluid ripple wavelet pulses", () => {
		const material = createLiquidGlassMaterial({ rippleStrength: 0.8 });
		expect(material.uniforms.rippleStrength.value).toBe(0.8);
		expect(material.uniforms.ripple0.value.w).toBe(0);

		material.addRipple(0.4, 0.6, 1.5, 2.0);
		expect(material.uniforms.ripple0.value.x).toBeCloseTo(0.4);
		expect(material.uniforms.ripple0.value.y).toBeCloseTo(0.6);
		expect(material.uniforms.ripple0.value.z).toBe(2.0);
		expect(material.uniforms.ripple0.value.w).toBe(1.5);

		// Cycling through ripple slots:
		material.addRipple(0.5, 0.5, 1.0, 2.1);
		material.addRipple(0.6, 0.4, 0.8, 2.2);
		material.addRipple(0.7, 0.3, 0.6, 2.3);
		expect(material.uniforms.ripple3.value.w).toBe(0.6);

		// Fifth ripple wraps around to slot 0:
		material.addRipple(0.1, 0.2, 2.0, 2.4);
		expect(material.uniforms.ripple0.value.x).toBeCloseTo(0.1);
		expect(material.uniforms.ripple0.value.w).toBe(2.0);

		material.update({ rippleStrength: 1.4 });
		expect(material.uniforms.rippleStrength.value).toBe(1.4);
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

describe("createWorldLensMaterial", () => {
	it("builds an opaque depth-writing lens graph", () => {
		const backdrop = new DataTexture(
			new Uint8Array([8, 16, 32, 255]),
			1,
			1,
			RGBAFormat,
			UnsignedByteType,
		);
		const material = createWorldLensMaterial({ backdrop, refraction: 40, dispersion: 0.2 });
		expect(material.colorNode).toBeTruthy();
		expect(material.transparent).toBe(false);
		expect(material.depthWrite).toBe(true);
		expect(material.toneMapped).toBe(false);
		expect(material.uniforms.refraction.value).toBe(40);
		material.update({ refraction: 12, lightDirection: [0.2, -0.4], caustic: 0.05 });
		expect(material.uniforms.refraction.value).toBe(12);
		expect(material.uniforms.lightDirection.value.y).toBe(-0.4);
		expect(material.uniforms.caustic.value).toBeCloseTo(0.05, 6);
		expect(material.uniforms.environment.value).toBeCloseTo(0.44, 6);
		expect(material.uniforms.pointerVelocity.value.length()).toBe(0);
		expect(material.environmentMap).toBeTruthy();
		material.update({ environment: 4 });
		expect(material.uniforms.environment.value).toBe(1);
		material.update({ environment: -2 });
		expect(material.uniforms.environment.value).toBe(0);
		const custom = new DataTexture(
			new Uint8Array([4, 8, 12, 255]),
			1,
			1,
			RGBAFormat,
			UnsignedByteType,
		);
		material.update({ environmentMap: custom, environment: 0.2 });
		expect(material.environmentMap).toBe(custom);
		expect(material.uniforms.environment.value).toBeCloseTo(0.2, 6);
		material.update({ environmentMap: null });
		expect(material.environmentMap).not.toBe(custom);
		expect(() => material.setBackdrop(backdrop)).not.toThrow();
		material.dispose();
		backdrop.dispose();
		custom.dispose();
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
