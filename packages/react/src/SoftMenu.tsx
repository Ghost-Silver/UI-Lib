import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import { anchorNameFrom, usePopover } from "./overlay.js";

/** A command, a separator, or a heading inside a menu. */
export type SoftMenuItem =
	| {
			kind?: "item";
			id: string;
			label: string;
			/** A shortcut hint. Rendered and announced, not only drawn. */
			shortcut?: string;
			disabled?: boolean;
			/** Draw a tick before the label. */
			checked?: boolean;
			/** Put a rule above this item. */
			dividerBefore?: boolean;
			onSelect: () => void;
	  }
	| { kind: "separator"; id: string }
	/** A group heading. Not focusable and not selectable. */
	| { kind: "label"; id: string; label: string };

export interface SoftMenuProps {
	/** What the button says. */
	trigger: string;
	items: readonly SoftMenuItem[];
	/** Which side of the trigger the menu opens on. */
	align?: "start" | "end";
	/** The accessible name of the menu, when the trigger's text is not enough. */
	label?: string;
	disabled?: boolean;
	className?: string;
}

/**
 * A menu of commands, opened from a button.
 *
 * ## `role="menu"` is not for navigation links, and most implementations get that wrong
 *
 * The ARIA menu roles describe an **application menu**: a list of commands that
 * act on something, where the reader expects arrow keys to walk it and where the
 * items do things rather than go places. It is the File menu, not a sidebar.
 *
 * A list of *links* is `<nav>` with a `<ul>` — the breadcrumb and pagination in
 * this package are that, and they are deliberately not menus. Marking a list of
 * links as `role="menu"` tells a reader it is a set of commands, which changes
 * what they expect the arrow keys to do and which gestures their screen reader
 * intercepts. There is no prop here to make this component a navigation list:
 * reaching for it should be a deliberate choice, and the wrong choice should
 * require reaching for a different component.
 *
 * ## The keyboard model is the whole point
 *
 *   Enter / Space / Down   open, and land on the first item
 *   Up                     open, and land on the last
 *   Down / Up              walk the items, skipping separators and disabled ones
 *   Home / End             first and last
 *   A-Z                    type-ahead over the labels
 *   Enter / Space          run the focused command
 *   Escape                 close and return focus to the trigger
 *   Tab                    close — a menu is not a form to move through
 *
 * Focus really moves into the menu, which is the opposite of what the listbox
 * does. A listbox keeps focus on the trigger and moves a highlight with
 * `aria-activedescendant`, because the trigger is a text field the user is still
 * typing into. A menu has no text field, so focus belongs on the item — which is
 * also what makes `Tab` closing it the right behaviour rather than a bug.
 *
 * ```tsx
 * <SoftMenu trigger="文件" items={[
 *   { id: "new", label: "新建", shortcut: "⌘N", onSelect: () => newFile() },
 *   { kind: "separator", id: "s1" },
 *   { id: "quit", label: "退出", onSelect: () => quit() },
 * ]} />
 * ```
 */
export const SoftMenu = forwardRef<HTMLDivElement, SoftMenuProps>(function SoftMenu(
	{ trigger, items, align = "start", label, disabled, className },
	ref,
) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const generated = useId();
	const menuId = `${generated}-menu`;
	const anchor = anchorNameFrom(generated, "ui-anchor-menu");
	const { ref: popover } = usePopover<HTMLDivElement>(open);

	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const typed = useRef({ text: "", at: 0 });

	/** Selectable positions: not separators, not headings, not disabled. */
	const selectable = items
		.map((item, index) => ({ item, index }))
		.filter(
			({ item }) =>
				(item.kind ?? "item") === "item" && !(item as { disabled?: boolean }).disabled,
		);

	const close = useCallback((refocus: boolean) => {
		setOpen(false);
		if (refocus) triggerRef.current?.focus();
	}, []);

	/*
	 * The outside click, written by hand because a `manual` popover does not do
	 * it — the same reason the select has this, and the same measurement behind
	 * it: `auto` closes on an outside click but also on a click of the trigger,
	 * and the trigger is itself a toggle, so the two would fight.
	 *
	 * `pointerdown` in the capture phase, so a click on another control closes
	 * this menu before that control acts on it.
	 */
	useEffect(() => {
		if (!open) return;
		const away = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (triggerRef.current?.contains(target)) return;
			const list = document.getElementById(menuId);
			if (list?.contains(target)) return;
			// The menu is closed but the focus is deliberately not returned: the user
			// has chosen somewhere else to be, and yanking focus back to a button
			// they have moved on from is worse than leaving it where they clicked.
			setOpen(false);
		};
		document.addEventListener("pointerdown", away, true);
		return () => document.removeEventListener("pointerdown", away, true);
	}, [menuId, open]);

	/*
	 * Focus follows the highlight, and it has to happen after the menu has been
	 * rendered into the top layer — focusing an element that is not yet laid out
	 * moves the focus nowhere and the menu opens with the reader still on the
	 * trigger.
	 */
	useEffect(() => {
		if (!open || active < 0) return;
		itemRefs.current[active]?.focus();
	}, [active, open]);

	const step = useCallback(
		(direction: 1 | -1, from = active) => {
			if (selectable.length === 0) return;
			const here = selectable.findIndex((entry) => entry.index === from);
			const start = here < 0 ? (direction === 1 ? -1 : 0) : here;
			const next = (start + direction + selectable.length) % selectable.length;
			setActive(selectable[next]!.index);
		},
		[active, selectable],
	);

	const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;
		switch (event.key) {
			case "ArrowDown":
			case "Enter":
			case " ":
				event.preventDefault();
				setActive(selectable[0]?.index ?? -1);
				setOpen(true);
				return;
			case "ArrowUp":
				event.preventDefault();
				setActive(selectable.at(-1)?.index ?? -1);
				setOpen(true);
				return;
			default:
				return;
		}
	};

	const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				step(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				step(-1);
				return;
			case "Home":
				event.preventDefault();
				setActive(selectable[0]?.index ?? -1);
				return;
			case "End":
				event.preventDefault();
				setActive(selectable.at(-1)?.index ?? -1);
				return;
			case "Escape":
				event.preventDefault();
				close(true);
				return;
			case "Tab":
				// A menu is not a form. Tab closes rather than moving to the next
				// item, and the focus goes back to where the menu came from, which is
				// what makes the sequence "open, choose, back to the button" something
				// a keyboard user can predict.
				close(true);
				return;
			case "Enter":
			case " ": {
				event.preventDefault();
				const item = items[active];
				if (item && (item.kind ?? "item") === "item") {
					(item as { onSelect: () => void }).onSelect();
					close(true);
				}
				return;
			}
			default:
				break;
		}

		/*
		 * Type-ahead, and its limit is worth stating rather than hiding.
		 *
		 * A command menu is scanned by name, so this matters more here than in a
		 * listbox. It matches the label with `startsWith`, which is exactly right
		 * for a Latin label and **does nothing for a Chinese one**: typing "s"
		 * cannot match "保存", because the label does not contain the letter. That
		 * is not a bug to be fixed by a smarter comparison — the missing piece is
		 * a transliteration table, which is a dependency, a locale decision and
		 * megabytes of data, and none of that belongs in a component that is
		 * otherwise 300 lines of CSS and state.
		 *
		 * It is left in because it works for every Latin label, which is most of
		 * the labels in most applications, and because a menu with no type-ahead
		 * at all is worse than one with type-ahead that covers part of its
		 * alphabet. What it must not do is *appear* to work: a reader who types
		 * "s" and sees the highlight jump somewhere arbitrary learns to distrust
		 * the feature, so a miss leaves the highlight exactly where it is.
		 */
		if (event.key.length !== 1 || !/[\p{L}\p{N}]/u.test(event.key)) return;
		const now = Date.now();
		const buffer = now - typed.current.at < 500 ? typed.current.text + event.key : event.key;
		typed.current = { text: buffer, at: now };
		const needle = buffer.toLowerCase();
		const here = selectable.findIndex((entry) => entry.index === active);
		// From the current one onward, wrapping. Searching from a fixed start would
		// make repeated presses cycle through every match from the top, which is
		// how a list that starts with the same letter becomes unusable.
		for (let i = 1; i <= selectable.length; i += 1) {
			const entry = selectable[(here + i) % selectable.length];
			const text = entry ? ((entry.item as { label?: string }).label?.toLowerCase() ?? "") : "";
			if (entry && text.startsWith(needle)) {
				setActive(entry.index);
				return;
			}
		}
	};

	return (
		<div
			ref={ref}
			className={className ? `ui-lib-soft-menu ${className}` : "ui-lib-soft-menu"}
			data-ui-lib-align={align}
			style={{ anchorName: anchor } as React.CSSProperties}
		>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				className="ui-lib-soft-menu__trigger"
				onClick={() => setOpen((was) => !was)}
				onKeyDown={onTriggerKeyDown}
			>
				{trigger}
				<svg
					className="ui-lib-soft-menu__chevron"
					viewBox="0 0 10 10"
					width="9"
					height="9"
					aria-hidden="true"
				>
					<path
						d="M2 4 L5 7 L8 4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{/*
			 * `manual`, like the select, and for the same measured reasons: `auto`
			 * closes when the trigger is clicked, and the trigger is itself a
			 * toggle, so the menu would close and the click would reopen it.
			 * `manual` ignores outside clicks, so those are handled on the trigger.
			 */}
			<div
				ref={popover}
				popover="manual"
				id={menuId}
				role="menu"
				aria-label={label ?? trigger}
				className="ui-lib-soft-menu__list"
				style={{ positionAnchor: anchor } as React.CSSProperties}
				onKeyDown={onMenuKeyDown}
			>
				{items.map((item, index) => {
					// Narrowed on `item.kind` rather than on a derived `kind`, because the
					// derived value is a string and TypeScript cannot use it to narrow
					// `item` — which is what the first version did, and it type-checked
					// the separator branch and then failed on the label one.
					if (item.kind === "separator") {
						/*
						 * A rule inside the menu, and `role="separator"` rather than
						 * `<hr>`, which biome suggests.
						 *
						 * Inside a `role="menu"` the separator has a job: it is what tells
						 * a reader that the commands above and below are different groups,
						 * rather than that there is an empty entry between them. `<hr>` is
						 * the document-level themed break and carries no such meaning in a
						 * menu; the explicit role is the one that survives being spoken.
						 */
						// biome-ignore lint/a11y/useSemanticElements: inside role="menu" the separator groups commands; hr carries no such meaning here
						return <div key={item.id} role="separator" className="ui-lib-soft-menu__sep" />;
					}
					if (item.kind === "label") {
						return (
							<div key={item.id} role="presentation" className="ui-lib-soft-menu__group">
								{item.label}
							</div>
						);
					}
					const entry = item as Extract<SoftMenuItem, { kind?: "item" }>;
					return (
						<div key={item.id} role="presentation">
							{entry.dividerBefore && (
								// biome-ignore lint/a11y/useSemanticElements: the separator groups commands inside the menu, which hr does not express there
								<div role="separator" className="ui-lib-soft-menu__sep" />
							)}
							<button
								ref={(node) => {
									itemRefs.current[index] = node;
								}}
								type="button"
								role="menuitem"
								disabled={entry.disabled}
								// The shortcut is not decoration: a reader that only hears the
								// label learns the command exists but not that it can be run
								// without opening the menu.
								aria-keyshortcuts={entry.shortcut}
								className="ui-lib-soft-menu__item"
								data-ui-lib-checked={entry.checked ? "" : undefined}
								onPointerEnter={() => setActive(index)}
								onClick={() => {
									entry.onSelect();
									close(true);
								}}
							>
								<span className="ui-lib-soft-menu__tick" aria-hidden="true">
									{entry.checked ? "✓" : ""}
								</span>
								<span className="ui-lib-soft-menu__text">{entry.label}</span>
								{entry.shortcut && (
									<span className="ui-lib-soft-menu__shortcut" aria-hidden="true">
										{entry.shortcut}
									</span>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
});
