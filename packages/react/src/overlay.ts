import { useEffect, useRef, useState } from "react";

/**
 * The part every top-layer overlay shares: showing the element, and knowing when
 * the platform has hidden it.
 *
 * Four overlays in this library now use the top layer and they arrived at the
 * same two problems from different directions.
 *
 * The first problem is that the platform and React both want to own visibility.
 * `showPopover()` puts the element in the top layer; if React only sets a
 * boolean and never calls it, the element renders inside whatever stacking
 * context the trigger happens to sit in and is clipped by the next card. So the
 * call has to happen, and it has to happen exactly once per transition.
 *
 * The second is the feedback loop, which cost a full debugging session the first
 * time: `toggle` fires on **open as well as close**, and a listener that sets the
 * open state to `false` unconditionally will therefore close the popover it was
 * just told about. The sequence for one click becomes open, show, toggle, close,
 * hide — and the only symptom is that the state never becomes true, which reads
 * as a dead click rather than as a loop. The state has to be read from the
 * event's `newState`.
 *
 * Both live here now so the next overlay does not have to rediscover them.
 *
 * ```ts
 * const popover = usePopover(open);
 * <div ref={popover} popover="manual" />
 * ```
 */
export function usePopover<T extends HTMLElement>(open: boolean) {
	const ref = useRef<T | null>(null);
	const [shown, setShown] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		if (open && !node.matches(":popover-open")) node.showPopover();
		else if (!open && node.matches(":popover-open")) node.hidePopover();
		setShown(open);
	}, [open]);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const onToggle = (event: Event) => {
			const state = (event as ToggleEvent).newState;
			setShown(state === "open");
		};
		node.addEventListener("toggle", onToggle);
		return () => node.removeEventListener("toggle", onToggle);
	}, []);

	return { ref, shown, setShown };
}

/**
 * A unique anchor name for this instance.
 *
 * Every overlay that positions itself against another element needs one, and the
 * first version of the select put a single name in the stylesheet — which meant
 * every select on the page claimed it, the browser had no way to know which one
 * `anchor(bottom)` referred to, and a two-field page put the second field's list
 * below the first field's list. The name has to be per instance, and it has to
 * come from an id that is stable across server and client.
 *
 * React's `useId` produces colons, which are legal in an id and legal in an
 * anchor name once stripped; this strips them rather than hand-rolling a
 * counter, because a counter is not stable across a server render.
 *
 * ## The prefix, and why it is not `ui-lib-`
 *
 * It was, and that was a mistake with a slow cost. `ui-lib-` is the **class**
 * namespace, and a stylesheet is written against it — so every anchor name looked
 * like a class to everything that reads the prefix, including this package's own
 * class-contract guard. That guard reported four false positives across three
 * rounds, and each one cost a decision about whether the anchor name needed a
 * rule.
 *
 * Two namespaces sharing a prefix is the actual problem, and a longer exclusion
 * list is not the fix. Anchor names are `ui-anchor-*` now, which cannot be
 * confused with a class by a person or by a check.
 */
export function anchorNameFrom(id: string, prefix: string): string {
	return `--${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
