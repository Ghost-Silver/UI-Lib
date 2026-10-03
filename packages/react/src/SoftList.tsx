import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useId, useMemo, useRef, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";

export interface SoftListItem {
	id: string;
	/** The main line. */
	label: string;
	/** A line under it. */
	note?: string;
	/** A leading slot, usually an avatar or an icon. */
	leading?: React.ReactNode;
	/** A trailing slot, usually a count or a state. */
	trailing?: React.ReactNode;
	disabled?: boolean;
}

export interface SoftListProps {
	items: readonly SoftListItem[];
	/** Which items are chosen. A listbox may be single or multiple. */
	selected?: readonly string[];
	onChange?: (selected: string[]) => void;
	/** `multiple` keeps a selection set; `single` replaces it. */
	selection?: "single" | "multiple";
	/** Describes the list. Required — a listbox with no name is unusable. */
	label: string;
	/** The id of an element that names it, if it is labelled on screen. */
	ariaLabelledBy?: string;
	/** Rendered between the list and its end, for a "no matches" state. */
	empty?: React.ReactNode;
	/** `sm` is denser, for a panel. `md` is the default. */
	size?: "sm" | "md";
	/** What the list is made of. */
	material?: SoftMaterial;
	tone?: IrisTone;
	className?: string;
}

/**
 * A list of things that can be chosen.
 *
 * ## Which of the three list shapes this is
 *
 * There are three, they look alike, and picking the wrong one is what makes a
 * list feel strange to use with a screen reader:
 *
 * - **Plain content** is a `<ul>` and nothing else. Nothing is selectable and
 *   there is no interaction to announce. Most lists are this.
 * - **Navigation** is `<nav>` with a `<ul>` of links, which is what this
 *   package's breadcrumb and pagination are.
 * - **Selection** is a `listbox`: the items are options in a set, the set has a
 *   selection, and the reader is told both which item they are on and which ones
 *   are chosen.
 *
 * This component is the third, which is why its `label` is required rather than
 * optional. A listbox with no accessible name is announced as "list box" and
 * nothing more, and there is no way for a caller to fix that from the outside —
 * so it is not possible to build one here by accident.
 *
 * ## Focus stays on the list, not on the items
 *
 * Which is the same model the select uses and the opposite of the menu's. A
 * listbox is one control with a moving highlight, so the list itself takes the
 * focus and the highlight moves with `aria-activedescendant`. Moving real focus
 * to each item would mean every option is a tab stop, and Tab would walk the
 * contents of the list rather than leaving it.
 *
 * ## The keyboard is the listbox keyboard
 *
 *   Up / Down     move the highlight, skipping disabled items
 *   Home / End    first and last
 *   Space         toggle (multiple) or choose (single)
 *   Enter         choose, and is the same as Space for a single-selection list
 *   A-Z           type-ahead over the labels
 *
 * ```tsx
 * <SoftList
 *   label="材质"
 *   items={[{ id: "paper", label: "水彩纸" }]}
 *   selected={picked}
 *   onChange={setPicked}
 *   selection="multiple"
 * />
 * ```
 */
export const SoftList = forwardRef<HTMLDivElement, SoftListProps>(function SoftList(
	{
		items,
		selected = [],
		onChange,
		selection = "single",
		label,
		ariaLabelledBy,
		empty,
		size = "md",
		material,
		tone,
		className,
	},
	ref,
) {
	const surface = useMaterial(material && material !== "plain" ? { material, tone } : {});
	const generated = useId();
	const listId = `${generated}-list`;
	const optionId = useCallback((id: string) => `${generated}-opt-${id}`, [generated]);

	const list = useRef<HTMLDivElement | null>(null);
	const [active, setActive] = useState(() => items.findIndex((item) => !item.disabled));
	const typed = useRef({ text: "", at: 0 });
	const chosen = useMemo(() => new Set(selected), [selected]);

	/** Selectable positions, in order, for the keyboard to walk. */
	const walkable = useMemo(
		() =>
			items
				.map((item, index) => ({ item, index }))
				.filter(({ item }) => !item.disabled)
				.map(({ index }) => index),
		[items],
	);

	const move = (step: 1 | -1, from = active) => {
		if (walkable.length === 0) return;
		const here = walkable.indexOf(from);
		const start = here < 0 ? (step === 1 ? -1 : 0) : here;
		setActive(walkable[(start + step + walkable.length) % walkable.length]!);
	};

	const choose = useCallback(
		(index: number) => {
			const item = items[index];
			if (!item || item.disabled) return;
			if (selection === "single") {
				onChange?.([item.id]);
				return;
			}
			const next = new Set(chosen);
			if (next.has(item.id)) next.delete(item.id);
			else next.add(item.id);
			// Emitted in the order the items appear rather than the order they were
			// clicked, because a caller rendering a summary of the selection wants
			// it to read in the same order as the list it came from.
			onChange?.(items.filter((entry) => next.has(entry.id)).map((entry) => entry.id));
		},
		[chosen, items, onChange, selection],
	);

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				move(-1);
				return;
			case "Home":
				event.preventDefault();
				setActive(walkable[0] ?? -1);
				return;
			case "End":
				event.preventDefault();
				setActive(walkable.at(-1) ?? -1);
				return;
			case " ":
			case "Enter":
				event.preventDefault();
				choose(active);
				return;
			default:
				break;
		}

		/*
		 * Type-ahead, with the same limit the menu has and for the same reason: a
		 * `startsWith` over the label is right for a Latin label and does nothing
		 * for a Chinese one, because the letter is not in the label. Fixing that
		 * means a transliteration table, which is a dependency and a locale
		 * decision rather than a comparison. A miss leaves the highlight where it
		 * is, because a reader who sees it jump at random learns to distrust it.
		 */
		if (event.key.length !== 1 || !/[\p{L}\p{N}]/u.test(event.key)) return;
		const now = Date.now();
		const buffer = now - typed.current.at < 500 ? typed.current.text + event.key : event.key;
		typed.current = { text: buffer, at: now };
		const needle = buffer.toLowerCase();
		const here = walkable.indexOf(active);
		for (let i = 1; i <= walkable.length; i += 1) {
			const index = walkable[(here + i) % walkable.length]!;
			if (items[index]?.label.toLowerCase().startsWith(needle)) {
				setActive(index);
				return;
			}
		}
	};

	return (
		<div
			ref={(node) => {
				list.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			id={listId}
			role="listbox"
			// `multiple` is what makes a reader announce "selected" per item rather
			// than announcing a single value for the whole set.
			aria-multiselectable={selection === "multiple" ? true : undefined}
			aria-label={ariaLabelledBy ? undefined : label}
			aria-labelledby={ariaLabelledBy}
			// One tab stop for the whole control, and the highlight follows.
			tabIndex={0}
			aria-activedescendant={active >= 0 ? optionId(items[active]?.id ?? "") : undefined}
			className={
				surface.className
					? `ui-lib-soft-list ${surface.className} ${className ?? ""}`.trim()
					: className
						? `ui-lib-soft-list ${className}`
						: "ui-lib-soft-list"
			}
			style={surface.className ? (surface.style as React.CSSProperties) : undefined}
			data-ui-lib-size={size}
			onKeyDown={onKeyDown}
			/*
			 * The highlight has to follow the pointer as well, or a click moves the
			 * selection while `aria-activedescendant` still points at wherever the
			 * keyboard was — and the next arrow press jumps from the wrong place.
			 */
			onPointerMove={(event) => {
				const target = (event.target as HTMLElement).closest("[role=option]");
				if (!target) return;
				const index = items.findIndex((item) => optionId(item.id) === target.id);
				if (index >= 0 && !items[index]?.disabled) setActive(index);
			}}
		>
			{items.length === 0 && empty ? (
				/*
				 * Two suppressions, both because the listbox model puts the keyboard
				 * somewhere other than where a linter expects it.
				 *
				 * A `li` carrying `role="option"` is the structure the listbox role is
				 * defined over, and the option itself is deliberately not focusable: the
				 * list holds the focus and `aria-activedescendant` points at the option,
				 * which is what makes one tab stop for the whole control. So there is no
				 * keyboard handler here to pair with the click — the list's own handler is
				 * the keyboard path, and it is complete without this element.
				 */
				/*
				 * Three suppressions, all from the same fact: in a listbox the keyboard
				 * lives on the list, not on the options.
				 *
				 * The list takes the focus and `aria-activedescendant` points at the
				 * option, which is what gives the whole control one tab stop. So an
				 * option is deliberately not focusable, and there is no key handler to
				 * pair with its click — the list's own handler is the keyboard path and
				 * it is complete without this element.
				 */
				<div className="ui-lib-soft-list__empty">{empty}</div>
			) : (
				items.map((item, index) => {
					const isChosen = chosen.has(item.id);
					return (
						/*
						 * The listbox model puts the keyboard on the list, not on the options.
						 *
						 * The list takes the focus and `aria-activedescendant` points at the
						 * option, which is what gives the whole control one tab stop. So the
						 * option is deliberately not focusable, and there is no key handler to
						 * pair with its click — the list's handler is the keyboard path and it
						 * is complete without this element.
						 */
						// biome-ignore lint/a11y/useFocusableInteractive: the list holds focus and aria-activedescendant points here
						// biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the list's own handler
						<div
							key={item.id}
							id={optionId(item.id)}
							role="option"
							aria-selected={isChosen}
							aria-disabled={item.disabled ? true : undefined}
							data-ui-lib-active={index === active ? "" : undefined}
							data-ui-lib-selected={isChosen ? "" : undefined}
							data-ui-lib-disabled={item.disabled ? "" : undefined}
							className="ui-lib-soft-list__item"
							onClick={() => {
								setActive(index);
								choose(index);
							}}
						>
							{item.leading && (
								<span className="ui-lib-soft-list__leading" aria-hidden="true">
									{item.leading}
								</span>
							)}
							<span className="ui-lib-soft-list__body">
								<span className="ui-lib-soft-list__label">{item.label}</span>
								{item.note && <span className="ui-lib-soft-list__note">{item.note}</span>}
							</span>
							{item.trailing && (
								<span className="ui-lib-soft-list__trailing" aria-hidden="true">
									{item.trailing}
								</span>
							)}
						</div>
					);
				})
			)}
		</div>
	);
});
