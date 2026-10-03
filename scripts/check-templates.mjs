#!/usr/bin/env node
/**
 * Stylesheet templates must not contain a backtick.
 *
 * `injectStyles.ts` holds the library's entire stylesheet in one template
 * literal. A backtick inside it — almost always one in a comment, used to quote
 * an identifier the way Markdown would — ends the literal early. The file is
 * still *valid JavaScript*, so `tsc`, `biome` and `esbuild` all accept it right
 * up until something imports it, at which point it fails to parse and the page
 * returns 500 with the error in a browser console nobody is watching.
 *
 * This happened ten times while building the wash material and the form
 * primitives. A unit test caught nine of them, which worked, but the test lived
 * in one package and only ran when that package's tests ran — so the feedback
 * arrived after the build, at the cost of a re-run each time.
 *
 * ## Why this check is narrow on purpose
 *
 * The first two versions tried to find *every* stylesheet-like template in the
 * repository by inspecting its contents. Both were wrong, and both were wrong
 * in the same way: a script that generates JavaScript contains braces, colons
 * and semicolons, so it looks exactly like CSS to a heuristic. Three of this
 * repository's own build scripts were flagged, none of them broken.
 *
 * So the scope is not "any template that might be CSS". It is one declared
 * list of files that hold a stylesheet, which is a fact about the repository
 * rather than a guess about a string. Adding a file to that list is a one-line
 * change and a deliberate act; a heuristic that is right most of the time is
 * worse than a list that is right always.
 *
 * Usage:
 *   node scripts/check-templates.mjs
 *   node scripts/check-templates.mjs --self-test
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Files that carry a stylesheet in a template literal. */
const STYLESHEET_FILES = ["packages/react/src/injectStyles.ts"];

/** The variable each of those assigns it to. */
const ASSIGNMENT = /const\s+([A-Z_]+)\s*=\s*`/g;

/**
 * Extract the name and body of every stylesheet literal in a source file.
 *
 * The body ends at the first backtick that is not escaped, because that is
 * exactly what the JavaScript parser does — which is why a stray one inside is
 * fatal rather than merely untidy.
 */
export function stylesheetLiterals(source) {
	const out = [];
	for (const match of source.matchAll(ASSIGNMENT)) {
		const name = match[1];
		const open = match.index + match[0].length - 1;
		let close = -1;
		for (let i = open + 1; i < source.length; i += 1) {
			if (source[i] !== "`") continue;
			let backslashes = 0;
			for (let j = i - 1; j >= 0 && source[j] === "\\"; j -= 1) backslashes += 1;
			if (backslashes % 2 === 0) {
				close = i;
				break;
			}
		}
		out.push({
			name,
			open,
			close,
			body: close === -1 ? source.slice(open + 1) : source.slice(open + 1, close),
		});
	}
	return out;
}

/**
 * What follows a stylesheet literal, and does it look like the literal ended
 * where a stylesheet would end?
 *
 * A correctly written one closes at a line that is just the closing backtick
 * and a semicolon. When a stray backtick inside has cut it short, what follows
 * is the rest of a CSS comment run into CSS run into a JavaScript statement —
 * so the closing happens mid-line, and the text right after it is not a
 * statement boundary.
 */
export function inspect(source) {
	/** @type {string[]} */
	const problems = [];
	const lines = source.split("\n");
	for (const literal of stylesheetLiterals(source)) {
		if (literal.close === -1) {
			problems.push(`${literal.name} is never closed`);
			continue;
		}
		const before = source.slice(0, literal.close);
		const line = before.split("\n").length;
		const lineText = lines[line - 1] ?? "";
		// The closing backtick must be the last thing on its line, give or take a
		// semicolon — that is how the file has to be written for the literal to
		// end at a rule boundary rather than mid-statement.
		if (!/^[ \t]*`;?[ \t]*$/.test(lineText)) {
			problems.push(
				`${literal.name} closes mid-line at ${line}: ${JSON.stringify(lineText.slice(0, 60))}`,
			);
			continue;
		}
		// And the body itself must not contain a template interpolation, which
		// would run the stylesheet as code.
		if (literal.body.includes("${")) {
			const at = literal.body.indexOf("${");
			problems.push(`${literal.name} interpolates: ${literal.body.slice(at, at + 40)}`);
		}
	}
	return problems;
}

async function main() {
	if (process.argv.includes("--self-test")) {
		/*
		 * Prove the probe can fail, on the exact mistake it exists for: a
		 * backtick in a comment inside the stylesheet, which closes the literal
		 * early and leaves the closing backtick stranded mid-line.
		 */
		const clean = "const CSS = `\n.a { color: red; }\n.b { color: blue; }\n`;\n";
		const stray =
			"const CSS = `\n/* use `foo` here */\n.a { color: red; }\n.b { color: blue; }\n`;\n";
		const interpolated = "const CSS = `\n.a { width: ${w}; }\n.b { color: blue; }\n`;\n";
		const cleanOk = inspect(clean).length === 0;
		const caughtStray = inspect(stray).length > 0;
		const caughtInterpolation = inspect(interpolated).length > 0;
		if (!(cleanOk && caughtStray && caughtInterpolation)) {
			console.error("\ncheck-templates --self-test: the probe is blind");
			console.error({ cleanOk, caughtStray, caughtInterpolation, onClean: inspect(clean) });
			return 1;
		}
		console.log("\ncheck-templates --self-test: probe is live\n");
		return 0;
	}

	let failures = 0;
	for (const file of STYLESHEET_FILES) {
		const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		const literals = stylesheetLiterals(source);
		if (literals.length === 0) {
			console.error(`  ${file}: no stylesheet literal found — did the assignment change?`);
			failures += 1;
			continue;
		}
		for (const problem of inspect(source)) {
			console.error(`  ${file}: ${problem}`);
			failures += 1;
		}
		// And confirm the stylesheet is actually big, so a literal that ended
		// after three lines is noticed rather than passing quietly.
		for (const literal of literals) {
			if (literal.body.length < 2000) {
				console.error(
					`  ${file}: ${literal.name} is only ${literal.body.length} characters — a stylesheet this size means the literal was cut short`,
				);
				failures += 1;
			}
		}
	}

	if (failures > 0) {
		console.error(`\ncheck-templates: ${failures} problem(s)\n`);
		return 1;
	}
	console.log(`check-templates: ${STYLESHEET_FILES.length} stylesheet(s) clean\n`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
