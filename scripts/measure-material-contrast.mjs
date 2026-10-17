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
	viewport: { width: 1000, height: 760 },
	deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:5173/?demo=iris-kit&component=material&tone=iris", {
	waitUntil: "networkidle",
	timeout: 60000,
});
await page.waitForTimeout(6000);

/*
 * Measure the text against the pixels it is actually on.
 *
 * The previous round compared the text colour to the ground's FIRST colour stop
 * and reported 6.45:1 for a card whose text is plainly unreadable. What the card
 * paints is the middle of a several-stop gradient, so the stop I sampled was not
 * the colour behind the glyphs.
 *
 * This samples the rendered rectangle: the modal colour of the paragraph's own box
 * is the ground, and the darkest tenth of its pixels is the glyph.
 */
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

console.log("主题        卡片    正文对比度（实测像素）");
for (const theme of ["anime", "cyberpunk", "minimalist", "obsidian"]) {
	await page.evaluate((t) => document.documentElement.setAttribute("data-moe-theme", t), theme);
	await page.waitForTimeout(700);
	const cards = await page.locator(".ui-lib-soft-card.ui-lib-material--ground").all();
	for (const [i, card] of cards.entries()) {
		const p = card.locator("p").first();
		if ((await p.count()) === 0) continue;
		const img = decodePng(await p.screenshot());
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
		const r = ratio(darkest, modal);
		const lightest = [...hist.keys()]
			.map((k) => k.split(",").map(Number))
			.sort((a, b) => lum(b) - lum(a))[0]
			.map((v) => v * 8);
		const rLight = ratio(lightest, modal);
		const worst = Math.max(r, rLight);
		console.log(
			`${theme.padEnd(11)} ${String(i).padEnd(6)} ${worst.toFixed(2)}:1  ${worst < 4.5 ? "✗ 不达标" : "✓"}`,
		);
	}
}
await browser.close();
