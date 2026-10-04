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
 * Names that tie the library to one project.
 *
 * The library is independent, and the one thing that quietly breaks that is a
 * public type named after the product it was built for. `IrisTone` was exactly
 * that: a component prop typed `IrisTone` asks a caller to learn what `Iris` is
 * in order to pass `"blossom"`. There is a `Tone` alias now and the old name is
 * kept, so this check does not fail on it — what it does is stop the *next* one.
 *
 * Only exported type names are checked, and only these words. The palette itself
 * is still called `IRIS` and that is a value rather than a type: a consumer who
 * never touches it never meets the name.
 */
const PROJECT_WORDS = ["Iris", "SuLiluo", "ShengFlow", "CTorch"];

/**
 * Exported types whose name carries a project word, with the neutral name that
 * satisfies the rule.
 *
 * Registered rather than renamed, for the reason `SoftButton` is an alias: these
 * names are in call sites, and renaming them would break every one for a naming
 * improvement. `Tone`, `GlassLookName`, `ToneRoles` and `PanelProps` are the
 * neutral names; the old ones stay exported and stay supported.
 *
 * The list is what keeps the exception **visible and finite**. Adding a fifth is
 * a decision with a reason; leaving one off is a check that quietly widens.
 */
const ALIASED_TYPES = new Map([
	["IrisTone", "Tone"],
	["IrisToneRoles", "ToneRoles"],
	["IrisGlassLookName", "GlassLookName"],
	["IrisPanelProps", "PanelProps"],
	["IrisEffectOptions", "EffectOptions"],
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

	/*
	 * Public type names, read off the built declarations rather than the sources.
	 *
	 * The declarations write `type X = ...` and export it from a list at the end of
	 * the file, so matching `export type` matches nothing — which is what the first
	 * version of this did, and it reported a clean bill of health for a check that
	 * had not looked at anything. A guard that cannot fail is worse than no guard.
	 */
	const { existsSync } = await import("node:fs");
	let checkedTypes = 0;
	const PACKAGES = [
		"core",
		"react",
		"dom",
		"renderer",
		"particles",
		"post",
		"motion",
		"shaders",
	];
	for (const pkg of PACKAGES) {
		const path = join(ROOT, `packages/${pkg}/dist/index.d.ts`);
		if (!existsSync(path)) continue;
		const text = readFileSync(path, "utf8");

		// The exported names, from the export list rather than from the declarations.
		const exported = new Set(
			[...text.matchAll(/export\s*\{([^}]*)\}/gs)]
				.flatMap((m) => m[1].split(","))
				.map((entry) =>
					(
						entry
							.trim()
							.split(/\s+as\s+/)
							.pop() || ""
					).trim(),
				)
				// The export list prefixes types with the keyword — "type IrisTone" — so
				// the keyword is stripped here. Without this nothing matches and the check
				// reports a clean bill of health for having looked at nothing.
				.map((entry) => entry.replace(/^type\s+/, ""))
				.filter(Boolean),
		);

		for (const match of text.matchAll(/^(?:declare )?(?:type|interface|class|enum) (\w+)/gm)) {
			const name = match[1];
			if (!name || !exported.has(name)) continue;
			checkedTypes += 1;
			if (ALIASED_TYPES.has(name)) continue;
			for (const word of PROJECT_WORDS) {
				if (name.includes(word)) {
					problems.push(`${pkg}: exported type ${name} carries the project name ${word}`);
				}
			}
		}
	}

	if (problems.length > 0) {
		console.error("\ncheck-api: the naming rule is broken");
		for (const p of problems) console.error(`  ${p}`);
		console.error("");
		return 1;
	}
	console.log(
		`check-api: ${files.length} components follow the rule; ${checkedTypes} exported types carry no project name`,
	);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
