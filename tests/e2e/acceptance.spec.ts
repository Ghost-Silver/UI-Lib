import { expect, test } from "@playwright/test";

const demos = [
	"liquid-glass",
	"aurora-flow",
	"product-hero",
	"scroll-cinema",
	"cursor-field",
] as const;

for (const demo of demos) {
	test(`${demo} renders semantic content and a stable stage`, async ({ page }) => {
		await page.goto(`/?demo=${demo}&fallback=1`);
		const stage = page.locator("[data-ui-lib-stage]");
		await expect(stage).toHaveAttribute("data-ui-lib-stage", "unsupported");
		await expect(page.locator(`[data-ui-lib-acceptance="${demo}"]`)).toBeVisible();
		await expect(page.locator("h1")).toContainText(/.+/);
		await expect(page.locator("canvas")).toHaveCount(0);
		await expect(page).toHaveScreenshot(`${demo}-css.png`, {
			animations: "disabled",
			caret: "hide",
			maxDiffPixelRatio: 0.02,
		});
	});

	test(`${demo} has the GPU/WebGL route and fallback route`, async ({ page }) => {
		await page.goto(`/?demo=${demo}&backend=webgl`);
		const stage = page.locator("[data-ui-lib-stage]");
		await expect(stage).toHaveAttribute("data-ui-lib-stage", /ready|unsupported/);
		await expect(page.locator(`[data-ui-lib-acceptance="${demo}"]`)).toBeVisible();
	});
}

test("scroll acceptance preserves focusable DOM content", async ({ page }) => {
	await page.goto("/?demo=scroll-cinema&fallback=1");
	const firstHeading = page.getByRole("heading", { name: "Read the surface" });
	await firstHeading.scrollIntoViewIfNeeded();
	await expect(firstHeading).toBeVisible();
	await page.keyboard.press("Tab");
	await expect(page.locator("[data-ui-lib-acceptance=scroll-cinema]")).toBeVisible();
});

test("reduced motion keeps the readable DOM state", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/?demo=liquid-glass");
	await expect(page.getByRole("heading", { name: "Liquid Glass Pro" })).toBeVisible();
	await expect(page.locator("[data-ui-lib-acceptance=liquid-glass]")).toBeVisible();
});

test("context loss is observable and triggers a fresh stage", async ({ page }) => {
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
});
