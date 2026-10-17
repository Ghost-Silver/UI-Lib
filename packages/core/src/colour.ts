/**
 * OKLCH to sRGB, so a colour can be reasoned about rather than only written.
 *
 * The stylesheet is written in OKLCH because OKLCH is perceptually uniform, which
 * is the right reason to write it in OKLCH. Everything that needs to *measure* a
 * colour — contrast, distance, "is this too close to that" — needs it in a space
 * with linear light in it, which OKLCH deliberately is not.
 *
 * That gap is why a contrast check written against this stylesheet scanned **zero
 * pairs** on its first run: it parsed `rgb()` and every colour in the file is
 * `oklch()`, so it reported a clean bill of health for having looked at nothing.
 * A check that cannot read its own input is worse than no check.
 *
 * The transform is the standard one — Björn Ottosson's OKLab — and it is here
 * rather than in the checker because a second implementation of a colour space is
 * a second source of disagreement.
 */

export interface Srgb {
	/** 0–255, not normalised: this is what `getComputedStyle` reports. */
	r: number;
	g: number;
	b: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** OKLCH to OKLab. Hue is in degrees; chroma and lightness as CSS writes them. */
export function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
	const rad = (h * Math.PI) / 180;
	return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/**
 * OKLab to linear sRGB, unclamped.
 *
 * Unclamped on purpose: a colour outside the sRGB gamut is a real thing that
 * exists in OKLCH, and silently clamping it here would turn "this is out of gamut"
 * into "this is this other colour" — which is the class of quiet error the rest of
 * this library keeps finding.
 */
export function oklabToLinearSrgb(l: number, a: number, b: number): [number, number, number] {
	const lp = l + 0.3963377774 * a + 0.2158037573 * b;
	const mp = l - 0.1055613458 * a - 0.0638541728 * b;
	const sp = l - 0.0894841775 * a - 1.291485548 * b;

	const lc = lp * lp * lp;
	const mc = mp * mp * mp;
	const sc = sp * sp * sp;

	return [
		+4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
		-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
		-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
	];
}

/** Linear light to the sRGB transfer function, then to 0–255. */
export function linearToSrgb255(linear: [number, number, number]): Srgb {
	const encode = (v: number) => {
		const x = clamp01(v);
		const s = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
		return Math.round(s * 255);
	};
	return { r: encode(linear[0]), g: encode(linear[1]), b: encode(linear[2]) };
}

/** OKLCH to sRGB, the whole path. */
export function oklchToSrgb(l: number, c: number, h: number): Srgb {
	const [ll, aa, bb] = oklchToOklab(l, c, h);
	return linearToSrgb255(oklabToLinearSrgb(ll, aa, bb));
}

/**
 * Whether an OKLCH colour is representable in sRGB.
 *
 * Reported rather than corrected. A palette that has drifted out of gamut renders
 * as something the author did not choose, and the only way to notice is to ask.
 */
export function inSrgbGamut(l: number, c: number, h: number): boolean {
	const [ll, aa, bb] = oklchToOklab(l, c, h);
	const linear = oklabToLinearSrgb(ll, aa, bb);
	const eps = 1e-4;
	return linear.every((v) => v >= -eps && v <= 1 + eps);
}

/**
 * Parse an `oklch()` string as CSS writes one.
 *
 * Handles the percent forms CSS allows — `oklch(98% 0.008 85)`, `oklch(0.98 8% 85)`
 * — because the parser is the part that has to be right for any of the rest to
 * mean anything, and a parser that only handles the spelling this repository
 * happens to use is a parser that will silently skip a colour someone else wrote.
 */
export function parseOklch(
	value: string,
): { l: number; c: number; h: number; alpha: number } | null {
	const m = value.match(
		/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)/i,
	);
	if (!m) return null;
	const percent = (raw: string) =>
		raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
	const alphaRaw = m[4];
	const [, lRaw, cRaw, hRaw] = m;
	if (!lRaw || !cRaw || !hRaw) return null;
	return {
		l: percent(lRaw),
		c: cRaw.endsWith("%") ? (Number(cRaw.slice(0, -1)) / 100) * 0.4 : Number(cRaw),
		h: Number(hRaw),
		alpha: alphaRaw === undefined ? 1 : percent(alphaRaw),
	};
}

/** Parse `rgb()` / `rgba()` / hex into 0–255 plus alpha. */
export function parseColour(value: string): (Srgb & { alpha: number }) | null {
	const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hex?.[1]) {
		const h = hex[1];
		const full =
			h.length === 3
				? h
						.split("")
						.map((x) => x + x)
						.join("")
				: h;
		return {
			r: Number.parseInt(full.slice(0, 2), 16),
			g: Number.parseInt(full.slice(2, 4), 16),
			b: Number.parseInt(full.slice(4, 6), 16),
			alpha: 1,
		};
	}
	const fn = value.match(
		/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i,
	);
	if (fn) {
		return {
			r: Number(fn[1]),
			g: Number(fn[2]),
			b: Number(fn[3]),
			alpha: fn[4] === undefined ? 1 : Number(fn[4]),
		};
	}
	const ok = parseOklch(value);
	if (ok) {
		const { r, g, b } = oklchToSrgb(ok.l, ok.c, ok.h);
		return { r, g, b, alpha: ok.alpha };
	}
	return null;
}
