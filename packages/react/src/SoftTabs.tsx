import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";

export interface SoftTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
	/** Tab labels, in order. */
	items: readonly string[];
	/** Controlled selection. */
	value?: number;
	/** Called with the index that was picked. */
	onChange?: (index: number) => void;
	/** `sm` is 34px tall, `md` is 42. */
	size?: "sm" | "md";
	/** A name for the group, for assistive technology. */
	label?: string;
}

interface Geometry {
	left: number;
	width: number;
}

/**
 * A segmented control whose indicator stretches like a droplet.
 *
 * The movement is the feature. A pill that slides looks like a separate object
 * being carried between slots; a droplet that narrows as it leaves, trails a
 * neck, and then swallows into the next slot reads as one continuous body of
 * liquid. Pure CSS cannot do a real metaball, so the neck is a third element —
 * a bar that spans the gap while the two ends travel — which is the same trick
 * at a fraction of the cost.
 *
 * The geometry is measured rather than calculated. Tab widths depend on the
 * label text and the font, and this repository ships a font stack whose first
 * entry is a local face that may or may not be installed, so any arithmetic
 * here would be wrong on half the machines that run it.
 *
 * ```tsx
 * <SoftTabs items={["柔光", "水彩", "玻璃"]} value={tab} onChange={setTab} />
 * ```
 */
export const SoftTabs = forwardRef<HTMLDivElement, SoftTabsProps>(function SoftTabs(
	{ items, value, onChange, size = "md", label, className, ...props },
	ref,
) {
	const [own, setOwn] = useState(0);
	const active = value ?? own;
	const isControlled = value !== undefined;

	const listRef = useRef<HTMLDivElement | null>(null);
	const [geometry, setGeometry] = useState<Geometry[]>([]);
	/** True while the indicator is between two slots, so it can stretch. */
	const [travelling, setTravelling] = useState(false);
	const first = useRef(true);
	const groupId = useId();

	const measure = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const rect = list.getBoundingClientRect();
		setGeometry(
			Array.from(list.children, (child) => {
				const box = (child as HTMLElement).getBoundingClientRect();
				return { left: box.left - rect.left, width: box.width };
			}),
		);
	}, []);

	// Measured on mount and whenever the labels change. A ResizeObserver rather
	// than a window listener, because the list reflows when the font swaps in,
	// which is not a resize of anything the window knows about.
	useEffect(() => {
		measure();
		const list = listRef.current;
		if (!list || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(list);
		for (const child of Array.from(list.children)) observer.observe(child);
		return () => observer.disconnect();
	}, [measure]);

	// The stretch is only for movement, never for the first paint: a control
	// that animates itself into place on load draws the eye to the wrong thing.
	// `active` is load-bearing: this runs *because* the selection changed, and
	// the ref guard inside is what skips the first paint. Removing it from the
	// list would stop the stretch from ever firing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the effect exists to react to `active`
	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		setTravelling(true);
		const timer = window.setTimeout(() => setTravelling(false), 380);
		return () => window.clearTimeout(timer);
	}, [active]);

	const pick = (index: number) => {
		if (!isControlled) setOwn(index);
		onChange?.(index);
	};

	const current = geometry[active];
	const from = geometry[active === 0 ? 1 : active - 1];
	const to = geometry[active + 1] ?? (active > 0 ? geometry[active - 1] : undefined);

	// While travelling, the pill is drawn from the midpoint of the previous slot
	// to the midpoint of the next one, and a neck is drawn across whatever is
	// left. Between them the shape narrows and then fills, which is the whole
	// illusion.
	const mid = (g: Geometry | undefined) => (g ? g.left + g.width / 2 : undefined);
	const travelFrom = travelling ? mid(from) : undefined;
	const travelTo = travelling ? mid(to) : undefined;
	const neckLeft =
		travelFrom !== undefined && travelTo !== undefined ? Math.min(travelFrom, travelTo) : 0;
	const neckWidth =
		travelFrom !== undefined && travelTo !== undefined ? Math.abs(travelTo - travelFrom) : 0;

	return (
		<div
			{...props}
			ref={(node) => {
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			className={className ? `ui-lib-soft-tabs ${className}` : "ui-lib-soft-tabs"}
			data-ui-lib-size={size}
			data-ui-lib-travelling={travelling ? "" : undefined}
		>
			<div className="ui-lib-soft-tabs__list" role="tablist" aria-label={label} ref={listRef}>
				{current && (
					<>
						<span
							className="ui-lib-soft-tabs__neck"
							aria-hidden="true"
							style={{ left: `${neckLeft}px`, width: `${neckWidth}px` }}
						/>
						<span
							className="ui-lib-soft-tabs__pill"
							aria-hidden="true"
							style={{ left: `${current.left}px`, width: `${current.width}px` }}
						/>
					</>
				)}
				{items.map((item, index) => (
					<button
						key={item}
						role="tab"
						type="button"
						id={`${groupId}-${index}`}
						aria-selected={index === active}
						aria-controls={`${groupId}-panel-${index}`}
						tabIndex={index === active ? 0 : -1}
						className="ui-lib-soft-tabs__tab"
						onClick={() => pick(index)}
						onKeyDown={(event) => {
							// Arrow keys move between tabs, which is what the ARIA
							// tab pattern asks for and what a keyboard user expects.
							const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
							if (!step) return;
							event.preventDefault();
							const next = (index + step + items.length) % items.length;
							pick(next);
							const node = listRef.current?.children[next] as HTMLElement | undefined;
							node?.focus();
						}}
					>
						{item}
					</button>
				))}
			</div>
		</div>
	);
});
