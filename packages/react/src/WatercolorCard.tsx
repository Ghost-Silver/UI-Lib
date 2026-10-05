import { IRIS } from "@ui-lib/core";
import { forwardRef, type HTMLAttributes, useRef } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";
import { useTilt } from "./tilt.js";

export interface WatercolorCardProps
	extends IrisPanelProps,
		Omit<HTMLAttributes<HTMLDivElement>, "color"> {
	/**
	 * Where the pigment pools. A wash is never even, so the blooms sit off
	 * centre by default; `still` puts a single pool in the middle for cards
	 * that need to look settled.
	 */
	pools?: "offCentre" | "still";
	/** Lean into horizontal pointer speed using calibrated spring damping (zeta = 0.55). */
	tilt?: boolean;
}

/**
 * A card under a watercolour wash.
 *
 * The pigment is layered CSS radials rather than a texture, so it recolours
 * with `tone` and costs nothing to ship. The glass on top is real: it refracts
 * whatever the page has behind it, which is what stops the wash from reading
 * as a flat gradient once the card scrolls over something.
 *
 * ```tsx
 * <WatercolorCard tone="blossom">
 *   <h3>水彩卡片</h3>
 *   <p>字仍然可选、可聚焦。</p>
 * </WatercolorCard>
 * ```
 */
export const WatercolorCard = forwardRef<HTMLDivElement, WatercolorCardProps>(
	function WatercolorCard(
		{ tone = "iris", pools = "offCentre", tilt = false, className, style, children, ...props },
		ref,
	) {
		const host = useRef<HTMLDivElement | null>(null);
		useTilt(host, { enabled: Boolean(tilt) });

		const setHost = (node: HTMLDivElement | null) => {
			host.current = node;
			if (typeof ref === "function") ref(node);
			else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
		};

		const { options, rest } = splitGlassProps(props, {
			...GLASS_LOOKS.wash,
			tint: IRIS[tone][100],
		});

		return (
			<GlassPanel
				ref={setHost}
				className={irisClass("watercolor-card", tone, className)}
				data-ui-lib-pools={pools}
				style={style}
				{...rest}
				{...options}
			>
				{children}
			</GlassPanel>
		);
	},
);
