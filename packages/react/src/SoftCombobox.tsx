import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { fieldMessage, useField } from "./field.js";
import { anchorNameFrom, usePopover } from "./overlay.js";
import { useStyles } from "./useStyles.js";

export interface SoftComboboxOption {
	value: string;
	label: string;
	/** A line under the label. Matched by the filter as well as shown. */
	note?: string;
	disabled?: boolean;
}

export interface SoftComboboxProps {
	options: readonly SoftComboboxOption[];
	value: string;
	onChange: (value: string) => void;
	label?: string;
	hint?: string;
	error?: string;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	/** Shown in the list when nothing matches. */
	emptyText?: string;
	/**
	 * Let the value be something that is not in the list.
	 *
	 * Off by default, and the default is the interesting half: with `false` the
	 * control is a chooser and a typed string that matches nothing is not a value,
	 * so it reverts on blur. With `true` it is a free-text field with
	 * suggestions, which is a different contract and a different announcement.
	 */
	allowCustom?: boolean;
}

/**
 * A text field with a list of suggestions.
 *
 * ## What makes it different from the select
 *
 * The select's trigger is a `<button role="combobox">`: it opens a list and it
 * cannot be typed into. This one's trigger is an `<input role="combobox">`, which
 * adds two obligations the button never had.
 *
 * **`aria-autocomplete="list"`**, and its exact meaning matters: a popup list is
 * shown *and its contents depend on what has been typed*. That is what `list`
 * means, as opposed to `inline` (the completion appears inside the field, like a
 * shell's tab completion) or `both`. Omitting it is not a crash — it is a reader
 * that does not know the list is changing under it, so it never announces that
 * the result count went from eight to two.
 *
 * **The list filters**, and that is what makes the reading order wrong in most
 * implementations: the visually active item and the
 * `aria-activedescendant` target have to be recomputed on every keystroke, and a
 * stale id points at an option that is no longer rendered.
 *
 * ## Focus does not move into the list
 *
 * The same model as the select, and it is the opposite of the menu for the same
 * reason: the trigger is a field the user is still typing into, so focus stays
 * there and `aria-activedescendant` names the option. Moving focus into the list
 * would take the caret out of the field on the first arrow press.
 *
 * ## Keyboard
 *
 *   Down / Up      open, then walk the filtered list
 *   Enter          choose the active option, or accept what is typed when custom
 *                  values are allowed
 *   Escape         close without choosing; a second Escape clears the field
 *   Tab            close and keep what is typed if it is valid, or revert
 *   Home / End     jump within the filtered list while it is open
 *
 * ```tsx
 * <SoftCombobox
 *   label="材质"
 *   value={material}
 *   onChange={setMaterial}
 *   options={[{ value: "paper", label: "水彩纸", note: "会吸水" }]}
 * />
 * ```
 */
export const SoftCombobox = forwardRef<HTMLInputElement, SoftComboboxProps>(
	function SoftCombobox(
		{
			options,
			value,
			onChange,
			label,
			hint,
			error,
			placeholder,
			disabled,
			id,
			className,
			emptyText = "没有匹配",
			allowCustom = false,
		},
		ref,
	) {
		// The stylesheet is not injected by the GPU components alone; see useStyles.
		useStyles();
		const generated = useId();
		const wiring = useField({ id, hasHint: Boolean(hint), hasError: Boolean(error) });
		const message = fieldMessage(wiring, { hint, error });
		const listId = `${generated}-list`;
		const anchor = anchorNameFrom(generated, "ui-anchor-combo");

		const [open, setOpen] = useState(false);
		/*
		 * What is in the field, which is a **label**, not the `value`.
		 *
		 * The first version initialised this with `value`, so a field whose value was
		 * `"paper"` held the string "paper" — and then filtered the options by it,
		 * found nothing, and opened straight onto "no matches". The field showed one
		 * thing and searched for another, which is a class of bug that only appears
		 * when the value and the label differ. In this page they did.
		 */
		const [draft, setDraft] = useState(
			() => options.find((option) => option.value === value)?.label ?? "",
		);
		const [active, setActive] = useState(0);
		const { ref: popover } = usePopover<HTMLDivElement>(open);
		const input = useRef<HTMLInputElement | null>(null);
		/** Set while a change comes from the list, so the filter does not re-run. */
		const fromList = useRef(false);

		/*
		 * The value can be changed from outside, and the field has to follow — as a
		 * label, for the same reason the initial state is one.
		 *
		 * `fromList` is what keeps this from fighting the user: a change made by
		 * choosing from the list already set the draft to the right label, and
		 * re-deriving it here would be a no-op at best and a fight at worst.
		 */
		useEffect(() => {
			if (fromList.current) {
				fromList.current = false;
				return;
			}
			setDraft(options.find((option) => option.value === value)?.label ?? "");
		}, [options, value]);

		/*
		 * The filter, which is what `aria-autocomplete="list"` promises. Matched
		 * against the note as well as the label, because a note is often the part
		 * that distinguishes two options with similar names.
		 */
		const filtered = useMemo(() => {
			const needle = draft.trim().toLowerCase();
			/*
			 * A field showing its own chosen label is not a search.
			 *
			 * This is the second half of the value/label bug. Fixing the first half
			 * made the field show "水彩纸" instead of "paper" — and the list then
			 * filtered by "水彩纸", so opening it showed one option out of four and
			 * typing a character onto the end searched for "水彩纸水" and found
			 * nothing. Measured: `options: 1` on open, `options: 0` after a keystroke.
			 *
			 * So the filter runs on what the user is *searching for*, not on what the
			 * field happens to contain. While the text still matches the chosen
			 * option's label exactly, nothing is being searched and the whole list is
			 * offered; the first edit makes it a search.
			 */
			const chosen = options.find((option) => option.value === value);
			if (needle === "" || (chosen && needle === chosen.label.toLowerCase())) return options;
			return options.filter((option) =>
				`${option.label} ${option.note ?? ""}`.toLowerCase().includes(needle),
			);
		}, [draft, options, value]);

		/*
		 * The active index has to be repointed whenever the list shrinks, or
		 * `aria-activedescendant` names an option that is no longer rendered — which
		 * is announced as nothing at all, and the arrow keys then appear to do
		 * nothing because the walk starts from an index that is not in the list.
		 */
		useEffect(() => {
			setActive((was) => {
				const next = Math.min(was, filtered.length - 1);
				return next < 0 ? 0 : next;
			});
		}, [filtered.length]);

		const commit = useCallback(
			(option: SoftComboboxOption) => {
				fromList.current = true;
				setDraft(option.label);
				onChange(option.value);
				setOpen(false);
			},
			[onChange],
		);

		const optionId = (index: number) => `${generated}-opt-${index}`;

		const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
			const walk = (step: 1 | -1) => {
				if (filtered.length === 0) return;
				setActive((was) => (was + step + filtered.length) % filtered.length);
			};
			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					if (!open) setOpen(true);
					else walk(1);
					return;
				case "ArrowUp":
					event.preventDefault();
					if (!open) setOpen(true);
					else walk(-1);
					return;
				case "Home":
					if (!open) return;
					event.preventDefault();
					setActive(0);
					return;
				case "End":
					if (!open) return;
					event.preventDefault();
					setActive(Math.max(filtered.length - 1, 0));
					return;
				case "Enter": {
					const option = filtered[active];
					if (open && option && !option.disabled) {
						event.preventDefault();
						commit(option);
					} else if (allowCustom && draft.trim() !== "") {
						event.preventDefault();
						onChange(draft.trim());
						setOpen(false);
					}
					return;
				}
				case "Escape":
					event.preventDefault();
					if (open) setOpen(false);
					// A second Escape clears, which is the behaviour a reader expects
					// from a search field and the only way to get back to the full list
					// without selecting the text by hand.
					else if (draft !== "") {
						setDraft("");
						fromList.current = true;
						onChange("");
					}
					return;
				case "Tab":
					/*
					 * Tab is a decision, and which decision depends on the contract.
					 *
					 * With custom values allowed, whatever is typed is the answer.
					 * Without them the field is a chooser: a string that matches no
					 * option is not a value, so it reverts to the one that is selected —
					 * which is the same rule the blur handler applies, because leaving
					 * the field is leaving the field however it happens.
					 */
					setOpen(false);
					if (allowCustom && draft.trim() !== "") {
						fromList.current = true;
						onChange(draft.trim());
					} else {
						const match = options.find((option) => option.value === value);
						setDraft(match ? match.label : "");
					}
					return;
				default:
					return;
			}
		};

		return (
			<div
				className={className ? `ui-lib-soft-input ${className}` : "ui-lib-soft-input"}
				data-ui-lib-invalid={error ? "" : undefined}
				data-ui-lib-disabled={disabled ? "" : undefined}
				data-ui-lib-open={open ? "" : undefined}
			>
				{label && (
					<label className="ui-lib-soft-input__label" htmlFor={wiring.id}>
						{label}
					</label>
				)}
				<span
					className="ui-lib-soft-input__shell"
					style={{ anchorName: anchor } as React.CSSProperties}
				>
					<input
						ref={(node) => {
							input.current = node;
							if (typeof ref === "function") ref(node);
							else if (ref) ref.current = node;
						}}
						id={wiring.id}
						role="combobox"
						// The list is a popup whose contents change with the typing. Omitting
						// this leaves a reader that never announces the count changing.
						aria-autocomplete="list"
						aria-expanded={open}
						aria-controls={listId}
						aria-haspopup="listbox"
						aria-activedescendant={open && filtered[active] ? optionId(active) : undefined}
						aria-invalid={error ? true : undefined}
						aria-describedby={wiring.describedBy}
						autoComplete="off"
						disabled={disabled}
						placeholder={placeholder}
						value={draft}
						className="ui-lib-soft-input__field"
						onChange={(event) => {
							setDraft(event.target.value);
							setOpen(true);
							setActive(0);
						}}
						onFocus={(event) => {
							setOpen(true);
							/*
							 * Select what is already there, so typing replaces the chosen label
							 * rather than appending to it.
							 *
							 * Without this the field is nearly unusable past its first use:
							 * it holds "水彩纸", the user types "水", and the search becomes
							 * "水彩纸水" and matches nothing. Measured before this was added:
							 * `options: 4` on open, `options: 0` after one keystroke. With it,
							 * the same keystroke replaces the text and the list filters to
							 * the two options containing it.
							 *
							 * Only on keyboard focus, not on every click: selecting the text
							 * when someone clicks to place a caret would fight them.
							 */
							if (event.target instanceof HTMLInputElement) {
								event.target.select();
							}
						}}
						onKeyDown={onKeyDown}
						onBlur={() => {
							/*
							 * The revert, on blur rather than on every keystroke: a field that
							 * rejects what is being typed cannot be typed into. Leaving it is
							 * the moment the string becomes an answer, and a string that
							 * matches no option is not one — unless the caller said custom
							 * values are allowed, in which case it is.
							 *
							 * Deferred by a microtask so a click on an option is applied
							 * first. The list's own handler calls `preventDefault` on pointer
							 * down, which should be enough, but the order of a blur against a
							 * pointer event is not something to depend on when getting it
							 * wrong means the choice is silently undone.
							 */
							if (allowCustom) return;
							queueMicrotask(() => {
								const match = options.find((option) => option.value === value);
								setDraft(match ? match.label : "");
							});
						}}
					/>
				</span>

				<div
					ref={popover}
					popover="manual"
					id={listId}
					role="listbox"
					aria-label={label}
					className="ui-lib-soft-combobox__list"
					style={{ positionAnchor: anchor } as React.CSSProperties}
				>
					{filtered.length === 0 ? (
						<div className="ui-lib-soft-combobox__empty">{emptyText}</div>
					) : (
						filtered.map((option, index) => (
							/*
							 * The option is not focusable, by design and by the same rule as the
							 * list: the field keeps the focus while the user is still typing into
							 * it, and `aria-activedescendant` names the option. Moving focus into
							 * the list would take the caret out of the field on the first arrow
							 * press, which is the bug this whole arrangement avoids.
							 */
							// biome-ignore lint/a11y/useFocusableInteractive: the input holds focus and aria-activedescendant points here
							<div
								key={option.value}
								id={optionId(index)}
								role="option"
								aria-selected={option.value === value}
								aria-disabled={option.disabled ? true : undefined}
								data-ui-lib-active={index === active ? "" : undefined}
								data-ui-lib-selected={option.value === value ? "" : undefined}
								data-ui-lib-option-disabled={option.disabled ? "" : undefined}
								className="ui-lib-soft-combobox__option"
								// Pointer down rather than click, so the choice lands before the
								// field's blur reverts the draft.
								onPointerDown={(event) => {
									event.preventDefault();
									if (!option.disabled) commit(option);
								}}
								onPointerEnter={() => setActive(index)}
							>
								<span className="ui-lib-soft-combobox__label">{option.label}</span>
								{option.note && (
									<span className="ui-lib-soft-combobox__note">{option.note}</span>
								)}
							</div>
						))
					)}
				</div>

				{message && (
					<p
						className="ui-lib-soft-input__message"
						id={message.id}
						role={message.invalid ? "alert" : undefined}
					>
						{message.text}
					</p>
				)}
			</div>
		);
	},
);
