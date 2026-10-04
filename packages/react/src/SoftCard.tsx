import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useRef } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { GLASS_LOOKS, type GlassLookName } from "./looks.js";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useTilt } from "./tilt.js";
import { useStyles } from "./useStyles.js";

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
	 * Lean into horizontal pointer speed, and straighten when it stops.
	 *
	 * The specification's §3.3 wobble, for the case it names first: a card being
	 * moved quickly across the viewport. Off by default, and it is the one
	 * interaction in this library that costs a frame loop — an interface where
	 * every card leans as the pointer crosses it is also an interface that is
	 * moving when the user is not asking it to.
	 *
	 * Under `prefers-reduced-motion` it attaches nothing at all; see `useTilt`.
	 */
	tilt?: boolean;
	/**
	 * What the card is made of. `plain` is paper and is the default, because
	 * most of an interface should be paper and the material should be the
	 * exception that draws the eye.
	 */
	material?: SoftMaterial;
	/** Which family the pigment comes from. Ignored by `plain`. */
	tone?: IrisTone;
	/**
	 * Render through a real `GlassPanel`, so the card refracts what is behind it.
	 *
	 * **Off by default**, and the reason is architectural rather than aesthetic: a
	 * `GlassPanel` only refracts things the canvas draws. A card in the DOM is
	 * above that canvas, so a glass card needs a `GlassStage` on the page and needs
	 * the pigment behind it to be canvas pigment. Pass one of `GLASS_LOOKS` —
	 * `slab` is the thick one.
	 *
	 * This is what makes a card's *material* mean something different from its
	 * finish. `material="wash"` is pigment printed on a card; `look="slab"` is a
	 * card made of two centimetres of glass with the pigment behind it.
	 */
	look?: GlassLookName;
	/**
	 * Give the paper a grain direction, for a surface that is a specific kind of
	 * paper rather than paper in general. See `MaterialOptions.fibre`.
	 */
	fibre?: boolean;
	/** Which way the grain runs, in degrees. */
	fibreAngle?: number;
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
		tilt = false,
		material,
		tone,
		seedName,
		look,
		fibre,
		fibreAngle,
		className,
		children,
		...props
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	/** A glass card takes no pigment; see the note on `useMaterial` below. */
	const pigment = look === undefined;
	const host = useRef<HTMLDivElement | null>(null);
	useTilt(host, { enabled: tilt });

	/*
	 * **A glass card does not get a paper ground**, and that is the whole reason
	 * this is conditional.
	 *
	 * Measured on the first version of the glass-lab page: four cards with
	 * `look="dew" | "pane" | "product" | "slab"` rendered **identically**, because
	 * each was also carrying `ui-lib-material--ground` and its computed background
	 * was `radial-gradient(... rgb(250 233 255) ...)` — an opaque paper fill sitting
	 * on top of the glass, hiding every pixel of refraction underneath it.
	 *
	 * So the surface and the glass are alternatives rather than layers. A card is
	 * either pigment printed on paper or a piece of glass; asking for both gets the
	 * pigment, because that is what "material" has always meant and silently
	 * ignoring it would be worse.
	 */
	const surface = useMaterial(
		pigment && (material !== undefined || tone !== undefined || seedName !== undefined || fibre)
			? { material, tone, name: seedName, fibre, fibreAngle }
			: {},
	);

	const setHost = (node: HTMLDivElement | null) => {
		host.current = node;
		if (typeof ref === "function") ref(node);
		else if (ref) ref.current = node;
	};

	const classes = [
		className ? `ui-lib-soft-card ${className}` : "ui-lib-soft-card",
		surface.className,
	]
		.filter((c) => !(look && c === "ui-lib-material--ground"))
		.filter(Boolean)
		.join(" ");

	const shared = {
		className: classes,
		style: surface.className && pigment ? { ...props.style, ...surface.style } : props.style,
		"data-ui-lib-interactive": interactive ? "" : undefined,
		"data-ui-lib-glossy": glossy ? "" : undefined,
		"data-ui-lib-material": material && material !== "plain" ? material : undefined,
	};

	/*
	 * A glass card is a `GlassPanel` and a paper card is a `div`, and the tag is the
	 * only thing that differs.
	 *
	 * `GlassPanel` is what registers with the stage, so a card that has to refract
	 * has to *be* one — a `div` with a glass class on it would be a card that claims
	 * to be glass and is not, which is the failure this library has already made
	 * once with `role="button"` on a span.
	 *
	 * The material class is kept on the glass path too, because the ink tokens a
	 * ground sets (`--moe-on-material`) are what keep text readable on it, and a
	 * glass card needs them exactly as much as a washed one.
	 */
	if (look) {
		const glassLook = typeof look === "string" ? GLASS_LOOKS[look] : look;
		return (
			<GlassPanel
				{...props}
				{...shared}
				{...glassLook}
				ref={setHost}
				className={`${classes} ui-lib-soft-card--glass`}
			>
				{children}
			</GlassPanel>
		);
	}

	return (
		<div ref={setHost} {...shared} {...props}>
			{children}
		</div>
	);
});
