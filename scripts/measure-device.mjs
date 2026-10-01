#!/usr/bin/env node
/**
 * Real-device measurement for the six flagship pages.
 *
 * This is deliberately NOT part of CI. CI runs headless, and headless
 * Chromium on macOS falls back to SwiftShader — the numbers would describe a
 * software rasteriser, not the machine. Run this on a workstation with a real
 * GPU, where headed Chromium gets Metal or a discrete adapter.
 *
 * It measures frame pacing from the outside, with its own requestAnimationFrame
 * loop, and separately records what the runtime reports. The two are kept apart
 * on purpose: `droppedFrames` is defined against a fixed 60 Hz budget and is
 * cumulative since the scheduler started, so it cannot be read as a drop rate.
 *
 *   node scripts/measure-device.mjs [--url http://127.0.0.1:5173]
 *                                   [--window 8000] [--warmup 3000]
 *                                   [--dpr 2] [--backend webgl]
 *                                   [--out reports/device] [--headless]
 *
 * `--dpr` is the one to reach for when the numbers look suspiciously flat: at
 * DPR 1 the render target is a quarter of the size a Retina panel would give,
 * and a vsync-locked 120fps at that size says very little.
 *
 * `--backend webgl` forces the WebGL2 route through the playground's own
 * `?backend=` switch, so the fallback path gets measured on the same machine
 * instead of being assumed to behave like WebGPU.
 *
 * The playground must already be running; this script does not start or stop a
 * server for you.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const DEMOS = [
	"liquid-glass",
	"aurora-flow",
	"product-hero",
	"scroll-cinema",
	"cursor-field",
	"wake",
];

function parseArgs(argv) {
	const out = {
		url: "http://127.0.0.1:5173",
		window: 8000,
		warmup: 3000,
		out: "reports/device",
		headless: false,
		dpr: null,
		backend: null,
	};
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--url") out.url = argv[++i];
		else if (a === "--window") out.window = Number(argv[++i]);
		else if (a === "--warmup") out.warmup = Number(argv[++i]);
		else if (a === "--out") out.out = argv[++i];
		else if (a === "--dpr") out.dpr = Number(argv[++i]);
		else if (a === "--backend") out.backend = argv[++i];
		else if (a === "--headless") out.headless = true;
		else {
			console.error(`unknown argument: ${a}`);
			process.exit(2);
		}
	}
	return out;
}

const args = parseArgs(process.argv);

if (args.backend !== null && !["webgpu", "webgl"].includes(args.backend)) {
	console.error(`--backend must be webgpu or webgl, got ${args.backend}`);
	process.exit(2);
}

async function assertServerUp(url) {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
	} catch (error) {
		console.error(`The playground is not reachable at ${url}.`);
		console.error("Start it first, for example:");
		console.error("  pnpm --filter @ui-lib/docs dev --host 127.0.0.1");
		console.error(`(${error.message})`);
		process.exit(1);
	}
}

/** Frame intervals sampled in the page, independent of the runtime's own counters. */
const FRAME_SAMPLER = (ms) =>
	new Promise((resolve) => {
		const intervals = [];
		let last = performance.now();
		const start = last;
		const tick = (now) => {
			intervals.push(now - last);
			last = now;
			if (now - start < ms) requestAnimationFrame(tick);
			else resolve(intervals);
		};
		requestAnimationFrame(tick);
	});

function percentile(sorted, p) {
	if (sorted.length === 0) return 0;
	const idx = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
	);
	return sorted[idx];
}

function summarise(intervals) {
	const sorted = [...intervals].sort((a, b) => a - b);
	const sum = intervals.reduce((a, b) => a + b, 0);
	const mean = intervals.length ? sum / intervals.length : 0;
	return {
		count: intervals.length,
		meanMs: Number(mean.toFixed(2)),
		p50Ms: Number(percentile(sorted, 50).toFixed(2)),
		p95Ms: Number(percentile(sorted, 95).toFixed(2)),
		p99Ms: Number(percentile(sorted, 99).toFixed(2)),
		maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
		over16_7Ms: intervals.filter((v) => v > 16.7).length,
		over33_3Ms: intervals.filter((v) => v > 33.3).length,
		fpsFromMean: Number((mean > 0 ? 1000 / mean : 0).toFixed(1)),
	};
}

function readStage(page) {
	return page.evaluate(() => {
		const el = document.querySelector("[data-ui-lib-stage]");
		const num = (name) => {
			const raw = el?.getAttribute(name);
			if (raw === null || raw === "") return null;
			const n = Number(raw);
			return Number.isFinite(n) ? n : null;
		};
		return {
			stage: el?.getAttribute("data-ui-lib-stage") ?? null,
			mode: el?.getAttribute("data-ui-lib-mode") ?? null,
			backend: el?.getAttribute("data-ui-lib-backend") ?? null,
			tier: num("data-ui-lib-tier"),
			fps: num("data-ui-lib-fps"),
			droppedFrames: num("data-ui-lib-dropped-frames"),
			longFrames: num("data-ui-lib-long-frames"),
			resourceCount: num("data-ui-lib-resource-count"),
			hasCanvas: document.querySelectorAll("canvas").length,
		};
	});
}

async function probeGpu(page) {
	return page.evaluate(async () => {
		const out = {
			webgpu: typeof navigator.gpu !== "undefined",
			adapter: null,
			glRenderer: null,
			glVendor: null,
		};
		const c = document.createElement("canvas");
		const gl = c.getContext("webgl2") || c.getContext("webgl");
		if (gl) {
			const ext = gl.getExtension("WEBGL_debug_renderer_info");
			out.glRenderer = ext
				? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
				: gl.getParameter(gl.RENDERER);
			out.glVendor = ext
				? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
				: gl.getParameter(gl.VENDOR);
		}
		if (out.webgpu) {
			try {
				const a = await navigator.gpu.requestAdapter();
				const i = a?.info ?? {};
				out.adapter = a
					? `${i.vendor ?? "?"} / ${i.architecture ?? "?"} / ${i.description ?? "?"}`
					: "no adapter";
			} catch (e) {
				out.adapter = `error: ${e.message}`;
			}
		}
		return out;
	});
}

/** A filesystem-safe label for the GPU bucket the numbers belong to. */
function bucketName(gpu) {
	const raw = gpu.glRenderer ?? gpu.adapter ?? "unknown-gpu";
	return raw
		.replace(/^ANGLE \(/, "")
		.replace(/[()]/g, " ")
		.replace(/[^A-Za-z0-9.+-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80)
		.toLowerCase();
}

async function main() {
	await assertServerUp(args.url);

	const browser = await chromium.launch({ headless: args.headless });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1000 },
		...(args.dpr ? { deviceScaleFactor: args.dpr } : null),
		colorScheme: "dark",
		reducedMotion: "no-preference",
	});
	const page = await context.newPage();

	await page.goto(args.url, { waitUntil: "load" });
	const gpu = await probeGpu(page);
	const env = await page.evaluate(() => ({
		userAgent: navigator.userAgent,
		devicePixelRatio: window.devicePixelRatio,
		hardwareConcurrency: navigator.hardwareConcurrency,
		screen: `${screen.width}x${screen.height} @${screen.colorDepth}`,
	}));

	// The forced backend is part of the bucket name: the same GPU produces very
	// different numbers on the WebGPU and WebGL2 paths, and mixing them would
	// make the record unreadable.
	const backendTag = args.backend === "webgl" ? "-webgl2" : "";
	const bucket = `${bucketName(gpu)}-dpr${env.devicePixelRatio}${backendTag}`;
	const outDir = resolve(args.out, bucket);
	mkdirSync(outDir, { recursive: true });

	const pages = [];
	for (const demo of DEMOS) {
		const path = `/?demo=${demo}${args.backend ? `&backend=${args.backend}` : ""}`;
		await page.goto(`${args.url}${path}`, { waitUntil: "load" });

		// Wait for the stage to settle. A cold start compiles shaders, and that
		// cost belongs in the warmup, not in the measured window.
		await page
			.waitForFunction(
				() => {
					const el = document.querySelector("[data-ui-lib-stage]");
					return el && ["ready", "unsupported"].includes(el.getAttribute("data-ui-lib-stage"));
				},
				{ timeout: 30_000 },
			)
			.catch(() => {});
		await page.waitForTimeout(args.warmup);

		const before = await readStage(page);
		const intervals = await page.evaluate(FRAME_SAMPLER, args.window);
		const after = await readStage(page);

		const screenshot = join(outDir, `${demo}.png`);
		await page.screenshot({ path: screenshot, fullPage: false });

		pages.push({
			demo,
			path,
			stage: after.stage,
			backend: after.backend,
			tier: after.tier,
			hasCanvas: after.hasCanvas,
			frames: summarise(intervals),
			runtime: {
				fps: after.fps,
				droppedFrames: after.droppedFrames,
				droppedFramesDelta:
					after.droppedFrames !== null && before.droppedFrames !== null
						? after.droppedFrames - before.droppedFrames
						: null,
				longFrames: after.longFrames,
				longFramesDelta:
					after.longFrames !== null && before.longFrames !== null
						? after.longFrames - before.longFrames
						: null,
				resourceCount: after.resourceCount,
			},
			screenshot,
		});
		process.stdout.write(`  measured ${demo}\n`);
	}

	await browser.close();

	const report = {
		generatedAt: new Date().toISOString(),
		url: args.url,
		requestedBackend: args.backend,
		headless: args.headless,
		gpu,
		env,
		window: { measuredMs: args.window, warmupMs: args.warmup },
		pages,
	};

	const jsonPath = join(outDir, "measurement.json");
	writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

	const header =
		"| page | backend | tier | fps | p50 | p95 | p99 | max | >16.7ms | >33.3ms | runtime fps | Δ dropped | Δ long |";
	const rule = "|---|---|---|---|---|---|---|---|---|---|---|---|---|";
	const rows = pages.map((p) => {
		const f = p.frames;
		const r = p.runtime;
		return `| ${p.demo} | ${p.backend} | ${p.tier ?? "-"} | ${f.fpsFromMean} | ${f.p50Ms} | ${f.p95Ms} | ${f.p99Ms} | ${f.maxMs} | ${f.over16_7Ms} | ${f.over33_3Ms} | ${r.fps ?? "-"} | ${r.droppedFramesDelta ?? "-"} | ${r.longFramesDelta ?? "-"} |`;
	});

	const md = [
		`# Real-device measurement`,
		"",
		`- Generated: ${report.generatedAt}`,
		`- URL: ${args.url}${args.headless ? " (headless — expect software rendering)" : ""}`,
		`- GPU bucket: \`${bucket}\``,
		`- WebGL renderer: ${gpu.glRenderer ?? "n/a"}`,
		`- WebGPU adapter: ${gpu.adapter ?? "n/a"}`,
		`- Viewport: 1440x1000 @${env.devicePixelRatio}x, screen ${env.screen}`,
		`- Requested backend: ${args.backend ?? "auto (WebGPU first)"}`,
		`- Measured window: ${args.window}ms after ${args.warmup}ms warmup`,
		"",
		"Frame intervals are sampled by the harness itself, not read from the runtime.",
		"`Δ dropped` / `Δ long` are the runtime's own cumulative counters, differenced across the window.",
		"",
		header,
		rule,
		...rows,
		"",
	].join("\n");

	const mdPath = join(outDir, "measurement.md");
	writeFileSync(mdPath, md, "utf8");

	console.log(`\nGPU bucket: ${bucket}`);
	console.log(`  ${gpu.glRenderer ?? "n/a"}`);
	console.log(`  webgpu adapter: ${gpu.adapter ?? "n/a"}`);
	console.log(`\n${md}`);
	console.log(`wrote ${jsonPath}`);
	console.log(`wrote ${mdPath}`);
	console.log(`wrote ${pages.length} screenshots to ${outDir}`);
}

await main();
