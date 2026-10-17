/**
 * The IRIS palette.
 *
 * IRIS is the purple iris, so the first voice is violet and the second is the
 * pink of a watercolour wash bleeding into it. Every family carries the same
 * five rungs, which is what keeps one component's `300` meaning the same thing
 * as another's.
 *
 * Two rules the values follow, both from the brief:
 *
 *  - **Nothing fluorescent.** The base rungs sit around 60-75% saturation.
 *    A neon pink reads as a toy; the brand is soft and translucent.
 *  - **The washes stay near white.** `100` is the ground a card or a panel
 *    floats on, so it has to survive text on top of it. Contrast is checked
 *    where the rungs are used for type, not assumed here.
 *
 * Lives in `@ui-lib/core` because it is plain data: `@ui-lib/react` and
 * `@ui-lib/dom` both need it, and neither should have to depend on the other
 * to get a hex value.
 */
export const IRIS = {
	/** Violet. The iris itself, and the default accent. */
	iris: {
		900: "#33224f",
		700: "#5b3aa6",
		500: "#8b5cf6",
		300: "#b79cf5",
		100: "#efeaff",
	},
	/** Pink. The second voice; used for warmth, never as the lead. */
	blossom: {
		900: "#6d1436",
		700: "#c02b6e",
		500: "#ff7fb2",
		300: "#ffc2dc",
		100: "#fff0f7",
	},
	/** Cool blue-violet. Keeps a pastel page from turning into one flat hue. */
	mist: {
		900: "#26375c",
		700: "#4a6da8",
		500: "#8fb0dd",
		300: "#c3d8f0",
		100: "#eef5fd",
	},
	/** Paper and ink. The ground, and the type that sits on it. */
	paper: "#fffafd",
	ink: "#33224f",
	inkSoft: "#6b5687",
} as const;

/** Which accent a component wears. Kept to three so the set stays coherent. */
export type IrisTone = keyof Pick<typeof IRIS, "iris" | "blossom" | "mist">;

export const IRIS_TONES: readonly IrisTone[] = ["iris", "blossom", "mist"];

/**
 * The same accent set, under the name a caller outside this project would use.
 *
 * `IrisTone` is the registry's name — `IRIS` is the palette, and naming the
 * type after it is accurate from inside. From outside, a component prop typed
 * `IrisTone` asks a caller to learn what `Iris` is in order to pass `"blossom"`.
 * The three accents are a *tone* set, and `Tone` says that without requiring
 * anyone to know the project.
 *
 * **An alias rather than a rename**, for the same reason `SoftButton` is one:
 * renaming would break every call site for a naming improvement, and the old
 * name is not wrong so much as inward-looking. Both are exported; the
 * documentation points at the neutral one and the old one keeps working.
 */
export type Tone = IrisTone;

/** The accents, under the neutral name. */
export const TONES: readonly Tone[] = IRIS_TONES;

/**
 * What each accent is called in English, for a caller building a picker.
 *
 * Kept out of the registry because it is a presentation concern: a palette is
 * hex values and roles, and a label is a word in a language.
 */
/**
 * The glass look names, under a neutral name.
 *
 * `IrisGlassLookName` names a set of looks; the set does not belong to a project.
 */
export type GlassLookName = IrisGlassLookName;

/** The roles a tone plays, under a neutral name. */
export type ToneRoles = IrisToneRoles;

export const TONE_LABELS = {
	iris: "Violet",
	blossom: "Blossom",
	mist: "Mist",
} as const satisfies Record<Tone, string>;

/**
 * The rungs a component reaches for. Naming the roles here means a component
 * never hard-codes which rung is the fill and which is the edge.
 */
export interface IrisToneRoles {
	/** Text and icons on the fill. */
	on: string;
	/** The accent itself: borders, active marks. */
	base: string;
	/** Top of the fill gradient. */
	fillTop: string;
	/** Bottom of the fill gradient. */
	fillBottom: string;
	/** The soft bloom behind a card or a button. */
	bloom: string;
}

export function irisTone(tone: IrisTone): IrisToneRoles {
	switch (tone) {
		case "blossom":
			return {
				on: IRIS.blossom[900],
				base: IRIS.blossom[700],
				fillTop: IRIS.blossom[100],
				fillBottom: IRIS.blossom[300],
				bloom: IRIS.blossom[500],
			};
		case "mist":
			return {
				on: IRIS.mist[900],
				base: IRIS.mist[700],
				fillTop: IRIS.mist[100],
				fillBottom: IRIS.mist[300],
				bloom: IRIS.mist[500],
			};
		default:
			return {
				on: IRIS.iris[900],
				base: IRIS.iris[700],
				fillTop: IRIS.iris[100],
				fillBottom: IRIS.iris[300],
				bloom: IRIS.iris[500],
			};
	}
}

/**
 * The IRIS glass looks.
 *
 * These live in `core` rather than beside the other look registries because
 * `@ui-lib/dom` needs them too, and `dom` must not depend on `@ui-lib/react`.
 * They are plain option objects with no particle or renderer types attached,
 * so the dependency-free package can hold them; `GLASS_LOOKS` in the React
 * adapter spreads them back in under the same names.
 */
export const IRIS_GLASS_LOOKS = {
	/** The signature. Violet glass with a wide soft rim, for a pale ground. */
	iris: {
		radius: 999,
		bevel: 14,
		refraction: 20,
		dispersion: 0.1,
		roughness: 0.08,
		frost: 9,
		tint: IRIS.iris[100],
		tintAmount: 0.2,
		specular: 0.55,
		edgeGlow: 0.3,
		pointerStrength: 0.3,
		pointerRadius: 140,
		environment: 0.28,
	},
	/** A soft light rather than a pane: heavy frost, wide rim, little bend. */
	glow: {
		radius: 32,
		bevel: 28,
		refraction: 15,
		dispersion: 0.05,
		roughness: 0.16,
		frost: 22,
		tint: IRIS.iris[100],
		tintAmount: 0.24,
		specular: 0.32,
		edgeGlow: 0.44,
		pointerStrength: 0.22,
		pointerRadius: 340,
		environment: 0.18,
	},
	/** Watercolour: the paint is the subject, so the glass barely bends. */
	wash: {
		radius: 28,
		bevel: 30,
		refraction: 9,
		dispersion: 0.04,
		roughness: 0.3,
		// 10, not 26. The description is "real glass that bends what is behind it",
		// and refraction is not the same thing as a heavy frost. At 26 the crystal
		// text on the card arrived as an embossed ghost — legible, but nothing
		// like the clear type it is named for, and no amount of tuning the text
		// could recover it because the glass was doing the blurring. Bending is
		// kept; the veil is lighter.
		frost: 10,
		tint: IRIS.blossom[100],
		tintAmount: 0.2,
		specular: 0.24,
		edgeGlow: 0.2,
		pointerStrength: 0.18,
		pointerRadius: 380,
		environment: 0.14,
	},
} as const;

/** Which IRIS glass look a component reaches for. */
export type IrisGlassLookName = keyof typeof IRIS_GLASS_LOOKS;
