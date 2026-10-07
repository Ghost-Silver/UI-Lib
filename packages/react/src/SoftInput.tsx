import { createSpring } from "@ui-lib/core";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { fieldMessage, useField } from "./field.js";
import { useStyles } from "./useStyles.js";

export interface SoftInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
	/** A short label above the field. Rendered and wired, not just decorative. */
	label?: string;
	/** Helper text below. Replaced by `error` when there is one. */
	hint?: string;
	/** An error message. Presents it to assistive technology, not only visually. */
	error?: string;
	/** `sm` is 40px, `md` is 48, `lg` is 56. */
	size?: "sm" | "md" | "lg";
	/** Grows with its content instead of scrolling. */
	grow?: boolean;
	/** A slot at the start, for an icon. */
	leading?: React.ReactNode;
	/** A slot at the end, for a unit or a button. */
	trailing?: React.ReactNode;
}

/**
 * A field that sits in a groove in the paper.
 *
 * The recess is the whole idea. A raised input says "a box is here"; a sunken
 * one says "this is a place to put something", and the eye reads that before it
 * reads any label. So the surface uses the same inset shadow the switch's track
 * does — the two are made of the same material — and the paper's own fibre
 * shows through rather than being covered by a fill.
 *
 * **Focus is a spring, not a transition.** The focus ring is driven by
 * `createSpring` at a known damping ratio rather than by a CSS curve, which
 * matters for two reasons: the overshoot is the point (a ring that arrives
 * with a little momentum reads as noticing you), and a spring can be
 * *interrupted* — clicking in while the previous focus is still settling
 * continues from where it is instead of restarting, which no bezier can do.
 *
 * The native `<input>` is the control. Everything here is laid on top of it:
 * the DOM element keeps its type, its `autocomplete`, its `inputMode`, its
 * form participation and its screen-reader behaviour.
 *
 * ```tsx
 * <SoftInput label="作品名" placeholder="未命名" hint="随时可以改。" />
 * <SoftInput label="邮箱" type="email" error="这个地址看起来不完整。" />
 * ```
 */
export const SoftInput = forwardRef<HTMLInputElement, SoftInputProps>(function SoftInput(
	{
		label,
		hint,
		error,
		size = "md",
		grow = false,
		leading,
		trailing,
		className,
		id,
		disabled,
		onFocus,
		onBlur,
		...props
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const [focused, setFocused] = useState(false);
	const inner = useRef<HTMLInputElement | null>(null);
	const ring = useRef<HTMLSpanElement | null>(null);
	/*
	 * React's own `useId`, and the first version of this file got it wrong.
	 *
	 * It used a module-level counter, which is stable across renders of one
	 * client and *not* matched by the server — so the `<label for>` would point
	 * at an id that does not exist after hydration, and the label would be
	 * silently detached from its field. React's `useId` exists precisely to be
	 * the same on both sides; the colons it produces are legal in an `id`, and
	 * this one is never used in a selector.
	 */
	/*
	 * Called unconditionally, and the `??` that was here first is a real bug:
	 * the right-hand side of `??` is lazy, so a field given an explicit id
	 * would skip the hook and a field without one would call it. Two different
	 * hook counts in the same component is a rules-of-hooks violation, and it
	 * only shows up in whichever of the two cases is less well tested.
	 */
	/*
	 * The shared field wiring, which used to be written here.
	 *
	 * This component had the contract first, and `SoftSelect` and `SoftTextarea`
	 * each wrote it again, so it lives in `useField` now and this reads from it.
	 * The ids, the error-wins-over-hint rule and the `aria-describedby` value are
	 * unchanged; only where they are written changed.
	 *
	 * The local version had one history worth keeping in mind: it was first
	 * written with a module-level counter, which is stable across renders of one
	 * client and *not* matched by a server, so every `<label for>` pointed at an
	 * id that did not exist after hydration. `useField` calls `useId`
	 * unconditionally, because `id ?? useId()` is a bug — the right-hand side of
	 * `??` is lazy, so the hook would run for some fields and not others.
	 */
	const wiring = useField({ id, hasHint: Boolean(hint), hasError: Boolean(error) });
	const message = fieldMessage(wiring, { hint, error });
	const fieldId = wiring.id;
	const describedBy = wiring.describedBy;

	/*
	 * The focus ring, driven by a real spring.
	 *
	 * The value is the ring's scale, written to a custom property the stylesheet
	 * reads. One spring for the whole library rather than one per field would be
	 * wrong here: two fields can be settling at once — tabbing from one to the
	 * next blurs the first while the second focuses — and a shared spring would
	 * have them fight.
	 */
	const spring = useRef(createSpring(0, "pop")).current;
	useEffect(() => {
		let raf = 0;
		let last = 0;
		const frame = (time: number) => {
			const dt = last === 0 ? 1 / 60 : Math.min((time - last) / 1000, 1 / 20);
			last = time;
			const value = spring.step(dt);
			ring.current?.style.setProperty("--ring", String(Math.max(value, 0)));
			if (!spring.settled) raf = requestAnimationFrame(frame);
			else raf = 0;
		};
		spring.target = focused ? 1 : 0;
		if (raf === 0) {
			last = 0;
			raf = requestAnimationFrame(frame);
		}
		return () => {
			if (raf !== 0) cancelAnimationFrame(raf);
		};
	}, [focused, spring]);

	const handleFocus = useCallback(
		(event: React.FocusEvent<HTMLInputElement>) => {
			setFocused(true);
			onFocus?.(event);
		},
		[onFocus],
	);

	const handleBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>) => {
			setFocused(false);
			onBlur?.(event);
		},
		[onBlur],
	);

	return (
		<div
			className={className ? `ui-lib-soft-input ${className}` : "ui-lib-soft-input"}
			data-ui-lib-size={size}
			data-ui-lib-focused={focused ? "" : undefined}
			data-ui-lib-invalid={error ? "" : undefined}
			data-ui-lib-disabled={disabled ? "" : undefined}
		>
			{label && (
				<label className="ui-lib-soft-input__label" htmlFor={fieldId}>
					{label}
				</label>
			)}

			<span className="ui-lib-soft-input__shell" ref={ring}>
				<span className="ui-lib-soft-input__ring" aria-hidden="true" />
				{leading && <span className="ui-lib-soft-input__affix">{leading}</span>}
				<input
					{...props}
					ref={(node) => {
						inner.current = node;
						if (typeof ref === "function") ref(node);
						else if (ref) ref.current = node;
					}}
					id={fieldId}
					disabled={disabled}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy}
					className={
						grow
							? "ui-lib-soft-input__field ui-lib-soft-input__field--grow"
							: "ui-lib-soft-input__field"
					}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>
				{trailing && <span className="ui-lib-soft-input__affix">{trailing}</span>}
			</span>

			{/*
			 * The message is in the DOM whether or not it is an error, and it is
			 * linked by `aria-describedby` rather than placed next to the field and
			 * hoped for. An error that is only red is an error a screen reader
			 * never hears.
			 */}
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
});
