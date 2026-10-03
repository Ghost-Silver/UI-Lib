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

/**
 * Duplicate names inside one import statement.
 *
 * `import { SoftTable, SoftTable } from "./x.js"` is a syntax error that `tsc`
 * reports as "Duplicate identifier" — which is a real error message and costs
 * only a minute, so this is not a safety net for something dangerous.
 *
 * It is here because it has happened twice, both times from a scripted edit that
 * matched more text than intended, and both times the path from "the edit
 * looked right" to "the build said duplicate identifier" ran through several
 * steps. The point is to move the report to the moment of the edit, not to
 * catch something the compiler would miss.
 *
 * Only within a single statement: two modules importing the same name is legal
 * and common, and flagging that would make the check something to work around.
 */
export function duplicateImports(source) {
	/** @type {string[]} */
	const problems = [];
	const pattern = /import\s*\{([^}]*)\}\s*from/g;
	for (const match of source.matchAll(pattern)) {
		const names = match[1]
			.split(",")
			.map(
				(entry) =>
					entry
						.trim()
						.split(/\s+as\s+/)
						.pop() ?? "",
			)
			.filter(Boolean);
		const seen = new Set();
		for (const name of names) {
			if (seen.has(name)) problems.push(name);
			seen.add(name);
		}
	}
	return problems;
}

async function main() {
	/*
	 * The auto-fix, and its first version destroyed a file.
	 *
	 * It took everything from `const CSS = \`` to the last backtick in the file
	 * and stripped every backtick in that range — which includes the two that
	 * delimit the literal. The stylesheet stopped being a string, the file
	 * stopped parsing, and three edits were lost with it.
	 *
	 * The range is right and the *operation* was wrong. What has to go is the
	 * stray backticks inside the body, so the body is what gets rewritten: the
	 * slice starts after the opening delimiter and ends at the closing one, and
	 * the two delimiters are put back around the result rather than being
	 * included in it.
	 *
	 * It also refuses to act if the template is not exactly where it expects.
	 * A fixer that guesses at offsets is worse than no fixer: this one either
	 * finds both delimiters and rewrites strictly between them, or it changes
	 * nothing and says so.
	 */
	if (process.argv.includes("--write")) {
		const { readFileSync: read, writeFileSync: write } = await import("node:fs");
		let fixed = 0;
		for (const file of STYLESHEET_FILES) {
			const path = new URL(`../${file}`, import.meta.url);
			const source = read(path, "utf8");
			if (inspect(source).length === 0) continue;

			const openMarker = "const CSS = `";
			const open = source.indexOf(openMarker);
			const close = source.lastIndexOf("`;");
			if (open === -1 || close === -1 || close <= open + openMarker.length) {
				console.error(`  ${file}: could not locate the literal; refusing to guess`);
				return 1;
			}
			const head = source.slice(0, open + openMarker.length);
			const body = source.slice(open + openMarker.length, close);
			const tail = source.slice(close);

			const count = (body.match(/`/g) ?? []).length;
			if (count === 0) continue;
			write(path, head + body.replace(/`/g, "") + tail, "utf8");
			console.error(`  ${file}: removed ${count} backtick(s) from inside the literal`);
			fixed += count;
		}
		if (fixed > 0) {
			console.error(`\ncheck-templates --write: ${fixed} removed; re-run the gates\n`);
			return 0;
		}
		console.log("check-templates --write: nothing to fix\n");
		return 0;
	}

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
		const goodImports =
			duplicateImports('import { a, b } from "./x.js";\nimport { a } from "./y.js";').length ===
			0;
		const caughtDuplicate = duplicateImports('import { a, b, a } from "./x.js";').length > 0;
		if (!(cleanOk && caughtStray && caughtInterpolation && goodImports && caughtDuplicate)) {
			console.error("\ncheck-templates --self-test: the probe is blind");
			console.error({
				cleanOk,
				caughtStray,
				caughtInterpolation,
				goodImports,
				caughtDuplicate,
			});
			return 1;
		}
		console.log("\ncheck-templates --self-test: probe is live\n");
		return 0;
	}

	let failures = 0;

	// Every source file, because a duplicate import can appear in any of them and
	// the stylesheet check below only covers one.
	/** @type {string[]} */
	const sources = [];
	const { readdir } = await import("node:fs/promises");
	const { join } = await import("node:path");
	const walk = async (dir) => {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			if (["node_modules", "dist", ".git", "coverage"].includes(entry.name)) continue;
			const full = join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (/\.tsx?$/.test(entry.name)) sources.push(full);
		}
	};
	await walk(ROOT);

	for (const file of sources) {
		const source = readFileSync(file, "utf8");
		for (const name of duplicateImports(source)) {
			console.error(`  ${relative(ROOT, file)}: ${name} is imported twice in one statement`);
			failures += 1;
		}
	}

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
