import type { IrisTone } from "@ui-lib/core";

/**
 * The liquid-glass pane, for pages that are not React.
 *
 * This is the one entry in this package that does **not** touch the shared
 * glass layer, and the reason is worth stating rather than hiding: the other
 * four call `createEffect` and paint on the canvas, because they refract what
 * is behind them and only a shader can do that. This one is `backdrop-filter`
 * — the compositor blurs the page and tints the result — so it costs no
 * canvas, works on a page that has no stage at all, and cannot bend anything.
 *
 * That distinction is the whole abstraction. Reach for this on a heading, a
 * toolbar or a rail: content that sits *on* a pane. Reach for
 * `softLightPanel` or `watercolorCard` for a surface that content sits
 * *behind*, where the bending is the effect.
 *
 * ```ts
 * import { liquidGlass } from "@ui-lib/dom";
 *
 * const glass = liquidGlass(document.querySelector(".wordmark")!, { tint: "iris", glossy: true });
 * // ...later
 * glass.dispose();
 * ```
 */

export interface LiquidGlassOptions {
	/** Which family the pane is tinted toward. */
	tint?: IrisTone;
	/** Sheen strength. Quieter than the React default, for a backdrop element. */
	glossy?: boolean;
	/** Corner radius as a CSS length. */
	radius?: string;
}

/** Per-tint body, rim and inner glow, matching the React component's palette. */
const TINTS: Record<IrisTone, { body: string; rim: string; glow: string }> = {
	iris: {
		body: "oklch(0.88 0.07 300 / 0.42)",
		rim: "oklch(0.99 0.02 305 / 0.85)",
		glow: "oklch(0.72 0.12 300 / 0.35)",
	},
	blossom: {
		body: "oklch(0.9 0.07 10 / 0.42)",
		rim: "oklch(0.99 0.02 10 / 0.85)",
		glow: "oklch(0.76 0.12 10 / 0.35)",
	},
	mist: {
		body: "oklch(0.89 0.06 235 / 0.42)",
		rim: "oklch(0.99 0.02 235 / 0.85)",
		glow: "oklch(0.74 0.11 235 / 0.35)",
	},
};

export interface LiquidGlassHandle {
	/** The element, unchanged. */
	element: HTMLElement;
	/** Removes every class and custom property this added. */
	dispose: () => void;
}

/**
 * Turn an element into a liquid-glass pane.
 *
 * Synchronous, because nothing here is asynchronous: there is no device to
 * acquire and no shader to compile. A caller that only ever needed this could
 * skip the await the other entries require.
 */
export function liquidGlass(
	element: HTMLElement,
	options: LiquidGlassOptions = {},
): LiquidGlassHandle {
	const { tint = "iris", glossy = false, radius = "var(--moe-radius-full)" } = options;
	const palette = TINTS[tint];
	const previous = {
		radius: element.style.getPropertyValue("border-radius"),
		body: element.style.getPropertyValue("--lg-body"),
		rim: element.style.getPropertyValue("--lg-rim"),
		glow: element.style.getPropertyValue("--lg-glow"),
	};

	element.classList.add("ui-lib-liquid-glass");
	element.dataset.uiLibTint = tint;
	if (glossy) element.dataset.uiLibGlossy = "";
	element.style.setProperty("border-radius", radius);
	element.style.setProperty("--lg-body", palette.body);
	element.style.setProperty("--lg-rim", palette.rim);
	element.style.setProperty("--lg-glow", palette.glow);

	// The sheen is a child rather than a pseudo-element so it can be removed
	// with everything else instead of leaving a rule behind on the class.
	const sheen = document.createElement("span");
	sheen.className = "ui-lib-liquid-glass__sheen";
	sheen.setAttribute("aria-hidden", "true");
	element.prepend(sheen);

	return {
		element,
		dispose: () => {
			sheen.remove();
			element.classList.remove("ui-lib-liquid-glass");
			delete element.dataset.uiLibTint;
			delete element.dataset.uiLibGlossy;
			// Restore rather than clear: the element may have had a radius of its
			// own before it was handed to this, and blanking it would lose that.
			element.style.setProperty("border-radius", previous.radius);
			element.style.setProperty("--lg-body", previous.body);
			element.style.setProperty("--lg-rim", previous.rim);
			element.style.setProperty("--lg-glow", previous.glow);
		},
	};
}
