import { createWash } from "@ui-lib/core";
import { describe, expect, it } from "vitest";
import { WASH_CSS } from "../src/washStyles.js";

/**
 * The stylesheet half of the wash generator.
 *
 * It lives here rather than in `core` because `core` has no dependencies and
 * every package depends on it — a 5 KB stylesheet in there is a cost paid by
 * the renderer, the particles and the DOM bridge for a feature only the UI
 * layer uses. `core` computes the numbers; this says what they mean.
 */
describe("the wash stylesheet", () => {
	/**
	 * The guard that was missing.
	 *
	 * `injectStyles.ts` has had a test for this since a stray backtick in a CSS
	 * comment ended the template early, and it was written for that one file.
	 * This module has a stylesheet too, made the same mistake, and nothing was
	 * watching — which is the lesson: the guard protected a file, not the class
	 * of error.
	 */
	it("is one template literal with nothing that can close it early", () => {
		const backticks = [...WASH_CSS].filter((c) => c === "`").length;
		expect(backticks, "a backtick inside the CSS ends the template early").toBe(0);
		expect(WASH_CSS.includes("${"), "an interpolation would run the CSS as code").toBe(false);
	});

	it("only reads variables the generator produces", () => {
		// The two halves are written in different files and have to agree. A
		// variable the CSS reads but the generator never sets is a silent
		// layout bug — the fallback hides it and the wash is just wrong.
		const produced = new Set(Object.keys(createWash({ hue: "#b79cf5" }).style));
		const optional = new Set(["--wash-paper"]);
		const used = [...WASH_CSS.matchAll(/var\((--wash-[a-z-]+)/g)].map((m) => m[1]!);
		const orphans = [...new Set(used)].filter((v) => !produced.has(v) && !optional.has(v));
		expect(orphans, `CSS reads ${orphans.join(", ")} which nothing produces`).toEqual([]);
	});

	it("honours reduced motion for every animated selector", () => {
		// Checked by selector rather than by keyframe name. The reduced-motion
		// block switches off the rules that animate, and a keyframe's name never
		// appears in it — so the first version of this test asserted the wrong
		// thing and failed on a stylesheet that was correct.
		const selectors = [...WASH_CSS.matchAll(/^(\.[a-z0-9_.\- ]+?)\s*\{[^}]*animation:/gms)].map(
			(m) => m[1]!.trim(),
		);
		expect(selectors.length).toBeGreaterThan(0);
		const reduced = WASH_CSS.slice(WASH_CSS.indexOf("prefers-reduced-motion"));
		for (const selector of new Set(selectors)) {
			expect(reduced, `${selector} is not covered by reduced motion`).toContain(selector);
		}
	});
});
