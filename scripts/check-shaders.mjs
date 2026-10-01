#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
/**
 * Real-device shader compilation gate.
 *
 * Serves the built playground, loads every flagship page on WebGPU and on the
 * WebGL 2 fallback, and fails when a shader or render pipeline does not
 * compile.
 *
 * Why this exists as a device check rather than a unit test: a Tint lowering
 * failure can be *adapter-specific*. `swizzle view instruction still has usages
 * after lowering` reproduced on the Metal adapter and passed on SwiftShader
 * with byte-identical WGSL, while a deliberately broken shader failed on both.
 * A headless browser picks SwiftShader, so headless CI stayed green for months
 * while the WebGPU post chain never actually ran. Nothing that runs without a
 * real GPU can substitute for this script.
 *
 * three also never calls `getCompilationInfo()`, so a failed module only shows
 * up as a Tint summary line with no source position. This patches
 * `createShaderModule` from an init script and collects the real diagnostics.
 *
 * What each row asserts, beyond "the console was quiet":
 *   - no failed shader module, no console failure pattern, no page error
 *   - no uncaptured WebGPU validation error (three opens no error scope)
 *   - on WebGPU: a device existed, a shader module was created, and at least
 *     one command buffer was submitted — a page that renders nothing is silent
 *   - `data-ui-lib-backend` / `-tier` / `-fps` hold real values, so a stage that
 *     never initialised cannot pass by reporting nothing
 *
 * Not asserted, because it is not observable from outside the page: whether a
 * render target is still bound when the frame ends. Zero submits is the closest
 * proxy, and it only catches the extreme case.
 *
 * Usage:
 *   node scripts/check-shaders.mjs                 # headed, real GPU
 *   node scripts/check-shaders.mjs --headless      # runs, but proves little
 *   node scripts/check-shaders.mjs --self-test     # is the probe actually live?
 *   node scripts/check-shaders.mjs --demos wake    # one page
 *   node scripts/check-shaders.mjs --timeout 12000 # slower machines
 *
 * Run `pnpm --filter @ui-lib/docs build` first.
 */
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const siteDir = join(root, "apps", "docs", "dist");

const DEMOS = [
	"liquid-glass",
	"product-hero",
	"scroll-cinema",
	"cursor-field",
	"aurora-flow",
	"wake",
];

/** Console text that means a shader or a pipeline did not make it to the GPU. */
const FAILURE_PATTERNS = [
	/Render pipeline creation failed/i,
	/Invalid RenderPipeline/i,
	/Invalid CommandBuffer/i,
	/swizzle view instruction still has usages/i,
	/Tint .*(error|failed)/i,
	/shader.*compilation.*fail/i,
	/Source and destination formats do not match/i,
	/Invalid value used as weak map key/i,
	/WebGPU validation/i,
];

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".woff2": "font/woff2",
	".glb": "model/gltf-binary",
};

function parseArgs(argv) {
	const options = { headless: false, demos: DEMOS, timeout: 8000 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--headless") options.headless = true;
		else if (arg === "--headed") options.headless = false;
		else if (arg === "--self-test") options.selfTest = true;
		else if (arg === "--demos")
			options.demos = String(argv[++i] ?? "")
				.split(",")
				.filter(Boolean);
		else if (arg === "--timeout") options.timeout = Number(argv[++i] ?? 8000);
		else if (arg === "--help" || arg === "-h") options.help = true;
	}
	return options;
}

function serveStatic(directory) {
	const server = createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://localhost");
		const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
		let file = join(directory, relative);
		try {
			if (statSync(file).isDirectory()) file = join(file, "index.html");
		} catch {
			file = join(directory, "index.html");
		}
		try {
			const body = readFileSync(file);
			res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
			res.end(body);
		} catch {
			res.writeHead(404).end("not found");
		}
	});
	return new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
	});
}

/**
 * Runs inside the page before any app code. Reports every shader module Dawn
 * refuses, plus the pipeline descriptors three submits, so a failure names the
 * stage instead of only the Tint summary.
 */
const PROBE = `
(() => {
  window.__shaderGate = {
    errors: [], pipelines: [], modules: 0, note: null,
    uncaptured: [], submits: 0, hasDevice: false,
  };
  if (typeof GPUDevice === "undefined") {
    window.__shaderGate.note = "no GPUDevice global";
    return;
  }

  // A pipeline that Dawn refuses is logged by three but the frame keeps
  // submitting. Device-level validation errors that nobody opened an error
  // scope for arrive here instead, which is the only way to see them.
  if (typeof GPUAdapter !== "undefined" && GPUAdapter.prototype.requestDevice) {
    const requestDevice = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = function () {
      return requestDevice.apply(this, arguments).then((device) => {
        window.__shaderGate.hasDevice = true;
        try {
          device.addEventListener("uncapturederror", (event) => {
            const error = event.error;
            window.__shaderGate.uncaptured.push(String((error && error.message) || error));
          });
        } catch (error) {
          window.__shaderGate.uncaptured.push("could not listen for uncaptured errors: " + error.message);
        }
        return device;
      });
    };
  }

  // Zero submits means no frame ever reached the GPU, which is what a render
  // target left bound at frame end would look like from out here.
  if (typeof GPUQueue !== "undefined" && GPUQueue.prototype.submit) {
    const submit = GPUQueue.prototype.submit;
    GPUQueue.prototype.submit = function () {
      window.__shaderGate.submits++;
      return submit.apply(this, arguments);
    };
  }

  const proto = GPUDevice.prototype;
  const createShaderModule = proto.createShaderModule;
  proto.createShaderModule = function (descriptor) {
    const module = createShaderModule.call(this, descriptor);
    const label = (descriptor && descriptor.label) || "(unlabelled)";
    const code = descriptor && descriptor.code ? String(descriptor.code) : "";
    window.__shaderGate.modules++;
    try {
      const info = module.getCompilationInfo();
      if (info && typeof info.then === "function") {
        info.then((result) => {
          const lines = code.split("\\n");
          for (const message of result.messages || []) {
            if (message.type !== "error") continue;
            window.__shaderGate.errors.push({
              label,
              line: message.lineNum,
              message: message.message,
              source: lines[message.lineNum - 1] || null,
            });
          }
        }).catch(() => {});
      }
    } catch (error) {
      window.__shaderGate.errors.push({ label, message: "getCompilationInfo threw: " + error.message });
    }
    return module;
  };
  for (const name of ["createRenderPipeline", "createRenderPipelineAsync"]) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    proto[name] = function (descriptor) {
      window.__shaderGate.pipelines.push((descriptor && descriptor.label) || "(unlabelled)");
      return original.apply(this, arguments);
    };
  }
})();
`;

/**
 * Proves the probe is not blind. A green run only means something if the same
 * instrumentation reports red when a shader is broken, so this feeds it a module
 * Tint cannot parse, a validation error nobody scopes, and a real submit.
 */
async function selfTest(context, origin) {
	const page = await context.newPage();
	await page.addInitScript(PROBE);
	await page.goto(origin, { waitUntil: "load" });
	const seen = await page.evaluate(async () => {
		const gate = window.__shaderGate;
		if (typeof navigator === "undefined" || !navigator.gpu)
			return { skipped: "navigator.gpu is absent" };
		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) return { skipped: "requestAdapter() returned null" };
		const device = await adapter.requestDevice();

		// 1. A module Tint cannot parse: must land in `errors` via getCompilationInfo.
		device.createShaderModule({
			label: "self-test:bad-wgsl",
			code: "fn main( -> { nonsense }",
		});
		// 2. A validation error with no error scope open: must land in `uncaptured`.
		try {
			device.createBuffer({ label: "self-test:bad-buffer", size: 0 });
		} catch {
			/* synchronous throws are also fine, the event is what we assert */
		}
		// 3. A real submit: must increment the counter.
		device.queue.submit([device.createCommandEncoder().finish()]);

		await new Promise((resolve) => setTimeout(resolve, 600));
		return {
			errors: gate.errors.length,
			uncaptured: gate.uncaptured.slice(0, 3),
			submits: gate.submits,
			hasDevice: gate.hasDevice,
		};
	});
	await page.close();

	if (seen.skipped) return { ok: true, skipped: seen.skipped };

	const problems = [];
	if (!seen.hasDevice) problems.push("requestDevice() was not observed");
	if (seen.errors < 1) problems.push("a module with invalid WGSL produced no recorded error");
	if (seen.uncaptured.length < 1)
		problems.push("an out-of-scope validation error produced no uncaptured error");
	if (seen.submits < 1) problems.push("queue.submit() was not counted");

	return { ok: problems.length === 0, problems, seen };
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
		return 0;
	}

	try {
		statSync(join(siteDir, "index.html"));
	} catch {
		console.error(
			`check-shaders: ${siteDir} is missing — run \`pnpm --filter @ui-lib/docs build\` first.\n`,
		);
		return 1;
	}

	const { server, port } = await serveStatic(siteDir);
	const origin = `http://127.0.0.1:${port}`;

	const browser = await chromium.launch({ headless: options.headless });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		colorScheme: "dark",
	});

	if (options.headless) {
		console.warn(
			"check-shaders: running headless. Headless Chromium uses the SwiftShader adapter, and the\n" +
				"shader bug this gate was written for only reproduced on Metal — a pass here is not evidence.\n",
		);
	}

	if (options.selfTest) {
		const result = await selfTest(context, origin);
		await browser.close();
		server.close();
		if (result.skipped) {
			console.log(`\ncheck-shaders --self-test: skipped — ${result.skipped}\n`);
			return 0;
		}
		if (!result.ok) {
			console.error("\ncheck-shaders --self-test: the probe is blind\n");
			for (const problem of result.problems) console.error(`  ${problem}`);
			console.error(`\n  observed: ${JSON.stringify(result.seen)}\n`);
			return 1;
		}
		console.log(
			`\ncheck-shaders --self-test: probe is live — ${result.seen.errors} shader error(s), ` +
				`${result.seen.uncaptured.length} uncaptured error(s), ${result.seen.submits} submit(s) recorded\n`,
		);
		return 0;
	}

	// One probe page decides whether this machine can run the WebGPU rows at all.
	const probePage = await context.newPage();
	await probePage.goto(origin, { waitUntil: "load" });
	const adapter = await probePage.evaluate(async () => {
		if (typeof navigator === "undefined" || !navigator.gpu)
			return { ok: false, why: "navigator.gpu is absent" };
		try {
			const found = await navigator.gpu.requestAdapter();
			if (!found) return { ok: false, why: "requestAdapter() returned null" };
			const info =
				found.info ?? (found.requestAdapterInfo ? await found.requestAdapterInfo() : null);
			return {
				ok: true,
				name:
					[info?.vendor, info?.architecture, info?.description].filter(Boolean).join(" ") ||
					"unknown adapter",
			};
		} catch (error) {
			return { ok: false, why: `requestAdapter() threw: ${error.message}` };
		}
	});
	await probePage.close();

	const backends = [];
	if (adapter.ok)
		backends.push({ id: "webgpu", label: `WebGPU (${adapter.name})`, suffix: "" });
	else {
		console.warn(`check-shaders: skipping WebGPU rows — ${adapter.why}\n`);
	}
	backends.push({ id: "webgl2", label: "WebGL 2", suffix: "&backend=webgl" });

	const failures = [];
	const rows = [];

	for (const backend of backends) {
		for (const demo of options.demos) {
			const page = await context.newPage();
			await page.addInitScript(PROBE);

			const consoleLines = [];
			page.on("console", (message) =>
				consoleLines.push(`[${message.type()}] ${message.text()}`),
			);
			page.on("pageerror", (error) => consoleLines.push(`[pageerror] ${error.message}`));

			const url = `${origin}/?demo=${demo}${backend.suffix}`;
			try {
				await page.goto(url, { waitUntil: "load" });
				await page.waitForSelector("[data-ui-lib-backend]", { timeout: options.timeout });
				await page.waitForTimeout(options.timeout);
			} catch (error) {
				failures.push(
					`${backend.id}/${demo}: page never produced a stage — ${error.message.split("\n")[0]}`,
				);
				rows.push({ backend: backend.id, demo, status: "no-stage", detail: "" });
				await page.close();
				continue;
			}

			const report = await page.evaluate(() => {
				const gate = window.__shaderGate ?? { errors: [], pipelines: [], modules: 0 };
				const stage = document.querySelector("[data-ui-lib-backend]");
				return {
					errors: gate.errors,
					pipelineCount: gate.pipelines.length,
					moduleCount: gate.modules,
					note: gate.note ?? null,
					uncaptured: gate.uncaptured ?? [],
					submits: gate.submits ?? 0,
					hasDevice: gate.hasDevice ?? false,
					backend: stage?.getAttribute("data-ui-lib-backend") ?? null,
					tier: stage?.getAttribute("data-ui-lib-tier") ?? null,
					fps: stage?.getAttribute("data-ui-lib-fps") ?? null,
				};
			});
			await page.close();

			const matched = consoleLines.filter(
				(line) =>
					FAILURE_PATTERNS.some((pattern) => pattern.test(line)) &&
					!/Failed to load resource/i.test(line),
			);
			const pageErrors = consoleLines.filter((line) => line.startsWith("[pageerror]"));

			// The stage attributes are the only observable claim the app makes about
			// itself. Check they hold real values rather than a placeholder, so a
			// page that renders nothing cannot pass by staying quiet.
			const tier = Number.parseInt(report.tier ?? "", 10);
			const fps = Number.parseFloat(report.fps ?? "");
			const attributes = [];
			if (!Number.isInteger(tier) || tier < 1)
				attributes.push(`tier=${report.tier ?? "missing"}`);
			if (!Number.isFinite(fps) || fps <= 0) attributes.push(`fps=${report.fps ?? "missing"}`);

			const isWebGpu = backend.id === "webgpu";
			const activity = [];
			if (isWebGpu && report.note) activity.push(report.note);
			if (isWebGpu && !report.hasDevice) activity.push("no GPUDevice was ever created");
			if (isWebGpu && report.moduleCount === 0) activity.push("no shader module was created");
			if (isWebGpu && report.submits === 0) activity.push("no command buffer was submitted");

			const detail = [
				report.errors.length > 0 ? `${report.errors.length} shader error(s)` : "",
				matched.length > 0 ? `${matched.length} console failure(s)` : "",
				report.uncaptured.length > 0
					? `${report.uncaptured.length} uncaptured GPU error(s)`
					: "",
				pageErrors.length > 0 ? `${pageErrors.length} page error(s)` : "",
				...activity,
				...attributes,
				report.backend !== backend.id ? `backend=${report.backend ?? "unknown"}` : "",
			]
				.filter(Boolean)
				.join(", ");

			const ok = detail === "";
			rows.push({
				backend: backend.id,
				demo,
				status: ok ? "ok" : "fail",
				detail: ok
					? [
							`${report.moduleCount} modules`,
							`${report.pipelineCount} pipelines`,
							`tier ${tier}`,
							`${fps.toFixed(1)} fps`,
							isWebGpu ? `${report.submits} submits` : "",
						]
							.filter(Boolean)
							.join(", ")
					: detail,
			});

			if (!ok) {
				failures.push(`${backend.id}/${demo}: ${detail}`);
				for (const error of report.errors.slice(0, 4)) {
					failures.push(`    shader "${error.label}" line ${error.line}: ${error.message}`);
					if (error.source) failures.push(`      ${error.source.trim().slice(0, 200)}`);
				}
				for (const message of report.uncaptured.slice(0, 4)) {
					failures.push(`    uncaptured GPU error: ${message.slice(0, 240)}`);
				}
				for (const line of [...matched, ...pageErrors].slice(0, 6))
					failures.push(`    ${line.slice(0, 240)}`);
			}
		}
	}

	await browser.close();
	server.close();

	console.log("\nReal-device shader compilation\n");
	console.log(`  ${"backend".padEnd(8)} ${"demo".padEnd(16)} ${"result".padEnd(6)} detail`);
	console.log(`  ${"-".repeat(96)}`);
	for (const row of rows) {
		const mark = row.status === "ok" ? "ok" : row.status === "fail" ? "FAIL" : "????";
		console.log(
			`  ${row.backend.padEnd(8)} ${row.demo.padEnd(16)} ${mark.padEnd(6)} ${row.detail}`,
		);
	}

	if (failures.length > 0) {
		console.error(`\ncheck-shaders: ${failures.length} problem line(s)\n`);
		for (const failure of failures) console.error(`  ${failure}`);
		console.error("");
		return 1;
	}

	const total = rows.length;
	console.log(`\ncheck-shaders: ${total} page(s) compiled clean\n`);
	if (!adapter.ok) {
		console.log(`  WebGPU rows skipped (${adapter.why}); the WebGL 2 rows still ran.\n`);
	}
	return 0;
}

process.exit(await main());
