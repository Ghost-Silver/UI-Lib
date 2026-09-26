import { defineConfig, devices } from "@playwright/test";

/**
 * Browser acceptance gate for the five showcase surfaces.
 *
 * Screenshots are only comparable within one browser/GPU bucket. CI may add
 * WebGPU-capable projects without changing the test contract.
 */
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "line" : "list",
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "retain-on-failure",
		video: "off",
		viewport: { width: 1440, height: 1000 },
		colorScheme: "dark",
		reducedMotion: "no-preference",
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
