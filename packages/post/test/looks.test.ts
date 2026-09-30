import { describe, expect, it } from "vitest";
import { LOOKS, resolveLook } from "../src/looks.js";
import { createPostProcessing, POST_DEFAULTS } from "../src/postProcessing.js";
import { compressHighlight } from "../src/shoulder.js";

describe("highlight shoulder", () => {
	it("leaves midtones and a zero amount alone", () => {
		expect(compressHighlight(0.4, 1)).toBeCloseTo(0.4);
		expect(compressHighlight(1, 1)).toBeCloseTo(1);
		expect(compressHighlight(4, 0)).toBe(4);
	});

	it("rolls peaks off without sending them under 1", () => {
		const rolled = compressHighlight(4, 1);
		expect(rolled).toBeGreaterThan(1);
		expect(rolled).toBeLessThan(2);
		expect(compressHighlight(4, 0.7)).toBeGreaterThan(rolled);
		expect(compressHighlight(4, 0.7)).toBeLessThan(4);
	});

	it("is what the cinema grade uses to stay under the uncapped grade", () => {
		const hot = compressHighlight(4, LOOKS.bright.shoulder);
		const graded = compressHighlight(4, LOOKS.cinema.shoulder);
		expect(hot).toBe(4);
		expect(graded).toBeLessThan(hot);
		expect(LOOKS.cinema.bloomThreshold).toBeGreaterThan(LOOKS.bright.bloomThreshold);
		expect(LOOKS.cinema.bloomStrength).toBeLessThan(LOOKS.bright.bloomStrength);
	});
});

describe("looks", () => {
	it("lets a page override a grade and disable the chain", () => {
		expect(resolveLook()).toBeUndefined();
		expect(resolveLook(undefined, false)).toBe(false);
		const merged = resolveLook("cinema", { motionBlur: 0.46, shoulder: 0.2 });
		expect(merged).toMatchObject({
			shoulder: 0.2,
			motionBlur: 0.46,
			bloomStrength: LOOKS.cinema.bloomStrength,
		});
	});

	it("keeps the default shoulder at identity so unnamed stages do not change grade", () => {
		expect(POST_DEFAULTS.shoulder).toBe(0);
		const post = createPostProcessing({ shoulder: 0.4 });
		expect(post.uniforms.shoulder.value).toBe(0.4);
		post.update({ shoulder: 0 });
		expect(post.uniforms.shoulder.value).toBe(0);
		post.dispose();
	});
});
