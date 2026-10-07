import type { IrisTone } from "@ui-lib/core";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface WatercolorBoardProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
	/** Color tone palette for the watercolor wash diffusion. */
	tone?: IrisTone;
	/** Capillary moisture percentage (0 - 100). Defaults to 65. */
	moisture?: number;
	/** Whether to display the deckled edge / subtle rim border. Defaults to true. */
	bordered?: boolean;
	className?: string;
}

/**
 * Xuan Paper & Watercolor Showcase Board (宣纸水墨底板).
 *
 * Provides an authentic oriental Xuan paper texture and Lucas-Washburn
 * pigment diffusion substrate to host showcase cards, synthesizers, and pillars.
 * Sits naturally in the DOM layout flow without locking or covering the viewport.
 */
export const WatercolorBoard = forwardRef<HTMLDivElement, WatercolorBoardProps>(
	function WatercolorBoard(
		{ children, tone = "iris", moisture = 65, bordered = true, className = "", style, ...rest },
		ref,
	) {
		const moistureFactor = Math.min(Math.max(moisture / 100, 0), 1);

		return (
			<div
				ref={ref}
				className={`ui-lib-watercolor-board ui-lib-watercolor-board--${tone} ${bordered ? "ui-lib-watercolor-board--bordered" : ""} ${className}`.trim()}
				data-tone={tone}
				style={
					{
						"--ui-lib-moisture": moistureFactor.toFixed(2),
						...style,
					} as React.CSSProperties
				}
				{...rest}
			>
				<div className="ui-lib-watercolor-board__deckle" aria-hidden="true" />
				<div className="ui-lib-watercolor-board__content">{children}</div>
			</div>
		);
	},
);
