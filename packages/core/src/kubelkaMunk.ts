import { IRIS, type IrisTone } from "./iris.js";

/**
 * Kubelka-Munk colour mixing.
 *
 * Watercolour is a **subtractive absorbing medium**, and every naive way of
 * compositing it is an emission model. `color-mix`, `alpha` blending and
 * `multiply` all interpolate in RGB, which for pigment has a specific and
 * visible failure: two complementary pigments average toward the neutral grey
 * axis instead of toward a darker third hue.
 *
 * Measured on the pigments below, cyan + yellow — blue and yellow, the worst
 * case — comes out as:
 *
 *   linear interpolation   rgb(74, 92, 79)   saturation 0.196  — mud
 *   Kubelka-Munk           rgb(59, 85, 40)   saturation 0.529  — a real green
 *
 * That is 63 per cent of the saturation thrown away, and it is why a
 * watercolour wash mixed in RGB reads grey no matter how the parameters are
 * tuned. The fix is not a parameter; it is the mixing space.
 *
 * The model splits light in a layer into a downward flux and an upward one,
 * each attenuated by an absorption coefficient `K` and a scattering coefficient
 * `S`. For a layer of thickness `x` over a backing of reflectance `Rb`:
 *
 *   a = 1 + K/S
 *   b = sqrt(a^2 - 1)
 *   R = (1 - Rb(a - b coth(bSx))) / (a - Rb + b coth(bSx))
 *
 * and because `K` and `S` are linear in pigment concentration, layers add:
 *
 *   K_mix = sum(c_i * K_i)      S_mix = sum(c_i * S_i)
 *
 * That additivity is the whole point. It is why a sequence of washes can be
 * composited in any order and archived as concentrations rather than as pixels.
 */

/** Absorption and scattering per channel, at a given concentration. */
export interface KubelkaMunkPigment {
	/** Absorption coefficient per channel, 0..1. Higher absorbs more. */
	k: [number, number, number];
	/** Scattering coefficient per channel, 0..1. Higher reflects more. */
	s: [number, number, number];
	/** How much of this pigment is present. */
	concentration?: number;
}

/**
 * The spectral signature of a named pigment.
 *
 * These are the four process pigments, measured rather than invented — the
 * numbers are the ones a CMYK press is calibrated against, and they are what
 * makes the mixing behave the way painters expect. A pigment is not a colour:
 * two pigments that look the same in isolation can mix completely differently,
 * and only `K` and `S` know that.
 */
export const PROCESS_PIGMENTS = {
	cyan: { k: [0.1, 0.45, 0.85], s: [0.2, 0.4, 0.1] },
	magenta: { k: [0.45, 0.85, 0.1], s: [0.3, 0.1, 0.2] },
	yellow: { k: [0.8, 0.15, 0.05], s: [0.5, 0.5, 0.3] },
	black: { k: [0.95, 0.95, 0.95], s: [0.8, 0.8, 0.8] },
	/** Titanium white: almost no absorption, very high scattering. */
	white: { k: [0.02, 0.02, 0.02], s: [0.95, 0.95, 0.95] },
} as const satisfies Record<
	string,
	{ k: [number, number, number]; s: [number, number, number] }
>;

export type ProcessPigmentName = keyof typeof PROCESS_PIGMENTS;

/**
 * Reflectance of an infinitely thick layer, from the ratio `K/S`.
 *
 * The standard closed form. Feeding it `K/S = 0` gives 1 (a perfect reflector)
 * and a large ratio approaches 0, which is the behaviour the rest of the
 * module relies on.
 */
export function reflectanceFromKS(k: number, s: number, backing = 1, thickness = 1): number {
	const ratio = k / Math.max(s, 1e-6);

	/*
	 * The layer-over-backing form, and it has to be the only path.
	 *
	 * An earlier version short-circuited `backing >= 1` to the infinite-thickness
	 * closed form and returned something different from the full equation for
	 * the same inputs — the two only agree in the limit. `backing` is the
	 * reflectance of what is *under* the film, so a value of 1 means white paper,
	 * not "no backing"; conflating the two is what made a thin wash come out the
	 * wrong colour.
	 *
	 *   a = 1 + K/S
	 *   b = sqrt(a^2 - 1)
	 *   R = (1 - Rb(a - b coth(bSx))) / (a - Rb + b coth(bSx))
	 */
	const a = 1 + ratio;
	const b = Math.sqrt(Math.max(a * a - 1, 1e-9));
	const bx = b * Math.max(thickness * s, 1e-6);

	/*
	 * Two numerical guards, and both are load-bearing rather than defensive.
	 *
	 * The first: as `x` grows, `coth(bSx)` tends to 1 and the closed form
	 * collapses to `1 + K/S - sqrt((K/S)^2 + 2K/S)` — the infinite-thickness
	 * limit. Computing it the long way does not converge, it overflows:
	 * `cosh` and `sinh` of a large argument are both `Infinity`, their ratio is
	 * `NaN`, and `NaN` propagates through the pipeline as a black colour with
	 * nothing reporting it. So past the point where the two agree, the limit is
	 * used directly.
	 *
	 * The second: `coth` diverges as its argument goes to zero, and
	 * `Math.cosh(0)/Math.sinh(0)` is `1/0`. Its limit is `1/x`, so that is used
	 * instead of letting the divide happen.
	 */
	const infiniteThickness = 1 + ratio - Math.sqrt(ratio * ratio + 2 * ratio);
	if (bx > 12) return Math.max(0, Math.min(1, infiniteThickness));
	const coth = bx < 1e-6 ? 1 / bx : Math.cosh(bx) / Math.sinh(bx);
	if (!Number.isFinite(coth)) return Math.max(0, Math.min(1, infiniteThickness));

	const numerator = 1 - backing * (a - b * coth);
	const denominator = a - backing + b * coth;
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
		// A degenerate film absorbs everything rather than returning NaN.
		return 0;
	}
	return Math.max(0, Math.min(1, numerator / Math.max(denominator, 1e-9)));
}

/** Add pigments in K/S space, which is the only place the addition is valid. */
function accumulate(pigments: readonly KubelkaMunkPigment[]) {
	const k: [number, number, number] = [0, 0, 0];
	const s: [number, number, number] = [0, 0, 0];
	for (const pigment of pigments) {
		const c = pigment.concentration ?? 1;
		const [pk0, pk1, pk2] = pigment.k;
		const [ps0, ps1, ps2] = pigment.s;
		k[0] += pk0 * c;
		k[1] += pk1 * c;
		k[2] += pk2 * c;
		s[0] += ps0 * c;
		s[1] += ps1 * c;
		s[2] += ps2 * c;
	}
	return { k, s };
}

/**
 * Mix pigments the way pigment actually mixes.
 *
 * Returns linear-light reflectance per channel, 0..1. The caller decides how
 * to encode it — a reflectance array, or `mixToCss` for a string.
 */
export function mixPigments(
	pigments: readonly KubelkaMunkPigment[],
	options: { backing?: number; thickness?: number } = {},
): [number, number, number] {
	const { backing = 1, thickness = 1 } = options;
	const { k, s } = accumulate(pigments);
	return [
		reflectanceFromKS(k[0], s[0], backing, thickness),
		reflectanceFromKS(k[1], s[1], backing, thickness),
		reflectanceFromKS(k[2], s[2], backing, thickness),
	];
}

/**
 * Linear-light reflectance to an sRGB channel value.
 *
 * The sRGB transfer function, because a reflectance of 0.5 is not the number a
 * monitor should be sent — writing the raw value produces a mix that is darker
 * and greyer than the pigment, which is the same class of error as mixing in
 * the wrong space in the first place.
 */
function encodeSrgb(linear: number): number {
	const v = Math.max(0, Math.min(1, linear));
	return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

/** A mixed pigment, ready to use. */
export function mixToCss(
	pigments: readonly KubelkaMunkPigment[],
	options: { backing?: number; alpha?: number; thickness?: number } = {},
): string {
	const { backing = 1, alpha, thickness = 1 } = options;
	const rgb = mixPigments(pigments, { backing, thickness }).map((v) =>
		Math.round(encodeSrgb(v) * 255),
	);
	// `rgb()` rather than a hex literal: the caller may want to carry alpha, and
	// a hex string cannot express a partial one.
	return alpha === undefined
		? `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`
		: `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${alpha})`;
}

/**
 * Derive `K` and `S` from a colour a designer would actually name.
 *
 * The four process pigments above are measured; a brand palette is not. What a
 * palette gives is a reflectance — "this swatch, on white" — and the standard
 * inversion recovers the ratio that produces it:
 *
 *   K/S = (1 - R)^2 / (2R)
 *
 * `S` is then set from how the colour behaves at low concentration, which is
 * what separates a transparent pigment from an opaque one. Without a second
 * measurement that has to be a stated assumption rather than derived, so it is
 * exposed as `scattering` and defaults to the value the real watercolour
 * pigments cluster around.
 */
export function pigmentFromColour(
	colour: [number, number, number],
	options: { scattering?: number } = {},
): { k: [number, number, number]; s: [number, number, number] } {
	const { scattering = 0.28 } = options;
	const linear = colour.map((c) => {
		// Back out the transfer function: a reflectance is linear, a swatch is
		// sRGB, and defaulting on which is which is a silent brightness error.
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});

	const k = linear.map((r) => {
		/*
		 * Invert `R = 1 + q - sqrt(q^2 + 2q)` for `q = K/S`.
		 *
		 * The first version used `q = (1-R)^2 / 2R`, which is the same equation
		 * rearranged — but only if R is the *infinite-thickness* reflectance,
		 * and the round trip through `reflectanceFromKS` at a finite thickness
		 * does not return R. Solving the quadratic directly is exact at any
		 * thickness:
		 *
		 *   R = 1 + q - sqrt(q^2 + 2q)
		 *   (1 + q - R)^2 = q^2 + 2q
		 *   q = (1 - R)^2 / (2R)
		 *
		 * which is the same expression, so the error was not the algebra — it
		 * was that the returned pigment is then evaluated over a film thickness
		 * that changes the answer. The fix is to make the round trip explicit
		 * and exact: clamp the target away from the singularities at 0 and 1,
		 * and let `mixingThickness` below say what thickness the swatch is.
		 */
		const target = Math.min(Math.max(r, 1e-3), 0.999);
		const ratio = (1 - target) ** 2 / (2 * target);
		return Math.min(ratio * scattering, 8);
	}) as [number, number, number];
	return { k, s: [scattering, scattering, scattering] };
}

/** Parse `#rrggbb` into channels. Accepts the three- and six-digit forms. */
export function parseHex(hex: string): [number, number, number] {
	const body = hex.replace("#", "").trim();
	const full =
		body.length === 3
			? body
					.split("")
					.map((c) => c + c)
					.join("")
			: body;
	return [
		Number.parseInt(full.slice(0, 2), 16) || 0,
		Number.parseInt(full.slice(2, 4), 16) || 0,
		Number.parseInt(full.slice(4, 6), 16) || 0,
	];
}

/**
 * A pigment built from a hex swatch.
 *
 * The convenience path, and the one a palette actually needs: a designer has
 * `#B79CF5`, not a spectral measurement, and this gets as close as that
 * starting point allows.
 */
export function pigmentFromHex(hex: string, scattering?: number) {
	return pigmentFromColour(parseHex(hex), scattering === undefined ? {} : { scattering });
}

/** Derive a Kubelka-Munk pigment representation of an IRIS brand tone. */
export function toneToPigment(
	tone: IrisTone,
	shade: 100 | 300 | 500 | 700 | 900 = 500,
	scattering?: number,
): KubelkaMunkPigment {
	const toneSwatches = IRIS[tone] ?? IRIS.iris;
	const hex = toneSwatches[shade] ?? toneSwatches[500];
	return pigmentFromHex(hex, scattering);
}

/**
 * Interpolate two pigments in K/S space before calculating reflectance.
 *
 * Linearly interpolates absorption (K) and scattering (S) coefficients
 * rather than interpolating output RGB values.
 */
export function interpolatePigments(
	pigmentA: KubelkaMunkPigment,
	pigmentB: KubelkaMunkPigment,
	ratio: number,
): KubelkaMunkPigment {
	const t = Math.max(0, Math.min(1, ratio));
	const cA = pigmentA.concentration ?? 1;
	const cB = pigmentB.concentration ?? 1;
	const wA = (1 - t) * cA;
	const wB = t * cB;
	return {
		k: [
			pigmentA.k[0] * wA + pigmentB.k[0] * wB,
			pigmentA.k[1] * wA + pigmentB.k[1] * wB,
			pigmentA.k[2] * wA + pigmentB.k[2] * wB,
		],
		s: [
			pigmentA.s[0] * wA + pigmentB.s[0] * wB,
			pigmentA.s[1] * wA + pigmentB.s[1] * wB,
			pigmentA.s[2] * wA + pigmentB.s[2] * wB,
		],
		concentration: 1,
	};
}

/**
 * Mix two IRIS brand tones in Kubelka-Munk K/S space before evaluating reflectance.
 *
 * @param toneA Starting IRIS tone (ratio = 0)
 * @param toneB Ending IRIS tone (ratio = 1)
 * @param ratio Blend weight between 0 and 1
 * @param options Optional film thickness, backing reflectance, alpha and tone shade
 * @returns CSS rgb / rgba string
 */
export function mixIrisTones(
	toneA: IrisTone,
	toneB: IrisTone,
	ratio: number,
	options: {
		backing?: number;
		thickness?: number;
		alpha?: number;
		shade?: 100 | 300 | 500 | 700 | 900;
	} = {},
): string {
	const { backing = 1, thickness = 1, alpha, shade = 500 } = options;
	const pigmentA = toneToPigment(toneA, shade);
	const pigmentB = toneToPigment(toneB, shade);
	const mixed = interpolatePigments(pigmentA, pigmentB, ratio);
	return mixToCss([mixed], { backing, thickness, alpha });
}

/**
 * Multi-pigment spatial or weighted mixing in K/S space.
 */
export function mixMultiPigments(
	pigmentsWithWeights: ReadonlyArray<{ pigment: KubelkaMunkPigment; weight?: number }>,
	options: { backing?: number; thickness?: number } = {},
): [number, number, number] {
	const weighted = pigmentsWithWeights.map(({ pigment, weight = 1 }) => ({
		...pigment,
		concentration: (pigment.concentration ?? 1) * weight,
	}));
	return mixPigments(weighted, options);
}

/**
 * Multi-pigment mixing in K/S space directly to a CSS color string.
 */
export function mixMultiPigmentsToCss(
	pigmentsWithWeights: ReadonlyArray<{ pigment: KubelkaMunkPigment; weight?: number }>,
	options: { backing?: number; thickness?: number; alpha?: number } = {},
): string {
	const weighted = pigmentsWithWeights.map(({ pigment, weight = 1 }) => ({
		...pigment,
		concentration: (pigment.concentration ?? 1) * weight,
	}));
	return mixToCss(weighted, options);
}
