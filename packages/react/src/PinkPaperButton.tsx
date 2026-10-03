import { IRIS } from "@ui-lib/core";
import { forwardRef, useCallback, useRef, useState } from "react";
import { GlassPanel } from "./GlassPanel.js";
import { irisClass, splitGlassProps } from "./irisPanel.js";
import type { IrisPanelProps } from "./irisTypes.js";
import { GLASS_LOOKS } from "./looks.js";

/** How the button is made. */
export type PaperButtonVariant = "clay" | "gummy" | "flat";

export interface PinkPaperButtonProps
	extends IrisPanelProps,
		Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "children"> {
	/** Stretch to the container. Default hugs its label. */
	block?: boolean;
	/**
	 * `clay` is a solid with three shadow layers, `gummy` is translucent with a
	 * juice gradient, `flat` drops the inner shadows for dense layouts.
	 */
	variant?: PaperButtonVariant;
	/** 36 / 48 / 58px tall. Touch targets below 44px are hard to hit. */
	size?: "sm" | "md" | "lg";
	/**
	 * Throw a burst of sparks from the point that was pressed. On by default;
	 * turns itself off under `prefers-reduced-motion`.
	 */
	sparkles?: boolean;
}

/** One spark, in flight. */
interface Spark {
	id: number;
	x: number;
	y: number;
}

const SPARK_COUNT = 7;

/**
 * A button that feels like pressed paper, or like clay, depending on whether
 * you are looking at it or pressing it.
 *
 * A real `<button>`: it keeps its type, its disabled state, its focus ring and
 * its keyboard behaviour. The glass is the sheen across the sheet; the fibre
 * is a CSS grain, because a texture that has to move with the pointer is not
 * something a screen-space refractor can give you honestly.
 *
 * The press is a squash, and a squash is a stretch on the other axis — a soft
 * body keeps its volume, so compressing one axis has to fatten the other.
 * Scaling a single axis reads as a flat sticker sliding rather than as
 * something being pushed.
 *
 * ```tsx
 * <PinkPaperButton tone="blossom" onClick={start}>开始</PinkPaperButton>
 * <PinkPaperButton variant="gummy" size="lg" tone="mist" sparkles={false}>更多</PinkPaperButton>
 * ```
 */
export const PinkPaperButton = forwardRef<HTMLButtonElement, PinkPaperButtonProps>(
	function PinkPaperButton(
		{
			tone = "blossom",
			block = false,
			variant = "clay",
			size = "md",
			sparkles = true,
			className,
			style,
			children,
			onClick,
			...props
		},
		ref,
	) {
		const { options, rest } = splitGlassProps(props, {
			...GLASS_LOOKS.iris,
			radius: 18,
			refraction: 14,
			frost: 6,
			tint: IRIS[tone][100],
			tintAmount: 0.24,
		});

		const [burst, setBurst] = useState<Spark[]>([]);
		const nextId = useRef(0);

		const handleClick = useCallback(
			(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (!sparkles) return;
				// A reduced-motion preference is a request about exactly this: a
				// burst that arrives too fast to track, from a click the user
				// already got feedback for. Honour it by not emitting at all.
				if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

				const box = event.currentTarget.getBoundingClientRect();
				const spark = {
					id: nextId.current++,
					x: event.clientX - box.left,
					y: event.clientY - box.top,
				};
				setBurst((current) => [...current, spark]);
				// The animation runs 450ms; the node is dropped a little after it
				// so the last frame is not cut off mid-flight.
				window.setTimeout(() => {
					setBurst((current) => current.filter((item) => item.id !== spark.id));
				}, 520);
			},
			[onClick, sparkles],
		);

		return (
			<GlassPanel
				as="button"
				ref={ref}
				type="button"
				className={irisClass("paper-button", tone, className)}
				data-ui-lib-block={block ? "" : undefined}
				data-ui-lib-variant={variant}
				data-ui-lib-size={size}
				style={style}
				onClick={handleClick}
				{...rest}
				{...options}
			>
				<span className="ui-lib-paper-button__label" data-ui-lib-label>
					{children}
				</span>

				{burst.map((spark) => (
					<span
						key={spark.id}
						className="ui-lib-paper-button__burst"
						style={{ left: `${spark.x}px`, top: `${spark.y}px` }}
						aria-hidden="true"
					>
						{Array.from({ length: SPARK_COUNT }, (_, index) => {
							// Even radial spread. The initial speed is carried by how far
							// a spark travels, and the decay by its opacity.
							const angle = (index / SPARK_COUNT) * Math.PI * 2;
							const distance = 26 + (index % 3) * 7;
							return (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: the burst is fixed and ordered
									key={index}
									className="ui-lib-paper-button__spark"
									style={
										{
											"--dx": `${Math.cos(angle) * distance}px`,
											"--dy": `${Math.sin(angle) * distance}px`,
											"--spin": `${index % 2 === 0 ? 90 : -90}deg`,
										} as React.CSSProperties
									}
								>
									✦
								</span>
							);
						})}
					</span>
				))}
			</GlassPanel>
		);
	},
);

/**
 * The same button, under the name the rest of the library uses.
 *
 * `PinkPaperButton` was written before the `Soft` layer existed, and it is the
 * one component that ended up on the wrong side of the line: measured, it is the
 * only unprefixed export that carries an accessibility contract — a real
 * `<button>` with a `tone`, a `variant` and a size, sitting in the same layer as
 * `SoftCard` and `SoftInput` while being named as though it were a primitive.
 *
 * **An alias rather than a rename.** Renaming it would break every call site for
 * a naming preference, and the old name is not wrong so much as uninformative:
 * a reader who sees `PinkPaperButton` learns what it looks like, and a reader who
 * sees `SoftButton` learns what it is. Both are true, and one of them is
 * consistent with the other thirty-three components.
 *
 * `PinkPaperButton` stays exported and stays supported. There is no deprecation
 * warning, because a warning for a name that works is a cost with no benefit —
 * the documentation points at the new one and the old one keeps working.
 */
export const SoftButton = PinkPaperButton;

/** The props of `SoftButton`, under the name the rest of the library uses. */
export type SoftButtonProps = PinkPaperButtonProps;
