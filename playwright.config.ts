import { defineConfig, devices } from "@playwright/test";

/**
 * Browser acceptance gate for the six showcase surfaces.
 *
 * Screenshots are only comparable within one browser/GPU bucket. CI may add
 * WebGPU-capable projects without changing the test contract.
 *
 * On CI the whole suite is fenced in. Twice the browser job reported all 17
 * tests green and then never exited, burning the job's budget. A hung
 * teardown has no timeout of its own, so the run needs a ceiling here and an
 * artifact to inspect afterwards.
 */
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	timeout: 90_000,
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
			// GitHub runners hand Chromium a small /dev/shm. This is the usual
			// remedy for a renderer that wedges there; it is cheap insurance
			// rather than a confirmed cause.
			args: process.env.CI ? ["--disable-dev-shm-usage"] : [],
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	// On CI the workflow starts and owns the server itself, so Playwright has
	// nothing to spawn and nothing to tear down.
	//
	// Playwright's own webServer teardown hung twice on the Linux runner, both
	// times after all 17 tests had already reported green: it kills the `pnpm`
	// wrapper it spawned, the `vite` process behind it survives with the stdio
	// pipes still open, and the teardown then waits on a pipe that never
	// closes. Switching from the dev server to `vite preview` did not change
	// it, which is what ruled the esbuild optimizer out. Locally this never
	// reproduced because `reuseExistingServer` reuses an already-running
	// server, so the spawn/teardown path is never taken.
	webServer: process.env.CI
		? undefined
		: {
				command: "pnpm --filter @ui-lib/docs dev --host 127.0.0.1",
				url: "http://127.0.0.1:5173",
				reuseExistingServer: true,
				timeout: 120_000,
			},
});
