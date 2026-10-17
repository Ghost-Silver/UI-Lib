import { IRIS } from "@ui-lib/core";
import { forwardRef, type HTMLAttributes } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";

export interface BubbleBadgeProps
	extends IrisPanelProps,
		Omit<HTMLAttributes<HTMLSpanElement>, "color"> {}

/**
 * A rounded bead for a short label.
 *
 * The text stays a real, selectable, focusable DOM node; the glass is painted
 * underneath it by the stage. Fully rounded by default, because a badge with
 * square corners reads as a tag rather than as a bead.
 *
 * ```tsx
 * <BubbleBadge>新</BubbleBadge>
 * <BubbleBadge tone="blossom">限时</BubbleBadge>
 * ```
 */
export const BubbleBadge = forwardRef<HTMLSpanElement, BubbleBadgeProps>(function BubbleBadge(
	{ tone = "iris", className, style, children, ...props },
	ref,
) {
	const { options, rest } = splitGlassProps(props, {
		...GLASS_LOOKS.iris,
		tint: IRIS[tone][100],
	});

	return (
		<GlassPanel
			as="span"
			ref={ref}
			className={irisClass("bubble-badge", tone, className)}
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "5px 14px",
				fontSize: "0.85em",
				fontWeight: 600,
				letterSpacing: "0.01em",
				...style,
			}}
			{...rest}
			{...options}
		>
			{children}
		</GlassPanel>
	);
});
