import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftSelectOption {
	value: string;
	label: string;
	/** Shown under the label. Also what type-ahead matches. */
	note?: string;
	disabled?: boolean;
}

export interface SoftSelectProps {
	options: readonly SoftSelectOption[];
	value?: string;
	onChange?: (value: string) => void;
	/** A visible label. Wired to the control, not merely placed near it. */
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	/** The id of the element that labels the control, if there is no `label`. */
	ariaLabelledBy?: string;
	/** Surface material for dropdown popover: plain paper, wash ground, or light tint. */
	material?: SoftMaterial;
	/** Pigment tone for the material ground. */
	tone?: IrisTone;
	className?: string;
}

/**
 * A listbox that behaves the way a native `<select>` does.
 *
 * Built on the **Popover API** rather than on `<dialog>`, and that is the
 * decision the component is organised around. A dialog is modal: it traps
 * focus, makes the rest of the page inert, and expects to be answered. A
 * dropdown is none of those — it is a non-modal layer that must close on an
 * outside click, on Escape, and on a scroll, while the page underneath stays
 * live. The platform now provides exactly that, in the top layer, with no
 * portal and no stacking-context algebra. `SoftModal` uses `<dialog>`
 * deliberately; this uses the tool that matches.
 *
 * ## Keyboard
 *
 * The whole contract, because a listbox that only works with a mouse is a
 * listbox that does not work:
 *
 *   Up / Down      move the active option, opening first if closed
 *   Home / End     first and last enabled option
 *   Enter / Space  commit the active option
 *   Escape         close without committing
 *   Tab            commit the active option, or close without changing
 *   A-Z / 0-9      type-ahead, matched against label and note
 *
 * ## ARIA
 *
 * `role="combobox"` on the trigger with `aria-expanded` and
 * `aria-activedescendant` pointing at the active option, `role="listbox"` on
 * the popover, `role="option"` with `aria-selected` on each row. Focus never
 * leaves the trigger, which is what `aria-activedescendant` exists for — moving
 * real focus into a list means the list has to be focusable, and then Escape
 * and Tab stop behaving the way users expect.
 *
 * ```tsx
 * <SoftSelect
 *   label="材质"
 *   value={material}
 *   onChange={setMaterial}
 *   options={[
 *     { value: "paper", label: "水彩纸" },
 *     { value: "glass", label: "液态玻璃", note: "会折射" },
 *   ]}
 * />
 * ```
 */
export const SoftSelect = forwardRef<HTMLButtonElement, SoftSelectProps>(function SoftSelect(
	{
		options,
		value,
		onChange,
		label,
		placeholder = "请选择",
		disabled,
		ariaLabelledBy,
		material,
		tone,
		className,
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const surface = useMaterial(material ? { material, tone } : {});
	const [open, setOpen] = useState(false);
	const generated = useId();
	const labelId = `${generated}-label`;
	const listId = `${generated}-list`;
	const optionId = useCallback((index: number) => `${generated}-opt-${index}`, [generated]);

	/*
	 * A per-instance anchor name.
	 *
	 * The first version set `anchor-name: --ui-lib-select` in the stylesheet, so
	 * every select on the page claimed the same name. The browser then has no way
	 * to know which one a `top: anchor(bottom)` refers to, and it picked one —
	 * a page with two fields put the second field's list below the first field's
	 * list, 112px off, which reads as the list being *covered* rather than as
	 * being mis-anchored. `elementFromPoint` at the list's own corner returned one
	 * of its own options, which is what ruled the covering theory out.
	 */
	const anchorName = `--ui-anchor-select-${generated.replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const trigger = useRef<HTMLButtonElement | null>(null);
	const popover = useRef<HTMLDivElement | null>(null);
	/** The option the keyboard is on. Not the same as the chosen one. */
	const [active, setActive] = useState(0);
	/** Type-ahead buffer, with the time it was last appended to. */
	const typed = useRef({ text: "", at: 0 });

	const selectedIndex = useMemo(
		() => options.findIndex((option) => option.value === value),
		[options, value],
	);
	const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

	/** Index of the first option that can be chosen. */
	const firstEnabled = useCallback(
		(from = 0, step = 1) => {
			for (let i = from; i >= 0 && i < options.length; i += step) {
				if (!options[i]?.disabled) return i;
			}
			return -1;
		},
		[options],
	);

	/*
	 * Show and hide through the platform rather than through state alone.
	 *
	 * `showPopover()` is what puts the element in the top layer; setting `open`
	 * without it would render a listbox inside whichever stacking context the
	 * field happens to sit in, and it would be clipped by the next card. The
	 * `popover` attribute handles light dismiss, so there is no document
	 * listener for outside clicks and nothing to leak.
	 */
	useEffect(() => {
		const node = popover.current;
		if (!node) return;
		if (open && !node.matches(":popover-open")) node.showPopover();
		else if (!open && node.matches(":popover-open")) node.hidePopover();
	}, [open]);

	/*
	 * Keep `open` in step when the popover closes for a reason React does not
	 * know about.
	 *
	 * The state has to be read from the event, and the first version did not:
	 *
	 *   const closed = () => setOpen(false);
	 *   node.addEventListener("toggle", closed);
	 *
	 * `toggle` fires on **open as well as close**, so the sequence for a single
	 * click was: click sets `open` true, the effect calls `showPopover()`, the
	 * popover fires `toggle`, the listener sets `open` back to false, and the
	 * effect then closes it. The list opened and immediately shut, and the only
	 * symptom was `aria-expanded` never becoming true — which looks like a
	 * broken click, not like a feedback loop, and is why it was traced by
	 * reading the event handlers rather than by adding more logging to the DOM.
	 */
	useEffect(() => {
		const node = popover.current;
		if (!node) return;
		const onToggle = (event: Event) => {
			const state = (event as ToggleEvent).newState;
			if (state === "closed") setOpen(false);
			else if (state === "open") setOpen(true);
		};
		node.addEventListener("toggle", onToggle);
		return () => node.removeEventListener("toggle", onToggle);
	}, []);

	/*
	 * The outside click, written by hand because `manual` popovers do not do it.
	 *
	 * `pointerdown` rather than `click`: a click on another control would also
	 * activate that control, and for a list this is worse — the list closes and
	 * something unrelated happens. On pointerdown the list is gone before the
	 * other element sees the event.
	 *
	 * The trigger is excluded, because its own handler toggles and two handlers
	 * on one event would fight.
	 */
	useEffect(() => {
		if (!open) return;
		const away = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (popover.current?.contains(target)) return;
			if (trigger.current?.contains(target)) return;
			setOpen(false);
		};
		// Capture, so a handler that stops propagation downstream cannot keep the
		// list open.
		document.addEventListener("pointerdown", away, true);
		return () => document.removeEventListener("pointerdown", away, true);
	}, [open]);

	const commit = useCallback(
		(index: number) => {
			const option = options[index];
			if (!option || option.disabled) return;
			onChange?.(option.value);
			setOpen(false);
			trigger.current?.focus();
		},
		[onChange, options],
	);

	const move = useCallback(
		(step: number) => {
			if (options.length === 0) return;
			let next = active;
			// Wrap, and skip disabled options rather than landing on them.
			for (let i = 0; i < options.length; i += 1) {
				next = (next + step + options.length) % options.length;
				if (!options[next]?.disabled) break;
			}
			setActive(next);
		},
		[active, options],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (disabled) return;
			const { key } = event;

			if (
				!open &&
				(key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ")
			) {
				event.preventDefault();
				const start = selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1);
				setActive(start < 0 ? 0 : start);
				setOpen(true);
				return;
			}

			switch (key) {
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
					setActive(firstEnabled(0, 1));
					return;
				case "End":
					event.preventDefault();
					setActive(firstEnabled(options.length - 1, -1));
					return;
				case "Enter":
				case " ":
					event.preventDefault();
					commit(active);
					return;
				case "Escape":
					event.preventDefault();
					setOpen(false);
					return;
				case "Tab":
					// A tab is a decision: it either commits what is highlighted or
					// leaves without changing. Closing silently would throw away a
					// deliberate keyboard selection.
					if (open) commit(active);
					return;
				default:
					break;
			}

			// Type-ahead. Multi-character within half a second, matching either
			// the label or the note, and repeating a single character cycles
			// through the options that start with it.
			if (key.length !== 1 || !/[\p{L}\p{N}]/u.test(key)) return;
			const now = Date.now();
			const buffer = now - typed.current.at < 500 ? typed.current.text + key : key;
			typed.current = { text: buffer, at: now };
			const lower = buffer.toLowerCase();
			for (let i = 1; i <= options.length; i += 1) {
				const index = (active + i) % options.length;
				const option = options[index];
				if (!option || option.disabled) continue;
				const haystack = `${option.label} ${option.note ?? ""}`.toLowerCase();
				if (haystack.includes(lower)) {
					setActive(index);
					if (!open) setOpen(true);
					return;
				}
			}
		},
		[active, commit, disabled, firstEnabled, move, open, options, selectedIndex],
	);

	return (
		<div
			className={className ? `ui-lib-soft-select ${className}` : "ui-lib-soft-select"}
			data-ui-lib-open={open ? "" : undefined}
			data-ui-lib-disabled={disabled ? "" : undefined}
		>
			{label && (
				<span className="ui-lib-soft-select__label" id={labelId}>
					{label}
				</span>
			)}
			<button
				ref={(node) => {
					trigger.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				type="button"
				role="combobox"
				aria-expanded={open}
				aria-controls={listId}
				aria-haspopup="listbox"
				aria-activedescendant={open ? optionId(active) : undefined}
				aria-labelledby={label ? labelId : ariaLabelledBy}
				disabled={disabled}
				className="ui-lib-soft-select__trigger"
				/*
				 * The anchor is the trigger, not the wrapper. Anchoring the
				 * wrapper made `left: anchor(left)` and `right: anchor(right)`
				 * resolve against two different boxes — the label sits above the
				 * trigger inside the same wrapper — so the list came out 177px
				 * wide against a 320px field. Anchoring the trigger makes both
				 * edges the field's own edges, and the list matches it.
				 */
				style={{ anchorName } as React.CSSProperties}
				onClick={() => setOpen((was) => !was)}
				onKeyDown={handleKeyDown}
			>
				<span
					className="ui-lib-soft-select__value"
					data-ui-lib-placeholder={selected ? undefined : ""}
				>
					{selected?.label ?? placeholder}
				</span>
				<span className="ui-lib-soft-select__chevron" aria-hidden="true" />
			</button>
			{/*
			 * popover="manual", with the outside click written above. Neither
			 * platform mode is usable as-is, measured with a real mouse rather
			 * than assumed: auto closes on an outside click but also closes when
			 * the trigger is clicked, and the trigger is itself a toggle; manual
			 * ignores the trigger (wanted) and also ignores outside clicks (not
			 * wanted). Light dismiss does not fire for a programmatic click, only
			 * for a real pointer — the first attempt used element.click() and
			 * reported that neither mode dismissed.
			 */}
			<div
				ref={popover}
				popover="manual"
				id={listId}
				role="listbox"
				aria-labelledby={label ? labelId : ariaLabelledBy}
				className={["ui-lib-soft-select__list", surface.className].filter(Boolean).join(" ")}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
				style={{ positionAnchor: anchorName, ...surface.style } as React.CSSProperties}
			>
				{options.map((option, index) => (
					<div
						key={option.value}
						id={optionId(index)}
						role="option"
						tabIndex={-1}
						aria-selected={option.value === value}
						aria-disabled={option.disabled ? true : undefined}
						data-ui-lib-active={index === active ? "" : undefined}
						data-ui-lib-option-disabled={option.disabled ? "" : undefined}
						className="ui-lib-soft-select__option"
						// Pointer down rather than click: the popover's light dismiss
						// runs on pointerdown, and a click handler would be racing it.
						onPointerDown={(event) => {
							event.preventDefault();
							commit(index);
						}}
						onPointerEnter={() => setActive(index)}
					>
						<span className="ui-lib-soft-select__option-label">{option.label}</span>
						{option.note && (
							<span className="ui-lib-soft-select__option-note">{option.note}</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
});
