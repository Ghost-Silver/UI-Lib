import { forwardRef } from "react";

export interface SoftCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Lift, tilt and squeeze under the pointer. Off by default: a card that
	 * moves is a card that is claiming to be clickable, and most are not.
	 */
	interactive?: boolean;
	/** A sheen across the top-left corner. Reads as a glass edge, not a line. */
	glossy?: boolean;
	children?: React.ReactNode;
}

/**
 * A soft, raised surface.
 *
 * Pure CSS and a plain div — no animation library and no Tailwind. The physics
 * the design calls for is a spring, and a spring that only needs to overshoot
 * once is a cubic-bezier with a control point past 1; the one place a curve
 * cannot express it is the two-hump press, which is a keyframe animation. That
 * keeps this component's only dependency a stylesheet the package already
 * ships.
 *
 * ```tsx
 * <SoftCard interactive>
 *   <h3>柔光</h3>
 *   <p>重磨砂、宽亮边，边缘是化开的。</p>
 * </SoftCard>
 * ```
 */
export const SoftCard = forwardRef<HTMLDivElement, SoftCardProps>(function SoftCard(
	{ interactive = false, glossy = false, className, children, ...props },
	ref,
) {
	return (
		<div
			ref={ref}
			className={className ? `ui-lib-soft-card ${className}` : "ui-lib-soft-card"}
			data-ui-lib-interactive={interactive ? "" : undefined}
			data-ui-lib-glossy={glossy ? "" : undefined}
			{...props}
		>
			{children}
		</div>
	);
});
