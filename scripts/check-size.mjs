#!/usr/bin/env node
/**
 * Size budget gate.
 *
 * Reads `size-budget.json` and compares it against the real bytes on disk in
 * each package's `dist/`. Run `pnpm build` first — this script measures build
 * output, it does not build for you.
 *
 * Gated on raw, uncompressed bytes because that number is identical on every
 * machine. gzip is printed for context only; it moves with the zlib version and
 * must not decide a pass or fail.
 *
 * Exits non-zero when a package is missing, over budget, or when a budgeted
 * package no longer exists.
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const budget = JSON.parse(readFileSync(join(root, "size-budget.json"), "utf8"));

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;
const formatDelta = (bytes) =>
	`${bytes >= 0 ? "+" : "−"}${(Math.abs(bytes) / 1024).toFixed(2)} KB`;

const measure = (file) => {
	try {
		return { bytes: statSync(file).size, gzip: gzipSync(readFileSync(file)).length };
	} catch {
		return null;
	}
};

const rows = [];
const failures = [];

for (const [name, limits] of Object.entries(budget.packages)) {
	const dir = join(root, "packages", name, "dist");
	const js = measure(join(dir, "index.js"));
	const dts = measure(join(dir, "index.d.ts"));

	if (!js || !dts) {
		failures.push(`${name}: dist/ is missing — run \`pnpm build\` before \`pnpm size\``);
		continue;
	}

	const jsOver = js.bytes - limits.maxJsBytes;
	const dtsOver = dts.bytes - limits.maxDtsBytes;

	rows.push({ name, js, dts, limits, jsOver, dtsOver });

	if (jsOver > 0) {
		failures.push(
			`${name}: index.js is ${formatBytes(js.bytes)}, ${formatBytes(jsOver)} over the ${formatBytes(limits.maxJsBytes)} budget`,
		);
	}
	if (dtsOver > 0) {
		failures.push(
			`${name}: index.d.ts is ${formatBytes(dts.bytes)}, ${formatBytes(dtsOver)} over the ${formatBytes(limits.maxDtsBytes)} budget`,
		);
	}
}

if (rows.length === 0) {
	console.error("size: nothing to measure. Build the packages first.\n");
	for (const failure of failures) console.error(`  ${failure}`);
	process.exit(1);
}

const pad = (value, width) => String(value).padStart(width);

console.log("\nPackage size budget\n");
console.log(
	`  ${"package".padEnd(12)} ${pad("js", 10)} ${pad("budget", 10)} ${pad("headroom", 10)} ${pad("gzip", 10)} ${pad("d.ts", 10)} ${pad("budget", 10)}`,
);
console.log(`  ${"-".repeat(78)}`);

let totalJs = 0;
let totalGzip = 0;

for (const row of rows) {
	totalJs += row.js.bytes;
	totalGzip += row.js.gzip;

	const jsHeadroom = -row.jsOver;
	const mark = row.jsOver > 0 || row.dtsOver > 0 ? "✗" : " ";

	console.log(
		`${mark} ${row.name.padEnd(12)} ${pad(formatBytes(row.js.bytes), 10)} ${pad(formatBytes(row.limits.maxJsBytes), 10)} ${pad(formatDelta(jsHeadroom), 10)} ${pad(formatBytes(row.js.gzip), 10)} ${pad(formatBytes(row.dts.bytes), 10)} ${pad(formatBytes(row.limits.maxDtsBytes), 10)}`,
	);
}

console.log(`  ${"-".repeat(78)}`);
console.log(
	`  ${"total".padEnd(12)} ${pad(formatBytes(totalJs), 10)} ${" ".repeat(21)} ${pad(formatBytes(totalGzip), 10)}`,
);

if (failures.length > 0) {
	console.error(`\nsize: ${failures.length} problem(s)\n`);
	for (const failure of failures) console.error(`  ${failure}`);
	console.error(
		"\nIf the growth is intended, raise the number in size-budget.json in the same commit.\n",
	);
	process.exit(1);
}

console.log("\nsize: all packages within budget\n");
