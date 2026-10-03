#!/usr/bin/env node
/**
 * Pixel acceptance gate.
 *
 * The semantic browser suite proves the DOM, the fallback routes and the
 * lifecycle contract. It cannot see the canvas, which is how three separate
 * defects lived on `main` with 17 tests green: a forced-WebGL2 page throwing
 * every frame, a post chain compiling to nothing on both backends, and every
 * glass panel drawn mirrored about the canvas centre. In each case the stage
 * still reached `ready`, the canvas still existed, and no DOM assertion broke.
 *
 * This script looks at the pixels and asserts two structural things:
 *
 *   1. **The canvas is drawing.** A flat frame means the world silently did
 *      not render. `ink` is the fraction of pixels that differ from the frame's
 *      own modal colour; a page that draws nothing scores ~0 while still
 *      reporting a healthy stage.
 *
 *   2. **Glass panels are where their elements are.** Panels are captured
 *      twice with a frame between them (animation noise), then once with every
 *      registered panel hidden. The pixels that changed because of the removal
 *      — minus the pixels that were already moving — must land inside the
 *      elements' rectangles. Mirrored or offset glass puts that signal
 *      somewhere else and fails here.
 *
 * Why headless is enough for these two, when `check:shaders` deliberately
 * refuses to run in CI: neither assertion is adapter-specific. "Did anything
 * draw" and "did it draw where the element is" hold on SwiftShader too. What
 * still needs a real GPU — tone, colour, glare — is what `measure` and
 * `check:shaders` are for, and those stay out of CI.
 *
 * Sensitivity, measured rather than assumed. Removing a panel also shifts the
 * bloom around it and invalidates the temporal history, so the whole frame
 * moves a little; the contrast ratio divides that spill out, which is why the
 * fixed tree scores 3.6x to 559x on every page. The blind spot is a
 * displacement that maps a panel onto or near its own rectangle — a layout
 * symmetric about the canvas centre, or a panel sitting close to the mirror
 * axis. An earlier version that compared the union of every panel rectangle at
 * once was blinder still: with the mirrored-panel bug present, the pages whose
 * panels are laid out symmetrically scored 0.95 and passed. Asserting one panel
 * at a time is what fixed that, not the threshold, which was swept from 24 to
 * 200 and changed nothing.
 *
 * Not asserted, and worth saying out loud: this is not an aesthetic baseline.
 * It cannot tell whether the glass looks good, only that it is present and in
 * the right place. A screenshot diff against a stored reference would be
 * device-specific and would rot on every GPU driver update, so there is
 * deliberately no `toHaveScreenshot` anywhere in this repo.
 *
 * Usage:
 *   node scripts/check-pixels.mjs                  # every demo, headless
 *   node scripts/check-pixels.mjs --demos iris     # one page
 *   node scripts/check-pixels.mjs --report         # per-panel numbers
 *   node scripts/check-pixels.mjs --self-test      # is the probe actually live?
 */

import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

/* --------------------------------------------------------------- PNG ---- */

/**
 * Decode an 8-bit PNG into RGBA.
 *
 * Playwright screenshots are 8-bit RGB or RGBA. Writing the forty lines here
 * keeps the gate dependency-free: a verification script that needs an install
 * is a verification script that stops being run.
 */
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
			const depth = data[8];
			const colourType = data[9];
			if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
			if (colourType === 2) channels = 3;
			else if (colourType === 6) channels = 4;
			else throw new Error(`unsupported colour type ${colourType}`);
		} else if (type === "IDAT") {
			idat.push(data);
		} else if (type === "IEND") {
			break;
		}
		offset += 12 + length;
	}

	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const out = new Uint8ClampedArray(width * height * 4);
	let previous = new Uint8Array(stride);
	let cursor = 0;

	for (let y = 0; y < height; y += 1) {
		const filter = raw[cursor];
		cursor += 1;
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
				const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
				line[i] = (line[i] + pr) & 0xff;
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

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Fraction of pixels that differ from the frame's modal colour, and the mean
 * absolute frame-to-frame difference between two captures.
 *
 * The modal colour is the background by definition: a full-bleed gradient or a
 * particle cloud cannot hold a majority, an empty frame holds nothing else.
 */
export function frameStats(image) {
	const { width, height, data } = image;
	const histogram = new Map();
	const pixels = width * height;

	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		const key = ((data[o] >> 3) << 10) | ((data[o + 1] >> 3) << 5) | (data[o + 2] >> 3);
		histogram.set(key, (histogram.get(key) ?? 0) + 1);
	}

	let modal = 0;
	let modalCount = 0;
	for (const [key, count] of histogram) {
		if (count > modalCount) {
			modal = key;
			modalCount = count;
		}
	}
	const modalRgb = [((modal >> 10) & 31) << 3, ((modal >> 5) & 31) << 3, (modal & 31) << 3];

	let ink = 0;
	let sum = 0;
	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		const distance =
			Math.abs(data[o] - modalRgb[0]) +
			Math.abs(data[o + 1] - modalRgb[1]) +
			Math.abs(data[o + 2] - modalRgb[2]);
		if (distance > 24) ink += 1;
		sum += luma(data[o], data[o + 1], data[o + 2]);
	}

	return { ink: ink / pixels, meanLuma: sum / pixels, modalCount: modalCount / pixels };
}

export function frameDelta(a, b) {
	if (a.width !== b.width || a.height !== b.height) {
		throw new Error(`size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`);
	}
	const pixels = a.width * a.height;
	let sum = 0;
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
 * Pixels that changed because the panels were removed, excluding pixels that
 * were already moving.
 *
 * The two comparisons must span the *same* interval or the metric lies. An
 * earlier version measured noise over 120ms and the removal over 720ms; six
 * hundred milliseconds of camera drift then counted as panel signal, and two
 * pages failed for no reason. Callers therefore capture `before` and `after`
 * one interval apart, hide the panels, and capture `without` one further
 * interval apart — so drift and signal are weighed on the same scale.
 *
 * `margin` dilates every rectangle before the containment test. A panel's
 * removal also changes the bloom and dispersion around it, and those halos
 * belong to the panel even though they land outside its box.
 */
export function placementContrast(before, after, without, rects, margin = 24) {
	const { width, height } = before;
	const pixels = width * height;
	const inRect = new Uint8Array(pixels);

	for (const rect of rects) {
		const x0 = Math.max(0, Math.floor(rect.x - margin));
		const y0 = Math.max(0, Math.floor(rect.y - margin));
		const x1 = Math.min(width, Math.ceil(rect.x + rect.w + margin));
		const y1 = Math.min(height, Math.ceil(rect.y + rect.h + margin));
		for (let y = y0; y < y1; y += 1) {
			for (let x = x0; x < x1; x += 1) inRect[y * width + x] = 1;
		}
	}

	let inSum = 0;
	let inCount = 0;
	let outSum = 0;
	let outCount = 0;

	for (let i = 0; i < pixels; i += 1) {
		const o = i * 4;
		const noise =
			Math.abs(before.data[o] - after.data[o]) +
			Math.abs(before.data[o + 1] - after.data[o + 1]) +
			Math.abs(before.data[o + 2] - after.data[o + 2]);
		const changed =
			Math.abs(after.data[o] - without.data[o]) +
			Math.abs(after.data[o + 1] - without.data[o + 1]) +
			Math.abs(after.data[o + 2] - without.data[o + 2]);
		// What the removal did, over and above what the scene was already doing.
		const value = Math.max(0, changed - noise);

		if (inRect[i]) {
			inSum += value;
			inCount += 1;
		} else {
			outSum += value;
			outCount += 1;
		}
	}

	const inside = inCount === 0 ? 0 : inSum / inCount;
	const outside = outCount === 0 ? 0 : outSum / outCount;

	return {
		inside,
		outside,
		// Removing a panel also shifts the bloom and invalidates the temporal
		// history, so the whole frame moves a little. Dividing cancels that:
		// spill lifts both sides, a misplaced panel lifts only the far side.
		contrast: inside / Math.max(outside, 0.5),
		signal: inSum,
		total: pixels,
	};
}

/* ---------------------------------------------------------- self test ---- */

/** A synthetic frame: flat background with one filled square. */
function syntheticFrame(width, height, square) {
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
			data[o] = 30;
			data[o + 1] = 30;
			data[o + 2] = 30;
			data[o + 3] = 255;
		}
	}
	return { width, height, data };
}

/**
 * Prove the probe can fail.
 *
 * Two synthetic cases with the same panels: one drawn inside its rectangle,
 * one drawn 300px to the right of it — the exact shape of the mirrored-panel
 * bug this gate exists for. If the second case passes, the metric is blind and
 * every green run it ever prints is worthless.
 */
export function selfTest() {
	const width = 800;
	const height = 400;
	const rects = [{ x: 100, y: 100, w: 200, h: 120 }];
	const healthy = { x: 100, y: 100, w: 200, h: 120 };
	const displaced = { x: 400, y: 100, w: 200, h: 120 };

	const run = (square) => {
		const withPanels = syntheticFrame(width, height, square);
		const withoutPanels = syntheticFrame(width, height, { x: 0, y: 0, w: 0, h: 0 });
		return placementContrast(withPanels, withPanels, withoutPanels, rects, 0);
	};

	const good = run(healthy);
	const bad = run(displaced);
	return {
		healthyContrast: good.contrast,
		displacedContrast: bad.contrast,
		healthySignal: good.signal,
		live: good.signal > 0 && good.contrast > 3 && bad.contrast < 1.5,
	};
}

/* ------------------------------------------------------------- runner ---- */

async function main() {
	const args = process.argv.slice(2);
	const options = { demos: null, report: false, selfTest: false, timeout: 45_000 };
	for (let i = 0; i < args.length; i += 1) {
		if (args[i] === "--self-test") options.selfTest = true;
		else if (args[i] === "--report") options.report = true;
		else if (args[i] === "--demos") options.demos = args[++i].split(",");
		else if (args[i] === "--timeout") options.timeout = Number(args[++i]);
	}

	if (options.selfTest) {
		const result = selfTest();
		if (!result.live) {
			console.error("\ncheck-pixels --self-test: the probe is blind");
			console.error(
				`  a panel drawn in its own rect scored ${result.healthyContrast.toFixed(2)}x, ` +
					`one drawn 300px away scored ${result.displacedContrast.toFixed(2)}x`,
			);
			console.error(
				"  both should not look the same. Nothing this gate prints is trustworthy.\n",
			);
			return 1;
		}
		console.log(
			`\ncheck-pixels --self-test: probe is live — in-place panel scores ` +
				`${result.healthyContrast.toFixed(2)}x its surroundings, displaced panel ` +
				`${result.displacedContrast.toFixed(2)}x\n`,
		);
		return 0;
	}

	const demos = options.demos ?? [
		"liquid-glass",
		"aurora-flow",
		"product-hero",
		"scroll-cinema",
		"cursor-field",
		"wake",
		"iris",
	];
	const origin = process.env.UI_LIB_ORIGIN ?? "http://127.0.0.1:5173";

	const browser = await chromium.launch({ headless: true });
	const rows = [];
	let failed = 0;

	/**
	 * Run `worker` over `items`, at most `limit` at a time.
	 *
	 * Sequential was the first version and it took over seven minutes: every
	 * page pays a cold shader compile, and on a headless runner that is the
	 * software rasteriser. The pages are independent, so they overlap. The cap
	 * exists because every page allocates its own GPU context and the renderer
	 * already notes that concurrent contexts are limited.
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

	async function checkDemo(demo) {
		const row = { demo, ok: true, notes: [] };
		try {
			// Pass 1 — the live page. Proves the canvas is drawing something.
			const live = await browser.newPage({
				viewport: { width: 1280, height: 860 },
			});
			await live.goto(`${origin}/?demo=${demo}`, { waitUntil: "networkidle", timeout: 60_000 });
			await live.waitForFunction(
				() =>
					document.querySelector("[data-ui-lib-stage]")?.getAttribute("data-ui-lib-stage") ===
					"ready",
				null,
				{ timeout: options.timeout },
			);
			await live.waitForTimeout(4000);

			const canvas = live.locator("canvas").first();
			if ((await canvas.count()) === 0) {
				row.ok = false;
				row.notes.push("no canvas");
				await live.close();
				return row;
			}
			const liveShot = decodePng(await canvas.screenshot());
			await live.waitForTimeout(160);
			const stats = frameStats(liveShot);
			row.ink = stats.ink;
			row.delta = frameDelta(liveShot, decodePng(await canvas.screenshot()));
			if (stats.ink < 0.02) {
				row.ok = false;
				row.notes.push(`flat frame (ink ${stats.ink.toFixed(3)})`);
			}
			await live.close();

			// Pass 2 — the same page with motion reduced. The layer stops
			// advancing its shared clock, so the whole scene freezes and hiding
			// the panels becomes the only thing that changes between frames.
			// Measuring placement on a live page does not work: removing a
			// panel invalidates the temporal history, the next frame flashes
			// globally, and that flash lands outside every rectangle. Two pages
			// failed on exactly that before this pass existed.
			const frozen = await browser.newPage({
				viewport: { width: 1280, height: 860 },
				reducedMotion: "reduce",
			});
			await frozen.goto(`${origin}/?demo=${demo}`, {
				waitUntil: "networkidle",
				timeout: 60_000,
			});
			await frozen.waitForFunction(
				() =>
					document.querySelector("[data-ui-lib-stage]")?.getAttribute("data-ui-lib-stage") ===
					"ready",
				null,
				{ timeout: options.timeout },
			);
			await frozen.waitForTimeout(4000);

			const frozenCanvas = frozen.locator("canvas").first();
			const canvasBox = await frozenCanvas.boundingBox();
			const panels = await frozen.evaluate(() => {
				const out = [];
				for (const el of document.querySelectorAll("[data-ui-lib-glass]")) {
					const state = el.getAttribute("data-ui-lib-glass");
					if (state !== "gpu" && state !== "ready") continue;
					const r = el.getBoundingClientRect();
					if (r.width < 2 || r.height < 2) continue;
					out.push({ x: r.x, y: r.y, w: r.width, h: r.height });
				}
				return out;
			});

			if (panels.length > 0 && canvasBox) {
				const before = decodePng(await frozenCanvas.screenshot());
				await frozen.waitForTimeout(400);
				const after = decodePng(await frozenCanvas.screenshot());
				row.frozenNoise = frameDelta(before, after);
				const px = before.width / canvasBox.width;

				if (row.frozenNoise > 0.5) {
					// The freeze did not take, so every number below is measuring
					// scene motion as much as it is measuring glass.
					row.notes.push(
						`scene did not freeze under reduced motion (frame delta ${row.frozenNoise.toFixed(2)})`,
					);
					row.ok = false;
				} else {
					const toLocal = (p) => ({
						x: (p.x - canvasBox.x) * px,
						y: (p.y - canvasBox.y) * px,
						w: p.w * px,
						h: p.h * px,
					});

					// Hide one panel at a time and require *its* signal to land in
					// *its* rectangle. Hiding every panel at once only proves the
					// signal landed somewhere among them, which a dense page
					// satisfies even when every panel is displaced — the iris page
					// scored 0.95 with the mirrored-panel bug present.
					const ranked = panels
						.map((p, index) => ({ ...p, index }))
						.filter((p) => p.w * px >= 24 && p.h * px >= 24)
						.sort(
							(a, b) =>
								Math.hypot(
									b.x + b.w / 2 - canvasBox.width / 2,
									b.y + b.h / 2 - canvasBox.height / 2,
								) -
								Math.hypot(
									a.x + a.w / 2 - canvasBox.width / 2,
									a.y + a.h / 2 - canvasBox.height / 2,
								),
						)
						.slice(0, 4);

					await frozen.evaluate(() => {
						const style = document.createElement("style");
						style.id = "ui-lib-pixel-gate";
						style.textContent = "[data-ui-lib-pixel-hide]{display:none !important}";
						document.head.appendChild(style);
					});

					const perPanel = [];
					for (const panel of ranked) {
						await frozen.evaluate((index) => {
							const el = [...document.querySelectorAll("[data-ui-lib-glass]")].filter(
								(node) => {
									const state = node.getAttribute("data-ui-lib-glass");
									return state === "gpu" || state === "ready";
								},
							)[index];
							el?.setAttribute("data-ui-lib-pixel-hide", "");
						}, panel.index);
						await frozen.waitForTimeout(360);
						const without = decodePng(await frozenCanvas.screenshot());
						const placement = placementContrast(before, after, without, [toLocal(panel)]);
						perPanel.push(placement.contrast);
						await frozen.evaluate((index) => {
							const el = [...document.querySelectorAll("[data-ui-lib-glass]")].filter(
								(node) => {
									const state = node.getAttribute("data-ui-lib-glass");
									return state === "gpu" || state === "ready";
								},
							)[index];
							el?.removeAttribute("data-ui-lib-pixel-hide");
						}, panel.index);
						await frozen.waitForTimeout(140);
					}

					row.panels = panels.length;
					row.checked = perPanel.length;
					row.placement = perPanel.length ? Math.min(...perPanel) : undefined;

					if (perPanel.length === 0) {
						row.notes.push("no panel large enough to measure");
						row.ok = false;
					} else if (row.placement < 1.6) {
						row.ok = false;
						row.notes.push(
							`hiding a panel changed its own rect only ${row.placement.toFixed(2)}x as much ` +
								`as the rest of the frame (worst of ${perPanel.length} checked)`,
						);
					}
				}
			}
			await frozen.close();
		} catch (error) {
			row.ok = false;
			row.notes.push(String(error).split("\n")[0].slice(0, 120));
		}
		return row;
	}

	const results = await pool(
		demos,
		Math.max(1, Number(process.env.UI_LIB_PIXEL_CONCURRENCY ?? 3)),
		checkDemo,
	);
	for (const row of results) {
		if (!row.ok) failed += 1;
		rows.push(row);
	}

	await browser.close();

	console.log("\ndemo            ink    Δframe  panels  checked  contrast  verdict");
	console.log("---------------------------------------------------------------------");
	for (const row of rows) {
		const cell = (value, digits = 3, width = 7) =>
			value === undefined ? " ".repeat(width) : value.toFixed(digits).padStart(width);
		console.log(
			`${row.demo.padEnd(14)}${cell(row.ink)} ${cell(row.delta)}  ${String(row.panels ?? "-").padStart(6)}  ` +
				`${String(row.checked ?? "-").padStart(7)}  ${cell(row.placement, 2)}x  ${row.ok ? "ok" : "FAIL"}`,
		);
		if (!row.ok) for (const note of row.notes) console.log(`${" ".repeat(15)}└ ${note}`);
	}
	console.log("");

	if (failed > 0) {
		console.error(`check-pixels: ${failed} of ${rows.length} page(s) failed\n`);
		return 1;
	}
	console.log(`check-pixels: ${rows.length} page(s) drawing, with glass on its elements\n`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
