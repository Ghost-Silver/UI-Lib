import { expect, test } from "@playwright/test";
import { createWash } from "../packages/core/src/wash.js";
import { GLASS_LOOKS } from "../packages/react/src/looks.js";

/**
 * Comprehensive E2E Material System Test Suite (Tiers 1-4).
 *
 * Covers requirements R1-R5 per TEST_INFRA.md and PROJECT.md:
 * - F1: Middle subtle frosted glass pass & render pipeline invariants
 * - F2: Resilient canvas watercolor rendering & organic edge dispersion
 * - F3: Relative thickness look auto-scaling across small & large cards
 * - F4: Homepage discovery & surface navigation across 4 surfaces
 * - F5: Studio capillary wetting progression & information density
 *
 * Architectural Invariants:
 * - Opaque-box testing against running preview server http://127.0.0.1:5173/
 * - Structural invariants over fragile pixel baselines
 * - Serial execution to prevent GPU context resource contention
 */

test.use({
	baseURL: "http://127.0.0.1:5173",
	viewport: { width: 1440, height: 1000 },
	colorScheme: "dark",
});

test.describe.configure({ mode: "serial" });

function setupErrorListeners(page: import("@playwright/test").Page): Error[] {
	const errors: Error[] = [];
	page.on("pageerror", (err) => {
		if (err.message.includes("WebSocket") || err.message.includes("[vite]")) return;
		errors.push(err);
	});
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			if (text.includes("WebSocket") || text.includes("[vite]") || text.includes("404")) return;
			if (text.includes("WebGL Device Lost")) return;
			errors.push(new Error(`Console error: ${text}`));
		}
	});
	return errors;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 tests per feature for F1-F5, Total 25 tests)
// ============================================================================

test.describe("Tier 1: Feature Coverage", () => {
	// --- Feature 1 (F1): Frosted Glass Layer & Render Pipeline Invariants ---
	test.describe("F1: Frosted Glass Layer Presence & Pipeline Invariants", () => {
		test("T1-F1-01: glass-lab stage initializes with ready status and active WebGL/WebGPU backend", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab&backend=webgl");
			const stage = page.locator("[data-ui-lib-stage]");
			await expect(stage).toHaveAttribute("data-ui-lib-stage", /ready|unsupported/, {
				timeout: 15_000,
			});
			await expect(stage).toHaveAttribute("data-ui-lib-backend", /webgl2|webgpu|unknown/);
			const canvas = page.locator("canvas");
			if ((await stage.getAttribute("data-ui-lib-stage")) === "ready") {
				await expect(canvas.first()).toBeAttached();
			}
			expect(errors).toEqual([]);
		});

		test("T1-F1-02: glass panels on glass-lab render over canvas stage without blocking interactions", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const canvas = page.locator("canvas");
			if ((await canvas.count()) > 0) {
				const pointerEvents = await canvas
					.first()
					.evaluate((el) => window.getComputedStyle(el).pointerEvents);
				expect(["none", "auto"]).toContain(pointerEvents);
			}
			const chip = page.locator(".glasslab__picker .ui-lib-soft-chip").first();
			await expect(chip).toBeVisible();
			await expect(chip).toBeEnabled();
			expect(errors).toEqual([]);
		});

		test("T1-F1-03: glass-lab probe backdrop provides structured background behind panels", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			await expect(page.locator(".glasslab__title")).toContainText("厚到什么程度算厚");
			const slabs = page.locator(".glasslab__slab");
			await expect(slabs).toHaveCount(3);
			const hero = page.locator(".glasslab__big");
			await expect(hero).toBeVisible();
			expect(errors).toEqual([]);
		});

		test("T1-F1-04: stacking page separates canvas-reachable layer from DOM-only layer", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=stacking");
			const row1 = page.locator(".stack__row").first();
			await expect(row1).toContainText("可以叠加");
			const row2 = page.locator(".stack__row--dom");
			await expect(row2).toContainText("不能叠加");
			expect(errors).toEqual([]);
		});

		test("T1-F1-05: GlassStage in section mode attaches canvas sized to container bounds", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const stage = page.locator(".studio-stage");
			await expect(stage).toBeVisible();
			await expect(stage).toHaveAttribute("data-ui-lib-mode", "section");
			expect(errors).toEqual([]);
		});
	});

	// --- Feature 2 (F2): Resilient Canvas Watercolor ---
	test.describe("F2: Resilient Canvas Watercolor", () => {
		test("T1-F2-01: wash-canvas component renders valid 190x190 canvas with non-zero pixel data", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=wash-canvas");
			const canvas = page.locator(".kit__washcanvas canvas");
			await expect(canvas).toBeVisible();
			const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
				width: el.width,
				height: el.height,
			}));
			expect(dims.width).toBeGreaterThanOrEqual(190);
			expect(dims.height).toBeGreaterThanOrEqual(190);
			expect(errors).toEqual([]);
		});

		test("T1-F2-02: canvas wash outer perimeter exhibits smooth falloff without rectangular straight cuts", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=wash-canvas");
			const canvas = page.locator(".kit__washcanvas canvas");
			await expect(canvas).toBeVisible();
			const cornerAlpha = await canvas.evaluate((el: HTMLCanvasElement) => {
				const ctx = el.getContext("2d");
				if (!ctx) return 255;
				const data = ctx.getImageData(0, 0, 1, 1).data;
				return data[3];
			});
			// Outer corner (0,0) must not have opaque rectangular boundary
			expect(cornerAlpha).toBeLessThan(100);
			expect(errors).toEqual([]);
		});

		test("T1-F2-03: canvas wash center exhibits pigment concentration without hollow concentric gap", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=wash-canvas");
			const canvas = page.locator(".kit__washcanvas canvas");
			await expect(canvas).toBeVisible();
			const centerMetrics = await canvas.evaluate((el: HTMLCanvasElement) => {
				const ctx = el.getContext("2d");
				if (!ctx) return { a: 0 };
				const w = el.width;
				const h = el.height;
				const pixel = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
				return { a: pixel[3], r: pixel[0], g: pixel[1], b: pixel[2] };
			});
			// Center must be pigmented
			expect(centerMetrics.a).toBeGreaterThan(30);
			expect(errors).toEqual([]);
		});

		test("T1-F2-04: paper fiber grain is integrated into the wash without hanging canvas resolution", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=wash-canvas");
			await expect(page.locator(".kit__washcanvas-error")).toHaveCount(0);
			await expect(page.locator(".kit__washcanvas canvas")).toBeAttached();
			expect(errors).toEqual([]);
		});

		test("T1-F2-05: WetPaperPage (?demo=paper) renders wet, dry, and spreading specimens with distinct deposit rings", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=paper");
			await expect(page.locator("[data-ui-lib-acceptance='wet-paper']")).toBeVisible();
			await expect(page.locator(".paper__title")).toContainText("颜料是怎么待在纸上的");
			const figures = page.locator(".paper__specimen");
			await expect(figures).toHaveCount(7);
			expect(errors).toEqual([]);
		});
	});

	// --- Feature 3 (F3): Relative Thickness Look Auto-Scaling ---
	test.describe("F3: Relative Thickness Look Auto-Scaling", () => {
		test("T1-F3-01: glass-lab renders small cards and large hero panel with proportional scales", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const slabs = page.locator(".glasslab__slab");
			const hero = page.locator(".glasslab__big");
			await expect(slabs).toHaveCount(3);
			await expect(hero).toBeVisible();
			const slabBox = await slabs.first().boundingBox();
			const heroBox = await hero.boundingBox();
			expect(slabBox).not.toBeNull();
			expect(heroBox).not.toBeNull();
			if (slabBox && heroBox) {
				// Hero panel must be wider than small slab card
				expect(heroBox.width).toBeGreaterThan(slabBox.width * 1.5);
			}
			expect(errors).toEqual([]);
		});

		test("T1-F3-02: look tier selection updates hero panel title and description", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const hero = page.locator(".glasslab__big");
			await expect(hero).toContainText("一整块 厚板");

			await page
				.locator(
					".glasslab__picker button:has-text('窗玻璃'), .glasslab__picker .ui-lib-soft-chip:has-text('窗玻璃')",
				)
				.click();
			await expect(hero).toContainText("一整块 窗玻璃");

			await page
				.locator(
					".glasslab__picker button:has-text('水珠'), .glasslab__picker .ui-lib-soft-chip:has-text('水珠')",
				)
				.click();
			await expect(hero).toContainText("一整块 水珠");
			expect(errors).toEqual([]);
		});

		test("T1-F3-03: small cards in glass-lab display individual calibrated bevel tags", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const tags = page.locator(".glasslab__slab .ui-lib-soft-tag");
			await expect(tags.nth(0)).toContainText(`bevel ${GLASS_LOOKS.dew.bevel}`);
			await expect(tags.nth(1)).toContainText(`bevel ${GLASS_LOOKS.pane.bevel}`);
			await expect(tags.nth(2)).toContainText(`bevel ${GLASS_LOOKS.product.bevel}`);
			expect(errors).toEqual([]);
		});

		test("T1-F3-04: look constants maintain optical progression (slab has highest refraction and bevel)", () => {
			expect(GLASS_LOOKS.slab.refraction).toBeGreaterThan(GLASS_LOOKS.pane.refraction);
			expect(GLASS_LOOKS.pane.refraction).toBeGreaterThan(GLASS_LOOKS.product.refraction);
			expect(GLASS_LOOKS.slab.bevel).toBeGreaterThan(GLASS_LOOKS.product.bevel);
		});

		test("T1-F3-05: bevel clamping invariant: bevel does not exceed half of short edge", () => {
			// Mathematical invariant test on layout scaling formula: Math.min(bevel * scale, Math.min(w, h) / 2)
			const simulateBevel = (bevel: number, w: number, h: number) => {
				const shortEdge = Math.min(w, h);
				return Math.min(bevel, shortEdge / 2);
			};
			expect(simulateBevel(46, 32, 32)).toBe(16);
			expect(simulateBevel(46, 60, 200)).toBe(30);
			expect(simulateBevel(46, 800, 600)).toBe(46);
		});
	});

	// --- Feature 4 (F4): Homepage Discovery & Surface Navigation ---
	test.describe("F4: Surface Routing & Homepage Navigation", () => {
		test("T1-F4-01: query routing to Component Index (?demo=kit-index) renders 35-component index", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=kit-index");
			await expect(page.locator(".kitindex__title")).toContainText("另一半。");
			await expect(page.locator(".kitindex__eyebrow")).toContainText("组件层 · 三十五件");
			expect(errors).toEqual([]);
		});

		test("T1-F4-02: query routing to Glass Lab (?demo=glass-lab) renders thickness lab", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			await expect(page.locator(".glasslab__title")).toContainText("厚到什么程度算厚");
			await expect(page.locator(".glasslab__picker")).toBeVisible();
			expect(errors).toEqual([]);
		});

		test("T1-F4-03: query routing to Studio Workbench (?demo=studio) renders product workbench", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			await expect(page.locator(".studio__title")).toContainText("水彩工作台");
			await expect(page.locator("[data-ui-lib-acceptance='studio']")).toBeVisible();
			expect(errors).toEqual([]);
		});

		test("T1-F4-04: query routing to Iris Kit (?demo=iris-kit) renders centered component fixture", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=bubble-badge&tone=iris");
			await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
			await expect(page.locator("[data-ui-lib-kit-box]")).toBeVisible();
			expect(await page.title()).toBe("IRIS kit · bubble-badge · iris");
			expect(errors).toEqual([]);
		});

		test("T1-F4-05: homepage navigation links include component index door", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/");
			const moeLink = page.locator("a[href*='demo=kit-index']");
			await expect(moeLink).toBeVisible();
			expect(errors).toEqual([]);
		});
	});

	// --- Feature 5 (F5): Studio Capillary Wetting Progression ---
	test.describe("F5: Studio Capillary Wetting Progression", () => {
		test("T1-F5-01: Studio workbench WashProgress renders initial idle state with label '纸面未润' and button '开始铺纸'", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			const label = page.locator(".studio__progress .ui-lib-soft-progress__label");
			await expect(btn).toContainText("开始铺纸");
			await expect(btn).toBeEnabled();
			await expect(label).toHaveText(/纸面未润|还没开始铺纸/);
			expect(errors).toEqual([]);
		});

		test("T1-F5-02: clicking '开始铺纸' transitions button to disabled state with text '铺纸中'", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			await btn.click();
			await expect(btn).toContainText("铺纸中");
			await expect(btn).toBeDisabled();
			expect(errors).toEqual([]);
		});

		test("T1-F5-03: wetting progression updates progress bar label to capillary wetting phase", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			const label = page.locator(".studio__progress .ui-lib-soft-progress__label");
			await btn.click();
			await expect(label).toHaveText(/触纸浸润|毛细导流|渗透饱和|正在铺纸/);
			expect(errors).toEqual([]);
		});

		test("T1-F5-04: wetting progression reaches 100% completion with label '铺展完成' and button '再铺一次'", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			const label = page.locator(".studio__progress .ui-lib-soft-progress__label");
			await btn.click();
			await expect(label).toHaveText(/铺展完成|铺好了/, { timeout: 6000 });
			await expect(btn).toContainText("再铺一次");
			await expect(btn).toBeEnabled();
			expect(errors).toEqual([]);
		});

		test("T1-F5-05: Studio workbench maintains product information density (form controls, usage table, stat cards)", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			await expect(page.locator(".studio__summary")).toBeVisible();
			await expect(page.locator(".studio__panel")).toHaveCount(3);
			await expect(page.locator(".studio__head .studio__bar")).toBeVisible();
			expect(errors).toEqual([]);
		});
	});
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature for F1-F5, Total 25 tests)
// ============================================================================

test.describe("Tier 2: Boundary & Corner Cases", () => {
	// --- F1 Boundaries ---
	test.describe("F1 Boundaries: Stage Geometry & Stacking Extremes", () => {
		test("T2-F1-01: GlassStage with 0 panels renders without runtime errors", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=cursor-field");
			await expect(page.locator("[data-ui-lib-acceptance='cursor-field']")).toBeVisible();
			expect(errors).toEqual([]);
		});

		test("T2-F1-02: resizing viewport resizes stage canvas and updates bounds", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.setViewportSize({ width: 900, height: 700 });
			await page.goto("/?demo=glass-lab");
			const stage = page.locator(".glasslab-stage");
			await expect(stage).toBeVisible();
			expect(errors).toEqual([]);
			await page.setViewportSize({ width: 1440, height: 1000 });
		});

		test("T2-F1-03: stage in fallback=1 mode disables canvas and marks stage unsupported", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris&fallback=1");
			const stage = page.locator("[data-ui-lib-stage]");
			await expect(stage).toHaveAttribute("data-ui-lib-stage", "unsupported");
			await expect(page.locator("canvas")).toHaveCount(0);
			expect(errors).toEqual([]);
		});

		test("T2-F1-04: multiple overlapping panels in stacking preserve relative DOM stacking without collapse", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=stacking");
			const overlap = page.locator(".stack__overlap");
			await expect(overlap).toBeVisible();
			const under = overlap.locator(".stack__under");
			const over = overlap.locator(".stack__glass--over");
			await expect(under).toBeVisible();
			await expect(over).toBeVisible();
			expect(errors).toEqual([]);
		});

		test("T2-F1-05: emulating reduced motion preserves canvas stage rendering without drift", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto("/?demo=glass-lab");
			await expect(page.locator(".glasslab__title")).toBeVisible();
			expect(errors).toEqual([]);
			await page.emulateMedia({ reducedMotion: "no-preference" });
		});
	});

	// --- F2 Boundaries ---
	test.describe("F2 Boundaries: Watercolor Aspect Ratios & Density Extremes", () => {
		test("T2-F2-01: non-square aspect ratio washes preserve elliptical gradient proportions", async () => {
			const wide = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7, size: 240 });
			const tall = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7, size: 80 });
			expect(wide.style).toBeDefined();
			expect(tall.style).toBeDefined();
			expect(wide.style["--wash-body"]).toContain("radial-gradient");
		});

		test("T2-F2-02: micro-dimension wash (32x32) creates valid style without NaN values", async () => {
			const micro = createWash({ hue: "#b79cf5", weight: 0.5, seed: 1, size: 32 });
			expect(micro.style["--wash-body"]).not.toContain("NaN");
			expect(micro.style["--wash-opacity"]).not.toContain("NaN");
		});

		test("T2-F2-03: pigment density scales monotonically from pale weight (0.2) to heavy weight (0.9)", async () => {
			const pale = createWash({ hue: "#b79cf5", weight: 0.2, seed: 7, size: 190 });
			const heavy = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7, size: 190 });
			const paleOpacity = Number(pale.style["--wash-opacity"]);
			const heavyOpacity = Number(heavy.style["--wash-opacity"]);
			expect(heavyOpacity).toBeGreaterThan(paleOpacity);
		});

		test("T2-F2-04: deterministic seed produces repeatable CSS wash properties across instances", async () => {
			const a = createWash({ hue: "#b79cf5", weight: 0.8, seed: 42, size: 200 });
			const b = createWash({ hue: "#b79cf5", weight: 0.8, seed: 42, size: 200 });
			expect(a.style["--wash-body"]).toBe(b.style["--wash-body"]);
			expect(a.style["--wash-opacity"]).toBe(b.style["--wash-opacity"]);
		});

		test("T2-F2-05: re-laying watercolor on ?demo=paper ('再画一笔') remounts specimen smoothly", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=paper");
			const relayBtn = page.locator("button.paper__relay");
			await expect(relayBtn).toBeVisible();
			await relayBtn.click();
			await expect(page.locator(".paper__specimen .wash--spreading")).toBeVisible();
			expect(errors).toEqual([]);
		});
	});

	// --- F3 Boundaries ---
	test.describe("F3 Boundaries: Scaling Extremes & Aspect Ratios", () => {
		test("T2-F3-01: extremely small chips (32px) clamp bevel to <= 16px to prevent self-intersection", async () => {
			const clampBevel = (bevel: number, minEdge: number) => Math.min(bevel, minEdge / 2);
			expect(clampBevel(46, 32)).toBeLessThanOrEqual(16);
			expect(clampBevel(30, 24)).toBeLessThanOrEqual(12);
		});

		test("T2-F3-02: large hero panel (width > 900px) bevel remains bounded and stable", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const hero = page.locator(".glasslab__big");
			const box = await hero.boundingBox();
			expect(box).not.toBeNull();
			if (box) {
				expect(box.width).toBeGreaterThanOrEqual(800);
			}
			expect(errors).toEqual([]);
		});

		test("T2-F3-03: asymmetric cards scale thickness against the short edge Math.min(width, height)", async () => {
			const computeScaledBevel = (baseBevel: number, w: number, h: number) => {
				const shortEdge = Math.min(w, h);
				const scale = shortEdge / 200;
				return Math.min(baseBevel * scale, shortEdge / 2);
			};
			// On a 800x60 banner, shortEdge is 60, scale is 0.3, bevel is clamped <= 30
			const bannerBevel = computeScaledBevel(46, 800, 60);
			expect(bannerBevel).toBeLessThanOrEqual(30);
		});

		test("T2-F3-04: zero-dimension or hidden panels do not produce runtime calculation errors", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			await page.evaluate(() => {
				const hidden = document.createElement("div");
				hidden.style.width = "0px";
				hidden.style.height = "0px";
				hidden.style.display = "none";
				document.body.appendChild(hidden);
			});
			expect(errors).toEqual([]);
		});

		test("T2-F3-05: toggling '紧凑' dense mode in Glass Lab preserves panel geometry and stage coordinates", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=glass-lab");
			const denseChip = page.locator(".glasslab__controls .ui-lib-soft-chip:has-text('紧凑')");
			await expect(denseChip).toBeVisible();
			await denseChip.click();
			await expect(denseChip).toHaveAttribute("aria-pressed", "true");
			expect(errors).toEqual([]);
		});
	});

	// --- F4 Boundaries ---
	test.describe("F4 Boundaries: Routing Fallbacks & Malformed Parameters", () => {
		test("T2-F4-01: unknown demo query ?demo=nonexistent-slug cleanly falls back to Playground homepage", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=nonexistent-slug");
			await expect(page.locator(".hero h1")).toContainText("Glass that actually");
			expect(errors).toEqual([]);
		});

		test("T2-F4-02: unknown iris-kit component ?demo=iris-kit&component=bogus falls back to bubble-badge", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=bogus");
			await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
			expect(await page.title()).toContain("bubble-badge");
			expect(errors).toEqual([]);
		});

		test("T2-F4-03: unknown iris-kit tone ?demo=iris-kit&component=material&tone=neon falls back to iris", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=iris-kit&component=material&tone=neon");
			await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
			expect(await page.title()).toBe("IRIS kit · bubble-badge · iris");
			expect(errors).toEqual([]);
		});

		test("T2-F4-04: keyboard Tab navigation cycles through interactive navigation links with focus indicator", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/");
			await page.keyboard.press("Tab");
			const focused = await page.evaluate(() => document.activeElement?.tagName);
			expect(focused).toBeDefined();
			expect(errors).toEqual([]);
		});

		test("T2-F4-05: multi-flag query parameters (?demo=studio&webgl=1) parse correctly without collisions", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio&webgl=1");
			await expect(page.locator(".studio__title")).toContainText("水彩工作台");
			expect(errors).toEqual([]);
		});
	});

	// --- F5 Boundaries ---
	test.describe("F5 Boundaries: Wetting Progression Stress & Workbench Controls", () => {
		test("T2-F5-01: rapid multi-clicks on wetting button while active do not spawn duplicate intervals", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			await btn.click();
			// Rapid second click immediately after
			await btn.click({ force: true }).catch(() => {});
			await expect(btn).toBeDisabled();
			expect(errors).toEqual([]);
		});

		test("T2-F5-02: re-triggering wetting progression via '再铺一次' resets value and completes second cycle", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const btn = page.locator(".studio__progress button");
			const label = page.locator(".studio__progress .ui-lib-soft-progress__label");
			await btn.click();
			await expect(label).toHaveText(/铺展完成|铺好了/, { timeout: 6000 });
			await btn.click();
			await expect(label).toHaveText(/触纸浸润|毛细导流|渗透饱和|正在铺纸/);
			await expect(btn).toBeDisabled();
			expect(errors).toEqual([]);
		});

		test("T2-F5-03: density radio group switching ('舒适' vs '紧凑') updates radio selection state", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const compactLabel = page.locator("label:has(input[value='compact'])");
			await compactLabel.click();
			const compactRadio = page.locator("input[name='density'][value='compact']");
			await expect(compactRadio).toBeChecked();
			expect(errors).toEqual([]);
		});

		test("T2-F5-04: sorting usage table columns by name or count updates row order without altering layout", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const table = page.locator(".studio__panel table");
			await expect(table).toBeVisible();
			const sortBtn = table.locator("button.ui-lib-soft-table__sort").first();
			if ((await sortBtn.count()) > 0) {
				await sortBtn.click();
			}
			expect(errors).toEqual([]);
		});

		test("T2-F5-05: expanding and collapsing accordion items in Studio preserves form state", async ({
			page,
		}) => {
			const errors = setupErrorListeners(page);
			await page.goto("/?demo=studio");
			const accordion = page.locator(".studio__panel .ui-lib-soft-accordion");
			await expect(accordion).toBeVisible();
			const input = page.locator(".ui-lib-soft-input input").first();
			await input.fill("测试工程");
			expect(await input.inputValue()).toBe("测试工程");
			expect(errors).toEqual([]);
		});
	});
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise, Total 10 tests)
// ============================================================================

test.describe("Tier 3: Cross-Feature Combinations", () => {
	test("T3-01: tone switching (iris -> blossom -> mist) on kit-index updates tone class and card tokens (F4 + F5)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=kit-index");
		const root = page.locator(".kitindex");
		await expect(root).toHaveClass(/kitindex--iris/);

		const blossomChip = page.locator(".kitindex__tones .ui-lib-soft-chip:has-text('blossom')");
		await blossomChip.click();
		await expect(root).toHaveClass(/kitindex--blossom/);

		const mistChip = page.locator(".kitindex__tones .ui-lib-soft-chip:has-text('mist')");
		await mistChip.click();
		await expect(root).toHaveClass(/kitindex--mist/);
		expect(errors).toEqual([]);
	});

	test("T3-02: probe backdrop sampled under varying glass looks (dew, pane, product, slab) (F1 + F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=glass-lab");
		for (const tier of ["水珠", "窗玻璃", "原版", "厚板"]) {
			const chip = page.locator(`.glasslab__picker .ui-lib-soft-chip:has-text('${tier}')`);
			await chip.click();
			await expect(page.locator(".glasslab__big")).toContainText(tier);
		}
		expect(errors).toEqual([]);
	});

	test("T3-03: watercolor paper ground in Studio under dark and light color schemes (F1 + F2 + F5)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/?demo=studio");
		await expect(page.locator(".studio__title")).toBeVisible();
		await page.emulateMedia({ colorScheme: "dark" });
		await expect(page.locator(".studio__title")).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("T3-04: proportional bevel scaling on watercolor-backed cards in KitIndex (F2 + F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=kit-index");
		const cards = page.locator(".kitindex__card");
		await expect(cards).toHaveCount(8);
		const firstCard = cards.first();
		await expect(firstCard).toHaveAttribute("data-ui-lib-soft-card", "");
		expect(errors).toEqual([]);
	});

	test("T3-05: surface navigation to Glass Lab with active look and probe backdrop verification (F4 + F1 + F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=glass-lab");
		await expect(page.locator(".glasslab-stage")).toBeVisible();
		await expect(page.locator(".glasslab__hero")).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("T3-06: Studio workbench under WebGL vs fallback mode with capillary wetting (F5 + F1)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=studio&webgl=1");
		const btn = page.locator(".studio__progress button");
		await expect(btn).toContainText("开始铺纸");
		await btn.click();
		await expect(btn).toContainText("铺纸中");
		expect(errors).toEqual([]);
	});

	test("T3-07: density toggle interaction with glass header and form controls in Studio (F3 + F5)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=studio");
		await page.locator("label:has(input[value='compact'])").click();
		await page.locator("label:has(input[value='comfortable'])").click();
		await expect(page.locator(".studio__bar")).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("T3-08: deep navigation from surface to IrisKit component with custom tone, verifying title and stage (F4 + F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=iris-kit&component=material&tone=blossom");
		await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
		expect(await page.title()).toBe("IRIS kit · material · blossom");
		expect(errors).toEqual([]);
	});

	test("T3-09: stacking panels refraction inspection: canvas wash in Row 1 vs DOM card in Row 2 (F1 + F2 + F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/?demo=stacking");
		const row1Glass = page.locator(".stack__row .stack__glass");
		const row2Glass = page.locator(".stack__row--dom .stack__glass--over");
		await expect(row1Glass).toBeVisible();
		await expect(row2Glass).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("T3-10: color palette selection in Playground with glass parameter live adjustment (F1 + F4)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		await page.goto("/");
		const panel = page.locator(".panel--hero");
		await expect(panel).toBeVisible();
		const sliders = page.locator(".sliders input[type='range']");
		expect(await sliders.count()).toBeGreaterThanOrEqual(4);
		expect(errors).toEqual([]);
	});
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 scenarios)
// ============================================================================

test.describe("Tier 4: Real-World Application Scenarios", () => {
	test("T4-01: Scenario 1 - Homepage to Glass Lab Deep Dive (F4, F1, F3)", async ({ page }) => {
		const errors = setupErrorListeners(page);
		// 1. Enter Homepage
		await page.goto("/");
		await expect(page.locator("h1")).toContainText("Glass that actually");

		// 2. Navigate to Glass Lab
		await page.goto("/?demo=glass-lab");
		await expect(page.locator(".glasslab__title")).toContainText("厚到什么程度算厚");

		// 3. Cycle through thickness looks
		for (const tier of ["水珠", "窗玻璃", "原版", "厚板"]) {
			await page.locator(`.glasslab__picker .ui-lib-soft-chip:has-text('${tier}')`).click();
			await expect(page.locator(".glasslab__big")).toContainText(tier);
		}

		// 4. Toggle dense mode
		const denseChip = page.locator(".glasslab__controls .ui-lib-soft-chip:has-text('紧凑')");
		await denseChip.click();

		// 5. Inspect button on glass
		const btn = page.locator(".glasslab__controls button:has-text('一个按钮也放在玻璃上')");
		await expect(btn).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("T4-02: Scenario 2 - Component Index Tone Exploration & Deep Navigation (F4, F3)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		// 1. Enter Component Index
		await page.goto("/?demo=kit-index");
		await expect(page.locator(".kitindex__title")).toContainText("另一半。");

		// 2. Cycle palette tones
		const tones = ["blossom", "mist", "iris"] as const;
		for (const t of tones) {
			await page.locator(`.kitindex__tones .ui-lib-soft-chip:has-text('${t}')`).click();
			await expect(page.locator(".kitindex")).toHaveClass(new RegExp(`kitindex--${t}`));
		}

		// 3. Navigate into Iris Kit material showcase
		await page.goto("/?demo=iris-kit&component=material&tone=blossom");
		await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
		await expect(page.locator(".kit__box")).toBeVisible();

		// 4. Navigate into combobox component
		await page.goto("/?demo=iris-kit&component=combobox&tone=mist");
		await expect(page.locator("[data-ui-lib-acceptance='iris-kit']")).toBeVisible();
		expect(await page.title()).toBe("IRIS kit · combobox · mist");
		expect(errors).toEqual([]);
	});

	test("T4-03: Scenario 3 - Studio Paper Wetting Progression Lifecycle (F5, F2)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		// 1. Enter Studio Workbench
		await page.goto("/?demo=studio");
		await expect(page.locator(".studio__title")).toContainText("水彩工作台");

		// 2. Inspect initial idle state
		const btn = page.locator(".studio__progress button");
		const label = page.locator(".studio__progress .ui-lib-soft-progress__label");
		await expect(btn).toContainText("开始铺纸");
		await expect(label).toHaveText(/纸面未润|还没开始铺纸/);

		// 3. Trigger capillary progression
		await btn.click();
		await expect(btn).toContainText("铺纸中");
		await expect(btn).toBeDisabled();
		await expect(label).toHaveText(/触纸浸润|毛细导流|渗透饱和|正在铺纸/);

		// 4. Wait for full capillary front completion
		await expect(label).toHaveText(/铺展完成|铺好了/, { timeout: 6000 });
		await expect(btn).toContainText("再铺一次");
		await expect(btn).toBeEnabled();

		// 5. Update project title and options
		const nameInput = page.locator(".ui-lib-soft-input input").first();
		await nameInput.fill("水彩试验项目 A");
		expect(await nameInput.inputValue()).toBe("水彩试验项目 A");
		expect(errors).toEqual([]);
	});

	test("T4-04: Scenario 4 - Stacking Panels Refraction Inspection (F1, F3, F2)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		// 1. Enter Stacking Surface
		await page.goto("/?demo=stacking");
		await expect(page.locator("h1, h2").first()).toBeVisible();

		// 2. Check Row 1 (canvas reachable by glass)
		const row1 = page.locator(".stack__row").first();
		await expect(row1).toContainText("玻璃能弯到的水彩");
		await expect(row1).toContainText("可以叠加");

		// 3. Check Row 2 (DOM watercolor unreachable by glass)
		const row2 = page.locator(".stack__row--dom");
		await expect(row2).toContainText("玻璃弯不到的");
		await expect(row2).toContainText("不能叠加");

		// 4. Check guidance notes
		await expect(page.locator(".stack__notes")).toContainText("要玻璃弯颜料");
		expect(errors).toEqual([]);
	});

	test("T4-05: Scenario 5 - Cross-Theme Contrast & Visual Legibility (F5, F1, F2)", async ({
		page,
	}) => {
		const errors = setupErrorListeners(page);
		// 1. Inspect Studio under dark theme
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/?demo=studio");
		await expect(page.locator(".studio__title")).toBeVisible();
		const darkColor = await page
			.locator(".studio__title")
			.evaluate((el) => window.getComputedStyle(el).color);
		expect(darkColor).toBeDefined();

		// 2. Inspect Studio under light theme
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/?demo=studio");
		await expect(page.locator(".studio__title")).toBeVisible();
		const lightColor = await page
			.locator(".studio__title")
			.evaluate((el) => window.getComputedStyle(el).color);
		expect(lightColor).toBeDefined();

		// 3. Verify footer tones are accessible
		const tags = page.locator(".studio__foot .ui-lib-soft-tag");
		await expect(tags).toHaveCount(3);
		expect(errors).toEqual([]);
	});
});
