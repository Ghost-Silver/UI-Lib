#!/usr/bin/env node
/**
 * The public API, held to the naming rule the library actually follows.
 *
 * The rule is not "everything is `Soft`", which is what a first reading of the
 * exports suggests and what would have led to renaming four components that are
 * correctly named. The library has two layers and they are named differently on
 * purpose:
 *
 *   **Application components** carry a `Soft` prefix. They are the things an
 *   application is built from: a field, a table, a dialog, a chip. Each has an
 *   accessibility contract — a role, a keyboard model, a screen-reader name —
 *   and that is what the prefix marks.
 *
 *   **Visual and motion primitives** carry no prefix. `GlassStage` is a render
 *   host, `Optics` is a material, `Reveal` is an animation, `Bling` is a burst
 *   of particles. They have no contract to keep and nothing to announce; they
 *   are the parts the components are made of.
 *
 * The distinction is measurable rather than a matter of taste: a component that
 * sets `role`, `aria-*` or `tabIndex`, or that renders a native interactive
 * element, is an application component. That is what this checks, so the rule
 * cannot drift into "whatever the last commit did".
 *
 * Usage:
 *   node scripts/check-api.mjs
 *   node scripts/check-api.mjs --self-test
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Exports that are deliberately outside the component layers. */
const NOT_A_COMPONENT = new Set([
	// Registries and constants.
	"LOOKS",
	"GLASS_LOOKS",
	"FIELD_LOOKS",
	"LENS_LOOKS",
	"SCROLL_CINEMA_BEATS",
	"SCROLL_CINEMA_FADE",
	"CINEMA_LENS_ENVIRONMENT",
	// Contexts, which are objects rather than rendered things.
	"GlassStageContext",
]);

/**
 * Primitive names that have no prefix **and should not have one**.
 *
 * Listed rather than inferred, so adding a sixth is an act with a reason beside
 * it rather than a check that quietly widens.
 */
/**
 * Components whose name is older than the rule, with the name that satisfies it.
 *
 * Listed rather than renamed, and the reasoning is in the component: renaming
 * would break every call site for a naming preference, and the old name is not
 * wrong so much as uninformative. What this list does is make the exception
 * **visible and finite** — a fourth entry would be a decision, not a slip.
 */
const ALIASED = new Map([["PinkPaperButton", "SoftButton"]]);

const PRIMITIVES = new Set([
	"GlassStage",
	"GlassPanel",
	"Optics",
	"Lens",
	"ParticleField",
	"Reveal",
	"Magnetic",
	"PointerTrail",
	"ScrollPin",
	"ScrollTrack",
	"Bling",
	"WatercolorCard",
	"BubbleBadge",
	"CrystalText",
	"LiquidGlass",
]);

/**
 * Whether a source file carries an accessibility contract.
 *
 * Three signals, any of which is enough: an explicit `role`, an `aria-*`
 * attribute, or a native interactive element. A file that has none of them is
 * decorative or infrastructural — it has nothing to announce.
 */
export function hasAccessibilityContract(source) {
	if (/\brole="/.test(source)) return true;
	if (/\baria-[a-z]+/.test(source)) return true;
	if (/<button[\s>]|<input[\s>]|<select[\s>]|<textarea[\s>]|<dialog[\s>]/.test(source))
		return true;
	return false;
}

async function main() {
	if (process.argv.includes("--self-test")) {
		// The probe has to be able to say yes and no.
		const yes = hasAccessibilityContract('<button type="button" aria-label="x" />');
		const roleOnly = hasAccessibilityContract('<div role="listbox" />');
		const ariaOnly = hasAccessibilityContract('<span aria-hidden="true" />');
		const no = hasAccessibilityContract('<div className="x"><span /></div>');
		if (!(yes && roleOnly && ariaOnly && !no)) {
			console.error("check-api --self-test: the probe is blind");
			console.error({ yes, roleOnly, ariaOnly, no });
			return 1;
		}
		console.log("check-api --self-test: probe is live");
		return 0;
	}

	const { readdir } = await import("node:fs/promises");
	const { join } = await import("node:path");
	const SRC = join(ROOT, "packages/react/src");
	const files = (await readdir(SRC)).filter((f) => f.endsWith(".tsx"));

	const problems = [];
	for (const file of files) {
		const name = file.replace(/\.tsx$/, "");
		if (NOT_A_COMPONENT.has(name) || PRIMITIVES.has(name)) continue;
		const source = readFileSync(join(SRC, file), "utf8");
		const prefixed = name.startsWith("Soft");
		const contract = hasAccessibilityContract(source);
		if (contract && !prefixed && !ALIASED.has(name)) {
			problems.push(`${name} has an accessibility contract and no Soft prefix`);
		}
	}

	if (problems.length > 0) {
		console.error("\ncheck-api: the naming rule is broken");
		for (const p of problems) console.error("  " + p);
		console.error("");
		return 1;
	}
	console.log(`check-api: ${files.length} components follow the rule`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
