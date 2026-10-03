import { IRIS, IRIS_GLASS_LOOKS, type IrisTone, mergeDefined } from "@ui-lib/core";
import type { GlassPanelHandle, GlassPanelOptions } from "@ui-lib/renderer";
import { createEffect } from "./magic.js";

/**
 * The IRIS components, for pages that are not React.
 *
 * One call per component, one thing to remember: hand it an element and it
 * comes back wearing the right look. The element keeps its own semantics — a
 * `<button>` here is still a button, a `<span>` is still a span — and the
 * shared glass layer is reused, so a page can decorate twenty elements and
 * still own exactly one canvas.
 *
 * ```ts
 * import { bubbleBadge, watercolorCard } from "@ui-lib/dom";
 *
 * const handle = await bubbleBadge(document.querySelector(".tag")!);
 * // ...later
 * handle.dispose();
 * ```
 */

export interface IrisEffectOptions extends GlassPanelOptions {
	/** Accent family. Defaults to the brand violet. */
	tone?: IrisTone;
}

type EffectFactory = (
	element: HTMLElement,
	options?: IrisEffectOptions,
) => Promise<GlassPanelHandle>;

/**
 * Build one entry point from a look.
 *
 * Every component differs only in which look it starts from and how much of
 * the palette its tint carries, so they are generated rather than written out
 * four times.
 */
function irisEffect(
	lookName: keyof typeof IRIS_GLASS_LOOKS,
	tintAmount?: number,
): EffectFactory {
	const look = IRIS_GLASS_LOOKS[lookName];
	return async function apply(element, options = {}) {
		const { tone = "iris", ...overrides } = options;
		return createEffect(element, {
			...mergeDefined<GlassPanelOptions, GlassPanelOptions>(look as GlassPanelOptions, {
				...(tintAmount === undefined ? {} : { tintAmount }),
				tint: IRIS[tone][100],
			}),
			...overrides,
		} as Partial<GlassPanelOptions>);
	};
}

/** A rounded bead for a short label. */
export const bubbleBadge: EffectFactory = irisEffect("iris");

/** A pane that reads as light rather than as a window. */
export const softLightPanel: EffectFactory = irisEffect("glow");

/** A card under a watercolour wash. */
export const watercolorCard: EffectFactory = irisEffect("wash");

/** A button that feels like pressed paper. */
export const paperButton: EffectFactory = irisEffect("iris", 0.24);
