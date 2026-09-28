import type { ParticleSystemOptions } from "@ui-lib/particles";
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

export type FieldLookName = "mote" | "spark" | "quiet" | "cursor" | "aurora";

/**
 * Particle clouds that belong with a lens. Counts stay high enough to read as
 * a field; intensity is what the grade is allowed to turn down.
 */
export const FIELD_LOOKS: Record<FieldLookName, ParticleSystemOptions> = {
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

/** DOM glass that can sit on a product page without a wall of props. */
export const GLASS_LOOKS = {
	product: {
		radius: 28,
		bevel: 22,
		refraction: 36,
		dispersion: 0.22,
		roughness: 0.2,
		frost: 16,
		specular: 0.45,
		edgeGlow: 0.28,
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
		roughness: 0.18,
		frost: 10,
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
} as const satisfies Record<string, GlassPanelOptions>;

export type GlassLookName = keyof typeof GLASS_LOOKS;
