import { IRIS, IRIS_GLASS_LOOKS } from "@ui-lib/core";
import { type ParticleSystemOptions, WAKE_FIELD } from "@ui-lib/particles";
import type { GlassPanelOptions } from "@ui-lib/renderer";

/** Optical constants for {@link Lens}. `flare` is the previous hot optic. */
export interface LensOptical {
	specular: number;
	shininess: number;
	caustic: number;
	fresnel: number;
	fresnelPower: number;
	tint: string;
	tintAmount: number;
	highlight: string;
	lightDirection: [number, number];
	pointerStrength: number;
	pointerRadius: number;
	coreColor: string;
	coreStrength: number;
	rimShadow: string;
	rimColor: string;
	rimStrength: number;
	/**
	 * Mix of the one shared studio probe. Looks scale it; they do not carry
	 * their own cubemap. `0` leaves only the scene-copy rim.
	 */
	environment: number;
}

export const LENS_LOOKS = {
	crystal: {
		specular: 0.55,
		shininess: 64,
		caustic: 0.14,
		fresnel: 0.66,
		fresnelPower: 3.4,
		tint: "#d7ecff",
		tintAmount: 0.08,
		highlight: "#fff6e4",
		lightDirection: [-0.35, 0.62],
		pointerStrength: 0.42,
		pointerRadius: 280,
		coreColor: "#ffe4ae",
		coreStrength: 0.45,
		rimShadow: "#120e0c",
		rimColor: "#f3d7ae",
		rimStrength: 0.75,
		environment: 0.5,
	},
	flare: {
		specular: 0.9,
		shininess: 52,
		caustic: 0.28,
		fresnel: 0.74,
		fresnelPower: 3.1,
		tint: "#d7ecff",
		tintAmount: 0.14,
		highlight: "#fff6e8",
		lightDirection: [-0.35, 0.62],
		pointerStrength: 0.62,
		pointerRadius: 320,
		coreColor: "#ffe6ad",
		coreStrength: 1,
		rimShadow: "#120e0a",
		rimColor: "#ffdb9e",
		rimStrength: 1,
		environment: 0.58,
	},
	ice: {
		specular: 0.42,
		shininess: 80,
		caustic: 0.08,
		fresnel: 0.7,
		fresnelPower: 3.6,
		tint: "#d5f4ff",
		tintAmount: 0.12,
		highlight: "#f4fbff",
		lightDirection: [-0.2, 0.7],
		pointerStrength: 0.3,
		pointerRadius: 240,
		coreColor: "#e7f7ff",
		coreStrength: 0.28,
		rimShadow: "#0c1218",
		rimColor: "#c9e8ff",
		rimStrength: 0.62,
		environment: 0.36,
	},
	ember: {
		specular: 0.46,
		shininess: 36,
		caustic: 0.16,
		fresnel: 0.55,
		fresnelPower: 2.8,
		tint: "#ffd0a8",
		tintAmount: 0.16,
		highlight: "#ffe1b8",
		lightDirection: [0.2, 0.4],
		pointerStrength: 0.36,
		pointerRadius: 260,
		coreColor: "#ffb15a",
		coreStrength: 0.46,
		rimShadow: "#1a0c08",
		rimColor: "#ffb06a",
		rimStrength: 0.8,
		environment: 0.4,
	},
} as const satisfies Record<string, LensOptical>;

/**
 * Same studio as {@link LENS_LOOKS}, mixed quieter. Cinema's grade already
 * rolls highlights; the pane should still read, not compete with it.
 */
export const CINEMA_LENS_ENVIRONMENT = 0.34;

export type LensLookName = keyof typeof LENS_LOOKS;

function definedPatch<T extends object>(patch: Partial<T>): Partial<T> {
	const next: Partial<T> = {};
	for (const key of Object.keys(patch) as (keyof T)[]) {
		if (patch[key] !== undefined) next[key] = patch[key];
	}
	return next;
}

/** Look first, then any prop the caller actually passed. */
export function resolveLensLook(
	look: LensLookName = "crystal",
	patch: Partial<LensOptical> = {},
): LensOptical {
	return { ...LENS_LOOKS[look], ...definedPatch(patch) };
}

/**
 * Particle clouds that belong with a lens. Counts stay high enough to read as
 * a field; intensity is what the grade is allowed to turn down.
 */
/**
 * Particle clouds in the IRIS palette.
 *
 * They live here rather than in `core` beside `IRIS_GLASS_LOOKS` because a
 * field look has to be checked against `ParticleSystemOptions` with contextual
 * typing, and that type belongs to `@ui-lib/particles`. `core` has no
 * dependencies at all by design, and a spread loses the context that keeps a
 * tuple a tuple — `life: [9, 18]` widens to `number[]` and stops matching.
 *
 * These exist because the world layer is most convincing where a pane is in
 * front of it, and a glass card has nothing to bend over a flat wash. A slow
 * halo gives the refraction something to move.
 */
export type IrisFieldLookName = "halo" | "petal";

const IRIS_FIELD_LOOKS = {
	/** Slow motes for a pane to bend. Sparse on purpose: anything fast enough
	    to notice is fast enough to fight the text on the same panel. */
	halo: {
		// 260 was the first count and it was invisible: a quarter of the motes
		// landed outside the card and the rest were too small to read as
		// anything but sensor noise. Count, size and radius all went up
		// together — one of the three alone changes nothing.
		count: 1_800,
		// 4.2 units was a 300px sphere with 1100 motes in it, which reads as
		// scattered debris. A tighter emitter and more of them is a cloud.
		emitter: { shape: "sphere", radius: 2.6, speed: 0.13, spread: 0.95 },
		// `attractor` near zero on purpose. With `anchor`, the attractor and the
		// emitter are the same point, so a strong pull collects the entire cloud
		// onto it — nine hundred motes rendered as one dot. The swirl is what
		// makes a cloud; the attractor only decides where it sits.
		forces: {
			turbulence: 0.42,
			vortex: 0.5,
			drag: 0.16,
			attractor: 0.06,
			attractorRadius: 1.6,
		},
		// Deep rungs, not the pale ones. The first pass used `blossom[300]` and
		// `iris[500]` on a pale pink card, which is a pastel on a pastel: the
		// motes were there and could not be seen. Contrast on a light ground
		// comes from the colour being deeper, not from adding glow — additive
		// blending on white only makes more white.
		colors: [IRIS.iris[700], IRIS.blossom[500], IRIS.mist[700]] as [string, string, string],
		size: [0.16, 0.42] as [number, number],
		intensity: 1.3,
		opacity: 0.85,
		life: [9, 18] as [number, number],
	},
	/** The same field with more life in it, for open ground. */
	petal: {
		// A wide, slow emitter spreads a few hundred motes so thin that the
		// field reads as sensor noise. Concentration is what makes a cloud:
		// a smaller sphere, more of them, and each one large enough to see.
		count: 1_600,
		emitter: { shape: "sphere", radius: 3.4, speed: 0.14, spread: 0.8 },
		forces: {
			turbulence: 0.5,
			vortex: 0.46,
			drag: 0.14,
			attractor: 0.05,
			attractorRadius: 1.8,
		},
		colors: [IRIS.blossom[500], IRIS.iris[700], IRIS.mist[700]] as [string, string, string],
		size: [0.13, 0.36] as [number, number],
		intensity: 1.4,
		opacity: 0.85,
		life: [8, 16] as [number, number],
	},
} satisfies Record<string, ParticleSystemOptions>;

export type FieldLookName =
	| "mote"
	| "spark"
	| "quiet"
	| "cursor"
	| "aurora"
	| "wake"
	| IrisFieldLookName;

/**
 * Fields are checked against `ParticleSystemOptions` directly rather than
 * through `as const`, unlike the glass and lens registries. `as const` makes
 * every array a readonly tuple, and `colors` is a tuple the shader depends on
 * being exactly three, so the readonly form stops satisfying the type and the
 * whole registry fails to compile.
 */
export const FIELD_LOOKS: Record<FieldLookName, ParticleSystemOptions> = {
	...IRIS_FIELD_LOOKS,
	mote: {
		count: 1_400,
		emitter: { shape: "sphere", radius: 0.7, speed: 0.1, spread: 0.85 },
		forces: {
			turbulence: 0.32,
			vortex: 0.38,
			drag: 0.24,
			attractor: 1.6,
			attractorRadius: 1.5,
		},
		colors: ["#f6ead8", "#7ee0ff", "#e7c2ff"],
		size: [0.012, 0.034],
		intensity: 1.1,
		opacity: 0.82,
		life: [8, 16],
	},
	spark: {
		count: 64,
		emitter: { shape: "sphere", radius: 2.4, speed: 0.04, spread: 1 },
		forces: { turbulence: 0.15, drag: 0.28, attractor: 0 },
		colors: ["#f6ead8", "#9ae6ff", "#e7c2ff"],
		size: [0.008, 0.02],
		intensity: 0.32,
		opacity: 0.24,
		life: [12, 20],
	},
	/** Held light for a product page. Dense enough to read, quiet enough to typeset beside. */
	quiet: {
		count: 420,
		emitter: { shape: "sphere", radius: 0.55, speed: 0.06, spread: 0.7 },
		forces: {
			turbulence: 0.16,
			vortex: 0.2,
			drag: 0.32,
			attractor: 1.2,
			attractorRadius: 1.15,
		},
		colors: ["#f6ead8", "#d5e7ef", "#f0d2b4"],
		size: [0.008, 0.02],
		intensity: 0.42,
		opacity: 0.5,
		life: [10, 18],
	},
	/**
	 * A page-sized cloud for a pointer field. Wider than a lens mote, no brighter
	 * than `quiet`, so a gather does not become a lamp.
	 */
	cursor: {
		count: 1_400,
		emitter: { shape: "sphere", radius: 2.2, speed: 0.04, spread: 0.7 },
		forces: {
			turbulence: 0.14,
			vortex: 0.08,
			drag: 0.28,
			attractor: 1.15,
			attractorRadius: 2.4,
			attractorFalloff: 1.45,
		},
		colors: ["#e4d6ff", "#c5dceb", "#f0d8c2"],
		size: [0.014, 0.03],
		intensity: 0.4,
		opacity: 0.64,
		life: [7, 13],
	},
	/**
	 * A page-sized curtain. The count is a composed workload, not a 1M claim.
	 * Attractor stays off so this does not become a gather. The local stir is
	 * what `<ParticleField flow>` walks toward the pointer.
	 */
	aurora: {
		count: 36_000,
		emitter: {
			shape: "box",
			position: [0, 1.05, 0.15],
			size: [7.2, 1.55, 1.15],
			speed: 0.08,
			spread: 1,
		},
		forces: {
			gravity: [0, 0.02, 0],
			drag: 0.16,
			wind: [0.18, 0.04, 0],
			turbulence: 0.72,
			noiseScale: 0.18,
			noiseDrift: 0.07,
			vortex: 0.16,
			attractor: 0,
			stir: 1.35,
			stirRadius: 2.6,
		},
		colors: ["#9dffd8", "#8ecfff", "#d4c2ff"],
		hotColor: "#f3fff8",
		hotAmount: 0.12,
		/** A colour, not a lamp. The mix does not scale intensity. */
		stirColor: "#efe6b0",
		stirTint: 0.7,
		speedReference: 1.4,
		size: [0.016, 0.04],
		intensity: 0.52,
		opacity: 0.48,
		life: [10, 18],
		bounds: "box",
		boundsSize: [8.4, 3.4, 2.4],
		bounce: 0.12,
		blending: "additive",
	},
	/** Rising strokes with a GPU history. Not brighter than aurora's curtain. */
	wake: WAKE_FIELD,
};

/** Shallow-merge a field look. `emitter` and `forces` merge one level down. */
export function fieldOptions(
	name: FieldLookName,
	patch: ParticleSystemOptions = {},
): ParticleSystemOptions {
	const base = FIELD_LOOKS[name];
	return {
		...base,
		...patch,
		emitter: { ...base.emitter, ...patch.emitter },
		forces: { ...base.forces, ...patch.forces },
	};
}

/**
 * DOM glass that can sit on a product page without a wall of props.
 *
 * Parameters are calibrated against a 200px reference card (`Math.min(w, h) = 200`).
 * At runtime, `bevel` and `refraction` auto-scale proportionally by
 * `Math.max(1, Math.min(width, height)) / 200` to maintain consistent relative glass
 * thickness across chips and large hero panels alike.
 */
export const GLASS_LOOKS = {
	/*
	 * A slab of glass rather than a pane of it.
	 *
	 * Every look this library had kept `bevel` between 14 and 22 and `refraction`
	 * between 14 and 36 — thin glass, all of it, and measured across the looks the
	 * difference between the thickest and the thinnest was a few pixels of edge.
	 * **The feedback that produced this was "液态玻璃一定要特别特别厚"**, and the
	 * reason the library did not have that is that "thick" is not one parameter: it
	 * is a large bevel relative to the element, strong enough refraction to bend
	 * what is behind it, and enough dispersion that the bend separates into colour.
	 *
	 * Numbers chosen against the geometry rather than by eye. `bevel: 78` on a
	 * 200px card means the bevel occupies nearly two fifths of it, which is what a
	 * slab of glass looks like from an angle — the flat window in the middle is the
	 * smaller part. `refraction: 96` is large enough that a pigment field behind it
	 * visibly moves rather than merely softening.
	 *
	 * `frost` is low on purpose. Thick glass is not frosted glass: a frosted slab
	 * hides what is behind it, and the whole point of a slab is that you can see
	 * through two centimetres of it and watch the edges bend.
	 *
	 * ## The bevel came down and the radius went up, and that is a correction
	 *
	 * The three were first built by making each one "more" than the last, which is
	 * the wrong axis. The brief describes three *shapes* rather than three amounts:
	 * a **plump spherical bubble**, a **flatter but still heavy pane**, and the
	 * **most substantial block with the most complex refraction**. Those order by
	 * radius — 96, 20, 34 — not by bevel.
	 *
	 * `bevel: 78` on the slab was also rejected on sight: **"方一点，不要太立体"**,
	 * and a bevel that wide is exactly what makes a panel look moulded rather than
	 * cut. Thickness is carried by `refraction` and `dispersion` — how far the
	 * image behind moves and how far it separates into colour — and those are
	 * unchanged at 96 and 0.34.
	 */
	slab: {
		radius: 34,
		bevel: 46,
		refraction: 96,
		dispersion: 0.34,
		roughness: 0,
		frost: 0,
		specular: 0.88,
		edgeGlow: 0.42,
	},
	/* A pane: real refraction, a modest edge, and a flat interior. The everyday
	   glass for a card that has to stay readable. */
	pane: {
		radius: 20,
		bevel: 30,
		refraction: 52,
		dispersion: 0.24,
		roughness: 0,
		frost: 0,
		specular: 0.75,
		edgeGlow: 0.36,
	},
	/* Droplets: a wide soft edge, clear water drop curve. */
	dew: {
		radius: 28,
		bevel: 40,
		refraction: 38,
		dispersion: 0.16,
		roughness: 0,
		frost: 0,
		specular: 0.82,
		edgeGlow: 0.48,
	},
	product: {
		radius: 28,
		bevel: 22,
		refraction: 36,
		dispersion: 0.22,
		roughness: 0,
		frost: 0,
		specular: 0.68,
		edgeGlow: 0.38,
		tintAmount: 0.05,
		pointerStrength: 0.4,
		pointerRadius: 280,
		environment: 0.42,
	},
	cinema: {
		radius: 30,
		bevel: 22,
		refraction: 32,
		dispersion: 0.2,
		roughness: 0,
		frost: 0,
		specular: 0.5,
		edgeGlow: 0.34,
		tintAmount: 0.04,
		pointerStrength: 0.5,
		pointerRadius: 320,
		environment: 0.34,
	},
	/** Text you have to read. Low bend, so the sentence wins. */
	quiet: {
		radius: 22,
		bevel: 16,
		refraction: 14,
		dispersion: 0.08,
		roughness: 0.12,
		frost: 6,
		specular: 0.26,
		edgeGlow: 0.12,
		tintAmount: 0.03,
		pointerStrength: 0.18,
		pointerRadius: 160,
		environment: 0.2,
	},
	pill: {
		radius: 999,
		bevel: 14,
		refraction: 16,
		dispersion: 0.16,
		roughness: 0.16,
		frost: 10,
		specular: 0.32,
		edgeGlow: 0.16,
		pointerStrength: 0.35,
		pointerRadius: 180,
		environment: 0.32,
	},
	/**
	 * A card the pointer can find. The highlight is tighter than cinema; the
	 * room stays under cinema's probe mix.
	 */
	cursor: {
		radius: 28,
		bevel: 18,
		refraction: 20,
		dispersion: 0.12,
		roughness: 0.16,
		frost: 8,
		specular: 0.32,
		edgeGlow: 0.14,
		tintAmount: 0.04,
		pointerStrength: 0.48,
		pointerRadius: 200,
		environment: 0.22,
	},
	/**
	 * The clear registration pane. Wide bevel, strong bend, almost no frost,
	 * so a hairline behind it reads as refraction. `environment` scales the
	 * shared studio probe; it is not a gain and not a cubemap.
	 */
	press: {
		radius: 18,
		bevel: 34,
		refraction: 58,
		dispersion: 0.55,
		roughness: 0.02,
		frost: 2,
		specular: 0.36,
		edgeGlow: 0.2,
		tintAmount: 0.02,
		pointerStrength: 0.2,
		pointerRadius: 180,
		environment: 0.26,
	},
	/**
	 * The frosted pane beside `press`. The DOM sentence stays sharp; the
	 * sampled sheet goes soft. Lower probe mix than `press`, still not a gain.
	 */
	milk: {
		radius: 18,
		bevel: 14,
		refraction: 10,
		dispersion: 0.02,
		roughness: 0.78,
		frost: 42,
		specular: 0.14,
		edgeGlow: 0.05,
		tintAmount: 0.06,
		pointerStrength: 0.12,
		pointerRadius: 160,
		environment: 0.16,
	},
	/**
	 * A pane the curtain can bend through. Quieter than cinema, so the sentence
	 * stays readable while the field is still visible in the glass.
	 */
	veil: {
		radius: 26,
		bevel: 18,
		refraction: 22,
		dispersion: 0.12,
		roughness: 0.14,
		frost: 8,
		specular: 0.28,
		edgeGlow: 0.14,
		tintAmount: 0.05,
		pointerStrength: 0.26,
		pointerRadius: 200,
		environment: 0.22,
	},
	/* Apple visionOS Signature Liquid Glass Presets */
	/** Crystal: thick Apple visionOS liquid glass card with dual-lobe specular & C2 continuous capsule. */
	"apple-crystal": {
		radius: 40,
		bevel: 16,
		refraction: 28,
		dispersion: 0.22,
		roughness: 0.02,
		frost: 0,
		specular: 0.88,
		edgeGlow: 0.62,
		tint: "#ffffff",
		tintAmount: 0.02,
		saturation: 1.18,
	},
	/** Floating navigation stadium capsule with gleaming top crest. */
	"apple-pill": {
		radius: 999,
		bevel: 14,
		refraction: 24,
		dispersion: 0.22,
		roughness: 0.02,
		frost: 0,
		specular: 0.88,
		edgeGlow: 0.62,
		tint: "#ffffff",
		tintAmount: 0.02,
		saturation: 1.18,
	},
	/** Frosted visionOS control center / dock pane with soft blur and low specular. */
	"frosted-dock": {
		radius: 32,
		bevel: 18,
		refraction: 18,
		dispersion: 0.12,
		roughness: 0.35,
		frost: 28,
		specular: 0.42,
		edgeGlow: 0.28,
		tint: "#ffffff",
		tintAmount: 0.04,
		saturation: 1.12,
	},
	// Semantic aliases
	crystal: {
		radius: 40,
		bevel: 16,
		refraction: 28,
		dispersion: 0.22,
		roughness: 0.02,
		frost: 0,
		specular: 0.88,
		edgeGlow: 0.62,
		tint: "#ffffff",
		tintAmount: 0.02,
		saturation: 1.18,
	},
	capsule: {
		radius: 999,
		bevel: 14,
		refraction: 24,
		dispersion: 0.22,
		roughness: 0.02,
		frost: 0,
		specular: 0.88,
		edgeGlow: 0.62,
		tint: "#ffffff",
		tintAmount: 0.02,
		saturation: 1.18,
	},
	frosted: {
		radius: 32,
		bevel: 18,
		refraction: 18,
		dispersion: 0.12,
		roughness: 0.35,
		frost: 28,
		specular: 0.42,
		edgeGlow: 0.28,
		tint: "#ffffff",
		tintAmount: 0.04,
		saturation: 1.12,
	},
	/* The IRIS looks are defined in @ui-lib/core so @ui-lib/dom can share
	   them without depending on this package. */
	...IRIS_GLASS_LOOKS,
} as const satisfies Record<string, GlassPanelOptions>;

export type GlassLookName = keyof typeof GLASS_LOOKS;
export type GlassPresetName = GlassLookName;

export interface ResolveGlassOptions {
	preset?: GlassPresetName;
	look?: GlassLookName;
	/**
	 * Thickness in millimeters (standard reference is 28mm).
	 * Scales bevel and refraction proportionally relative to 28mm.
	 */
	thickness?: number;
	overrides?: Partial<GlassPanelOptions>;
}

/**
 * Resolves a high-level glass preset with optional thickness scaling and property overrides.
 */
export function resolveGlassPreset(
	presetOrOptions: GlassPresetName | ResolveGlassOptions = "apple-crystal",
	overrides: Partial<GlassPanelOptions> = {},
): GlassPanelOptions {
	const opts: ResolveGlassOptions =
		typeof presetOrOptions === "string"
			? { preset: presetOrOptions, overrides }
			: { ...presetOrOptions, overrides: { ...presetOrOptions.overrides, ...overrides } };

	const key = (opts.preset ?? opts.look ?? "apple-crystal") as GlassLookName;
	const base = GLASS_LOOKS[key] ?? GLASS_LOOKS["apple-crystal"];
	const merged: GlassPanelOptions = { ...base, ...definedPatch(opts.overrides ?? {}) };

	if (
		typeof opts.thickness === "number" &&
		Number.isFinite(opts.thickness) &&
		opts.thickness > 0
	) {
		const scale = opts.thickness / 28;
		if (opts.overrides?.bevel === undefined && base.bevel !== undefined) {
			merged.bevel = Math.round(base.bevel * scale);
		}
		if (opts.overrides?.refraction === undefined && base.refraction !== undefined) {
			merged.refraction = Math.round(base.refraction * scale);
		}
	}

	return merged;
}
