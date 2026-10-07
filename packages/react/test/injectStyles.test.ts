import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
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

/**
 * Every class the package names, the stylesheet defines.
 *
 * This replaces a narrower version of the same idea, and the replacement is the
 * point. The first guard asked `createWash` for its class names and checked them
 * against the stylesheet, which caught the wash and nothing else — so when
 * `material.ts` emitted `ui-lib-material` and the stylesheet defined
 * `ui-lib-material--ground`, three generated washes were fine and every material
 * card rendered as plain paper. The check was correct and its scope was one
 * function.
 *
 * This one does not call anything. It reads every source file in the package,
 * takes every `ui-lib-*` string that appears in a class position, and requires a
 * rule for it. That is a fact about the two files rather than about one
 * generator, so it cannot be correct while the contract it guards is broken.
 *
 * Two exclusions, both explicit rather than inferred:
 *  - names the component *consumes* from a consumer, which is what `className`
 *    composition is for, are listed by prefix below;
 *  - `ui-lib-visually-hidden` and friends are defined, so they need no entry.
 */
describe("the stylesheet and the components agree", () => {
	const SRC = fileURLToPath(new URL("../src", import.meta.url));

	/*
	 * Names with the prefix that are not CSS classes.
	 *
	 * Both of these are real and both were flagged on the first run, which is
	 * the tension in a check this broad: a prefix is a convention, not a type.
	 *
	 *  - `ui-lib-styles` is the **id of the style element** this module injects.
	 *    An id selector for it would be wrong twice over.
	 *
	 * There were three entries here and now there is one. The other two were
	 * **anchor names**, which used to be prefixed `ui-lib-` — the same namespace
	 * as the classes — so they looked like classes to this check and to a reader.
	 * Anchor names are `ui-anchor-*` now, which fixes the cause instead of
	 * listing the symptoms; see `anchorNameFrom`.
	 *
	 * Listed rather than pattern-matched, so adding a third is a deliberate act
	 * with a reason next to it.
	 */
	const NOT_A_CLASS = ["ui-lib-styles"];

	/** Classes a caller supplies, or that come from another package's contract. */
	const EXTERNAL = [
		// The wash generator's own class names are asserted separately, above,
		// with the state list they come from.
		"ui-lib-wash",
	];

	function sourceFiles(): string[] {
		const out: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const full = join(dir, entry.name);
				if (entry.isDirectory()) walk(full);
				else if (/\.tsx?$/.test(entry.name)) out.push(full);
			}
		};
		walk(SRC);
		return out;
	}

	it("has a rule for every class any component names", async () => {
		const found = new Map<string, string>();
		for (const file of sourceFiles()) {
			const text = readFileSync(file, "utf8");
			// In a className string, a template literal, an array, or a
			// className= attribute. Not in an import path or a comment, which is
			// why this does not simply scan for the prefix everywhere: a comment
			// that mentions ui-lib-material--ground would otherwise become a
			// requirement that the stylesheet define it twice.
			for (const match of text.matchAll(/["'`]([a-z0-9_\- ]*ui-lib-[a-z0-9_\- ]+)["'`]/g)) {
				for (const name of match[1]!.split(/\s+/)) {
					if (name.startsWith("ui-lib-")) found.set(name, relative(SRC, file));
				}
			}
		}
		expect(found.size).toBeGreaterThan(10);

		const missing = [...found.entries()]
			.filter(([name]) => !EXTERNAL.some((prefix) => name.startsWith(prefix)))
			.filter(([name]) => !NOT_A_CLASS.includes(name))
			.filter(([name]) => !source.includes(`.${name}`))
			.map(([name, file]) => `${name} (named in ${file})`);

		expect(missing, `the stylesheet has no rule for: ${missing.join(", ")}`).toEqual([]);
	});

	it("defines no rule that no component names", async () => {
		// The other direction, and it is the one that would have caught a rename
		// that left a rule behind. Only top-level class rules are considered, and
		// only ones with the package prefix, because the stylesheet also defines
		// the token layer.
		const defined = new Set(
			[...source.matchAll(/^\.(ui-lib-[a-z0-9_-]+)/gm)].map((m) => m[1]!),
		);
		const used = new Set<string>();
		for (const file of sourceFiles()) {
			const text = readFileSync(file, "utf8");
			for (const match of text.matchAll(/ui-lib-[a-z0-9_-]+/g)) used.add(match[0]);
		}
		expect(defined.size).toBeGreaterThan(10);

		const orphans = [...defined].filter((name) => !used.has(name));
		expect(orphans, `nothing names: ${orphans.join(", ")}`).toEqual([]);
	});
});
