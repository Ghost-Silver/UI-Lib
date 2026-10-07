import { forwardRef, useId } from "react";
import { useStyles } from "./useStyles.js";

/* ------------------------------------------------------------------ progress -- */

export interface SoftProgressProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	/** 0 to `max`. Omit for an indeterminate bar. */
	value?: number;
	max?: number;
	/** A visible label above the bar. */
	label?: string;
	/** What the bar is measuring, for assistive technology. Required without a label. */
	ariaLabel?: string;
	/** `sm` is 6px tall, `md` is 10. */
	size?: "sm" | "md";
	/** Show the percentage at the end. */
	showValue?: boolean;
}

/**
 * A bar that fills the way pigment does, not the way a value does.
 *
 * The fill is not a solid block that widens. It is a gradient that travels
 * along its own length, so the leading edge is always lighter than the body
 * behind it and the whole thing reads as something moving through rather than
 * something being revealed. That is the same `background-position` animation the
 * slider's fill uses, reused deliberately: two components showing progress
 * should look like the same substance.
 *
 * The track is a recess, like every other groove in this library. A raised
 * track with a fill inside it reads as two objects; a sunken one reads as a
 * channel.
 *
 * **Indeterminate is a first-class state, not a `value` of -1.** When there is no
 * `value` the element keeps `role="progressbar"` but omits `aria-valuenow`
 * entirely, which is the documented way to say "busy" rather than to invent a
 * number. A `-1` would be announced as a value.
 *
 * ```tsx
 * <SoftProgress label="正在铺纸" value={62} showValue />
 * <SoftProgress label="正在等" />
 * ```
 */
export const SoftProgress = forwardRef<HTMLDivElement, SoftProgressProps>(function SoftProgress(
	{ value, max = 100, label, ariaLabel, size = "md", showValue = false, className, ...props },
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const generated = useId();
	const labelId = `${generated}-label`;
	const indeterminate = value === undefined;
	const ratio = indeterminate ? 0 : Math.min(Math.max(value / max, 0), 1);
	const percent = `${(ratio * 100).toFixed(2)}%`;

	return (
		<div
			{...props}
			ref={ref}
			className={className ? `ui-lib-soft-progress ${className}` : "ui-lib-soft-progress"}
			data-ui-lib-size={size}
			data-ui-lib-indeterminate={indeterminate ? "" : undefined}
		>
			{(label || showValue) && (
				<div className="ui-lib-soft-progress__head">
					{label && (
						<span className="ui-lib-soft-progress__label" id={labelId}>
							{label}
						</span>
					)}
					{/* Hidden from assistive technology: the same number is already
					    carried by `aria-valuenow`, and reading it twice is noise. */}
					{showValue && !indeterminate && (
						<span className="ui-lib-soft-progress__value" aria-hidden="true">
							{Math.round(ratio * 100)}%
						</span>
					)}
				</div>
			)}

			<div
				className="ui-lib-soft-progress__track"
				role="progressbar"
				aria-label={label ? undefined : ariaLabel}
				aria-labelledby={label ? labelId : undefined}
				{...(indeterminate
					? {}
					: {
							"aria-valuenow": Math.round(ratio * 100),
							"aria-valuemin": 0,
							"aria-valuemax": 100,
						})}
			>
				<span
					className="ui-lib-soft-progress__fill"
					aria-hidden="true"
					style={indeterminate ? undefined : { width: percent }}
				/>
			</div>
		</div>
	);
});

/* ------------------------------------------------------------------- spinner -- */

export interface SoftSpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
	/** Diameter in px. */
	size?: number;
	/** A name for assistive technology. Defaults to a plain "加载中". */
	label?: string;
}

/**
 * A loading indicator that breathes instead of spinning.
 *
 * A rotating arc is the default everywhere and it is the one motion in an
 * interface that never resolves — it turns at a constant rate for as long as
 * the wait lasts, which is precisely what makes waiting feel long. A ring that
 * expands and contracts at roughly a resting breath rate is the opposite: it
 * suggests something is *alive* rather than something is *stuck*.
 *
 * Three rings, offset in phase, so there is no single moment where the whole
 * thing is minimal. The phase offsets are not evenly spaced — an even spread
 * reads as a mechanical chase.
 *
 * It is `role="status"` with a name, not `role="img"`, because a status is what
 * a screen reader should announce when it appears and what it should be able to
 * find later.
 *
 * ```tsx
 * <SoftSpinner label="正在调色" />
 * ```
 */
export const SoftSpinner = forwardRef<HTMLSpanElement, SoftSpinnerProps>(function SoftSpinner(
	{ size = 28, label = "加载中", className, style, ...props },
	ref,
) {
	return (
		<span
			{...props}
			ref={ref}
			role="status"
			aria-label={label}
			className={className ? `ui-lib-soft-spinner ${className}` : "ui-lib-soft-spinner"}
			style={{ width: size, height: size, ...style }}
		>
			<span className="ui-lib-soft-spinner__ring" aria-hidden="true" />
			<span className="ui-lib-soft-spinner__ring" aria-hidden="true" />
			<span className="ui-lib-soft-spinner__ring" aria-hidden="true" />
		</span>
	);
});

/* ------------------------------------------------------------------ skeleton -- */

export interface SoftSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	/** `text` is a rounded line, `block` is a panel, `circle` is an avatar. */
	variant?: "text" | "block" | "circle";
	/** Lines for `text`. The last one is short, because text ends unevenly. */
	lines?: number;
	width?: string | number;
	height?: string | number;
}

/**
 * A placeholder that is wet rather than grey.
 *
 * The usual skeleton is a grey rectangle with a moving sheen. It says "content
 * is missing"; a wash says "content is arriving", which is the same thing a
 * half-finished watercolour says. So the fill is a soft pigment tint and the
 * motion is a slow drift of the wash across it, at the same rate as the wash on
 * the material page — a placeholder should look like the thing it is standing in
 * for, not like a UI convention.
 *
 * `aria-hidden` throughout, and that is the point: a skeleton is the visual
 * shape of content that does not exist yet. Announcing it would describe a
 * heading that is not there. The region that owns it should carry
 * `aria-busy="true"` and a label, which is the caller's job and is documented
 * here rather than assumed.
 *
 * ```tsx
 * <SoftSkeleton variant="text" lines={3} />
 * <SoftSkeleton variant="circle" width={44} height={44} />
 * ```
 */
export const SoftSkeleton = forwardRef<HTMLDivElement, SoftSkeletonProps>(function SoftSkeleton(
	{ variant = "block", lines = 1, width, height, className, style, ...props },
	ref,
) {
	const shapes = variant === "text" ? Math.max(1, lines) : 1;
	return (
		<div
			{...props}
			ref={ref}
			aria-hidden="true"
			className={className ? `ui-lib-soft-skeleton ${className}` : "ui-lib-soft-skeleton"}
			data-ui-lib-variant={variant}
			style={{ width, height, ...style }}
		>
			{Array.from({ length: shapes }, (_, index) => (
				<span
					/* Index keys are correct here and not merely convenient: the
					   shapes are identical and stateless, so growing the list from
					   three lines to five should reuse the first three rather than
					   recreate all of them. */
					// biome-ignore lint/suspicious/noArrayIndexKey: identical, stateless, order-fixed
					key={index}
					className="ui-lib-soft-skeleton__shape"
					// The last line of a paragraph is short; every line being full is
					// the tell that a placeholder is not shaped like the text.
					data-ui-lib-last={
						variant === "text" && index === shapes - 1 && shapes > 1 ? "" : undefined
					}
				/>
			))}
		</div>
	);
});
