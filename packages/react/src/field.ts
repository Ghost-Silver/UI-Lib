import { useId } from "react";

/**
 * The wiring every labelled control needs, and that no two of them should write
 * twice.
 *
 * A field is more than a control with a caption above it. The pieces that matter
 * are invisible: the label has to point at the input rather than sit near it, the
 * hint and the error have to be *referenced* by the input so a reader hears them
 * with the value, and the error has to be announced rather than merely drawn in
 * red. None of that is visible in a screenshot, which is precisely why it is the
 * part that gets skipped when each component does its own.
 *
 * By the time this was extracted, `SoftInput` and `SoftSelect` had each written
 * it once and a third was about to. Three copies of an accessible-name contract
 * is three places for it to drift, and the drift would be silent — every one of
 * them would look right.
 *
 * ## What it is not for
 *
 * `SoftSelect` does **not** use this, and that is a decision rather than an
 * oversight. It has no hint and no error, and it derives four ids from one base —
 * a label, a listbox, a per-option id and an anchor name — so what it needs is a
 * stable base, not a description contract. Adopting this there would mean
 * carrying two unused parameters and a `describedBy` that is always undefined, in
 * exchange for the appearance of consistency. A shared abstraction that a
 * component has to be bent to fit is not shared; it is borrowed.
 *
 * It returns ids and the `aria-describedby` value rather than rendering anything,
 * because the markup differs between a field with a ring and one with a popover,
 * and a hook that renders would have to take a layout prop and become a component
 * with extra steps.
 */
export interface FieldWiring {
	/** Put this on the control and on the label's `htmlFor`. */
	id: string;
	/** The id of the hint element, whether or not there is one. */
	hintId: string;
	/** The id of the error element, whether or not there is one. */
	errorId: string;
	/**
	 * The value for `aria-describedby`, or `undefined` when there is nothing to
	 * describe.
	 *
	 * The error wins over the hint rather than both being listed: they occupy the
	 * same slot and only one is ever rendered, so referencing both would point at
	 * an id that does not exist — which several readers announce as a broken
	 * reference.
	 */
	describedBy: string | undefined;
}

export function useField(options: {
	/** The caller's id, if they gave one. It wins, because they may have a label already. */
	id?: string;
	/** Whether a hint is being rendered. */
	hasHint?: boolean;
	/** Whether an error is being rendered. */
	hasError?: boolean;
}): FieldWiring {
	const { id, hasHint = false, hasError = false } = options;
	/*
	 * Called unconditionally, which is not a formality: `id ?? useId()` is a real
	 * bug, because the right-hand side of `??` is lazy — a field given an explicit
	 * id skips the hook and one without it calls it, and two different hook counts
	 * in one component is a rules-of-hooks violation that only shows up in
	 * whichever case is less tested. That exact mistake was made and fixed in
	 * `SoftInput` before this was extracted.
	 */
	const generated = useId();
	const fieldId = id ?? generated;
	return {
		id: fieldId,
		hintId: `${fieldId}-hint`,
		errorId: `${fieldId}-error`,
		describedBy: hasError ? `${fieldId}-error` : hasHint ? `${fieldId}-hint` : undefined,
	};
}

/**
 * The message under a control: the error if there is one, otherwise the hint.
 *
 * One function rather than a conditional in each component, because the `role`
 * is the part that gets forgotten. An error rendered as a red paragraph is an
 * error a screen reader never hears; `role="alert"` is what makes it arrive
 * without the reader having to go looking.
 */
export interface FieldMessage {
	text: string;
	id: string;
	/** True for an error, which the caller styles differently. */
	invalid: boolean;
}

export function fieldMessage(
	wiring: FieldWiring,
	options: { hint?: string; error?: string },
): FieldMessage | null {
	if (options.error) return { text: options.error, id: wiring.errorId, invalid: true };
	if (options.hint) return { text: options.hint, id: wiring.hintId, invalid: false };
	return null;
}
