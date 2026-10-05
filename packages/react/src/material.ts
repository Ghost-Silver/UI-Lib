import {
	createWash,
	type IrisTone,
	mixToCss,
	parseColour,
	pigmentFromHex,
	type WashResult,
} from "@ui-lib/core";
import { useEffect, useMemo, useState } from "react";

/**
 * Surfaces a component can be made of.
 *
 * Three, and they are three amounts of the same substance rather than three
 * unrelated styles — the same relationship the tag's variants have. That is
 * deliberate: a design system where every material is its own invention has no
 * material system, only a set of surfaces that happen to be in the same file.
 *
 *  - **plain** — paper. The default everywhere, because most of an interface
 *    should be paper and the material should be the exception that draws the
 *    eye.
 *  - **wash** — a pigmented ground. For a card that is a thing rather than a
 *    container: a summary, a specimen, a piece of content that has been
 *    collected.
 *  - **tint** — the same pigment at low concentration, used to group rather
 *    than to distinguish. Two of these next to each other should read as one
 *    region with a boundary, not as two objects.
 */
export type SoftMaterial = "plain" | "wash" | "tint";

export interface MaterialOptions {
	material?: SoftMaterial;
	/** Which family the pigment comes from. Ignored by `plain`. */
	tone?: IrisTone;
	/**
	 * Where in the range the film sits, 0 to 1. This is the generator's own
	 * `weight` and it means the same thing here: how far the deposit has run.
	 */
	weight?: number;
	/**
	 * Give the paper a grain direction.
	 *
	 * Off by default and it should stay off for most surfaces: two isotropic noise
	 * passes read as *a sheet of paper*, and a directional one reads as a specific
	 * kind of paper — xuan, laid, watercolour cold-press. That is a decision about
	 * what the surface is, not a quality setting.
	 */
	fibre?: boolean;
	/** Which way the grain runs, in degrees. Ignored when `fibre` is false. */
	fibreAngle?: number;
	/**
	 * Makes this instance's mark different from another's. Omit to get one from
	 * the component's own position in the tree, which is stable but arbitrary.
	 */
	seed?: number;
	/** A name, hashed into the seed. Use this when a value should follow an entity. */
	name?: string;
}

/** The pigment per tone, so every material asks the palette the same way. */
/**
 * Which token carries each tone's pigment.
 *
 * The hue used to be three hex strings written here, which meant a wash was the
 * same colour in every theme — the one part of the library a palette could not
 * reach. Measured in the cyberpunk theme: every surface followed, and the material
 * stayed pastel.
 *
 * The generator needs a colour value, not a CSS variable name, so the variable is
 * read at render time and its OKLCH value converted. That is the whole reason
 * `oklchToSrgb` exists outside of the contrast checker.
 */
const TONE_TOKEN: Record<IrisTone, string> = {
	iris: "--moe-material-pigment-taro",
	blossom: "--moe-material-pigment-sakura",
	mist: "--moe-material-pigment-soda",
};

/** The fallbacks, for a server render or a document with no stylesheet yet. */
const TONE_FALLBACK: Record<IrisTone, string> = {
	iris: "#b79cf5",
	blossom: "#ffb7c5",
	mist: "#9ad9ff",
};

/**
 * Resolve a tone to a colour the generator can use.
 *
 * `getComputedStyle` is only available in a browser; on the server the fallback is
 * used, and the wash is regenerated on the client once the stylesheet exists —
 * the same value the fallback produces in the default theme, so nothing flickers.
 */
/**
 * The weight a theme asks for, or the default when there is no stylesheet yet.
 *
 * Returns `undefined` rather than the default when a token is present but
 * unparseable, so the caller can fall back — a `NaN` weight would generate a wash
 * with no deposit at all and look like a rendering bug.
 */
function resolveWeight(material: SoftMaterial, fallback: number): number {
	if (typeof window === "undefined" || material === "plain") return fallback;
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue(MATERIAL_WEIGHT_TOKEN[material])
		.trim();
	if (!raw) return fallback;
	const value = Number(raw);
	return Number.isFinite(value) ? value : fallback;
}

function resolveTone(tone: IrisTone, element?: HTMLElement | null): string {
	if (typeof window === "undefined") return TONE_FALLBACK[tone];
	const host = element ?? document.documentElement;
	const raw = getComputedStyle(host).getPropertyValue(TONE_TOKEN[tone]).trim();
	if (!raw) return TONE_FALLBACK[tone];
	const parsed = parseColour(raw);
	if (!parsed) return TONE_FALLBACK[tone];
	const hex = (v: number) => v.toString(16).padStart(2, "0");
	return `#${hex(parsed.r)}${hex(parsed.g)}${hex(parsed.b)}`;
}

/**
 * How strong each material is. `plain` has none.
 *
 * These are the generator's `weight` — how far the deposit has run — and they
 * are **higher than the same material would use for a mark**. A ground is a
 * surface with content on top of it, so it has to be legible through its own
 * content rather than looked at directly, and it is composited at a fraction of
 * the mark's strength on top of that.
 *
 * The numbers are measured rather than chosen. At the mark's own strengths
 * (`tint` 0.42, `wash` 0.85) the two grounds came out at 0.063 and 0.088 effective
 * opacity against the paper — and the three palettes were **0.39 apart**, which
 * the component gate reported as "tones are not distinguishable" on a list that
 * was, in fact, tinted. The surfaces looked identical because they nearly were.
 */
const MATERIAL_WEIGHT: Record<SoftMaterial, number> = {
	plain: 0,
	/*
	 * The gap between these two was 0.62 to 1.0, and measured that is the difference
	 * between `rgb(238 218 255)` and `rgb(228 200 255)` — ten, eighteen and zero on
	 * the three channels. **A user cannot tell those apart**, which makes a
	 * three-value prop that only really has two.
	 *
	 * `tint` is now a whisper and `wash` is a wash: the first is for grouping
	 * without drawing attention, the second is the surface being a colour. The
	 * earlier numbers came from measuring contrast and lowering until it passed,
	 * which is how a distinction gets lost — the fix for contrast is the ink on the
	 * material, not the amount of material.
	 */
	tint: 0.34,
	wash: 1.35,
};

/**
 * The same weights, read from tokens when a theme wants to differ.
 *
 * The defaults above are the pastel theme's; a theme may lay pigment down more
 * thinly. Read at the same moment the pigment is, so a theme change re-reads both
 * rather than one of them.
 */
const MATERIAL_WEIGHT_TOKEN: Record<SoftMaterial, string> = {
	plain: "",
	tint: "--moe-material-tint",
	wash: "--moe-material-wash",
};

/**
 * A stable seed from a name.
 *
 * FNV-1a, and the reason it is here rather than `Math.random` is the same
 * reason the wash generator has one: a material that reshuffles on every render
 * is a surface that flickers, and one that differs between the server and the
 * client is a hydration mismatch.
 */
export function seedFromName(name: string): number {
	let hash = 2166136261;
	for (let i = 0; i < name.length; i += 1) {
		hash ^= name.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash) % 100000;
}

export interface MaterialResult {
	/** Put this on the element. Empty for `plain`. */
	className: string;
	/** Merge into the element's inline style. Empty for `plain`. */
	style: React.CSSProperties;
	/** The generator's output, for a component that wants to draw the mark itself. */
	wash: WashResult | null;
}

/**
 * Declare a surface's material, and get back what to put on the element.
 *
 * The point of this existing at all, rather than each component calling
 * `createWash` directly: the mapping from "what kind of surface is this" to
 * twelve custom properties is a decision that should be made once. A card, a
 * panel and a table that each work it out independently will drift, and the
 * drift is invisible because every one of them is defensible on its own.
 *
 * It is a hook rather than a component because material is not structure. A
 * card, a badge and a row of a table are all surfaces; wrapping them in a
 * `<Material>` element would put an extra box in every one of their layouts,
 * and the box would then have to be told to be `display: contents`, which is
 * the same amount of code for a worse result.
 *
 * ```ts
 * const surface = useMaterial({ material: "wash", tone: "iris" });
 * <div className={surface.className} style={surface.style} />
 * ```
 */
export const MATERIAL_GROUND_CLASS = "ui-lib-material--ground";

/**
 * Linearise sRGB channel and calculate relative luminance.
 */
export function srgbLuminance(r: number, g: number, b: number): number {
	const chan = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

export interface GroundContrast {
	luminance: number;
	onMaterial: string;
	onMaterialSoft: string;
}

/**
 * Dynamically compute effective ground luminance and appropriate on-material ink tokens.
 */
export function computeEffectiveGroundLuminance(options: {
	cardColor?: string;
	pigmentColor?: string;
	weight?: number;
	theme?: string;
	washCss?: string;
}): GroundContrast {
	const { cardColor, pigmentColor, weight = 1, theme, washCss } = options;
	let luminance = 0.95;

	if (washCss) {
		const match = washCss.match(
			/rgb\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/,
		);
		if (match) {
			const parsed = parseColour(match[0]);
			if (parsed) {
				luminance = srgbLuminance(parsed.r, parsed.g, parsed.b);
			}
		}
	} else if (pigmentColor) {
		try {
			const p = pigmentFromHex(pigmentColor);
			const css = mixToCss([p], { thickness: (weight || 1) * 0.7, backing: 1 });
			const parsed = parseColour(css);
			if (parsed) {
				luminance = srgbLuminance(parsed.r, parsed.g, parsed.b);
			}
		} catch {
			const parsed = parseColour(pigmentColor);
			if (parsed) luminance = srgbLuminance(parsed.r, parsed.g, parsed.b);
		}
	} else if (cardColor) {
		const parsed = parseColour(cardColor);
		if (parsed) {
			luminance = srgbLuminance(parsed.r, parsed.g, parsed.b);
		}
	} else if (theme === "cyberpunk") {
		luminance = 0.05;
	} else if (theme === "obsidian") {
		luminance = 0.08;
	}

	let onMaterial: string;
	let onMaterialSoft: string;
	if (luminance >= 0.22) {
		onMaterial = "oklch(0.10 0.02 265.76)";
		onMaterialSoft = "oklch(0.20 0.02 265.76)";
	} else if (theme === "cyberpunk") {
		onMaterial = "oklch(0.96 0.01 202.88)";
		onMaterialSoft = "oklch(0.75 0.02 202.88)";
	} else if (theme === "obsidian") {
		onMaterial = "oklch(0.95 0.01 261.69)";
		onMaterialSoft = "oklch(0.72 0.02 261.69)";
	} else {
		onMaterial = "oklch(0.96 0.01 265.76)";
		onMaterialSoft = "oklch(0.75 0.02 265.76)";
	}

	return { luminance, onMaterial, onMaterialSoft };
}

export function useMaterial(options: MaterialOptions = {}): MaterialResult {
	const { material = "plain", tone = "iris", weight, seed, name, fibre, fibreAngle } = options;

	const [theme, setTheme] = useState(() =>
		typeof document !== "undefined"
			? (document.documentElement.getAttribute("data-moe-theme") ?? "")
			: "",
	);
	const [pigment, setPigment] = useState(() => TONE_FALLBACK[tone]);
	const [resolvedWeight, setResolvedWeight] = useState(() => MATERIAL_WEIGHT[material]);
	useEffect(() => {
		setPigment(resolveTone(tone));
		setResolvedWeight(resolveWeight(material, MATERIAL_WEIGHT[material]));
		if (typeof document !== "undefined") {
			setTheme(document.documentElement.getAttribute("data-moe-theme") ?? "");
		}
		if (typeof MutationObserver === "undefined") return;
		const read = () => {
			setPigment(resolveTone(tone));
			setResolvedWeight(resolveWeight(material, MATERIAL_WEIGHT[material]));
			setTheme(document.documentElement.getAttribute("data-moe-theme") ?? "");
		};
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-moe-theme", "class", "style"],
		});
		return () => observer.disconnect();
	}, [tone, material]);

	const wash = useMemo(() => {
		if (material === "plain") return null;
		return createWash({
			hue: pigment,
			weight: weight ?? resolvedWeight,
			fibre,
			fibreAngle,
			seed: name !== undefined ? seedFromName(name) : (seed ?? 1),
			state: "dry",
		});
	}, [material, weight, seed, name, pigment, resolvedWeight, fibre, fibreAngle]);

	const contrast = useMemo(() => {
		if (material === "plain") return null;
		const rawCard =
			typeof window !== "undefined"
				? getComputedStyle(document.documentElement).getPropertyValue("--moe-card").trim()
				: undefined;
		return computeEffectiveGroundLuminance({
			cardColor: rawCard,
			pigmentColor: pigment,
			weight: weight ?? resolvedWeight,
			theme,
			washCss: wash?.style["--wash-body"] as string | undefined,
		});
	}, [material, pigment, weight, resolvedWeight, theme, wash]);

	return useMemo(() => {
		if (!wash) return { className: "", style: {}, wash };
		const style = {
			...(wash.style as unknown as Record<string, string>),
			"--moe-on-material": contrast?.onMaterial ?? "oklch(0.14 0.02 265.76)",
			"--moe-on-material-soft": contrast?.onMaterialSoft ?? "oklch(0.20 0.02 265.76)",
		} as unknown as React.CSSProperties;

		return {
			className: MATERIAL_GROUND_CLASS,
			style,
			wash,
		};
	}, [wash, contrast]);
}
