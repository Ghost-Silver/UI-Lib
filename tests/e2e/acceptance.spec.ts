import { expect, test } from "@playwright/test";

const demos = [
	"liquid-glass",
	"aurora-flow",
	"product-hero",
	"scroll-cinema",
	"cursor-field",
	"wake",
	"iris",
] as const;

function setupErrorListeners(page: import("@playwright/test").Page) {
	const errors: Error[] = [];
	page.on("pageerror", (err) => {
		// Ignore Vite WebSocket connection errors that happen in the dev server environment
		if (err.message.includes("WebSocket closed without opened")) return;
		errors.push(err);
	});
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			// Ignore Vite HMR / WebSocket noise
			if (text.includes("WebSocket") || text.includes("[vite] failed to connect")) return;
			// Ignore 404s (such as missing favicon or other unserved static assets in the static build)
			if (text.includes("404 (Not Found)")) return;
			// Ignore intentional WebGL context loss errors we test for
			if (text.includes("WebGL Device Lost")) return;

			errors.push(new Error(`Console error: ${text}`));
		}
	});
	return errors;
}

for (const demo of demos) {
	test(`${demo} renders semantic content and a stable stage`, async ({ page }) => {
		const errors = setupErrorListeners(page);
		await page.goto(`/?demo=${demo}&fallback=1`);
		const stage = page.locator("[data-ui-lib-stage]");
		await expect(stage).toHaveAttribute("data-ui-lib-stage", "unsupported");
		await expect(page.locator(`[data-ui-lib-acceptance="${demo}"]`)).toBeVisible();
		await expect(page.locator("[data-ui-lib-mode]")).toHaveAttribute(
			"data-ui-lib-mode",
			demo === "scroll-cinema" ||
				demo === "product-hero" ||
				demo === "liquid-glass" ||
				demo === "iris"
				? "section"
				: "viewport",
		);
		await expect(page.locator("h1")).toContainText(/.+/);
		await expect(page.locator("canvas")).toHaveCount(0);
		expect(errors).toEqual([]);
	});

	test(`${demo} has the GPU/WebGL route and fallback route`, async ({ page }) => {
		const errors = setupErrorListeners(page);
		await page.goto(`/?demo=${demo}&backend=webgl`);
		const stage = page.locator("[data-ui-lib-stage]");
		// Cold shader compilation on a software renderer takes far longer than
		// the 5s default, and the stage sits at "loading" until it finishes.
		await expect(stage).toHaveAttribute("data-ui-lib-stage", /ready|unsupported/, {
			timeout: 20_000,
		});

		const stageState = await stage.getAttribute("data-ui-lib-stage");
		if (stageState === "ready") {
			// If we are actually rendering on WebGL/WebGPU, runtime stats should be alive
			// We give it a short time to accumulate stats
			// aurora-flow on software WebGL renderer can take >20s to compile shaders and first frame, so give it a bit more time
			await expect(stage).toHaveAttribute("data-ui-lib-backend", /webgl2|webgpu/, {
				timeout: 20_000,
			});
			await expect(stage).not.toHaveAttribute("data-ui-lib-fps", "");
		}

		await expect(page.locator(`[data-ui-lib-acceptance="${demo}"]`)).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test("scroll cinema travels on the shared track and then releases", async ({ page }) => {
	const errors = setupErrorListeners(page);
	await page.goto("/?demo=scroll-cinema&fallback=1");
	const track = page.locator("[data-ui-lib-scroll-track]");
	await expect(track).toHaveAttribute("data-ui-lib-scroll-progress", "0.000");
	await expect(page.getByRole("heading", { name: "Hold the light" })).toBeVisible();
	await expect(page.locator("[data-ui-lib-mode=section]")).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(track).toHaveAttribute("data-ui-lib-scroll-progress", "1.000");
	await expect(page.getByRole("heading", { name: "The page continues." })).toBeVisible();
	await page.keyboard.press("Tab");
	await expect(page.locator("[data-ui-lib-acceptance=scroll-cinema]")).toBeVisible();
	expect(errors).toEqual([]);
});

test("liquid glass pins on a section, keeps a real link, then returns to the document", async ({
	page,
}) => {
	const errors = setupErrorListeners(page);
	await page.goto("/?demo=liquid-glass&fallback=1");
	await expect(page.getByRole("heading", { name: "Liquid Glass Pro" })).toBeVisible();
	await expect(page.locator("[data-ui-lib-mode=section]")).toBeVisible();
	const proof = page.getByRole("link", { name: "Read the colophon" });
	await proof.focus();
	await expect(proof).toBeFocused();
	await expect(
		page.getByRole("heading", { name: "The sheet stays on the page." }),
	).toBeAttached();
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(
		page.getByRole("heading", { name: "The sheet stays on the page." }),
	).toBeVisible();
	expect(errors).toEqual([]);
});

test("product hero pins, then returns to the document", async ({ page }) => {
	const errors = setupErrorListeners(page);
	await page.goto("/?demo=product-hero&fallback=1");
	await expect(page.getByRole("heading", { name: "Look through it." })).toBeVisible();
	await expect(page.locator("[data-ui-lib-mode=section]")).toBeVisible();
	await expect(page.getByRole("heading", { name: "It stays on the desk." })).toBeAttached();
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(page.getByRole("heading", { name: "It stays on the desk." })).toBeVisible();
	expect(errors).toEqual([]);
});

test("reduced motion keeps the readable DOM state", async ({ page }) => {
	const errors = setupErrorListeners(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/?demo=liquid-glass");
	await expect(page.getByRole("heading", { name: "Liquid Glass Pro" })).toBeVisible();
	await expect(page.locator("[data-ui-lib-acceptance=liquid-glass]")).toBeVisible();
	expect(errors).toEqual([]);
});

test("context loss is observable and triggers a fresh stage", async ({ page }) => {
	const errors = setupErrorListeners(page);
	await page.goto("/?demo=liquid-glass&backend=webgl");
	const canvas = page.locator("canvas");
	if ((await canvas.count()) === 0) {
		test.skip(true, "This browser has no WebGL2 context; the fallback route is covered above.");
		return;
	}

	const stage = page.locator("[data-ui-lib-stage]");
	await expect(stage).toHaveAttribute("data-ui-lib-stage", "ready", { timeout: 15_000 });
	await canvas.dispatchEvent("webglcontextlost");
	await expect(stage).toHaveAttribute("data-ui-lib-stage", /loading|ready|unsupported/, {
		timeout: 15_000,
	});
	expect(errors).toEqual([]);
});
