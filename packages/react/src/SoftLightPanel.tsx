import { IRIS } from "@ui-lib/core";
import { forwardRef, type HTMLAttributes, useRef } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useTilt } from "./tilt.js";
import { useStyles } from "./useStyles.js";

export interface SoftLightPanelProps
	extends IrisPanelProps,
		Omit<HTMLAttributes<HTMLDivElement>, "color"> {
	/** Surface material: plain paper, wash ground, or light tint. */
	material?: SoftMaterial;
	/** Lean into horizontal pointer speed using calibrated spring damping (zeta = 0.55). */
	tilt?: boolean;
}

/**
 * A pane that reads as light rather than as a window.
 *
 * Heavy frost, a wide rim and almost no bend: the edge is meant to bleed into
 * the page instead of drawing a hard silhouette. Reach for this when a block
 * of copy needs to lift off the ground without looking like a card.
 *
 * ```tsx
 * <SoftLightPanel tone="mist">
 *   <h2>标题</h2>
 *   <p>正文仍然是 HTML。</p>
 * </SoftLightPanel>
 * ```
 */
export const SoftLightPanel = forwardRef<HTMLDivElement, SoftLightPanelProps>(
	function SoftLightPanel(
		{ tone = "iris", material, tilt = false, className, style, children, ...props },
		ref,
	) {
		// The stylesheet is not injected by the GPU components alone; see useStyles.
		useStyles();
		const host = useRef<HTMLDivElement | null>(null);
		useTilt(host, { enabled: Boolean(tilt) });

		const setHost = (node: HTMLDivElement | null) => {
			host.current = node;
			if (typeof ref === "function") ref(node);
			else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
		};

		const surface = useMaterial(material ? { material, tone } : {});
		const { options, rest } = splitGlassProps(props, {
			...GLASS_LOOKS.glow,
			tint: IRIS[tone][100],
		});

		return (
			<GlassPanel
				ref={setHost}
				className={[irisClass("soft-light-panel", tone, className), surface.className]
					.filter(Boolean)
					.join(" ")}
				style={{ ...style, ...surface.style }}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
				{...rest}
				{...options}
			>
				{children}
			</GlassPanel>
		);
	},
);
