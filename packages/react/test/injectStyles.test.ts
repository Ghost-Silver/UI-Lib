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

/**
 * The wash generator and this stylesheet have to agree.
 *
 * They are written in different packages — the numbers in `core`, the rules
 * here — and the failure when they disagree is silent. A class name with no
 * rule renders nothing at all, which is what happened: three generated washes
 * were in the DOM, correctly styled with twelve custom properties, and the
 * page showed nothing because nothing consumed them.
 */
describe("the generated washes", () => {
	it("has a rule for every class the generator emits", async () => {
		const { createWash } = await import("@ui-lib/core");
		for (const state of ["wet", "drying", "dry"] as const) {
			const wash = createWash({ hue: "#b79cf5", seed: 3, state });
			for (const name of wash.className.split(" ")) {
				expect(source, `${name} has no rule`).toContain(`.${name}`);
			}
		}
		expect(source).toContain(".ui-lib-wash__deposit");
	});

	it("reads only variables the generator produces", async () => {
		const { createWash } = await import("@ui-lib/core");
		const produced = new Set(Object.keys(createWash({ hue: "#b79cf5" }).style));
		// The paper's own colour belongs to the caller, not to a single wash.
		const optional = new Set(["--wash-paper"]);
		const used = [...source.matchAll(/var\((--wash-[a-z-]+)/g)].map((m) => m[1]!);
		const orphans = [...new Set(used)].filter((v) => !produced.has(v) && !optional.has(v));
		expect(orphans, `CSS reads ${orphans.join(", ")} which nothing produces`).toEqual([]);
	});

	it("honours reduced motion for every animated rule", () => {
		const selectors = [...source.matchAll(/^(\.[a-z0-9_.\- ]+?)\s*\{[^}]*animation:/gms)].map(
			(m) => m[1]!.trim(),
		);
		expect(selectors.length).toBeGreaterThan(0);
		const reduced = source.slice(source.indexOf("prefers-reduced-motion"));
		for (const selector of new Set(selectors)) {
			expect(reduced, `${selector} is not covered`).toContain(selector);
		}
	});
});
