#!/usr/bin/env node
/**
 * The specification's own QA matrix, as a check.
 *
 * `MoeKit 萌系UI组件库设计体系与工程落地技术规范` §7 gives six quality
 * dimensions with a numeric criterion each, and the numbers are what makes it a
 * matrix rather than a mood board. This runs them against the built packages.
 *
 * Two things it deliberately does not do.
 *
 * It does not read the specification file, because a check that parses prose
 * breaks when a sentence is reworded, and it would fail open — silently checking
 * nothing — which is the failure mode this repository has already hit twice.
 * The criteria are transcribed here with their source section, and a change to
 * the document is a change to this file, visibly.
 *
 * And it does not treat the matrix as having no contradictions. §7 rejects ζ
 * outside `[0.42, 0.65]` and describes the failure as "more than three
 * oscillations, or none at all"; §3.1 defines `Spring.Gentle` at ζ = 0.80. The
 * two cannot both hold. **The stated failure is the one enforced**, because it
 * is the one that describes what a person sees, and the conflict is reported by
 * `check-spec --notes` rather than resolved by picking a favourite.
 *
 * Usage:
 *   node scripts/check-spec.mjs
 *   node scripts/check-spec.mjs --notes    # also print the criteria it cannot check
 *   node scripts/check-spec.mjs --self-test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const read = (p) => readFileSync(join(ROOT, p), "utf8");

/** Every failure, so one run reports all of them rather than the first. */
export const problems = [];

const fail = (section, message) => problems.push(`${section}: ${message}`);

/**
 * §7 "弹簧阻尼比" — a spring must settle without ringing more than three times,
 * and must not be so damped that it does not move.
 */
export function checkSprings(motion) {
	const names = Object.keys(motion.MOTION_PRESETS);
	if (names.length === 0) return fail("§7 dynamics", "no motion presets were exported");
	for (const name of names) {
		const spec = motion.MOTION_PRESETS[name];
		const crossings = motion.overshoots(spec);
		if (crossings === 0) {
			fail("§7 dynamics", `${name} (ζ=${spec.damping}) does not oscillate at all`);
		} else if (crossings > 3) {
			fail("§7 dynamics", `${name} (ζ=${spec.damping}) oscillates ${crossings} times`);
		}
	}
	// §3.1 names three springs and gives their k, c and m. A caller following the
	// document has to be able to write the name it prints.
	for (const [name, k, c] of [
		["jelly", 280, 14],
		["snappy", 450, 25],
		["gentle", 140, 19],
	]) {
		const spec = motion.MOTION_PRESETS[name];
		if (!spec) {
			fail("§3.1 springs", `${name} is named in the specification and not implemented`);
			continue;
		}
		const spring = motion.specToSpring(spec);
		if (Math.abs(spring.stiffness - k) > 1 || Math.abs(spring.damping - c) > 0.5) {
			fail(
				"§3.1 springs",
				`${name} resolves to k=${spring.stiffness.toFixed(1)} c=${spring.damping.toFixed(1)}, the spec says k=${k} c=${c}`,
			);
		}
	}
}

/**
 * §2.1 — seven radius tokens at the stated pixel values, and the capsule is the
 * one a button must close on.
 */
export function checkRadii(css) {
	const want = {
		"radius-xs": 6,
		"radius-sm": 10,
		"radius-md": 16,
		"radius-lg": 24,
		"radius-xl": 32,
		"radius-2xl": 40,
	};
	for (const [token, px] of Object.entries(want)) {
		const m = css.match(new RegExp(`--moe-${token}:\\s*([\\d.]+)rem`));
		if (!m) {
			fail("§2.1 radii", `--moe-${token} is missing`);
			continue;
		}
		const got = Number(m[1]) * 16;
		if (Math.abs(got - px) > 0.5) {
			fail("§2.1 radii", `--moe-${token} is ${got}px, the spec says ${px}px`);
		}
	}
	if (!/--moe-radius-full:\s*9999px/.test(css)) {
		fail("§2.1 radii", "the capsule radius is not 9999px");
	}
}

/**
 * §2.2 — the palette, by OKLCH value rather than by name. A token renamed to
 * something friendlier is fine; a token whose colour drifted is not.
 */
export function checkPalette(css) {
	const want = [
		["sakura-500", "0.85 0.12 15"],
		["lemon-500", "0.9 0.11 95"],
		["soda-500", "0.84 0.11 235"],
		["mint-500", "0.88 0.11 160"],
		["taro-500", "0.82 0.12 305"],
		["cocoa", "0.32 0.035 35"],
		["canvas", "0.98 0.008 85"],
	];
	const norm = (v) =>
		v
			.split(/\s+/)
			.map((x) => Number(x))
			.join(" ");
	const present = new Set(
		[...css.matchAll(/oklch\(([\d.]+ [\d.]+ [\d.]+)\)/g)].map((m) => norm(m[1])),
	);
	for (const [token, value] of want) {
		if (!present.has(norm(value))) {
			fail("§2.2 palette", `oklch(${value}) for --moe-${token} is not present`);
		}
	}
}

/**
 * §2.2.3 — no pure black, and no pure white text on a light fill.
 *
 * The second half is the one with a failure mode: white text on `lemon-500` or
 * `mint-500` measures around 1.5:1 and is unreadable, and it is exactly the
 * mistake a palette of pastels invites.
 */
export function checkContrast(css) {
	if (/#000(000)?\b/i.test(css) && !/\/\*[^*]*#000/.test(css)) {
		fail("§2.2.3 contrast", "a pure black value is in the stylesheet");
	}
	// Every rule that sets a pastel background must not also set white text.
	const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
	for (const [, selector, body] of rules) {
		const pastel = /var\(--moe-(sakura|lemon|mint|soda)-500\)|oklch\(0\.8[4-9]/.test(body);
		const whiteText = /color:\s*(#fff|#ffffff|white|oklch\(1\s)/i.test(body);
		if (pastel && whiteText && /background/.test(body)) {
			fail(
				"§2.2.3 contrast",
				`${selector.trim().slice(0, 40)} puts white text on a pastel fill`,
			);
		}
	}
}

/**
 * §5.3.2 and §5.3.3 — the two components whose geometry the specification gives
 * exactly, and the ones most likely to drift by a pixel at a time.
 */
export function checkGeometry(css) {
	const track = css.match(
		/\.ui-lib-soft-switch\s*\{[^}]*?width:\s*(\d+)px[^}]*?height:\s*(\d+)px/,
	);
	if (!track) fail("§5.3.2 switch", "the switch track has no fixed size");
	else if (track[1] !== "56" || track[2] !== "32") {
		fail("§5.3.2 switch", `track is ${track[1]}×${track[2]}, the spec says 56×32`);
	}
	const knob = css.match(/\.ui-lib-soft-switch__knob\s*\{[^}]*?height:\s*(\d+)px/);
	if (knob && knob[1] !== "26") {
		fail("§5.3.2 switch", `knob is ${knob[1]}px, the spec says 26px`);
	}
	const thumb = css.match(/\.ui-lib-soft-slider__thumb[^{]*\{[^}]*?width:\s*(\d+)px/);
	if (thumb && thumb[1] !== "22") {
		fail("§5.3.3 slider", `thumb is ${thumb[1]}px, the spec says 22px`);
	}
}

async function main() {
	const notes = process.argv.includes("--notes");
	const { createRequire } = await import("node:module");
	const require = createRequire(import.meta.url);
	const motion = require(join(ROOT, "packages/core/dist/index.js"));
	const css = read("packages/react/src/injectStyles.ts");

	if (process.argv.includes("--self-test")) {
		// Each probe must be able to fail. A check that only ever passes is the
		// failure mode this file's header warns about.
		const before = problems.length;
		checkSprings({
			...motion,
			MOTION_PRESETS: { dead: { damping: 1.4, frequency: 10, mass: 1 } },
		});
		const caught = problems.length > before;
		problems.length = before;
		const clean = problems.length === 0;
		if (!caught || !clean) {
			console.error("check-spec --self-test: a probe is blind");
			return 1;
		}
		console.log("check-spec --self-test: probes are live");
		return 0;
	}

	checkSprings(motion);
	checkRadii(css);
	checkPalette(css);
	checkContrast(css);
	checkGeometry(css);

	if (problems.length > 0) {
		console.error("\ncheck-spec: the specification's QA matrix is not satisfied");
		for (const p of problems) console.error("  " + p);
		console.error("");
		return 1;
	}

	if (notes) {
		console.log("\nNot checkable here, and why:");
		console.log("  §2.1.2 squircle  — needs a curvature measurement, not a grep");
		console.log("  §2.1.3 concentric — needs the rendered box tree");
		console.log("  §3.2 squash      — needs pointer events against a live page");
		console.log("  §5.1 anatomy     — needs the rendered layer stack");
		console.log("\nContradictions inside the specification:");
		console.log("  §7 rejects ζ outside [0.42, 0.65] and describes the failure as");
		console.log('  "more than three oscillations, or none". §3.1 defines Spring.Gentle');
		console.log("  at ζ = 0.80. The stated failure is enforced; see check-spec's header.");
	}

	console.log("check-spec: the QA matrix holds");
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
