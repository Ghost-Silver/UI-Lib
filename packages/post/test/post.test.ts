import { describe, expect, it } from "vitest";
import { createPostProcessing, POST_DEFAULTS } from "../src/index.js";

describe("post-processing", () => {
	it("builds the viewport TSL chain without a renderer or DOM", () => {
		const post = createPostProcessing({ bloomStrength: 0.5, grain: 0.03 });

		expect(post.outputNode.isNode).toBe(true);
		expect(post.uniforms.bloomStrength.value).toBe(0.5);
		expect(post.uniforms.grain.value).toBe(0.03);
		expect(post.uniforms.haloStrength.value).toBe(POST_DEFAULTS.haloStrength);
		expect(post.uniforms.exposure.value).toBe(POST_DEFAULTS.exposure);
		expect(post.uniforms.temporalBlend.value).toBe(POST_DEFAULTS.temporalBlend);
		expect(post.uniforms.temporalReactive.value).toBe(POST_DEFAULTS.temporalReactive);
		expect(post.uniforms.temporalClamp.value).toBe(POST_DEFAULTS.temporalClamp);
		expect(post.uniforms.worldVelocity.value.x).toBe(POST_DEFAULTS.worldVelocity[0]);
		expect(post.uniforms.worldVelocity.value.y).toBe(POST_DEFAULTS.worldVelocity[1]);
		expect(post.uniforms.depthRange.value.x).toBe(0.1);
		expect(post.uniforms.depthRange.value.y).toBe(100);
		expect(post.uniforms.focusDepth.value).toBe(POST_DEFAULTS.focusDepth);
		expect(post.uniforms.focusBlur.value).toBe(POST_DEFAULTS.focusBlur);
		const jitter = post.nextJitter();
		expect(jitter[0]).toBeGreaterThanOrEqual(-0.5);
		expect(jitter[0]).toBeLessThanOrEqual(0.5);
		expect(Number.isFinite(post.uniforms.temporalJitter.value.x)).toBe(true);
		expect(Number.isFinite(post.uniforms.temporalJitter.value.y)).toBe(true);
		expect(POST_DEFAULTS.vignette).toBeGreaterThan(0);

		post.setSize(1280, 720);
		post.step(1 / 60);
		post.update({ enabled: false, chromaticAberration: 2 });
		post.setWorldVelocity([3, -2]);
		post.setDepthRange(0.2, 80);
		expect(post.uniforms.enabled.value).toBe(0);
		expect(post.uniforms.chromaticAberration.value).toBe(2);
		expect(post.uniforms.worldVelocity.value.x).toBe(3);
		expect(post.uniforms.worldVelocity.value.y).toBe(-2);
		expect(post.uniforms.depthRange.value.x).toBe(0.2);
		expect(post.uniforms.depthRange.value.y).toBe(80);
		post.dispose();
	});
});
