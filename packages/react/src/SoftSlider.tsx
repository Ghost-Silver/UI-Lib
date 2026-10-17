import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import { useStyles } from "./useStyles.js";

export interface SoftSliderProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
	value?: number;
	defaultValue?: number;
	onChange?: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	/** Dims and blocks it. */
	softDisabled?: boolean;
	/** A name for assistive technology. Required when there is no visible label. */
	label?: string;
	/** Formats the bubble and the `aria-valuetext`. */
	format?: (value: number) => string;
}

/**
 * A slider whose thumb swells when you take hold of it.
 *
 * The bubble is the point. A number that lives somewhere else on the page makes
 * the user look away from their own finger to read it; a bubble attached to the
 * thumb is read in the same glance, and the little tail is what ties it to the
 * thing it describes. It tilts with the direction of travel, which is the
 * cheapest possible way to make it feel attached rather than pinned.
 *
 * The thumb grows from 22px to 28px while held. That is a 27 per cent change —
 * enough to read as "picked up", not enough to move what you are aiming at.
 *
 * The value is a real `<input type="range">` underneath, visually hidden. A
 * custom slider that reimplements keyboard, touch and screen-reader behaviour
 * reimplements it wrong; this one keeps the platform's and draws over it.
 *
 * The wrapper carries `role="presentation"` rather than a widget role: the
 * accessible control is the range input inside it, which already holds the
 * value, the label, the keyboard handling and the screen-reader text. The
 * wrapper only exists to catch pointer events over a larger area than the
 * 10px groove.
 *
 * ```tsx
 * const [level, setLevel] = useState(40);
 * <SoftSlider value={level} onChange={setLevel} label="亮度" format={(v) => `${v}%`} />
 * ```
 */
export const SoftSlider = forwardRef<HTMLDivElement, SoftSliderProps>(function SoftSlider(
	{
		value,
		defaultValue = 0,
		onChange,
		min = 0,
		max = 100,
		step = 1,
		softDisabled = false,
		label,
		format,
		className,
		...props
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const [own, setOwn] = useState(defaultValue);
	const current = value ?? own;
	const isControlled = value !== undefined;
	const [held, setHeld] = useState(false);
	/** Direction of travel, for the bubble's tilt. */
	const [lean, setLean] = useState(0);
	const previous = useRef(current);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const groupId = useId();

	const ratio = max === min ? 0 : (current - min) / (max - min);
	const percent = `${(ratio * 100).toFixed(4)}%`;
	const text = format ? format(current) : String(current);

	const commit = useCallback(
		(next: number) => {
			if (!isControlled) setOwn(next);
			onChange?.(next);
		},
		[isControlled, onChange],
	);

	// The tilt follows the sign of the last movement and decays, so a drag that
	// stops still settles upright instead of staying cocked to one side.
	useEffect(() => {
		const delta = current - previous.current;
		previous.current = current;
		if (delta === 0) return;
		const next = delta > 0 ? 6 : -6;
		setLean(next);
		const timer = window.setTimeout(() => setLean(0), 220);
		return () => window.clearTimeout(timer);
	}, [current]);

	const fromPointer = (clientX: number) => {
		const track = trackRef.current;
		if (!track) return current;
		const box = track.getBoundingClientRect();
		const t = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
		const raw = min + t * (max - min);
		const snapped = Math.round(raw / step) * step;
		// Floating point: `0.1 + 0.2` steps land on 0.30000000000000004, and the
		// bubble then shows a number nobody typed.
		return Number(snapped.toFixed(6));
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (softDisabled) return;
		setHeld(true);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		const next = fromPointer(event.clientX);
		if (next !== current) commit(next);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!held || softDisabled) return;
		const next = fromPointer(event.clientX);
		if (next !== current) commit(next);
	};

	const release = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!held) return;
		setHeld(false);
		(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
	};

	return (
		<div
			{...props}
			ref={(node) => {
				trackRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			role="presentation"
			className={className ? `ui-lib-soft-slider ${className}` : "ui-lib-soft-slider"}
			data-ui-lib-held={held ? "" : undefined}
			data-ui-lib-soft-disabled={softDisabled ? "" : undefined}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={release}
			onPointerCancel={release}
		>
			<div className="ui-lib-soft-slider__groove">
				<span className="ui-lib-soft-slider__fill" style={{ width: percent }} />
			</div>

			<span
				className="ui-lib-soft-slider__thumb"
				aria-hidden="true"
				style={{ left: percent, transform: `translate(-50%, -50%) rotate(${lean}deg)` }}
			/>

			<span className="ui-lib-soft-slider__bubble" aria-hidden="true" style={{ left: percent }}>
				<span className="ui-lib-soft-slider__bubble-face">{text}</span>
			</span>

			<input
				ref={inputRef}
				id={`${groupId}-input`}
				className="ui-lib-soft-slider__input"
				type="range"
				min={min}
				max={max}
				step={step}
				value={current}
				disabled={softDisabled || undefined}
				aria-label={label}
				aria-valuetext={format ? text : undefined}
				onChange={(event) => commit(Number(event.target.value))}
			/>
		</div>
	);
});
