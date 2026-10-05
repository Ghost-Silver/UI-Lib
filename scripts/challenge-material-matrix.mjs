import { chromium } from "/tmp/iris/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs";
import { decodePng } from "/tmp/iris/scripts/check-components.mjs";

const browser = await chromium.launch({
	executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	headless: true,
	args: [
		"--use-gl=angle",
		"--use-angle=metal",
		"--enable-unsafe-swiftshader",
		"--ignore-gpu-blocklist",
	],
});

const page = await browser.newPage({
	viewport: { width: 1200, height: 900 },
	deviceScaleFactor: 1,
});

await page.goto("http://127.0.0.1:5173/?demo=iris-kit&component=material&tone=iris", {
	waitUntil: "networkidle",
	timeout: 60000,
});
await page.waitForTimeout(4000);

const lum = (c) => {
	const [r, g, b] = c.map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
	const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
	return (x + 0.05) / (y + 0.05);
};

async function measureLocator(locator) {
	const img = decodePng(await locator.screenshot());
	const hist = new Map();
	let darkest = [255, 255, 255];
	for (let n = 0; n < img.width * img.height; n += 1) {
		const o = n * 4;
		const px = [img.data[o], img.data[o + 1], img.data[o + 2]];
		const key = `${px[0] >> 3},${px[1] >> 3},${px[2] >> 3}`;
		hist.set(key, (hist.get(key) ?? 0) + 1);
		if (lum(px) < lum(darkest)) darkest = px;
	}
	let modal = null,
		best = 0;
	for (const [k, count] of hist) {
		if (count > best) {
			best = count;
			modal = k.split(",").map((v) => Number(v) * 8 + 4);
		}
	}
	const rDark = ratio(darkest, modal);
	const lightest = [...hist.keys()]
		.map((k) => k.split(",").map(Number))
		.sort((a, b) => lum(b) - lum(a))[0]
		.map((v) => v * 8);
	const rLight = ratio(lightest, modal);
	return {
		modal,
		darkest,
		lightest,
		modalLum: lum(modal),
		contrast: Math.max(rDark, rLight),
	};
}

const themes = ["anime", "cyberpunk", "minimalist", "obsidian"];
const weights = [0.1, 0.5, 1.0, 2.0];

console.log("=== EMPIRICAL CHALLENGER: MATRIX OF THEMES × WEIGHTS × TONES ===");
console.log("Theme       Weight Tone    Modal Lum  Worst Contrast  Status");
console.log("------------------------------------------------------------");

let totalTests = 0;
let passTests = 0;
let failTests = 0;
const failures = [];

for (const theme of themes) {
	await page.evaluate((t) => document.documentElement.setAttribute("data-moe-theme", t), theme);
	await page.waitForTimeout(400);

	for (const weight of weights) {
		// Set dynamic weight token
		await page.evaluate((w) => {
			document.documentElement.style.setProperty("--moe-material-wash", String(w));
		}, weight);
		await page.waitForTimeout(600);

		// In MaterialKit:
		// Cards matching .ui-lib-soft-card.ui-lib-material--ground:
		// index 0: tint (tone=iris)
		// index 1: wash (tone=iris)
		// index 2: wash (tone=blossom)
		// index 3: wash (tone=mist)
		const groundCards = await page.locator(".ui-lib-soft-card.ui-lib-material--ground").all();

		// We evaluate wash cards for iris (idx 1), blossom (idx 2), mist (idx 3)
		const toneCardIndices = [
			{ tone: "iris", index: 1 },
			{ tone: "blossom", index: 2 },
			{ tone: "mist", index: 3 },
		];

		for (const { tone, index } of toneCardIndices) {
			totalTests++;
			const card = groundCards[index];
			const p = card.locator("p").first();
			const result = await measureLocator(p);
			const passed = result.contrast >= 4.5;
			if (passed) passTests++;
			else {
				failTests++;
				failures.push({
					theme,
					weight,
					tone,
					contrast: result.contrast,
					modalLum: result.modalLum,
				});
			}

			console.log(
				`${theme.padEnd(11)} ${String(weight).padEnd(6)} ${tone.padEnd(7)} ${result.modalLum.toFixed(3).padEnd(10)} ${result.contrast.toFixed(2).padStart(5)}:1        ${passed ? "✓ PASS" : "✗ FAIL (<4.5:1)"}`,
			);
		}
	}
}

// Reset custom styles
await page.evaluate(() => {
	document.documentElement.style.removeProperty("--moe-material-wash");
	document.documentElement.setAttribute("data-moe-theme", "anime");
});

await browser.close();

console.log("------------------------------------------------------------");
console.log(`Total tests: ${totalTests}, Passed: ${passTests}, Failed: ${failTests}`);
if (failures.length > 0) {
	console.log("FAILURES DETECTED:");
	console.log(JSON.stringify(failures, null, 2));
	process.exit(1);
} else {
	console.log("ALL MATRIX COMBINATIONS MEET WCAG AA (>= 4.5:1)");
}
