import { type TiltOptions, Tilt as TiltPhysics } from "@ui-lib/core";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "./reducedMotion.js";

export interface UseTiltOptions extends TiltOptions {
	/** Turned off by reduced motion, and off entirely when false. */
	enabled: boolean;
	/**
	 * Applied as `transform` on the element, around whatever the element already
	 * has. A card that is also lifting on hover needs both, and overwriting
	 * `transform` from here would silently win.
	 */
	base?: string;
}

/**
 * Tilt an element by horizontal pointer speed, from the specification's §3.3.
 *
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useTilt(ref, { enabled: tilt });
 * ```
 *
 * ## Why this is a hook and not a stylesheet rule
 *
 * §3.3 is `θ = -clamp(vx / vmax × 8°, -8°, +8°)`, and there is no CSS that can
 * read a pointer's velocity. `:hover` knows the pointer is there and not how fast
 * it is going. So this is the one interaction in the library that has to run a
 * loop, and it is written to do nothing at all when it is off: no listener, no
 * frame, no allocation.
 *
 * ## The listener is on the document, not the element
 *
 * A card that stops being tilted the moment the pointer leaves it looks broken —
 * the pointer crossing a card quickly is exactly the gesture the section
 * describes, and the pointer is over the element for a few frames of it. So the
 * speed is sampled from the document and the *angle* is what is scoped to the
 * element, which is the only part that was ever about the element.
 *
 * ## Reduced motion turns it off rather than shortening it
 *
 * A tilt is vestibular in a way a colour change is not: the whole effect is a
 * rotation that the user did not ask for and cannot stop. Under
 * `prefers-reduced-motion` this returns before attaching anything.
 */
export function useTilt(
	ref: React.RefObject<HTMLElement | null>,
	{ enabled, base = "", maxSpeed, damping, frequency, decay }: UseTiltOptions,
): void {
	const reduced = useReducedMotion();
	const on = enabled && !reduced;

	/*
	 * The options are destructured into primitives on purpose.
	 *
	 * An earlier version spread the rest object into the effect's dependency list,
	 * which is a new object on every render — so the effect tore down and rebuilt
	 * itself on every render, cancelling and re-requesting a frame each time, and
	 * the tilt never advanced past its first step. A caller writing the options
	 * inline (`{ enabled: true }`) makes that happen on every keystroke elsewhere
	 * on the page.
	 */
	const baseRef = useRef(base);
	baseRef.current = base;

	useEffect(() => {
		if (!on) return;
		const element = ref.current;
		if (!element) return;

		const tilt = new TiltPhysics({ maxSpeed, damping, frequency, decay });
		let frame = 0;
		let last = performance.now();
		let active = false;

		const onMove = (event: PointerEvent) => {
			// Only events over the element start a tilt; once started, the whole
			// document keeps feeding it, because the pointer leaves early.
			if (event.target === element || element.contains(event.target as Node)) {
				active = true;
			}
			if (active) tilt.push(event.clientX, event.timeStamp);
		};
		const onUp = () => {
			active = false;
			tilt.release();
		};

		const tick = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			const angle = tilt.step(dt);
			// Written every frame, even at rest, so that the angle returns to exactly
			// zero instead of to within a rounding error of it.
			const offset = ` rotate(${angle.toFixed(3)}deg)`;
			element.style.transform = baseRef.current ? baseRef.current + offset : offset.trim();
			frame = requestAnimationFrame(tick);
		};

		document.addEventListener("pointermove", onMove, { passive: true });
		document.addEventListener("pointerup", onUp, { passive: true });
		document.addEventListener("pointercancel", onUp, { passive: true });
		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			document.removeEventListener("pointercancel", onUp);
			element.style.transform = baseRef.current;
		};
	}, [on, ref, maxSpeed, damping, frequency, decay]);
}
