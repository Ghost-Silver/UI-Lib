import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useMemo } from "react";

export interface BlingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
	/** How many glints. Past about twenty the page reads as dusty. */
	count?: number;
	/** Accent family for the glints. */
	tone?: IrisTone;
	/** Seed for the scatter, so a re-render does not reshuffle the sparkle. */
	seed?: number;
}

/**
 * Scattered glints.
 *
 * Deliberately not glass. A three-to-eleven pixel bead gives a screen-space
 * refractor nothing to bend, so a panel here would cost a draw call and paint
 * an empty shape — measured, on a near-white ground, as indistinguishable from
 * not being there. These are painted by the element instead, which is the
 * honest way to draw a highlight with no scene behind it.
 *
 * Positions come from a seeded hash rather than `Math.random`, so server and
 * client agree and hydration does not reshuffle the layer.
 *
 * ```tsx
 * <Bling count={14} tone="blossom" />
 * ```
 */
export const Bling = forwardRef<HTMLDivElement, BlingProps>(function Bling(
	{ count = 12, tone = "iris", seed = 7, className, style, ...rest },
	ref,
) {
	const spots = useMemo(() => {
		const out: { id: string; left: number; top: number; size: number; delay: number }[] = [];
		let state = seed >>> 0 || 1;
		const next = () => {
			// xorshift32: tiny, stable, and good enough for a scatter.
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			return ((state >>> 0) % 100_000) / 100_000;
		};
		for (let i = 0; i < count; i += 1) {
			out.push({
				// Identity comes from the same seeded stream as the position, so
				// it is stable across renders without leaning on the array index.
				id: `gem-${Math.floor(next() * 1e9)}`,
				left: next() * 100,
				top: next() * 100,
				size: 3 + next() * 7,
				delay: next() * 4,
			});
		}
		return out;
	}, [count, seed]);

	return (
		<div
			ref={ref}
			className={`ui-lib-bling ui-lib-bling--${tone}${className ? ` ${className}` : ""}`}
			aria-hidden="true"
			style={style}
			{...rest}
		>
			{spots.map((spot) => (
				<span
					key={spot.id}
					className="ui-lib-bling__gem"
					style={{
						left: `${spot.left}%`,
						top: `${spot.top}%`,
						width: `${spot.size}px`,
						height: `${spot.size}px`,
						animationDelay: `${spot.delay}s`,
					}}
				/>
			))}
		</div>
	);
});
