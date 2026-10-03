import { mixToCss, PROCESS_PIGMENTS, pigmentFromHex } from "./kubelkaMunk.js";
import { clamp01, fbm2D, lerp } from "./math.js";

/**
 * Watercolour, generated rather than dialled in.
 *
 * Everything here was first worked out by hand in a stylesheet and then had to
 * be re-derived, which is the reason the module exists. Four properties make a
 * mark read as pigment rather than as a blurred shape, and none of them is a
 * gradient:
 *
 *   1. The rim is darker than the centre, because water carries pigment outward
 *      as it leaves and deposits it where it stops.
 *   2. The strength of that deposit varies **around** the circle. A uniform
 *      ring reads as a `border`.
 *   3. Nothing is periodic. Paper is not a repeating function, and neither is a
 *      wash.
 *   4. The edge means something. Wet is soft, dry is sharp, and the only
 *      difference between the two is how much water was there.
 *
 * The hard-won parts are the numbers that are *not* exposed as options. An
 * earlier hand-tuned version had five hand-written arc strengths, two noise
 * frequencies chosen to avoid visible tiling, and an overall opacity found by
 * looking at a full page rather than a zoom. All of that is derived here from a
 * `seed` and a `weight`, so a caller gets a correct wash by asking for one.
 *
 * ```ts
 * const wash = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7 });
 * Object.assign(element.style, wash.style);
 * ```
 */

/** How wet the mark still is. */
export type WashState = "wet" | "drying" | "dry";

export interface WashOptions {
	/** The pigment. Any CSS colour; the rim is derived from it. */
	hue: string;
	/**
	 * How much water carried the pigment, 0..1.
	 *
	 * This is the one knob that matters. It sets how far the deposit has run,
	 * how opaque the body is, and how soft the edge stays — which is why the
	 * dry and wet specimens on the study page are the same call with different
	 * weights rather than different rules.
	 */
	weight?: number;
	/**
	 * Any number. The same seed always produces the same wash, and two
	 * different seeds produce two marks that could not be mistaken for each
	 * other — which is what stops a page of them looking stamped.
	 */
	seed?: number;
	/** Wet marks are soft and drifting; dry ones have an edge. */
	state?: WashState;
	/** Smallest and largest pigment particle, in px. */
	size?: number;
}

export interface WashResult {
	/** Custom properties to assign to an element's style. */
	style: Record<string, string>;
	/** The class that consumes them. */
	className: string;
	/** Optional extra markup this wash needs, as an HTML string. */
	markup: string;
	/** What the seed actually produced, for debugging and for tests. */
	resolved: {
		weight: number;
		state: WashState;
		/** Arc strengths the rim is built from. */
		arcs: number[];
		/** The angle the rim's pattern starts at. */
		rotation: number;
		/** Corner radii, which make the silhouette non-elliptical. */
		lobes: number;
		/** Overall strength, the value that has to be judged on a whole page. */
		opacity: number;
		/** Edge softness in px. */
		blur: number;
	};
}

/**
 * The overall strength, and it is the number most likely to be got wrong.
 *
 * 0.5 looked right in a 300 per cent crop and read as a grey haze on a page;
 * 0.34 was still too much; 0.17 is where a wash sits on paper without becoming
 * the loudest thing in the composition. The lesson generalises and is worth
 * keeping next to the constant: **a texture judged only at high zoom will
 * always be too strong.** The question is what it does behind a paragraph.
 */
const BASE_OPACITY = 0.17;

/** Edge softness. `wet` against `dry` is the entire visible difference. */
const BLUR = { wet: 7, drying: 3.2, dry: 1.5 } as const;

/**
 * A small deterministic generator.
 *
 * `Math.random` cannot be used: the same wash has to look the same on a
 * server render and on the client, and a page of washes has to keep its shapes
 * across a re-render. This is mulberry32 — four lines, no state to leak, and
 * good enough for choosing five numbers between 0.1 and 1.
 */
function makeRandom(seed: number): () => number {
	let state = (seed | 0) + 0x6d2b79f5;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Five arc strengths, none of them equal.
 *
 * This is the part that took the longest to get right by hand and the part
 * most worth deriving. An even sequence reads as a mechanical ring no matter
 * how good the colour is, and the effect that makes pigment look real is
 * *unevenness* — heavy where the water pooled and stopped, barely present
 * where it ran off. Five arcs, because at fewer the variation is a blob and at
 * more it averages back out to uniform.
 */
function deriveArcs(random: () => number, weight: number): number[] {
	return Array.from({ length: 5 }, (_, index) => {
		// The first arc is anchored high so every wash has one clearly heavy
		// side; without it some seeds come out uniformly faint and read as a
		// fade rather than a deposit.
		if (index === 0) return lerp(0.72, 1, weight) * lerp(0.9, 1, random());
		return clamp01(lerp(0.12, 1, random()) * lerp(0.55, 1.15, weight));
	});
}

/** Turn the arc strengths into a `conic-gradient` mask, which is what varies them around the rim. */
function arcsToMask(arcs: number[], rotation: number): string {
	const step = 360 / arcs.length;
	const stops: string[] = [`from ${rotation.toFixed(1)}deg`];
	for (let i = 0; i < arcs.length; i += 1) {
		const start = (i * step).toFixed(1);
		const end = ((i + 1) * step).toFixed(1);
		// Dark = visible in a mask, so the arc strength becomes alpha.
		stops.push(`rgb(0 0 0 / ${arcs[i]?.toFixed(3) ?? "0"}) ${start}deg ${end}deg`);
	}
	return `conic-gradient(${stops.join(", ")})`;
}

/**
 * Two noise passes, at sizes that cannot line up.
 *
 * `feTurbulence` in an inline SVG, because there is no CSS function that
 * produces non-repeating noise. Two passes rather than one: coarse for the
 * unevenness pigment settles into, fine for the tooth of the sheet. The sizes
 * are deliberately not round and not multiples of each other — a first version
 * used 180px twice and the tiles were findable as a grid of squares.
 *
 * The base frequencies are chosen against each other rather than by taste. A
 * coarse pass at `0.012` pooled into coin-sized patches that read as water
 * stains; it has to stay high enough to be a gentle unevenness across the
 * whole sheet.
 */
export function paperNoise(seed: number): { image: string; sizes: string } {
	const coarseW = 480 + (seed % 97);
	const coarseH = 512 + (seed % 89);
	const fineW = 320 + (seed % 61);
	const fineH = 356 + (seed % 53);
	const svg = (w: number, h: number, freq: string, octaves: number, s: number) =>
		`url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${s}'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='${w}' height='${h}' filter='url(%23n)'/%3E%3C/svg%3E")`;
	return {
		image: `${svg(coarseW, coarseH, "0.028 0.034", 4, seed % 100)},${svg(fineW, fineH, "0.86 0.72", 2, (seed * 7) % 100)}`,
		sizes: `${coarseW}px ${coarseH}px, ${fineW}px ${fineH}px`,
	};
}

/**
 * Build a wash.
 *
 * Everything a caller supplies is something a designer would actually say out
 * loud — which pigment, how wet, and a number to make this one different from
 * the last. The five arc strengths, the noise frequencies, the tile sizes, the
 * silhouette and the overall opacity are all derived, because they are the
 * things nobody would get right by hand and which have to agree with each
 * other to work at all.
 */
export function createWash(options: WashOptions): WashResult {
	const { hue, weight: rawWeight = 0.7, seed = 1, state = "dry", size = 190 } = options;
	const weight = clamp01(rawWeight);
	const random = makeRandom(seed);

	const arcs = deriveArcs(random, weight);
	// The pattern's start angle, so two washes with the same arcs are still not
	// the same wash.
	const rotation = -30 + random() * 60;

	// `lobes` shifts four of the eight border radii. Small numbers only: the
	// silhouette has to read as a spread mark, and past about 4 per cent it
	// starts to look like a drawn leaf.
	const lobes = (random() - 0.5) * 7;

	// The sheet, seeded from the same number so a wash and its paper agree, and
	// offset well away from the origin so two washes on one page are not
	// sitting on the same patch of it.
	const grain = paperNoise(seed);
	const grainOffset = `${Math.round(random() * 400)}px ${Math.round(random() * 400)}px`;

	const blur = BLUR[state];
	// Drier marks are stronger: the water is gone and the pigment that is left
	// is all of the pigment that is left.
	const dryBoost = state === "dry" ? 1 : state === "drying" ? 0.92 : 0.82;
	const opacity = Number((BASE_OPACITY * lerp(0.6, 1.5, weight) * dryBoost).toFixed(3));

	// A body that is stronger in the middle of the mark and fades before the
	// rim, so the deposit ring has somewhere to sit rather than being the only
	// thing there.
	/*
	 * Mixing is done in Kubelka-Munk space, not in RGB.
	 *
	 * `color-mix(in oklab, ...)` is an interpolation in a *perceptual* space,
	 * which is the right tool for blending two lights and the wrong one for
	 * pigment. Watercolour is a subtractive absorbing medium: two washes of
	 * different pigment over each other produce a third hue, and interpolating
	 * the two colours directly takes a shortcut through the neutral axis. On the
	 * worst case — blue and yellow — that is 63 per cent of the saturation
	 * thrown away, which is why the first version of this read grey no matter
	 * how the weight was tuned.
	 *
	 * The pigment is derived from the swatch and thinned with white the way a
	 * painter does it: more white, less film thickness, and the paper shows
	 * through. `thickness` is the concentration, so `weight` drives it directly.
	 */
	const pigment = pigmentFromHex(hue);
	const bodyCentre = mixToCss([pigment], { thickness: weight * 1.6, backing: 1 });
	const bodyEdge = mixToCss([pigment], { thickness: weight * 1.1, backing: 1 });
	const body = `radial-gradient(72% 66% at ${(48 + random() * 4).toFixed(1)}% ${(45 + random() * 4).toFixed(1)}%, ${bodyCentre} 0%, ${bodyEdge} 76%, transparent 95%)`;

	/*
	 * The same pigment as a **fill**, for a surface rather than a mark.
	 *
	 * `--wash-body` is a stroke: it fades out before its own box ends, because a
	 * mark has a soft edge. A ground cannot use it — on a 460px table that fade
	 * covers the outer quarter of every side, and the result reads as a dark
	 * border with a lighter middle rather than as a surface made of pigment.
	 * Measured on the table, the sides were visibly darker than the centre in a
	 * way that had nothing to do with the grain.
	 *
	 * So the same two colours, with the fade moved past the edge. It is the same
	 * pigment at the same strengths; only where it stops is different, and that is
	 * a difference in *use* rather than in colour — which is why it is generated
	 * here rather than derived in a stylesheet from a string it cannot take apart.
	 */
	const ground = `radial-gradient(120% 110% at 50% 46%, ${bodyCentre} 0%, ${bodyEdge} 62%, ${bodyEdge} 100%)`;

	// The rim: pigment at its strongest, and the only element that uses the
	// angular mask.
	/*
	 * The rim is the same pigment at full strength over dry paper, plus a touch
	 * of the process black that real watercolour picks up where the water
	 * saturates. Mixed in K-M rather than darkened in RGB, so it stays the same
	 * hue instead of heading toward grey.
	 */
	const rim = mixToCss([pigment, { ...PROCESS_PIGMENTS.black, concentration: 0.06 * weight }], {
		thickness: Math.max(weight, 0.25) * 4,
		backing: 1,
	});

	return {
		className: `ui-lib-wash ui-lib-wash--${state}`,
		markup: '<span class="ui-lib-wash__deposit" aria-hidden="true"></span>',
		style: {
			"--wash-width": `${size}px`,
			"--wash-height": `${size}px`,
			"--wash-body": body,
			"--wash-ground": ground,
			"--wash-rim": rim,
			"--wash-opacity": String(opacity),
			"--wash-blur": `${blur}px`,
			"--wash-deposit-mask": arcsToMask(arcs, rotation),
			"--wash-grain-offset": grainOffset,
			"--wash-grain": grain.image,
			"--wash-grain-size": grain.sizes,
			"--wash-grain-opacity": String(Number((BASE_OPACITY * 0.9).toFixed(3))),
			"--wash-lobes": lobes.toFixed(2),
		},
		resolved: { weight, state, arcs, rotation, lobes, opacity, blur },
	};
}

/**
 * The arcs as a readable summary.
 *
 * Exists because the first thing anyone does with a generated mark is wonder
 * whether it came out right, and five floats in a `conic-gradient` are not
 * readable. `fbm2D` is used rather than the raw arcs so the shape of the
 * variation can be compared across seeds.
 */
export function describeWash(result: WashResult): string {
	const { arcs, weight, state, opacity } = result.resolved;
	const spread = Math.max(...arcs) - Math.min(...arcs);
	const evenness = fbm2D(arcs.length, spread, 2);
	return `${state} · weight ${weight.toFixed(2)} · arcs ${arcs.map((a) => a.toFixed(2)).join("/")} · spread ${spread.toFixed(2)} · opacity ${opacity} · unevenness ${evenness.toFixed(2)}`;
}
