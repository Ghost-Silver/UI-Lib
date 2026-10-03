#!/usr/bin/env node
/**
 * Per-component pixel baselines.
 *
 * `check:pixels` asks structural questions about a whole page. This asks them
 * about one component at a time, on the fixture route that renders exactly one
 * thing in a fixed box — because on the showcase page a region's pixels are
 * never only that component's.
 *
 * Three things are asserted, and each of them is a failure this repository has
 * actually shipped:
 *
 *   1. **The component is visible.** `ink` is the share of pixels in its box
 *      that differ from the box's modal colour. A component that renders
 *      nothing — a culled mesh, a colour that equals the background, a box that
 *      collapsed to zero — scores near zero while every semantic test stays
 *      green. This is the assertion that would have caught the mirrored glass
 *      and the culled glyphs.
 *   2. **The tones are distinguishable.** The three palettes must produce
 *      measurably different pixels, or the wiring from `IRIS` to the component
 *      is broken somewhere the types cannot see.
 *   3. **The GPU route differs from the fallback.** Reported per component and
 *      asserted only in aggregate, because it is genuinely near zero for some
 *      of them: a 30px bead on a pale ground gives a screen-space refractor
 *      nothing to bend, and its look comes from its own fill. Pretending
 *      otherwise would be a threshold picked to pass.
 *
 * What it is not: a stored reference. Screenshot baselines are device-specific
 * and rot on driver updates, so there is still no `toHaveScreenshot` here.
 *
 * Usage:
 *   node scripts/check-components.mjs
 *   node scripts/check-components.mjs --report
 *   node scripts/check-components.mjs --self-test
 */

import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

/**
 * Components, and whether a palette actually reaches them.
 *
 * `tone` is not universal: a switch has two states and no palette, so comparing
 * its three tones measures nothing and always fails. Declaring that here rather
 * than commenting it in the list keeps the visibility assertion — which every
 * component does owe — while skipping only the claim that does not apply.
 */
const COMPONENTS = [
	{ name: "bubble-badge", toned: true },
	{ name: "paper-button", toned: true },
	{ name: "soft-light-panel", toned: true },
	{ name: "watercolor-card", toned: true },
	{ name: "bling", toned: true },
	{ name: "switch", toned: false },
	{ name: "tabs", toned: false },
	{ name: "slider", toned: false },
];
const TONES = ["iris", "blossom", "mist"];

/* --------------------------------------------------------------- PNG ---- */

/** Same minimal decoder as `check-pixels`; Playwright writes 8-bit PNGs. */
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

/** Share of pixels differing from the frame's modal colour. */
export function ink(image) {
	const histogram = new Map();
	const pixels = image.width * image.height;
	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		const key =
			((image.data[o] >> 3) << 10) | ((image.data[o + 1] >> 3) << 5) | (image.data[o + 2] >> 3);
		histogram.set(key, (histogram.get(key) ?? 0) + 1);
	}
	let modal = 0;
	let best = 0;
	for (const [key, count] of histogram) {
		if (count > best) {
			modal = key;
			best = count;
		}
	}
	const rgb = [((modal >> 10) & 31) << 3, ((modal >> 5) & 31) << 3, (modal & 31) << 3];
	let marked = 0;
	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		if (
			Math.abs(image.data[o] - rgb[0]) +
				Math.abs(image.data[o + 1] - rgb[1]) +
				Math.abs(image.data[o + 2] - rgb[2]) >
			24
		) {
			marked += 1;
		}
	}
	return marked / pixels;
}

/** Mean absolute per-pixel difference, 0 when the images match. */
export function difference(a, b) {
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

/**
 * Mean absolute difference restricted to the pixels the component occupies.
 *
 * Averaging over the whole box was the first version and it made the metric
 * meaningless for small subjects: a badge covers about three per cent of a
 * 260x180 box, so a tone change of 25/255 inside the badge averaged out to 0.25
 * and read as "the palettes are the same". The pixels that matter are the ones
 * where either image differs from the shared background.
 */
export function differenceOverSubject(a, b) {
	if (a.width !== b.width || a.height !== b.height) {
		throw new Error(`size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`);
	}
	const pixels = a.width * a.height;
	const background = (image) => {
		const histogram = new Map();
		for (let i = 0; i < pixels; i += 1) {
			const o = i * 4;
			const key =
				((image.data[o] >> 3) << 10) |
				((image.data[o + 1] >> 3) << 5) |
				(image.data[o + 2] >> 3);
			histogram.set(key, (histogram.get(key) ?? 0) + 1);
		}
		let modal = 0;
		let best = 0;
		for (const [key, count] of histogram) {
			if (count > best) {
				modal = key;
				best = count;
			}
		}
		return [((modal >> 10) & 31) << 3, ((modal >> 5) & 31) << 3, (modal & 31) << 3];
	};
	const far = (data, o, rgb) =>
		Math.abs(data[o] - rgb[0]) +
			Math.abs(data[o + 1] - rgb[1]) +
			Math.abs(data[o + 2] - rgb[2]) >
		24;

	const bgA = background(a);
	const bgB = background(b);
	let sum = 0;
	let count = 0;
	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		if (!far(a.data, o, bgA) && !far(b.data, o, bgB)) continue;
		sum +=
			Math.abs(a.data[o] - b.data[o]) +
			Math.abs(a.data[o + 1] - b.data[o + 1]) +
			Math.abs(a.data[o + 2] - b.data[o + 2]);
		count += 1;
	}
	return count === 0 ? 0 : sum / (count * 3);
}

/* --------------------------------------------------------- self test ---- */

/** A canvas with one filled square, on a known background. */
function synthetic(width, height, square) {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < width * height; i += 1) {
		const o = i * 4;
		data[o] = 250;
		data[o + 1] = 248;
		data[o + 2] = 252;
		data[o + 3] = 255;
	}
	for (let y = square.y; y < square.y + square.h; y += 1) {
		for (let x = square.x; x < square.x + square.w; x += 1) {
			const o = (y * width + x) * 4;
			data[o] = 40;
			data[o + 1] = 20;
			data[o + 2] = 70;
			data[o + 3] = 255;
		}
	}
	return { width, height, data };
}

/**
 * Prove the probe can fail.
 *
 * A blank box and a filled one are the two cases the first assertion has to
 * separate, and two different fills are what the second has to separate. If a
 * blank box scores like a filled one, every green run this prints is worthless.
 */
export function selfTest() {
	const blank = synthetic(120, 90, { x: 0, y: 0, w: 0, h: 0 });
	const filled = synthetic(120, 90, { x: 20, y: 20, w: 60, h: 40 });
	const other = synthetic(120, 90, { x: 30, y: 30, w: 20, h: 20 });

	const blankInk = ink(blank);
	const filledInk = ink(filled);
	const tones = difference(filled, other);
	const same = difference(filled, filled);

	return {
		blankInk,
		filledInk,
		toneDelta: tones,
		identicalDelta: same,
		live: blankInk < 0.01 && filledInk > 0.1 && tones > 1 && same === 0,
	};
}

/* ------------------------------------------------------------- runner ---- */

async function main() {
	const args = process.argv.slice(2);
	const options = { report: false, selfTest: false, timeout: 120_000 };
	for (let i = 0; i < args.length; i += 1) {
		if (args[i] === "--self-test") options.selfTest = true;
		else if (args[i] === "--report") options.report = true;
		else if (args[i] === "--timeout") options.timeout = Number(args[++i]);
	}

	if (options.selfTest) {
		const result = selfTest();
		if (!result.live) {
			console.error("\ncheck-components --self-test: the probe is blind");
			console.error(
				`  blank box scored ${result.blankInk.toFixed(3)} ink, filled ${result.filledInk.toFixed(3)}, ` +
					`two different fills differed by ${result.toneDelta.toFixed(2)}, identical frames by ${result.identicalDelta.toFixed(2)}`,
			);
			return 1;
		}
		console.log(
			`\ncheck-components --self-test: probe is live — blank ${result.blankInk.toFixed(3)}, ` +
				`filled ${result.filledInk.toFixed(3)}, tone delta ${result.toneDelta.toFixed(1)}\n`,
		);
		return 0;
	}

	const origin = process.env.UI_LIB_ORIGIN ?? "http://127.0.0.1:5173";
	const browser = await chromium.launch({ headless: true });
	const rows = [];
	let failed = 0;

	/**
	 * Run `worker` over `items`, at most `limit` at a time.
	 *
	 * Sequential was the first version: five components, three tones, two
	 * routes, and every page pays a cold shader compile, so it ran for over
	 * five minutes and looked hung. The pages are independent; the cap exists
	 * because each allocates its own GPU context.
	 */
	async function pool(items, limit, worker) {
		const results = new Array(items.length);
		let next = 0;
		await Promise.all(
			Array.from({ length: Math.min(limit, items.length) }, async () => {
				while (next < items.length) {
					const index = next++;
					results[index] = await worker(items[index]);
				}
			}),
		);
		return results;
	}

	async function checkComponent({ name: component, toned }) {
		const row = { component, toned, ok: true, notes: [], ink: {}, effectDelta: {} };
		for (const tone of TONES) {
			const shots = {};
			for (const route of ["gpu", "fallback"]) {
				const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
				try {
					const query = route === "fallback" ? "&fallback=1" : "";
					await page.goto(
						`${origin}/?demo=iris-kit&component=${component}&tone=${tone}${query}`,
						{ waitUntil: "networkidle", timeout: 60_000 },
					);
					if (route === "gpu") {
						await page.waitForFunction(
							() =>
								document
									.querySelector("[data-ui-lib-stage]")
									?.getAttribute("data-ui-lib-stage") === "ready",
							null,
							{ timeout: options.timeout },
						);
					}
					await page.waitForTimeout(route === "gpu" ? 3500 : 900);
					const box = page.locator("[data-ui-lib-kit-box]");
					shots[route] = decodePng(await box.screenshot({ timeout: options.timeout }));
				} catch (error) {
					row.ok = false;
					row.notes.push(`${tone}/${route}: ${String(error).split("\n")[0].slice(0, 90)}`);
				} finally {
					await page.close();
				}
			}
			if (!shots.gpu || !shots.fallback) continue;
			if (!row.shots) row.shots = {};
			row.shots[tone] = shots.gpu;
			row.ink[tone] = ink(shots.gpu);
			// Effect on versus effect off, for this tone.
			row.effectDelta[tone] = difference(shots.gpu, shots.fallback);
		}

		const tones = Object.keys(row.ink);
		if (tones.length < TONES.length) {
			row.ok = false;
			return row;
		}

		// 1. Visible in every tone.
		for (const tone of tones) {
			// A floor, not a target. A 50x28 badge in a 260x180 box covers about
			// three per cent of it, so anything above a few thousandths means
			// something is drawn. Zero is the value this exists to catch.
			if (row.ink[tone] < 0.004) {
				row.ok = false;
				row.notes.push(`${tone}: box is blank (ink ${row.ink[tone].toFixed(4)})`);
			}
		}

		// 2. The tones are actually different pictures. Compared tone against
		// tone on the GPU route — an earlier version compared each tone against
		// its own fallback and called that a tone delta, which measured nothing
		// of the sort and read as a comfortable 100+.
		const pairs = [
			["iris", "blossom"],
			["iris", "mist"],
			["blossom", "mist"],
		];
		row.minToneDelta = Number.POSITIVE_INFINITY;
		for (const [a, b] of pairs) {
			row.minToneDelta = Math.min(
				row.minToneDelta,
				differenceOverSubject(row.shots[a], row.shots[b]),
			);
		}
		if (toned && row.minToneDelta < 4) {
			row.ok = false;
			row.notes.push(
				`tones are not distinguishable (weakest pair ${row.minToneDelta.toFixed(2)})`,
			);
		}
		delete row.shots;

		return row;
	}

	// Same reasoning as `check-pixels`: a software rasteriser has no parallelism
	// to exploit, so concurrency only adds contention. CI sets this to 1.
	const concurrency = Math.max(1, Number(process.env.UI_LIB_KIT_CONCURRENCY ?? 2));
	rows.push(...(await pool(COMPONENTS, concurrency, checkComponent)));
	for (const row of rows) if (!row.ok) failed += 1;

	await browser.close();

	// The one aggregate claim about the GPU route: across every component and
	// tone, the stage must change the picture somewhere by more than noise.
	const strongest = Math.max(...rows.flatMap((row) => Object.values(row.effectDelta)));
	console.log(
		"\ncomponent          ink (iris/blossom/mist)   weakest tone pair   effect on vs off",
	);
	console.log(
		"--------------------------------------------------------------------------------",
	);
	for (const row of rows) {
		const inkCells = TONES.map((tone) => (row.ink[tone] ?? 0).toFixed(3)).join(" / ");
		const gpuCells = TONES.map((tone) => (row.effectDelta[tone] ?? 0).toFixed(2)).join(" / ");
		console.log(
			`${row.component.padEnd(18)}${inkCells.padEnd(26)}` +
				`${(Number.isFinite(row.minToneDelta) ? row.minToneDelta.toFixed(2) : "-").padStart(10)}` +
				`${"   "}${gpuCells.padEnd(18)}${row.ok ? "ok" : "FAIL"}`,
		);
		for (const note of row.notes) console.log(`${" ".repeat(19)}└ ${note}`);
	}
	console.log("");
	console.log(
		`strongest single GPU-vs-fallback difference across the kit: ${strongest.toFixed(2)}`,
	);
	if (strongest < 0.2) {
		console.error(
			"\ncheck-components: the GPU route never changed any component measurably — " +
				"the stage is running but not drawing.\n",
		);
		return 1;
	}
	if (failed > 0) {
		console.error(`check-components: ${failed} of ${rows.length} component(s) failed\n`);
		return 1;
	}
	console.log(`check-components: ${rows.length} components visible, palettes wired\n`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
