import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export type LiquidTint = "iris" | "blossom" | "mist";

export interface LiquidGlassProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
	/** Which family the pane is tinted toward. */
	tint?: LiquidTint;
	/**
	 * How far the pane's own colour is allowed to shift from the page behind
	 * it. `0` keeps it a pure blur, `1` makes it a solid tile.
	 *
	 * Kept low by default on purpose: this is a *surround* for content, and a
	 * surround that hides what is behind it stops being glass.
	 */
	opacity?: number;
	/** Corner radius. Defaults to the capsule token. */
	radius?: string;
	/** Adds the diagonal sheen across the top-left. */
	glossy?: boolean;
	children?: ReactNode;
}

/** Per-tint rim and body colours, so the pane reads as tinted rather than grey. */
const TINTS: Record<LiquidTint, { body: string; rim: string; glow: string }> = {
	iris: {
		body: "oklch(0.88 0.07 300 / 0.42)",
		rim: "oklch(0.99 0.02 305 / 0.85)",
		glow: "oklch(0.72 0.12 300 / 0.35)",
	},
	blossom: {
		body: "oklch(0.9 0.07 10 / 0.42)",
		rim: "oklch(0.99 0.02 10 / 0.85)",
		glow: "oklch(0.76 0.12 10 / 0.35)",
	},
	mist: {
		body: "oklch(0.89 0.06 235 / 0.42)",
		rim: "oklch(0.99 0.02 235 / 0.85)",
		glow: "oklch(0.74 0.11 235 / 0.35)",
	},
};

/**
 * A translucent pane that sits on top of the page, as opposed to the glass
 * this library paints on a canvas.
 *
 * The two are different tools and it is worth being precise about which is
 * which. `GlassPanel` is a real screen-space refractor: it re-renders what is
 * behind it through a shader, which is why it needs a stage, a render target
 * and a GPU. This is `backdrop-filter` — the compositor blurs what is behind
 * the element and tints the result. It costs nothing, it works on a page with
 * no canvas at all, and it cannot *bend* anything.
 *
 * It exists because wrapping a heading or a toolbar in a full refractive panel
 * is usually wrong: the content is not sitting behind glass, it is sitting on
 * a piece of it, and refraction at that scale mostly makes the text wobble.
 *
 * Deliberately not very transparent. A surround that hides what is behind it
 * is not glass, and one that shows everything through it swallows the content
 * it was put there to hold — the body alpha lands around 0.42, which is enough
 * to read as a tinted material and not enough to lose the page.
 *
 * ```tsx
 * <LiquidGlass tint="iris" glossy>
 *   <h2>Iris UI</h2>
 * </LiquidGlass>
 * ```
 */
export const LiquidGlass = forwardRef<HTMLSpanElement, LiquidGlassProps>(function LiquidGlass(
	{
		tint = "iris",
		opacity = 1,
		radius = "var(--moe-radius-full)",
		glossy = false,
		className,
		style,
		children,
		...props
	},
	ref,
) {
	const palette = TINTS[tint];

	return (
		<span
			ref={ref}
			{...props}
			className={className ? `ui-lib-liquid-glass ${className}` : "ui-lib-liquid-glass"}
			data-ui-lib-tint={tint}
			data-ui-lib-glossy={glossy ? "" : undefined}
			style={
				{
					borderRadius: radius,
					// `opacity` scales the whole pane rather than its alpha channel,
					// so a caller can dial the material back without having to know
					// how the tint is built.
					opacity,
					"--lg-body": palette.body,
					"--lg-rim": palette.rim,
					"--lg-glow": palette.glow,
					...style,
				} as React.CSSProperties
			}
		>
			<span className="ui-lib-liquid-glass__sheen" aria-hidden="true" />
			<span className="ui-lib-liquid-glass__content">{children}</span>
		</span>
	);
});
