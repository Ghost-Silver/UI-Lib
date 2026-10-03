import { IRIS } from "@ui-lib/core";
import { forwardRef } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";

export interface PinkPaperButtonProps
	extends IrisPanelProps,
		Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "children"> {
	/** Stretch to the container. Default hugs its label. */
	block?: boolean;
}

/**
 * A button that feels like pressed paper.
 *
 * A real `<button>`: it keeps its type, its disabled state, its focus ring and
 * its keyboard behaviour. The glass is the sheen across the sheet; the fibre
 * is a CSS grain, because a texture that has to move with the pointer is not
 * something a screen-space refractor can give you honestly.
 *
 * ```tsx
 * <PinkPaperButton tone="blossom" onClick={start}>开始</PinkPaperButton>
 * ```
 */
export const PinkPaperButton = forwardRef<HTMLButtonElement, PinkPaperButtonProps>(
	function PinkPaperButton(
		{ tone = "blossom", block = false, className, style, children, ...props },
		ref,
	) {
		const { options, rest } = splitGlassProps(props, {
			...GLASS_LOOKS.iris,
			radius: 18,
			refraction: 14,
			frost: 6,
			tint: IRIS[tone][100],
			tintAmount: 0.24,
		});

		return (
			<GlassPanel
				as="button"
				ref={ref}
				type="button"
				className={irisClass("paper-button", tone, className)}
				data-ui-lib-block={block ? "" : undefined}
				style={style}
				{...rest}
				{...options}
			>
				{children}
			</GlassPanel>
		);
	},
);
