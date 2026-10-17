import type { IrisTone } from "@ui-lib/core";
import { forwardRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftTimelineItem {
	/** Unique key for the timeline item. */
	key: string;
	/** Primary event headline or stage name. */
	title: React.ReactNode;
	/** Detailed event description or supplementary note. */
	description?: React.ReactNode;
	/** Date, time, or milestone timestamp label. */
	timestamp?: React.ReactNode;
	/** Execution or lifecycle state: completed, processing, pending, or error. */
	status?: "completed" | "processing" | "pending" | "error";
	/** Tone family for the bead and capillary line. */
	tone?: IrisTone | "danger" | "success" | "warn" | "info";
	/** Custom icon or element inside the milestone bead. */
	icon?: React.ReactNode;
	/** Extra action buttons, badges, or metadata slot. */
	extra?: React.ReactNode;
}

export interface SoftTimelineProps extends React.HTMLAttributes<HTMLOListElement> {
	/** List of sequential timeline items. */
	items: readonly SoftTimelineItem[];
	/** Screen-reader label describing the timeline sequence. Required for a11y. */
	label: string;
	/** Visual layout direction: vertical (default) or horizontal. */
	direction?: "vertical" | "horizontal";
	/** Alignment of beads relative to text: left, right, or alternate (zigzag). */
	mode?: "left" | "right" | "alternate";
	/** Reverse chronological order display. */
	reverse?: boolean;
	/** Surface material ground: plain paper, wash ground, or glass. */
	material?: SoftMaterial;
	/** Tone family for default line and beads. */
	tone?: IrisTone;
}

/**
 * A chronological timeline component with capillary lineage lines and status beads.
 *
 * ## Organic Capillary Lines
 *
 * In physical ink wash and xuan paper design, sequential timelines represent
 * an unbroken current of time, rendered with delicate ink capillary guide lines.
 * Milestone beads feature status glyphs, soft watercolor halos, and continuous
 * connecting stems.
 *
 * ## WAI-ARIA List Semantics
 *
 * Rendered as an ordered list `<ol role="list">` with explicit accessible naming,
 * ensuring screen readers announce step count, item position, and status.
 *
 * ```tsx
 * <SoftTimeline
 *   label="发布历程"
 *   items={[
 *     { key: "1", title: "草稿完成", status: "completed", timestamp: "10:00" },
 *     { key: "2", title: "物理渲染烘焙", status: "processing", timestamp: "10:30" },
 *     { key: "3", title: "正式发布", status: "pending", timestamp: "11:00" },
 *   ]}
 * />
 * ```
 */
export const SoftTimeline = forwardRef<HTMLOListElement, SoftTimelineProps>(
	function SoftTimeline(
		{
			items,
			label,
			direction = "vertical",
			mode = "left",
			reverse = false,
			material,
			tone = "iris",
			className,
			style,
			...props
		},
		ref,
	) {
		useStyles();
		const surface = useMaterial(material ? { material, tone } : {});

		const displayItems = reverse ? [...items].reverse() : items;

		return (
			<ol
				{...props}
				ref={ref}
				aria-label={label}
				className={[
					"ui-lib-soft-timeline",
					`ui-lib-soft-timeline--${direction}`,
					`ui-lib-soft-timeline--${mode}`,
					surface.className,
					className,
				]
					.filter(Boolean)
					.join(" ")}
				style={{ ...style, ...surface.style }}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
				data-ui-lib-tone={tone}
			>
				{displayItems.map((item, index) => {
					const isLast = index === displayItems.length - 1;
					const itemTone = item.tone ?? tone;
					const itemStatus = item.status ?? "completed";

					return (
						<li
							key={item.key}
							className={[
								"ui-lib-soft-timeline__item",
								isLast ? "ui-lib-soft-timeline__item--last" : undefined,
								`ui-lib-soft-timeline__item--${itemStatus}`,
							]
								.filter(Boolean)
								.join(" ")}
							data-ui-lib-status={itemStatus}
							data-ui-lib-tone={itemTone}
						>
							{/* Capillary connecting line */}
							{!isLast && <div className="ui-lib-soft-timeline__line" aria-hidden="true" />}

							{/* Status milestone bead */}
							<div
								className={[
									"ui-lib-soft-timeline__bead",
									item.icon ? "ui-lib-soft-timeline__bead--custom" : undefined,
									itemStatus === "processing"
										? "ui-lib-soft-timeline__bead--processing"
										: undefined,
								]
									.filter(Boolean)
									.join(" ")}
								aria-hidden="true"
							>
								{item.icon ? (
									item.icon
								) : itemStatus === "completed" ? (
									<svg
										viewBox="0 0 12 12"
										width="8"
										height="8"
										aria-hidden="true"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M2.5 6 L5 8.5 L9.5 3.5" />
									</svg>
								) : itemStatus === "error" ? (
									<svg
										viewBox="0 0 12 12"
										width="8"
										height="8"
										aria-hidden="true"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									>
										<path d="M3 3 L9 9 M9 3 L3 9" />
									</svg>
								) : (
									<span className="ui-lib-soft-timeline__dot" />
								)}
							</div>

							{/* Content container */}
							<div className="ui-lib-soft-timeline__content">
								<div className="ui-lib-soft-timeline__header">
									<h4 className="ui-lib-soft-timeline__title">{item.title}</h4>
									{item.timestamp && (
										<time className="ui-lib-soft-timeline__time">{item.timestamp}</time>
									)}
								</div>

								{item.description && (
									<div className="ui-lib-soft-timeline__description">{item.description}</div>
								)}

								{item.extra && <div className="ui-lib-soft-timeline__extra">{item.extra}</div>}
							</div>
						</li>
					);
				})}
			</ol>
		);
	},
);
