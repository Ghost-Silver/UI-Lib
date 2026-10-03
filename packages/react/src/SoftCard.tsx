import type { IrisTone } from "@ui-lib/core";
import { forwardRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";

export interface SoftCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Lift and tilt under the pointer, and settle when it leaves.
	 *
	 * **Hover only, and it used to have a pressed state as well.** That was a
	 * promise the element could not keep: a pressed state says something happens
	 * when the press ends, and on a `div` only a pointer can make one. A keyboard
	 * user got no lift and no collapse, because there was nothing for them to
	 * press — the card said "clickable" to one kind of user and nothing to the
	 * other.
	 *
	 * So it is a hover response. A card that is genuinely clickable should hold a
	 * `<SoftButton>` or be one: that is the element a keyboard can reach and
	 * Enter can activate, and the one whose press means something.
	 */
	interactive?: boolean;
	/** A sheen across the top-left corner. Reads as a glass edge, not a line. */
	glossy?: boolean;
	/**
	 * What the card is made of. `plain` is paper and is the default, because
	 * most of an interface should be paper and the material should be the
	 * exception that draws the eye.
	 */
	material?: SoftMaterial;
	/** Which family the pigment comes from. Ignored by `plain`. */
	tone?: IrisTone;
	/**
	 * A name to hash into this card's mark, so the same card keeps its own
	 * ground across renders and two cards differ. Without one they differ by
	 * position, which is stable but arbitrary.
	 */
	seedName?: string;
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
 * It can also be made of pigment rather than paper. `material="wash"` gives it
 * a pigmented ground and a rim carried by the pigment instead of the neutral
 * stroke; `material="tint"` is the same at low concentration, for grouping
 * rather than distinguishing. The ground is a fill and a fibre texture, not the
 * mark that `createWash` draws for an avatar — a surface is not a stroke, so the
 * silhouette, the deposit mask and the rotation are deliberately not applied.
 *
 * ```tsx
 * <SoftCard interactive>
 *   <h3>柔光</h3>
 *   <p>重磨砂、宽亮边，边缘是化开的。</p>
 * </SoftCard>
 * <SoftCard material="wash" tone="iris" seedName="summary">…</SoftCard>
 * ```
 */
export const SoftCard = forwardRef<HTMLDivElement, SoftCardProps>(function SoftCard(
	{
		interactive = false,
		glossy = false,
		material,
		tone,
		seedName,
		className,
		children,
		...props
	},
	ref,
) {
	const surface = useMaterial(
		material === undefined && tone === undefined && seedName === undefined
			? {}
			: { material, tone, name: seedName },
	);

	return (
		<div
			ref={ref}
			className={[
				className ? `ui-lib-soft-card ${className}` : "ui-lib-soft-card",
				surface.className,
			]
				.filter(Boolean)
				.join(" ")}
			style={surface.className ? { ...props.style, ...surface.style } : props.style}
			data-ui-lib-interactive={interactive ? "" : undefined}
			data-ui-lib-glossy={glossy ? "" : undefined}
			data-ui-lib-material={material && material !== "plain" ? material : undefined}
			{...props}
		>
			{children}
		</div>
	);
});
