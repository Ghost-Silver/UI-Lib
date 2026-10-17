import type { HTMLAttributes, ReactNode } from "react";

export interface FrostedGroundProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
	/** Inset margin from viewport edges in px or CSS units. Defaults to 14px. */
	inset?: string | number;
	/** Corner radius in px or CSS units. Defaults to 20px. */
	radius?: string | number;
	className?: string;
}

/**
 * Layer 2: Intermediate Frosted Glass Ground Panel (Fixed Viewport Panel).
 *
 * Sits above the paper/watercolor background (Layer 1) and below liquid glass cards
 * and UI components (Layer 3). Renders a fixed frosted backdrop pinned to the viewport
 * margins that stays static while content scrolls over it.
 */
export function FrostedGround({
	children,
	inset = 14,
	radius = 20,
	className = "",
	style,
	...rest
}: FrostedGroundProps) {
	const insetVal = typeof inset === "number" ? `${inset}px` : inset;
	const radiusVal = typeof radius === "number" ? `${radius}px` : radius;

	return (
		<>
			<div
				className="ui-lib-frosted-ground-fixed"
				style={{
					top: insetVal,
					left: insetVal,
					right: insetVal,
					bottom: insetVal,
					borderRadius: radiusVal,
				}}
				aria-hidden="true"
			/>
			<div
				className={`ui-lib-frosted-ground-content ${className}`}
				style={{
					position: "relative",
					zIndex: 2,
					...style,
				}}
				{...rest}
			>
				{children}
			</div>
		</>
	);
}
