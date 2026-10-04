#!/usr/bin/env node
/**
 * Refraction acceptance gate.
 *
 * `check-pixels` proves the glass is *present and in the right place*. It has
 * never proved the glass is *transparent*, which is why a panel that rendered
 * as a solid tinted rectangle passed every gate for several rounds. This script
 * closes that hole.
 *
 * ## What "opaque" actually looks like, in pixels
 *
 * A transparent pane samples the backdrop, displaces it, and writes it back. It
 * therefore *preserves* the backdrop's local structure: a card sitting on a
 * field of hairlines still shows hairlines afterwards, just moved.
 *
 * An opaque pane replaces the backdrop with its own colour. Whatever local
 * structure was behind it is gone.
 *
 * So the discriminating measurement is not "how different is inside from
 * outside" — both cases differ from outside. It is **how much structure
 * survives inside the card**, compared against the structure of the same
 * backdrop with the card removed.
 *
 * ## The metric
 *
 * For each registered panel:
 *
 *   retention = localContrast(inside the card, glass on)
 *             / localContrast(inside the card, glass off)
 *
 * `localContrast` is the mean absolute Laplacian of luma. A Laplacian is the
 * right operator here because it responds to *edges only*: a uniform tint over
 * the region contributes nothing to it, while a displaced hairline still
 * contributes its full edge response. Brightness, tint and grading — the things
 * a pane may legitimately change without being opaque — are all invisible to it.
 *
 * A panel reads:
 *
 *   retention ~ 1.0   displacement only; the structure survived. Correct.
 *   retention ~ 0.3   the pane is blurring (frost) — expected for a frosted
 *                     look, so the floor is deliberately low, not global.
 *   retention ~ 0.0   the pane replaced the backdrop. This is the defect.
 *
 * ## Why the backdrop must have hard edges for this to work
 *
 * Retention is a ratio of edge energy. On a smooth gradient there are no edges,
 * so both numerator and denominator are noise and the ratio is meaningless —
 * the check would report whatever the sensor noise did. That is exactly why
 * `probeBackdrop.ts` exists and why the page it runs on must use it. The script
 * refuses to report a verdict from a featureless backdrop, because a
 * measurement from a broken apparatus is not evidence. Two rounds were lost to
 * exactly that: a smooth gradient backdrop, four cards at four thicknesses,
 * identical renders, and no gate able to say so.
 *
 * ## Motion is frozen, not ignored
 *
 * Measured with `reducedMotion: "reduce"`, the same trick `check-pixels` uses.
 * The layer stops advancing its shared clock, so hiding a panel is the only
 * thing that changes between two frames. Reading retention off a live page
 * would fold the particle drift into the denominator and inflate `off`.
 *
 * Usage:
 *   node scripts/check-refraction.mjs                # every listed page
 *   node scripts/check-refraction.mjs --demos glass-lab
 *   node scripts/check-refraction.mjs --report       # per-panel numbers
 *   node scripts/check-refraction.mjs --self-test    # is the metric live?
 */

import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { decodePng } from "./check-pixels.mjs";

const ORIGIN = process.env.REFRACTION_ORIGIN ?? "http://127.0.0.1:5173";

/**
 * Pages that mount a `GlassStage` over a backdrop with real edges.
 *
 * A page whose backdrop is a smooth gradient cannot be measured by this script;
 * listing it here would produce a meaningless number rather than an honest
 * failure, so such pages are deliberately absent. `check-pixels` still covers
 * them for presence and placement.
 *
 * `minimumEdges` is the denominator floor: the mean absolute Laplacian of the
 * backdrop behind the card, times 1000. Below it there is nothing to preserve
 * and the ratio is noise.
 */
const PAGES = [
	{ demo: "glass-lab", minimumEdges: 3, stage: "ready" },
	{ demo: "stacking", minimumEdges: 3, stage: "ready" },
];

/**
 * Mean absolute Laplacian of luma over a rectangle.
 *
 * 4-neighbour Laplacian: zero on any locally linear region, which is what makes
 * it ignore a constant tint and a linear gradient alike, and large at an edge.
 * Scaled by 1000 so `--report` is readable; the scale cancels in the ratio.
 */
export function localContrast(image, rect) {
	const { width, height, data } = image;
	const x0 = Math.max(1, Math.floor(rect.x));
	const y0 = Math.max(1, Math.floor(rect.y));
	const x1 = Math.min(width - 1, Math.ceil(rect.x + rect.w));
	const y1 = Math.min(height - 1, Math.ceil(rect.y + rect.h));
	if (x1 - x0 < 3 || y1 - y0 < 3) return 0;

	const at = (x, y) => {
		const o = (y * width + x) * 4;
		return 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
	};

	let sum = 0;
	let count = 0;
	for (let y = y0; y < y1; y += 1) {
		for (let x = x0; x < x1; x += 1) {
			const lap = 4 * at(x, y) - at(x - 1, y) - at(x + 1, y) - at(x, y - 1) - at(x, y + 1);
			sum += Math.abs(lap);
			count += 1;
		}
	}
	return count === 0 ? 0 : (sum / count) * 1000;
}

/**
 * Shrink a panel rectangle inward so the measurement lands on the pane's glass
 * and not on its rim, its shadow, or the text inside the card.
 *
 * `inset` has to clear the bevel: the bevel is where refraction is strongest and
 * also where the element's own border, inset shadows and specular streak live,
 * all of which would dominate the backdrop signal. The flat centre is the honest
 * place to ask "did the backdrop survive".
 */
export function innerRect(rect, inset = 0.24) {
	const dx = rect.w * inset;
	const dy = rect.h * inset;
	return { x: rect.x + dx, y: rect.y + dy, w: rect.w - dx * 2, h: rect.h - dy * 2 };
}

/**
 * `retention` for one panel, plus the denominator it was taken against.
 *
 * Returns `null` when the backdrop behind the card carries too little structure
 * for the ratio to mean anything. Callers must treat `null` as "not measured",
 * never as "passed" — conflating those is how a check reports green while
 * checking nothing, which has happened twice in this repo.
 */
export function retentionFor(withGlass, withoutGlass, rect, minimumEdges) {
	const inner = innerRect(rect);
	const on = localContrast(withGlass, inner);
	const off = localContrast(withoutGlass, inner);
	if (off < minimumEdges) return { on, off, retention: null };
	return { on, off, retention: on / off };
}

/**
 * Is the metric actually able to see opacity?
 *
 * Synthesises two frames of the same checker field. The control keeps it; the
 * treatment blurs it toward its own local mean, which is what an opaque pane
 * does to a backdrop — it replaces structure with a flat colour.
 *
 * The first version of this test flattened a *square* inside the field and
 * scored 0.75 instead of ~0, because the boundary of the flattened region is
 * itself one enormous hard edge and the Laplacian counted it. The metric was
 * right; the control was wrong. Blurring has no such seam: no new edge is
 * introduced, existing edge energy is simply removed. A test whose control
 * cannot fail is worth less than no test, so this one is built to fail.
 */
export function selfTest() {
	const size = 120;
	const data = new Uint8ClampedArray(size * size * 4);
	const blurred = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const o = (y * size + x) * 4;
			const on = (x >> 3) % 2 === (y >> 3) % 2;
			const value = on ? 236 : 20;
			data[o] = value;
			data[o + 1] = value;
			data[o + 2] = value;
			data[o + 3] = 255;
			// Alternate cells collapse to one mid value: every edge is gone, no
			// edge is created.
			const flat = ((x >> 3) + (y >> 3)) % 2 === 0 ? 128 : 130;
			blurred[o] = flat;
			blurred[o + 1] = flat;
			blurred[o + 2] = flat;
			blurred[o + 3] = 255;
		}
	}
	const rect = { x: 0, y: 0, w: size, h: size };
	const structured = localContrast({ width: size, height: size, data }, rect);
	const flattened = localContrast({ width: size, height: size, data: blurred }, rect);
	return {
		structured,
		flattened,
		retention: structured === 0 ? 0 : flattened / structured,
		live: structured > 5 && flattened / structured < 0.25,
	};
}

async function main() {
	const argv = process.argv.slice(2);
	const only = argv.includes("--demos")
		? (argv[argv.indexOf("--demos") + 1] ?? "").split(",").filter(Boolean)
		: null;
	const report = argv.includes("--report");
	const options = { timeout: 120_000 };

	if (argv.includes("--self-test")) {
		const result = selfTest();
		if (!result.live) {
			console.error("\ncheck-refraction --self-test: the probe is blind");
			console.error(
				`  structured frame scores ${result.structured.toFixed(2)}, ` +
					`same frame with its centre flattened scores ${result.flattened.toFixed(2)}`,
			);
			console.error("  an opaque region must destroy edge energy. Nothing here is trustworthy.\n");
			process.exit(1);
		}
		console.log(
			`\ncheck-refraction --self-test: probe is live — flattening the centre drops edge ` +
				`energy to ${(result.retention * 100).toFixed(1)}% of the structured frame\n`,
		);
		return;
	}

	const pages = only ? PAGES.filter((p) => only.includes(p.demo)) : PAGES;
	if (pages.length === 0) {
		console.error(`no such page; known: ${PAGES.map((p) => p.demo).join(", ")}`);
		process.exit(2);
	}

	const browser = await chromium.launch({ headless: true });
	const rows = [];
	let failed = 0;

	for (const page of pages) {
		const row = { demo: page.demo, ok: true, measured: 0, worst: null, notes: [] };
		const view = await browser.newPage({
			viewport: { width: 1440, height: 1000 },
			reducedMotion: "reduce",
		});
		try {
			await view.goto(`${ORIGIN}/?demo=${page.demo}`, {
				waitUntil: "networkidle",
				timeout: 60_000,
			});
			await view.waitForFunction(
				() =>
					document.querySelector("[data-ui-lib-stage]")?.getAttribute("data-ui-lib-stage") ===
					"ready",
				null,
				{ timeout: options.timeout },
			);
			await view.waitForTimeout(4000);

			const canvas = view.locator("canvas").first();
			if ((await canvas.count()) === 0) {
				row.ok = false;
				row.notes.push("no canvas");
				rows.push(row);
				continue;
			}
			const box = await canvas.boundingBox();
			if (!box) {
				row.ok = false;
				row.notes.push("canvas has no box");
				rows.push(row);
				continue;
			}

			const panels = await view.evaluate(() => {
				const out = [];
				for (const el of document.querySelectorAll("[data-ui-lib-glass]")) {
					const state = el.getAttribute("data-ui-lib-glass");
					if (state !== "gpu" && state !== "ready") continue;
					const r = el.getBoundingClientRect();
					if (r.width < 40 || r.height < 40) continue;
					out.push({ x: r.x, y: r.y, w: r.width, h: r.height });
				}
				return out;
			});
			if (panels.length === 0) {
				row.ok = false;
				row.notes.push("no glass panels on the page");
				rows.push(row);
				continue;
			}

			const shot = async () => decodePng(await canvas.screenshot({ timeout: options.timeout }));
			const withGlass = await shot();

			await view.evaluate(() => {
				const style = document.createElement("style");
				style.id = "ui-lib-refraction-gate";
				style.textContent = "[data-ui-lib-refraction-hide]{display:none !important}";
				document.head.appendChild(style);
				for (const el of document.querySelectorAll("[data-ui-lib-glass]")) {
					el.setAttribute("data-ui-lib-refraction-hide", "");
				}
			});
			await view.waitForTimeout(700);
			const withoutGlass = await shot();

			const px = withGlass.width / box.width;
			const toCanvas = (p) => ({
				x: (p.x - box.x) * px,
				y: (p.y - box.y) * px,
				w: p.w * px,
				h: p.h * px,
			});

			for (const panel of panels) {
				const r = retentionFor(withGlass, withoutGlass, toCanvas(panel), page.minimumEdges);
				if (r.retention === null) {
					row.notes.push(
						`panel@${Math.round(panel.x)},${Math.round(panel.y)} unmeasured ` +
							`(backdrop edge energy ${r.off.toFixed(2)} < ${page.minimumEdges})`,
					);
					continue;
				}
				row.measured += 1;
				if (report) {
					console.log(
						`  ${page.demo} @${Math.round(panel.x)},${Math.round(panel.y)} ` +
							`${Math.round(panel.w)}x${Math.round(panel.h)}: ` +
							`on=${r.on.toFixed(2)} off=${r.off.toFixed(2)} ` +
							`retention=${r.retention.toFixed(3)}`,
					);
				}
				if (!row.worst || r.retention < row.worst.retention) row.worst = r;
			}

			if (row.measured === 0) {
				row.ok = false;
				row.notes.push("no panel could be measured");
			} else if (row.worst.retention < 0.12) {
				row.ok = false;
				row.notes.push(
					`worst retention ${row.worst.retention.toFixed(3)} — the pane is replacing ` +
						`its backdrop rather than bending it`,
				);
			}
		} catch (error) {
			row.ok = false;
			row.notes.push(error instanceof Error ? error.message : String(error));
		} finally {
			await view.close();
		}
		rows.push(row);
	}

	await browser.close();

	console.log("");
	for (const row of rows) {
		const detail = row.worst ? `worst retention ${row.worst.retention.toFixed(3)}` : "not measured";
		console.log(
			`${row.ok ? "PASS" : "FAIL"}  ${row.demo.padEnd(12)} ${row.measured} panel(s)  ${detail}`,
		);
		for (const note of row.notes) console.log(`        ${note}`);
		if (!row.ok) failed += 1;
	}
	console.log("");

	if (failed > 0) {
		console.error(`${failed} page(s) failed refraction`);
		process.exit(1);
	}
	console.log("refraction ok");
}

const invoked = process.argv[1] ?? "";
if (invoked.endsWith("check-refraction.mjs")) {
	await main();
}
