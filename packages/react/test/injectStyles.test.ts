import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The fallback stylesheet is a template literal, so a backtick anywhere inside
 * it — including in a comment — ends the string early and the module stops
 * parsing. That is a build failure, but only once something imports the module;
 * `tsup` catches it, and it is easy to run the next command anyway and spend
 * the following half hour wondering why a page returns 500.
 *
 * It happened three times. This is the fourth time not happening.
 */
const source = readFileSync(
	fileURLToPath(new URL("../src/injectStyles.ts", import.meta.url)),
	"utf8",
);

describe("the injected stylesheet", () => {
	it("is one template literal with nothing that can close it early", () => {
		const start = source.indexOf("const CSS = `");
		expect(start).toBeGreaterThan(-1);
		const end = source.indexOf("`;", start);
		expect(end).toBeGreaterThan(start);
		const css = source.slice(start + "const CSS = `".length, end);

		const backticks = [...css].filter((character) => character === "`").length;
		expect(backticks, "a backtick inside the CSS ends the template early").toBe(0);
		expect(css.includes("${"), "an interpolation would run the CSS as code").toBe(false);
	});

	it("defines every class the IRIS components carry", () => {
		// A component whose class has no rule renders as an unstyled box, which
		// is exactly the sort of thing a page still manages to look fine with.
		for (const name of [
			"ui-lib-bubble-badge",
			"ui-lib-paper-button",
			"ui-lib-soft-light-panel",
			"ui-lib-watercolor-card",
			"ui-lib-bling",
		]) {
			expect(source).toContain(`.${name}`);
		}
	});

	it("gives every tone its own appearance", () => {
		// `tone` used to reach only the glass tint. On a pale ground the three
		// palettes were then indistinguishable: the component baseline measured
		// 0.00 between iris, blossom and mist on the watercolour card.
		for (const block of ["soft-light-panel", "watercolor-card", "bling"]) {
			for (const tone of ["blossom", "mist"]) {
				expect(source, `${block} has no ${tone} appearance`).toContain(`${block}--${tone}`);
			}
		}
	});
});
