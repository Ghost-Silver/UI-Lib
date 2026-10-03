import { IRIS } from "@ui-lib/core";
import { forwardRef, type HTMLAttributes } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";

export interface SoftLightPanelProps
	extends IrisPanelProps,
		Omit<HTMLAttributes<HTMLDivElement>, "color"> {}

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
	function SoftLightPanel({ tone = "iris", className, style, children, ...props }, ref) {
		const { options, rest } = splitGlassProps(props, {
			...GLASS_LOOKS.glow,
			tint: IRIS[tone][100],
		});

		return (
			<GlassPanel
				ref={ref}
				className={irisClass("soft-light-panel", tone, className)}
				style={style}
				{...rest}
				{...options}
			>
				{children}
			</GlassPanel>
		);
	},
);
