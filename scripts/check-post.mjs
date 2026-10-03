#!/usr/bin/env node
/**
 * Passthrough residual: is the post chain reading what the scene wrote?
 *
 * The README records this check by hand — "passthrough versus off", healthy
 * below 1, measured 0.92, and 10.61 on the first version whose chain input was
 * wrong. It was never turned into a gate, so nothing has been watching it since.
 *
 * The two states are the same picture if the chain is wired correctly:
 *
 *   off          the chain is never built; a present quad moves the composite
 *                to the canvas and three's output pass applies the transform.
 *   passthrough  the chain is built with `enabled: false`, which makes its
 *                output node `mix(baseSample, colour, 0)` — the input,
 *                unchanged — and applies the same transform.
 *
 * So a residual near zero means the chain is reading the composite. A residual
 * in the tens means it is reading something else: an unbound target, a stale
 * copy, an empty framebuffer. That is a silent failure — the page still draws,
 * the chain still runs, and the picture is wrong in a way no DOM assertion can
 * see, which is precisely how it survived a green suite the first time.
 *
 * Why the fixture rather than a flagship page: the kit holds still. Every
 * capture is of the same scene, so the residual is the chain's contribution and
 * not the scene's motion.
 *
 * Usage:
 *   node scripts/check-post.mjs
 *   node scripts/check-post.mjs --report
 *   node scripts/check-post.mjs --self-test
 */

import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const COMPONENTS = ["watercolor-card", "bubble-badge", "bling"];

/** Above this the two states are different pictures, not the same one. */
const MAX_RESIDUAL = 2;

/* --------------------------------------------------------------- PNG ---- */

export function decodePng(buffer) {
	if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
	let offset = 8;
	let width = 0;
	let height = 0;
	let channels = 0;
	const idat = [];
	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString("ascii", offset + 4, offset + 8);
		const data = buffer.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
			if (!channels) throw new Error(`unsupported colour type ${data[9]}`);
		} else if (type === "IDAT") idat.push(data);
		else if (type === "IEND") break;
		offset += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const out = new Uint8ClampedArray(width * height * 4);
	let previous = new Uint8Array(stride);
	let cursor = 0;
	for (let y = 0; y < height; y += 1) {
		const filter = raw[cursor++];
		const line = new Uint8Array(raw.subarray(cursor, cursor + stride));
		cursor += stride;
		for (let i = 0; i < stride; i += 1) {
			const a = i >= channels ? line[i - channels] : 0;
			const b = previous[i];
			const c = i >= channels ? previous[i - channels] : 0;
			if (filter === 1) line[i] = (line[i] + a) & 0xff;
			else if (filter === 2) line[i] = (line[i] + b) & 0xff;
			else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
			else if (filter === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a);
				const pb = Math.abs(p - b);
				const pc = Math.abs(p - c);
				line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
			}
		}
		for (let x = 0; x < width; x += 1) {
			const s = x * channels;
			const d = (y * width + x) * 4;
			out[d] = line[s];
			out[d + 1] = line[s + 1];
			out[d + 2] = line[s + 2];
			out[d + 3] = channels === 4 ? line[s + 3] : 255;
		}
		previous = line;
	}
	return { width, height, data: out };
}

/* ----------------------------------------------------------- metrics ---- */

/**
 * Mean absolute per-channel difference, 0..255.
 *
 * This is the number the README quotes. It is deliberately an average rather
 * than a maximum: a correct chain differs by a bit at the noise floor, and a
 * wrong one differs everywhere.
 */
export function residual(a, b) {
	if (a.width !== b.width || a.height !== b.height) {
		throw new Error(`size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`);
	}
	let sum = 0;
	const pixels = a.width * a.height;
	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		sum +=
			Math.abs(a.data[o] - b.data[o]) +
			Math.abs(a.data[o + 1] - b.data[o + 1]) +
			Math.abs(a.data[o + 2] - b.data[o + 2]);
	}
	return sum / (pixels * 3);
}

/* --------------------------------------------------------- self test ---- */

function synthetic(width, height, fill) {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < width * height; i += 1) {
		const o = i * 4;
		data[o] = fill[0];
		data[o + 1] = fill[1];
		data[o + 2] = fill[2];
		data[o + 3] = 255;
	}
	return { width, height, data };
}

/**
 * Prove the probe can fail.
 *
 * The metric has to read near zero for two captures of the same picture and in
 * the tens for two captures of different ones. The second case is the failure
 * this gate exists for, so a probe that cannot separate them is worthless.
 */
export function selfTest() {
	const a = synthetic(160, 120, [250, 248, 252]);
	const same = synthetic(160, 120, [250, 248, 252]);
	const black = synthetic(160, 120, [0, 0, 0]);
	const healthy = residual(a, same);
	const broken = residual(a, black);
	return {
		healthy,
		broken,
		live: healthy === 0 && broken > 100,
	};
}

/* ------------------------------------------------------------- runner ---- */

async function main() {
	const args = process.argv.slice(2);
	const options = { report: false, selfTest: false, timeout: 45_000 };
	for (let i = 0; i < args.length; i += 1) {
		if (args[i] === "--self-test") options.selfTest = true;
		else if (args[i] === "--report") options.report = true;
		else if (args[i] === "--timeout") options.timeout = Number(args[++i]);
	}

	if (options.selfTest) {
		const result = selfTest();
		if (!result.live) {
			console.error("\ncheck-post --self-test: the probe is blind");
			console.error(
				`  identical frames scored ${result.healthy.toFixed(2)}, a frame against black ` +
					`scored ${result.broken.toFixed(2)} — those must not be the same order of magnitude`,
			);
			return 1;
		}
		console.log(
			`\ncheck-post --self-test: probe is live — identical ${result.healthy.toFixed(2)}, ` +
				`versus black ${result.broken.toFixed(1)}\n`,
		);
		return 0;
	}

	const origin = process.env.UI_LIB_ORIGIN ?? "http://127.0.0.1:5173";
	const browser = await chromium.launch({ headless: true });
	const rows = [];
	let failed = 0;

	for (const component of COMPONENTS) {
		const row = { component, ok: true, notes: [] };
		const shots = {};
		for (const mode of ["off", "passthrough"]) {
			const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
			try {
				await page.goto(
					`${origin}/?demo=iris-kit&component=${component}&tone=iris&post=${mode}`,
					{ waitUntil: "networkidle", timeout: 60_000 },
				);
				await page.waitForFunction(
					() =>
						document.querySelector("[data-ui-lib-stage]")?.getAttribute("data-ui-lib-stage") ===
						"ready",
					null,
					{ timeout: options.timeout },
				);
				await page.waitForTimeout(3500);
				shots[mode] = decodePng(await page.locator("[data-ui-lib-kit-box]").screenshot());
			} catch (error) {
				row.ok = false;
				row.notes.push(`${mode}: ${String(error).split("\n")[0].slice(0, 90)}`);
			} finally {
				await page.close();
			}
		}

		if (shots.off && shots.passthrough) {
			row.value = residual(shots.off, shots.passthrough);
			if (row.value > MAX_RESIDUAL) {
				row.ok = false;
				row.notes.push(
					`passthrough differs from off by ${row.value.toFixed(2)} — the chain is not ` +
						`reading the composite`,
				);
			}
		}
		rows.push(row);
		if (!row.ok) failed += 1;
	}

	await browser.close();

	console.log("\ncomponent          passthrough vs off residual   verdict");
	console.log("-----------------------------------------------------------");
	for (const row of rows) {
		const cell = row.value === undefined ? "-" : row.value.toFixed(2);
		console.log(
			`${row.component.padEnd(19)}${cell.padStart(12)}${"".padEnd(22)}${row.ok ? "ok" : "FAIL"}`,
		);
		for (const note of row.notes) console.log(`${" ".repeat(20)}└ ${note}`);
	}
	console.log("");
	console.log(
		`threshold ${MAX_RESIDUAL} — the README's measured healthy value was 0.92, the broken one 10.61`,
	);

	if (failed > 0) {
		console.error(`\ncheck-post: ${failed} of ${rows.length} page(s) failed\n`);
		return 1;
	}
	console.log(`check-post: ${rows.length} page(s) with the chain reading the composite\n`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
