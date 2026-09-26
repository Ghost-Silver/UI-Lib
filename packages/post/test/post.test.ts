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
		expect(POST_DEFAULTS.vignette).toBeGreaterThan(0);

		post.setSize(1280, 720);
		post.step(1 / 60);
		post.update({ enabled: false, chromaticAberration: 2 });
		expect(post.uniforms.enabled.value).toBe(0);
		expect(post.uniforms.chromaticAberration.value).toBe(2);
		post.dispose();
	});
});
