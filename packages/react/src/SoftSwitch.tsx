import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

export interface SoftSwitchProps
	extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
	/** Controlled state. Leave undefined to let the switch hold its own. */
	checked?: boolean;
	/** Called with the next value. */
	onChange?: (checked: boolean) => void;
	/** Dims and blocks it. The DOM `disabled` still wins. */
	softDisabled?: boolean;
	/** A label for assistive technology when there is no visible `<label>`. */
	label?: string;
}

/** Track 56 x 32, knob 24. The knob's travel is the difference. */
const TRACK_WIDTH = 56;
const KNOB = 24;
const INSET = 3;

/**
 * A two-state switch that behaves like a soft body.
 *
 * Three things make this read as elastic rather than as a sliding box:
 *
 * 1. **The knob stretches along its direction of travel.** A soft body that is
 *    being pulled thins across the axis it is pulled on. A circle that simply
 *    translates looks like a sticker sliding on a track.
 * 2. **It snaps past the midpoint rather than following the finger all the
 *    way.** The pull releases at the halfway point and the spring takes it,
 *    which is what a real detent feels like.
 * 3. **The face changes.** `.` closed, `^^` open. It is the cheapest possible
 *    anthropomorphism and it is most of why the control reads as friendly
 *    rather than as an engineering toggle.
 *
 * Keyboard and screen-reader behaviour is `role="switch"` on a real `<button>`,
 * which is what the platform already has for exactly this control.
 *
 * ```tsx
 * const [on, setOn] = useState(false);
 * <SoftSwitch checked={on} onChange={setOn} label="柔光" />
 * ```
 */
export const SoftSwitch = forwardRef<HTMLButtonElement, SoftSwitchProps>(function SoftSwitch(
	{ checked, onChange, softDisabled = false, label, className, onClick, ...props },
	ref,
) {
	const [own, setOwn] = useState(false);
	const isControlled = checked !== undefined;
	const on = isControlled ? checked : own;

	/** How far the knob is pulled, in px, while a drag is in progress. */
	const [pull, setPull] = useState<number | null>(null);
	const dragging = useRef<{ startX: number; from: number } | null>(null);
	const trackRef = useRef<HTMLButtonElement | null>(null);

	const travel = TRACK_WIDTH - KNOB - INSET * 2;
	const restingOffset = on ? travel : 0;

	const setValue = useCallback(
		(next: boolean) => {
			if (softDisabled || props.disabled) return;
			if (!isControlled) setOwn(next);
			onChange?.(next);
		},
		[isControlled, onChange, softDisabled, props.disabled],
	);

	// Pointer events rather than mouse events, so a finger and a stylus take the
	// same path. Capture keeps the drag alive when it leaves the 32px track,
	// which it always does — the gesture is horizontal and the track is short.
	useEffect(() => {
		const up = (event: PointerEvent) => {
			const drag = dragging.current;
			if (!drag) return;
			dragging.current = null;
			setPull(null);
			const moved = event.clientX - drag.startX;
			// Past the midpoint of the remaining travel, it commits; short of it,
			// it returns. Either way the pull is released at once.
			const travelled = drag.from + moved;
			setValue(travelled > travel / 2);
		};
		const move = (event: PointerEvent) => {
			const drag = dragging.current;
			if (!drag) return;
			const moved = event.clientX - drag.startX;
			setPull(Math.min(Math.max(drag.from + moved, -2), travel + 2));
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
		};
	}, [setValue, travel]);

	const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
		if (softDisabled || props.disabled) return;
		dragging.current = { startX: event.clientX, from: restingOffset };
		// A press that never moves is a click, and a click toggles. Only a real
		// drag sets `pull`, so a tap does not stretch the knob before it moves.
		setPull(restingOffset);
	};

	const stretched = pull !== null;
	const offset = stretched ? (pull as number) : restingOffset;
	// Pulled away from its resting seat, the knob thins: 26px down to 21px,
	// never wider than the space it has left.
	const knobWidth = stretched
		? KNOB - Math.min(5, Math.abs(offset - restingOffset) * 0.14)
		: KNOB;

	return (
		<button
			{...props}
			ref={(node) => {
				trackRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			type="button"
			role="switch"
			aria-checked={on}
			aria-label={label}
			disabled={props.disabled}
			data-ui-lib-switch=""
			data-ui-lib-on={on ? "" : undefined}
			data-ui-lib-stretched={stretched ? "" : undefined}
			data-ui-lib-soft-disabled={softDisabled ? "" : undefined}
			className={className ? `ui-lib-soft-switch ${className}` : "ui-lib-soft-switch"}
			onPointerDown={handlePointerDown}
			onClick={(event) => {
				onClick?.(event);
				// A drag already committed on pointerup; the click that follows it
				// would undo the drag. Only a press with no travel toggles here.
				if (dragging.current === null) return;
				setValue(!on);
			}}
		>
			<span
				className="ui-lib-soft-switch__knob"
				style={{
					width: `${knobWidth}px`,
					transform: `translateX(${offset}px)`,
					transition: stretched
						? "width 120ms ease"
						: "transform var(--moe-dur-base) var(--moe-ease-jelly), width var(--moe-dur-base) var(--moe-ease-jelly)",
				}}
			>
				<span className="ui-lib-soft-switch__face" aria-hidden="true">
					{on ? "^ ^" : "—"}
				</span>
			</span>
		</button>
	);
});
