#!/usr/bin/env node
/**
 * Build a signed-distance-field font atlas.
 *
 * `evaluateMSDF` has been sitting in `@ui-lib/shaders`, correct and unused,
 * since it was written: there was no atlas in the repository for it to sample,
 * which is also why the text path had never run end to end. This generates one.
 *
 * It is an **SDF**, not an MSDF, and the difference is worth stating rather
 * than eliding. A real multi-channel field assigns a different edge to each
 * channel so that corners survive the median filter; this writes the same
 * distance into all three, which is what a single-channel field is. The shader
 * is unchanged and works — `max(min(r,g), min(max(r,g), b))` of three equal
 * channels is that channel — but glyph corners round off slightly. Shipping
 * data that is not what its name says is the failure this repository keeps
 * rediscovering, so the file is named `-sdf` and the JSON says `sdf`.
 *
 * Everything happens locally: Playwright rasterises glyphs through Canvas2D,
 * the 8SSEDT transform runs in the page, and the browser encodes the PNG. No
 * font parser, no image library, no network.
 *
 * Usage:
 *   node scripts/build-font-atlas.mjs
 *   node scripts/build-font-atlas.mjs --chars "水彩卡片IRIS" --size 64
 *   node scripts/build-font-atlas.mjs --font "PingFang SC" --out apps/docs/public/fonts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DEFAULT_CHARS =
	" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
	"水彩卡片晶透文字鸢尾糖萌软圆甜粉紫";

/** Padding around each glyph, in atlas pixels. The field needs room to fall off. */
const PADDING = 6;
/**
 * Texels the 0..1 field spans either side of the edge.
 *
 * This has to be *smaller than half the thinnest stroke*, or the field never
 * saturates inside that stroke and the glyph renders as a faint wash rather
 * than as ink. A CJK glyph at 48px has strokes about 3px wide, so a range of 4
 * left the inside at `sigDist ≈ -0.12` and `smoothstep` returned nearly zero —
 * the text was there, correctly placed and correctly sized, and almost
 * invisible. Rendering larger and keeping the range tight is what makes the
 * field reach its floor inside a stroke.
 */
const RANGE = 2;

function parseArgs(argv) {
	const options = {
		chars: DEFAULT_CHARS,
		size: 64,
		font: "",
		out: "apps/docs/public/fonts",
		name: "iris-sdf",
	};
	for (let i = 0; i < argv.length; i += 1) {
		const next = () => argv[++i];
		if (argv[i] === "--chars") options.chars = next();
		else if (argv[i] === "--size") options.size = Number(next());
		else if (argv[i] === "--font") options.font = next();
		else if (argv[i] === "--out") options.out = next();
		else if (argv[i] === "--name") options.name = next();
	}
	return options;
}

/**
 * Runs inside the page. Rasterises every glyph, turns each into a distance
 * field, and packs them into one canvas.
 */
function buildInPage({ chars, size, font, padding, range }) {
	// 8SSEDT: two passes, each storing the vector to the nearest edge pixel.
	// Far cheaper than a brute-force search and exact for a grid.
	const FAR = 1e9;

	function makeGrid(w, h) {
		const dx = new Int32Array(w * h);
		const dy = new Int32Array(w * h);
		const dist = new Float64Array(w * h);
		return { w, h, dx, dy, dist };
	}

	function seed(grid, mask, inside) {
		const { w, h, dx, dy, dist } = grid;
		for (let y = 0; y < h; y += 1) {
			for (let x = 0; x < w; x += 1) {
				const i = y * w + x;
				const isInside = mask[i] === 1;
				if (isInside === inside) {
					let best = FAR;
					let bx = 0;
					let by = 0;
					for (let oy = -1; oy <= 1; oy += 1) {
						for (let ox = -1; ox <= 1; ox += 1) {
							const nx = x + ox;
							const ny = y + oy;
							if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
							if (mask[ny * w + nx] === (inside ? 0 : 1)) {
								const d = ox * ox + oy * oy;
								if (d < best + 1e-9 && d < 2.5) {
									best = d;
									bx = ox;
									by = oy;
								}
							}
						}
					}
					if (best < 2.5) {
						dx[i] = bx;
						dy[i] = by;
						dist[i] = Math.sqrt(best);
					} else {
						dx[i] = 0;
						dy[i] = 0;
						dist[i] = FAR;
					}
				} else {
					dx[i] = 0;
					dy[i] = 0;
					dist[i] = 0;
				}
			}
		}
	}

	function propagate(grid) {
		const { w, h, dx, dy, dist } = grid;
		const relax = (x, y, ox, oy) => {
			const nx = x + ox;
			const ny = y + oy;
			if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
			const i = y * w + x;
			const j = ny * w + nx;
			if (dist[j] >= FAR) return;
			const cx = dx[j] + ox;
			const cy = dy[j] + oy;
			const d = Math.sqrt(cx * cx + cy * cy);
			if (d < dist[i]) {
				dist[i] = d;
				dx[i] = cx;
				dy[i] = cy;
			}
		};
		for (let y = 0; y < h; y += 1) {
			for (let x = 0; x < w; x += 1) {
				relax(x, y, -1, 0);
				relax(x, y, 0, -1);
				relax(x, y, -1, -1);
				relax(x, y, 1, -1);
			}
			for (let x = w - 1; x >= 0; x -= 1) relax(x, y, 1, 0);
		}
		for (let y = h - 1; y >= 0; y -= 1) {
			for (let x = w - 1; x >= 0; x -= 1) {
				relax(x, y, 1, 0);
				relax(x, y, 0, 1);
				relax(x, y, 1, 1);
				relax(x, y, -1, 1);
			}
			for (let x = 0; x < w; x += 1) relax(x, y, -1, 0);
		}
	}

	function signedField(mask, w, h) {
		const outside = makeGrid(w, h);
		seed(outside, mask, false);
		propagate(outside);
		const inside = makeGrid(w, h);
		seed(inside, mask, true);
		propagate(inside);

		const out = new Float64Array(w * h);
		for (let i = 0; i < w * h; i += 1) {
			const d = mask[i] === 1 ? inside.dist[i] : outside.dist[i];
			out[i] = mask[i] === 1 ? -d : d;
		}
		return out;
	}

	const probe = document.createElement("canvas").getContext("2d");
	const family = font || "system-ui, sans-serif";
	probe.font = `${size}px ${family}`;

	const glyphs = [];
	const seen = new Set();
	for (const ch of chars) {
		if (seen.has(ch)) continue;
		seen.add(ch);
		const m = probe.measureText(ch);
		const width = Math.max(1, Math.ceil(m.width));
		glyphs.push({
			ch,
			advance: m.width,
			left: m.actualBoundingBoxLeft ?? 0,
			ascent: m.actualBoundingBoxAscent ?? size * 0.8,
			descent: m.actualBoundingBoxDescent ?? 0,
			width,
		});
	}

	const cellW = Math.ceil(size * 0.9) + padding * 2;
	const cellH = Math.ceil(size * 1.15) + padding * 2;
	const maxWidth = Math.max(...glyphs.map((g) => g.width));
	const cw = Math.max(cellW, maxWidth + padding * 2);

	const columns = Math.min(
		glyphs.length,
		Math.max(1, Math.ceil(Math.sqrt(glyphs.length * (cellH / cw)))),
	);
	const rows = Math.ceil(glyphs.length / columns);

	const atlasW = columns * cw;
	const atlasH = rows * cellH;

	const atlas = document.createElement("canvas");
	atlas.width = atlasW;
	atlas.height = atlasH;
	const actx = atlas.getContext("2d");
	// Distance fields must not be colour-managed or smoothed on the way in.
	actx.imageSmoothingEnabled = false;
	actx.fillStyle = "#000";
	actx.fillRect(0, 0, atlasW, atlasH);

	const raster = document.createElement("canvas");
	raster.width = cw;
	raster.height = cellH;
	const rctx = raster.getContext("2d", { willReadFrequently: true });

	const chars_ = [];
	let index = 0;
	for (const glyph of glyphs) {
		const col = index % columns;
		const row = Math.floor(index / columns);
		index += 1;

		rctx.clearRect(0, 0, cw, cellH);
		rctx.fillStyle = "#fff";
		rctx.font = `${size}px ${family}`;
		rctx.textBaseline = "alphabetic";
		rctx.fillText(glyph.ch, padding + glyph.left, padding + Math.ceil(size * 0.8));

		const pixels = rctx.getImageData(0, 0, cw, cellH).data;
		const mask = new Uint8Array(cw * cellH);
		for (let i = 0; i < cw * cellH; i += 1) {
			mask[i] = pixels[i * 4 + 3] > 127 ? 1 : 0;
		}

		const field = signedField(mask, cw, cellH);
		const image = actx.createImageData(cw, cellH);
		for (let i = 0; i < cw * cellH; i += 1) {
			// 0.5 is the edge. Inside must land *above* it: `evaluateMSDF`
			// computes `median - 0.5` and ramps opacity up from there, so a
			// field that is dark inside renders the glyph as a negative. The
			// first build was inverted and only a pixel sample caught it.
			const value = Math.max(0, Math.min(1, 0.5 - field[i] / (range * 2)));
			const byte = Math.round(value * 255);
			image.data[i * 4] = byte;
			image.data[i * 4 + 1] = byte;
			image.data[i * 4 + 2] = byte;
			image.data[i * 4 + 3] = 255;
		}
		actx.putImageData(image, col * cw, row * cellH);

		chars_.push({
			id: glyph.ch.codePointAt(0),
			x: col * cw,
			y: row * cellH,
			width: cw,
			height: cellH,
			xoffset: -padding,
			yoffset: Math.ceil(size * 0.8) + padding,
			xadvance: Math.round(glyph.advance),
		});
	}

	return {
		png: atlas.toDataURL("image/png"),
		font: {
			info: { face: family, size, padding },
			common: {
				lineHeight: Math.ceil(size * 1.25),
				base: Math.ceil(size * 0.8),
				scaleW: atlasW,
				scaleH: atlasH,
			},
			distanceField: { fieldType: "sdf", distanceRange: range },
			chars: chars_,
		},
	};
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const here = fileURLToPath(new URL("..", import.meta.url));
	const outDir = resolve(here, options.out);
	mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	await page.setContent("<!doctype html><meta charset='utf-8'><body></body>");
	const result = await page.evaluate(buildInPage, {
		chars: Array.from(new Set(options.chars.split(""))).join(""),
		size: options.size,
		font: options.font,
		padding: PADDING,
		range: RANGE,
	});
	await browser.close();

	const png = Buffer.from(result.png.replace(/^data:image\/png;base64,/, ""), "base64");
	const pngPath = join(outDir, `${options.name}.png`);
	const jsonPath = join(outDir, `${options.name}.json`);
	writeFileSync(pngPath, png);
	writeFileSync(jsonPath, `${JSON.stringify(result.font, null, "\t")}\n`);

	const { scaleW, scaleH } = result.font.common;
	console.log(
		`build-font-atlas: ${result.font.chars.length} glyphs, ${scaleW}x${scaleH}, ` +
			`fieldType=${result.font.distanceField.fieldType}, range=${RANGE}`,
	);
	console.log(`  ${pngPath}  (${(png.length / 1024).toFixed(1)} KB)`);
	console.log(`  ${jsonPath}`);
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
