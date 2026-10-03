import { createWash, type IrisTone, type WashResult } from "@ui-lib/core";
import { useMemo } from "react";

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
	 * Makes this instance's mark different from another's. Omit to get one from
	 * the component's own position in the tree, which is stable but arbitrary.
	 */
	seed?: number;
	/** A name, hashed into the seed. Use this when a value should follow an entity. */
	name?: string;
}

/** The pigment per tone, so every material asks the palette the same way. */
const TONE_HUE: Record<IrisTone, string> = {
	iris: "#b79cf5",
	blossom: "#ffb7c5",
	mist: "#9ad9ff",
};

/** How strong each material is. `plain` has none. */
const MATERIAL_WEIGHT: Record<SoftMaterial, number> = {
	plain: 0,
	tint: 0.42,
	wash: 0.85,
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

export function useMaterial(options: MaterialOptions = {}): MaterialResult {
	const { material = "plain", tone = "iris", weight, seed, name } = options;

	/*
	 * The wash is memoised on its inputs, because it is not cheap: it generates
	 * two SVG turbulence layers and a five-stop conic gradient as strings, and
	 * redoing that on every render of a list of cards is real work for a value
	 * that cannot have changed.
	 */
	const wash = useMemo(() => {
		if (material === "plain") return null;
		return createWash({
			hue: TONE_HUE[tone],
			weight: weight ?? MATERIAL_WEIGHT[material],
			seed: name !== undefined ? seedFromName(name) : (seed ?? 1),
			// A surface is never wet. The wet states describe a *stroke* — pigment
			// still moving — and a card that looked like it was still spreading
			// would read as unfinished rather than as soft.
			state: "dry",
		});
	}, [material, tone, weight, seed, name]);

	return useMemo(() => {
		if (!wash) return { className: "", style: {}, wash };
		/*
		 * The ground class **and not** `wash.className`, which is the second
		 * version of this and the first one was wrong in a way that took three
		 * measurements to find.
		 *
		 * `createWash` returns `ui-lib-wash ui-lib-wash--dry`, and that base
		 * class is written for a *stroke*: it sets `background`, `border-radius`,
		 * a lobed silhouette, a rotation and an opacity — the whole appearance of
		 * a mark on paper. It also sets `background` as a shorthand, which resets
		 * `background-color` to transparent and silently undid the paper ground
		 * this class declares. Measured, every material card had a fully
		 * transparent background no matter what the stylesheet said, and the
		 * matched-rule list was the only thing that showed why: both classes
		 * matched and the wash one won.
		 *
		 * So a ground takes the **variables** and not the class. The generator's
		 * output is the right thing to carry; its default presentation is the
		 * right thing for a mark and the wrong thing for a surface.
		 */
		return {
			className: MATERIAL_GROUND_CLASS,
			style: wash.style as unknown as React.CSSProperties,
			wash,
		};
	}, [wash]);
}
