import type { IrisTone } from "@ui-lib/core";
import { forwardRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	/**
	 * Numeric count or custom element to display.
	 * When count is 0, the badge is hidden unless `showZero` is true.
	 */
	count?: React.ReactNode;
	/** Max count before truncating with "+" suffix (defaults to 99 -> "99+"). */
	maxCount?: number;
	/** Whether to display the badge when count evaluates to 0. Defaults to false. */
	showZero?: boolean;
	/** Minimalist dot indicator mode without numbers. */
	dot?: boolean;
	/** Status indicator dot with organic watercolor pulse: "success" | "processing" | "default" | "error" | "warning". */
	status?: "success" | "processing" | "default" | "error" | "warning";
	/** Text label accompanying a status dot or standalone badge. */
	text?: React.ReactNode;
	/** Custom coordinate offset [x, y] in pixels. */
	offset?: [number, number];
	/** Tone family for the badge pigment. */
	tone?: "iris" | "blossom" | "mist" | "danger" | "success" | "warn" | "info" | IrisTone;
	/** Material ground: plain paper, wash ground, or glass. */
	material?: SoftMaterial;
	/** Wrapped element (e.g. SoftAvatar, SoftButton). When omitted, renders standalone. */
	children?: React.ReactNode;
}

/**
 * An accessible status and count notification badge.
 *
 * ## Wrap and Standalone Modes
 *
 * `SoftBadge` has two call shapes:
 * 1. **Wrapper mode**: wraps a target element (`children`) and floats a count bead
 *    or dot in the top-right corner with physics-based scaling:
 *    ```tsx
 *    <SoftBadge count={5}>
 *      <SoftAvatar name="陈奕帆" />
 *    </SoftBadge>
 *    ```
 * 2. **Standalone mode**: renders an inline status bead with accompanying text label:
 *    ```tsx
 *    <SoftBadge status="processing" text="正在浸润画布..." />
 *    ```
 *
 * ## Accessible Announcing
 *
 * A count badge is not purely decorative — it announces unread counts, alerts, or
 * background task statuses. A reader receives the count through a descriptive
 * accessible status label, ensuring zero information loss for screen readers.
 */
export const SoftBadge = forwardRef<HTMLSpanElement, SoftBadgeProps>(function SoftBadge(
	{
		count,
		maxCount = 99,
		showZero = false,
		dot = false,
		status,
		text,
		offset,
		tone,
		material,
		className,
		style,
		children,
		...props
	},
	ref,
) {
	useStyles();

	const irisTone = tone === "iris" || tone === "blossom" || tone === "mist" ? tone : undefined;
	const surface = useMaterial(material ? { material, tone: irisTone } : {});

	// Compute effective count display
	const isZero = count === 0 || count === "0";
	const isHidden = (count === undefined || (isZero && !showZero)) && !dot && !status;

	let displayCount: React.ReactNode = count;
	if (typeof count === "number") {
		if (count > maxCount) {
			displayCount = `${maxCount}+`;
		}
	}

	// Status tone mapping
	const resolvedTone =
		tone ??
		(status === "success"
			? "success"
			: status === "processing"
				? "iris"
				: status === "error"
					? "danger"
					: status === "warning"
						? "warn"
						: status === "default"
							? "mist"
							: "blossom");

	// Standalone Status Mode (no children wrapped)
	if (!children) {
		return (
			<span
				{...props}
				ref={ref}
				role="status"
				className={["ui-lib-soft-badge-standalone", surface.className, className]
					.filter(Boolean)
					.join(" ")}
				style={{ ...style, ...surface.style }}
				data-ui-lib-tone={resolvedTone}
				data-ui-lib-status={status}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
			>
				<span
					className={[
						"ui-lib-soft-badge__dot",
						status === "processing" ? "ui-lib-soft-badge__dot--processing" : undefined,
					]
						.filter(Boolean)
						.join(" ")}
					aria-hidden="true"
				/>
				{text && <span className="ui-lib-soft-badge__text">{text}</span>}
			</span>
		);
	}

	// Wrapper Mode (floating bead over children)
	const offsetStyle: React.CSSProperties = {};
	if (offset) {
		offsetStyle.right = `calc(-8px + ${offset[0]}px)`;
		offsetStyle.top = `calc(-8px + ${offset[1]}px)`;
	}

	const srText =
		typeof count === "number"
			? `${count} 条未读通知`
			: typeof count === "string"
				? count
				: dot
					? "有新动态"
					: undefined;

	return (
		<span
			{...props}
			ref={ref}
			className={["ui-lib-soft-badge-wrap", className].filter(Boolean).join(" ")}
			style={style}
		>
			{children}
			{!isHidden && (
				<sup
					className={[
						"ui-lib-soft-badge",
						dot || status ? "ui-lib-soft-badge--dot" : undefined,
						status === "processing" ? "ui-lib-soft-badge--processing" : undefined,
						surface.className,
					]
						.filter(Boolean)
						.join(" ")}
					style={{ ...offsetStyle, ...surface.style }}
					data-ui-lib-tone={resolvedTone}
					data-ui-lib-material={material && material !== "plain" ? material : undefined}
					aria-hidden={!srText}
				>
					{!dot && !status && displayCount}
					{srText && <span className="ui-lib-soft-badge__sr">{srText}</span>}
				</sup>
			)}
		</span>
	);
});
