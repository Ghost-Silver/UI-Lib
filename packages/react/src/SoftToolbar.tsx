import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftToolbarItem {
	id: string;
	/** The accessible name. Required — a toolbar button is usually an icon. */
	label: string;
	/** The icon. Decorative: the name is on the button. */
	icon: React.ReactNode;
	/** A `title` for the pointer. Never the only name. */
	hint?: string;
	disabled?: boolean;
	/** Renders as pressed. For a toggle rather than a command. */
	pressed?: boolean;
	onSelect: () => void;
}

export interface SoftToolbarProps {
	items: readonly SoftToolbarItem[];
	/** Describes the whole toolbar. Required, for the reason the list's is. */
	label: string;
	/** `vertical` keeps arrow keys on the up/down pair, as the spec asks. */
	orientation?: "horizontal" | "vertical";
	/** `sm` is 30px tall, `md` is 36. */
	size?: "sm" | "md";
	/** What the toolbar is made of. */
	material?: SoftMaterial;
	tone?: IrisTone;
	className?: string;
}

/**
 * A row of related commands.
 *
 * ## The keyboard model is the difference from a row of buttons
 *
 * A group of ordinary buttons is walked with Tab: eight buttons, eight stops, and
 * a keyboard user crosses the toolbar one press at a time. A `toolbar` is **one
 * stop** — Tab enters it, the arrow keys walk inside it, Tab leaves. That is what
 * the role claims, and a row that has the role without the behaviour is worse
 * than a plain row, because a reader is told the arrow keys work and then they do
 * not.
 *
 * The axes are spec-accurate rather than convenient: a **horizontal** toolbar is
 * walked with Left and Right, a **vertical** one with Up and Down. A toolbar also
 * walks across its own axis in the spec, but the cross-axis directions are
 * reserved for a toolbar that contains other widgets — a menu button, say — where
 * they have to move within that widget instead. Keeping the axes separate is what
 * makes a nested control possible later.
 *
 * ## The icon is not the name
 *
 * Every item takes a `label` and it is required, because a toolbar button is
 * almost always an icon and an icon is not a name. `aria-label` carries it, the
 * glyph is `aria-hidden`, and `hint` only ever becomes a `title` — a tooltip is
 * not available to a reader, so it cannot be the name.
 *
 * ```tsx
 * <SoftToolbar label="画布" items={[
 *   { id: "brush", label: "画笔", icon: <Brush />, pressed: true, onSelect: pick },
 * ]} />
 * ```
 */
export const SoftToolbar = forwardRef<HTMLDivElement, SoftToolbarProps>(function SoftToolbar(
	{ items, label, orientation = "horizontal", size = "md", material, tone, className },
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const surface = useMaterial(material && material !== "plain" ? { material, tone } : {});
	const buttons = useRef<(HTMLButtonElement | null)[]>([]);

	/** Enabled positions, in order, for the arrow keys to walk. */
	const walkable = useCallback(
		() => items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled),
		[items],
	);

	const move = useCallback(
		(step: 1 | -1, from: number) => {
			const positions = walkable();
			if (positions.length === 0) return;
			const here = positions.findIndex((entry) => entry.index === from);
			const next = positions[(here + step + positions.length) % positions.length];
			if (next) buttons.current[next.index]?.focus();
		},
		[walkable],
	);

	/*
	 * One stop for the whole toolbar, and it lands on the first item that can be
	 * used. Every other button is reachable by arrow key, which is the arrangement
	 * the role describes — so `tabIndex` is 0 for exactly one of them and -1 for
	 * the rest.
	 *
	 * Computed once rather than inside the `map`, where the first version put it:
	 * that ran a full scan of the items for every button, which is `O(n^2)` in the
	 * length of the toolbar for a value that does not change between them.
	 */
	const firstEnabled = walkable()[0]?.index ?? -1;

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		// Read the position off the DOM rather than off `items`: the arrays are not
		// guaranteed to stay in step, and the element that has focus is the fact.
		const from = buttons.current.indexOf(event.target as HTMLButtonElement);
		if (from < 0) return;
		const forward = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
		const back = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
		if (event.key === forward) {
			event.preventDefault();
			move(1, from);
			return;
		}
		if (event.key === back) {
			event.preventDefault();
			move(-1, from);
			return;
		}
		if (event.key === "Home") {
			event.preventDefault();
			const first = walkable()[0];
			if (first) buttons.current[first.index]?.focus();
			return;
		}
		if (event.key === "End") {
			event.preventDefault();
			const last = walkable().at(-1);
			if (last) buttons.current[last.index]?.focus();
		}
	};

	return (
		<div
			ref={ref}
			role="toolbar"
			aria-label={label}
			aria-orientation={orientation}
			className={
				surface.className
					? `ui-lib-soft-toolbar ${surface.className} ${className ?? ""}`.trim()
					: className
						? `ui-lib-soft-toolbar ${className}`
						: "ui-lib-soft-toolbar"
			}
			style={surface.className ? surface.style : undefined}
			data-ui-lib-orientation={orientation}
			data-ui-lib-size={size}
			onKeyDown={onKeyDown}
		>
			{items.map((item, index) => {
				const toggle = item.pressed !== undefined;
				return (
					<button
						key={item.id}
						ref={(node) => {
							buttons.current[index] = node;
						}}
						type="button"
						disabled={item.disabled}
						tabIndex={index === firstEnabled ? 0 : -1}
						// A command is a button and a toggle is too, but only the toggle
						// reports a state. `aria-pressed` on a plain command would announce
						// a toggle that does not exist.
						aria-pressed={toggle ? Boolean(item.pressed) : undefined}
						aria-label={item.label}
						title={item.hint}
						className="ui-lib-soft-toolbar__item"
						data-ui-lib-pressed={item.pressed ? "" : undefined}
						onClick={item.onSelect}
					>
						<span className="ui-lib-soft-toolbar__icon" aria-hidden="true">
							{item.icon}
						</span>
					</button>
				);
			})}
		</div>
	);
});
