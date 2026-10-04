import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useId, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftAccordionItem {
	/** Stable identity. Used for the ids that wire the button to its panel. */
	id: string;
	/** The button's text. */
	title: string;
	/** A line under the title in the header. */
	note?: string;
	/** The panel's content. */
	content: React.ReactNode;
	/** Open on mount, for uncontrolled use. */
	defaultOpen?: boolean;
	disabled?: boolean;
	/**
	 * What this section is made of. A section that is a *thing* — a summary, a
	 * specimen — can carry pigment; the default is paper, which is right for a
	 * list of ordinary sections.
	 */
	material?: SoftMaterial;
	/** Which family the pigment comes from. */
	tone?: IrisTone;
}

export interface SoftAccordionProps {
	items: readonly SoftAccordionItem[];
	/**
	 * `single` closes the others when one opens; `multiple` lets several be open.
	 * `single` is the default because an accordion is normally a set of
	 * alternatives rather than a set of independent toggles.
	 */
	mode?: "single" | "multiple";
	/** Controlled open ids. Omit to let each item hold its own state. */
	open?: readonly string[];
	onChange?: (openIds: string[]) => void;
	className?: string;
}

/**
 * Sections that open in place, and a header that says what it is.
 *
 * ## Why this is not `role="tablist"`
 *
 * Tabs and accordions look alike and are not. A tablist selects one panel out of
 * several and *hides* the others; the panels are alternatives and only one is
 * ever relevant. An accordion holds several sections that all exist and whose
 * headers stay on screen whether they are open or not. Using the tab roles makes
 * a screen reader announce "tab 3 of 5" and hide the four headers, which is a
 * different interface from the one being drawn.
 *
 * The right shape is a heading containing a button with `aria-expanded` and
 * `aria-controls`, and a region below it. The heading is not decoration: it is
 * what makes the sections navigable by heading, which is how a long page is
 * read.
 *
 * ## Why the animation is `grid-template-rows`
 *
 * `height: auto` cannot be transitioned, which is the usual reason accordions
 * jump. Three techniques were measured before choosing and **the first three
 * measurements were all wrong** — they ran `requestAnimationFrame` inside
 * `page.evaluate`, and headless Chrome does not drive `rAF` when nothing is
 * painting, so every sample came back as either the start or the end value and
 * all three techniques appeared to be broken. Sampled with a real delay between
 * frames, both `grid-template-rows: 0fr` to `1fr` and a measured height produce
 * the identical curve (0, 7, 23, 40, 57, 73, 90).
 *
 * The grid technique is chosen because it needs no measurement: a JavaScript
 * height has to be re-measured whenever the content changes, which means a
 * `ResizeObserver` per panel and a class of bug where the panel is clipped after
 * a font loads. `0fr` to `1fr` is CSS only and the browser does the work.
 *
 * ```tsx
 * <SoftAccordion items={[
 *   { id: "a", title: "颜料是怎么待在纸上的", content: <p>…</p> },
 * ]} />
 * ```
 */
export const SoftAccordion = forwardRef<HTMLDivElement, SoftAccordionProps>(
	function SoftAccordion({ items, mode = "single", open, onChange, className }, ref) {
		// The stylesheet is not injected by the GPU components alone; see useStyles.
		useStyles();
		const generated = useId();
		const [uncontrolled, setUncontrolled] = useState<string[]>(() =>
			items.filter((item) => item.defaultOpen).map((item) => item.id),
		);
		const openIds = open ? [...open] : uncontrolled;

		const toggle = (id: string) => {
			const isOpen = openIds.includes(id);
			let next: string[];
			if (isOpen) next = openIds.filter((current) => current !== id);
			else next = mode === "single" ? [id] : [...openIds, id];
			if (open === undefined) setUncontrolled(next);
			onChange?.(next);
		};

		return (
			<div
				ref={ref}
				className={className ? `ui-lib-soft-accordion ${className}` : "ui-lib-soft-accordion"}
				data-ui-lib-mode={mode}
			>
				{items.map((item) => (
					<AccordionSection
						key={item.id}
						item={item}
						open={openIds.includes(item.id)}
						generated={generated}
						onToggle={toggle}
					/>
				))}
			</div>
		);
	},
);

/**
 * One section, split out so it can hold a hook.
 *
 * `useMaterial` cannot be called inside a `map` — that is a hook count that
 * depends on the length of an array, which is the rules-of-hooks violation in
 * its most natural disguise. A component per section is the answer, and the
 * cost is one extra element boundary, which is what a section is anyway.
 */
function AccordionSection({
	item,
	open: isOpen,
	generated,
	onToggle,
}: {
	item: SoftAccordionItem;
	open: boolean;
	generated: string;
	onToggle: (id: string) => void;
}) {
	const surface = useMaterial(
		item.material ? { material: item.material, tone: item.tone, name: item.id } : {},
	);
	const headerId = `${generated}-${item.id}-header`;
	const panelId = `${generated}-${item.id}-panel`;
	return (
		<div
			className={
				surface.className
					? `ui-lib-soft-accordion__item ${surface.className}`
					: "ui-lib-soft-accordion__item"
			}
			style={surface.className ? surface.style : undefined}
			data-ui-lib-open={isOpen ? "" : undefined}
			data-ui-lib-disabled={item.disabled ? "" : undefined}
			data-ui-lib-material={
				item.material && item.material !== "plain" ? item.material : undefined
			}
		>
			{/*
			 * A real heading, and a real button inside it. The button is
			 * what takes the click and the keyboard; the heading is what
			 * puts the section in the document outline so it can be reached
			 * by heading navigation. h3 rather than h2 because an accordion
			 * is normally a section of a page rather than the page itself.
			 */}
			<h3 className="ui-lib-soft-accordion__heading">
				<button
					type="button"
					id={headerId}
					className="ui-lib-soft-accordion__trigger"
					aria-expanded={isOpen}
					aria-controls={panelId}
					disabled={item.disabled}
					onClick={() => onToggle(item.id)}
				>
					<span className="ui-lib-soft-accordion__title">{item.title}</span>
					<span className="ui-lib-soft-accordion__mark" aria-hidden="true">
						<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
							<path
								d="M2 4.5 L6 8.5 L10 4.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
				</button>
				{item.note && <span className="ui-lib-soft-accordion__note">{item.note}</span>}
			</h3>
			<section
				id={panelId}
				aria-labelledby={headerId}
				className="ui-lib-soft-accordion__panel"
				/*
				 * `hidden` is not used on the panel even when closed, because a
				 * hidden element cannot be transitioned and the panel has to be
				 * able to animate open. `inert` is what keeps the closed content
				 * out of the tab order, and it is the modern answer to exactly
				 * this: visible to CSS, unreachable to focus.
				 */
				inert={isOpen ? undefined : true}
			>
				<div className="ui-lib-soft-accordion__body">
					<div className="ui-lib-soft-accordion__content">{item.content}</div>
				</div>
			</section>
		</div>
	);
}
