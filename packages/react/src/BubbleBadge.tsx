import { mergeDefined } from "@ui-lib/core";
import { forwardRef } from "react";
import { GlassPanel, type GlassPanelProps } from "./GlassPanel.js";
import { GLASS_LOOKS } from "./looks.js";

export interface BubbleBadgeProps extends Omit<GlassPanelProps, "as"> {}

export const BubbleBadge = forwardRef<HTMLSpanElement, BubbleBadgeProps>(
	function BubbleBadge(props, ref) {
		const { children, className, style, ...rest } = props;

		const mergedProps = mergeDefined(
			GLASS_LOOKS.iris,
			{
				radius: 999, // Pill shape
				refraction: 24,
				specular: 0.6,
				frost: 8,
			},
			rest as any
		);

		return (
			<GlassPanel
				as="span"
				ref={ref}
				className={className}
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "4px 12px",
					fontSize: "0.85em",
					color: "#7b2ff7",
					fontWeight: "bold",
					...style,
				}}
				{...mergedProps}
			>
				{children}
			</GlassPanel>
		);
	},
);