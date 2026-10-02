import { mergeDefined } from "@ui-lib/core";
import type { GlassPanelOptions } from "@ui-lib/renderer";
import { forwardRef } from "react";
import { GlassPanel, type GlassPanelProps } from "./GlassPanel.js";
import { GLASS_LOOKS } from "./looks.js";

export interface BubbleBadgeProps extends Omit<GlassPanelProps, "as"> {}

/**
 * A small, fully rounded glass bead for short labels.
 *
 * Every field of {@link GLASS_LOOKS.iris} can be overridden. `mergeDefined`
 * skips keys whose value is `undefined`, so omitting a field keeps the look
 * instead of clobbering it with an explicit `undefined`.
 */
export const BubbleBadge = forwardRef<HTMLSpanElement, BubbleBadgeProps>(
	function BubbleBadge(props, ref) {
		const { children, className, style, ...rest } = props;

		const options = mergeDefined<GlassPanelOptions, GlassPanelOptions>(
			GLASS_LOOKS.iris,
			mergeDefined<GlassPanelOptions, GlassPanelOptions>(
				{
					radius: 999, // Pill shape.
					refraction: 24,
					specular: 0.6,
					frost: 8,
				},
				rest,
			),
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
					fontWeight: "bold",
					...style,
				}}
				{...options}
			>
				{children}
			</GlassPanel>
		);
	},
);
