import { defineConfig, devices } from "@playwright/test";

/**
 * Browser acceptance gate for the six showcase surfaces.
 *
 * Screenshots are only comparable within one browser/GPU bucket. CI may add
 * WebGPU-capable projects without changing the test contract.
 *
 * On CI the whole suite is deliberately fenced in. The context-loss probe
 * wedged a runner once: every test reported, then the browser context close
 * never returned and the job sat there until its own 20-minute ceiling. A
 * hung close has no timeout of its own, so the run needs a ceiling here and
 * an artifact to inspect afterwards.
 */
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	timeout: 45_000,
	globalTimeout: process.env.CI ? 8 * 60_000 : 0,
	retries: process.env.CI ? 1 : 0,
	// One worker on CI: every page allocates its own GPU context, and the
	// renderer already notes that concurrent contexts are capped.
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "retain-on-failure",
		video: "off",
		viewport: { width: 1440, height: 1000 },
		colorScheme: "dark",
		reducedMotion: "no-preference",
		launchOptions: {
			// GitHub runners hand Chromium a small /dev/shm. Without this the
			// renderer can wedge, which is the failure mode described above.
			args: process.env.CI ? ["--disable-dev-shm-usage"] : [],
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm --filter @ui-lib/docs dev --host 127.0.0.1",
		url: "http://127.0.0.1:5173",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
