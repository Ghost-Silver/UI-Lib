/**
 * The cascade gate: a modifier rule must not sit in front of the rule it modifies.
 *
 * ## The bug this exists for
 *
 * `.ui-lib-soft-card--glass` was written to drop the card's opaque fill, because
 * the refraction that gives the card its thickness is painted by a canvas
 * *underneath* the element and an opaque fill hides it. The rule said
 * `background: transparent` and it was correct, and it did nothing at all,
 * because `.ui-lib-soft-card` appeared 62 lines *later* in the same stylesheet
 * and set `background: var(--moe-card)`.
 *
 * Both selectors are one class, so both weigh (0,1,0), so the cascade fell
 * through to source order, and source order said the base rule wins. The fill
 * stayed opaque, the four inset highlights and the uneven border were overridden
 * the same way, and the glass rendered as a flat white card.
 *
 * The cost of not having this gate was not one line. It was three rounds spent
 * looking for the fault somewhere else: first at the shader's uniforms, then at
 * the order in which the renderer draws the panel and the particle field into
 * the shared target. Both were plausible, neither was the fault, and a plausible
 * wrong answer costs more than a known unknown — because it comes with a reason
 * to stop looking.
 *
 * The lesson generalises past this file: **a fix with no gate is a hypothesis.**
 * A rule can be correct, present, and dead.
 *
 * ## What it checks
 *
 * For every rule whose selector is a single compound that carries a class also
 * used by a *lone* rule of that class — a modifier and its base:
 *
 *   - equal specificity, because otherwise the cascade decides and order is moot;
 *   - at least one declaration in common, shorthand-expanded, because two rules
 *     that never touch the same property cannot conflict;
 *   - equal importance, because `!important` outranks order in both directions;
 *   - the modifier *earlier* in the file than the base.
 *
 * Shorthand expansion is not a nicety. The glass rule sets `border-width` and
 * `border-color`; the card sets `border`. Compared as strings those are three
 * different properties and the conflict is invisible; expanded, `border` reaches
 * every one of them and the conflict is the whole bug.
 *
 * Usage:
 *   node scripts/check-cascade.mjs
 *   node scripts/check-cascade.mjs --self-test
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { stylesheetLiterals } from "./check-templates.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Files that carry a stylesheet in a template literal. */
const STYLESHEET_FILES = ["packages/react/src/injectStyles.ts"];

const SIDES = ["top", "right", "bottom", "left"];
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

/**
 * Shorthands that reach other properties, and the properties they reach.
 *
 * Only expansions that change a verdict are listed. `background` reaching
 * `background-color` and `border` reaching all twelve of its longhands are the
 * two that this file has actually needed.
 *
 * @type {Record<string, string[]>}
 */
const REACH = {
	background: [
		"background-color",
		"background-image",
		"background-position",
		"background-size",
		"background-repeat",
		"background-origin",
		"background-clip",
		"background-attachment",
	],
	border: [
		"border-width",
		"border-style",
		"border-color",
		...SIDES.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
	],
	"border-width": SIDES.map((s) => `border-${s}-width`),
	"border-style": SIDES.map((s) => `border-${s}-style`),
	"border-color": SIDES.map((s) => `border-${s}-color`),
	"border-radius": CORNERS.map((c) => `border-${c}-radius`),
	margin: SIDES.map((s) => `margin-${s}`),
	padding: SIDES.map((s) => `padding-${s}`),
	inset: SIDES,
	gap: ["row-gap", "column-gap"],
	overflow: ["overflow-x", "overflow-y"],
	flex: ["flex-grow", "flex-shrink", "flex-basis"],
	font: [
		"font-style",
		"font-variant",
		"font-weight",
		"font-stretch",
		"font-size",
		"line-height",
		"font-family",
	],
	transition: [
		"transition-property",
		"transition-duration",
		"transition-timing-function",
		"transition-delay",
	],
	animation: [
		"animation-name",
		"animation-duration",
		"animation-timing-function",
		"animation-delay",
		"animation-iteration-count",
		"animation-direction",
		"animation-fill-mode",
		"animation-play-state",
	],
	"place-items": ["align-items", "justify-items"],
	"text-decoration": ["text-decoration-line", "text-decoration-style", "text-decoration-color"],
	"list-style": ["list-style-type", "list-style-position", "list-style-image"],
};

/** Every property a declaration reaches, including itself. */
export function atoms(property) {
	const out = new Set([property]);
	for (const reached of REACH[property] ?? []) out.add(reached);
	return out;
}

/** Do two declarations touch the same underlying property? */
export function reaches(a, b) {
	const left = atoms(a);
	for (const atom of atoms(b)) if (left.has(atom)) return true;
	return false;
}

/**
 * Split a selector list on its top-level commas.
 *
 * `:is(a, b)` and `[data-x=","]` both contain commas that do not separate
 * selectors, so the split tracks bracket and paren depth and skips strings.
 */
export function splitSelectors(selector) {
	const out = [];
	let depth = 0;
	let current = "";
	let quote = "";
	for (let i = 0; i < selector.length; i += 1) {
		const ch = selector[i];
		if (quote) {
			current += ch;
			if (ch === quote) quote = "";
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			current += ch;
			continue;
		}
		if (ch === "(" || ch === "[") depth += 1;
		else if (ch === ")" || ch === "]") depth -= 1;
		if (ch === "," && depth === 0) {
			out.push(current.trim());
			current = "";
			continue;
		}
		current += ch;
	}
	out.push(current.trim());
	return out.filter(Boolean);
}

/**
 * The specificity of one compound selector, as a comparable number.
 *
 * Only compounds reach here — a selector with a combinator matches a *relation*
 * between elements rather than one element, and "the same element carries both
 * classes" is not a question that can be asked of it.
 */
export function specificity(compound) {
	let ids = 0;
	let classes = 0;
	let elements = 0;
	for (let i = 0; i < compound.length; i += 1) {
		const ch = compound[i];
		if (ch === "[") {
			classes += 1;
			const end = compound.indexOf("]", i);
			i = end === -1 ? compound.length : end;
			continue;
		}
		if (ch === ":") {
			if (compound[i + 1] === ":") {
				elements += 1;
				i += 1;
			} else classes += 1;
			continue;
		}
		if (ch === "." || ch === "#") {
			if (ch === "#") ids += 1;
			else classes += 1;
			while (i + 1 < compound.length && /[\w-]/.test(compound[i + 1])) i += 1;
			continue;
		}
		if (/[a-zA-Z*]/.test(ch)) {
			elements += 1;
			while (i + 1 < compound.length && /[\w-]/.test(compound[i + 1])) i += 1;
			continue;
		}
	}
	return ids * 1_000_000 + classes * 1_000 + elements;
}

/** The class names in one compound selector, in source order. */
export function classNames(compound) {
	const out = [];
	for (let i = 0; i < compound.length; i += 1) {
		if (compound[i] !== ".") continue;
		let name = "";
		while (i + 1 < compound.length && /[\w-]/.test(compound[i + 1])) {
			name += compound[i + 1];
			i += 1;
		}
		if (name) out.push(name);
	}
	return out;
}

/** Does the compound carry anything besides its class names? */
function isBareClass(compound, name) {
	return compound === `.${name}`;
}

/** Is this compound a single element selector, with no combinator to relate? */
export function isCompound(selector) {
	if (!selector) return false;
	if (/[\s>+~]/.test(selector.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "")))
		return false;
	return true;
}

/**
 * Walk a stylesheet into rules, tracking which at-rule each one sits in.
 *
 * Enough of a parser for a file this project writes by hand, and deliberately
 * not more: comments, strings and nesting are handled because they all occur,
 * and `@media` bodies recurse because the file has them.
 */
export function parseRules(css) {
	const rules = [];
	const stack = [];
	let buffer = "";
	let order = 0;
	let i = 0;
	while (i < css.length) {
		const ch = css[i];
		if (ch === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 2;
			continue;
		}
		if (ch === '"' || ch === "'") {
			const quote = ch;
			let j = i + 1;
			while (j < css.length && css[j] !== quote) {
				if (css[j] === "\\") j += 1;
				j += 1;
			}
			i = j + 1;
			buffer += " ";
			continue;
		}
		if (ch === "{") {
			const prelude = buffer.trim();
			buffer = "";
			if (prelude.startsWith("@")) stack.push({ at: prelude });
			else stack.push({ selector: prelude, bodyStart: i + 1, context: atContext(stack) });
			i += 1;
			continue;
		}
		if (ch === "}") {
			const top = stack.pop();
			if (top && top.selector !== undefined) {
				rules.push({
					selector: top.selector,
					body: css.slice(top.bodyStart, i),
					context: top.context,
					order: order++,
				});
			}
			buffer = "";
			i += 1;
			continue;
		}
		if (ch === ";" && buffer.trim().startsWith("@")) {
			buffer = "";
			i += 1;
			continue;
		}
		buffer += ch;
		i += 1;
	}
	return rules;
}

function atContext(stack) {
	return stack
		.filter((frame) => frame.at)
		.map((frame) => frame.at)
		.join(" && ");
}

/**
 * The declared properties of a rule, with their importance.
 *
 * Comments are removed first, and that is not tidiness. The declaration regex
 * anchors on `^`, `;` or `{`, so a comment sitting between a `;` and the next
 * declaration consumes the anchor and the declaration that follows it is never
 * seen. This file puts a paragraph of reasoning above the property it explains,
 * so the pattern is everywhere: the base card rule's own `padding: 22px` is
 * invisible to a parser that does not strip comments, and so is the glass
 * rule's `border-width`. A gate that under-reports is worse than no gate,
 * because it comes with a reason to stop looking.
 */
export function declarations(body) {
	const stripped = body.replace(/\/\*[\s\S]*?\*\//g, " ");
	const out = [];
	const re = /(^|;|\{)\s*([a-zA-Z-]+)\s*:([^;]*)/g;
	for (const match of stripped.matchAll(re)) {
		out.push({
			property: match[2].toLowerCase(),
			important: /!important/i.test(match[3]),
		});
	}
	return out;
}

/**
 * Every modifier that is outranked by its own base rule's source position.
 *
 * @returns {{selector: string, base: string, properties: string[], order: number, baseOrder: number}[]}
 */
export function findCascadeProblems(css) {
	const rules = parseRules(css);

	/** Lone-class rules, by class name. A class may be declared more than once. */
	const bases = new Map();
	for (const rule of rules) {
		for (const selector of splitSelectors(rule.selector)) {
			const names = classNames(selector);
			if (names.length !== 1) continue;
			if (!isBareClass(selector, names[0])) continue;
			if (!bases.has(names[0])) bases.set(names[0], []);
			bases.get(names[0]).push(rule);
		}
	}

	const problems = [];
	for (const rule of rules) {
		for (const selector of splitSelectors(rule.selector)) {
			if (!isCompound(selector)) continue;
			const names = classNames(selector);
			if (names.length === 0) continue;

			/*
			 * Which classes this selector modifies.
			 *
			 * A compound names them directly: `.card[data-x]` modifies `.card`. A
			 * lone class does not — `.card--glass` carries no trace of `.card` in
			 * its selector, only in its name, and the element in the markup has
			 * both classes. So the relationship is read from the `--` separator,
			 * which is the one thing BEM buys and the reason the bug was possible:
			 * the two rules are 62 lines apart and neither mentions the other.
			 *
			 * A modifier is also a base. `.card--glass` is modified by whatever
			 * modifies it, and the two roles are checked independently.
			 */
			const candidates = [];
			if (names.length === 1 && isBareClass(selector, names[0])) {
				const cut = names[0].lastIndexOf("--");
				if (cut > 0) candidates.push(names[0].slice(0, cut));
			} else {
				candidates.push(...names);
			}
			if (candidates.length === 0) continue;

			const declared = declarations(rule.body);
			for (const name of candidates) {
				for (const base of bases.get(name) ?? []) {
					if (base.order === rule.order) continue;
					if (base.order < rule.order) continue;
					if (specificity(selector) !== specificity(`.${name}`)) continue;
					const shadowed = new Set();
					for (const own of declared) {
						for (const other of declarations(base.body)) {
							if (own.important !== other.important) continue;
							if (!reaches(own.property, other.property)) continue;
							shadowed.add(own.property);
						}
					}
					if (shadowed.size === 0) continue;
					problems.push({
						selector,
						base: `.${name}`,
						properties: [...shadowed].sort(),
						order: rule.order,
						baseOrder: base.order,
					});
				}
			}
		}
	}
	return problems;
}

/* The modifier first, and a shorthand in the base reaching a longhand in the
   modifier — the shape of the bug this gate was written for. */
const SELF_TEST_BAD = `
.a--mod { background: transparent; border-width: 3px; }
.a { background: red; border: 1px solid black; }
`;

/* Base first is the correct order, and a modifier that shares no property with
   its base cannot conflict wherever it sits. */
const SELF_TEST_GOOD = `
.a { background: red; }
.a--mod { background: transparent; }
.c--mod { color: blue; }
.c { background: red; }
`;

/* The base is outranked by specificity, so source order never decides it. */
const SELF_TEST_SPECIFIC = `
.a.x { background: transparent; }
.a { background: red; }
`;

/* A declaration after a comment must still be seen. Anchoring the declaration
   regex on `;` alone loses it, and this file writes a comment above almost
   every property it cares about. */
const SELF_TEST_COMMENT = `
.a--mod { border-width: 3px; }
.a {
	/* the base's own border, explained at length and therefore invisible */
	border: 1px solid black;
}
`;

function selfTest() {
	const failures = [];

	const bad = findCascadeProblems(SELF_TEST_BAD);
	if (bad.length !== 1) failures.push(`expected 1 problem, found ${bad.length}`);
	else {
		const properties = bad[0].properties.join(",");
		if (properties !== "background,border-width") {
			failures.push(`expected background+border-width, found ${properties}`);
		}
	}

	const good = findCascadeProblems(SELF_TEST_GOOD);
	if (good.length !== 0) {
		failures.push(`expected no problems, found ${good.length}: ${good.map((p) => p.selector)}`);
	}

	// The base is outranked by specificity, so source order cannot decide it.
	const specific = findCascadeProblems(SELF_TEST_SPECIFIC);
	if (specific.length !== 0) failures.push(`specificity case flagged: ${specific.length}`);

	// A comment must not hide the declaration beneath it.
	const commented = findCascadeProblems(SELF_TEST_COMMENT);
	if (commented.length !== 1) {
		failures.push(`comment case: expected 1 problem, found ${commented.length}`);
	} else if (commented[0].properties.join(",") !== "border-width") {
		failures.push(`comment case: expected border-width, found ${commented[0].properties}`);
	}

	if (failures.length) {
		for (const failure of failures) console.error(`  self-test: ${failure}`);
		console.error("check-cascade: SELF-TEST FAILED");
		process.exit(1);
	}
	console.log("check-cascade: self-test passed");
}

function main() {
	if (process.argv.includes("--self-test")) {
		selfTest();
		return;
	}

	let problems = 0;
	let rules = 0;
	for (const file of STYLESHEET_FILES) {
		const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		for (const literal of stylesheetLiterals(source)) {
			const parsed = parseRules(literal.body);
			rules += parsed.length;
			for (const problem of findCascadeProblems(literal.body)) {
				problems += 1;
				console.error(
					`${file}\n  ${problem.selector}  is outranked by  ${problem.base}\n` +
						`  it sets ${problem.properties.join(", ")}, which ${problem.base} also sets\n` +
						`  ${problem.base} is ${problem.baseOrder - problem.order} rules later, ` +
						`at equal specificity, so it wins\n`,
				);
			}
		}
	}

	if (problems > 0) {
		console.error(`check-cascade: ${problems} modifier(s) shadowed by their own base rule`);
		process.exit(1);
	}
	console.log(`check-cascade: ${rules} rules, no modifier precedes its base (${ROOT})`);
}

main();
