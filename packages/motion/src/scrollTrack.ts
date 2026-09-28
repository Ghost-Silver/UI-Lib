import {
	clamp01,
	type Disposable,
	damp,
	type FrameInfo,
	getScheduler,
	onReducedMotionChange,
} from "@ui-lib/core";

export interface ScrollState {
	/** Smoothed progress in [0, 1]. Drive cameras and reveals with this. */
	progress: number;
	/** Unfiltered progress in [0, 1]. */
	raw: number;
	/** Smoothed progress units per second. */
	velocity: number;
	/** True while the track intersects the viewport. */
	active: boolean;
}

export const SCROLL_IDLE: ScrollState = {
	progress: 0,
	raw: 0,
	velocity: 0,
	active: false,
};

export interface ScrollTrackOptions {
	/**
	 * Viewport Y that counts as the pin line, in CSS pixels. Match this to the
	 * sticky child's `top`. Default 0.
	 */
	offset?: number;
	/**
	 * Exponential smoothing. 0 tracks the scroll position exactly. Reduced
	 * motion always snaps, regardless of this value. Default 12.
	 */
	smoothing?: number;
	onChange?: (state: ScrollState) => void;
}

/**
 * How far `element` has travelled through the viewport.
 *
 * 0 when the element's top sits on the pin line. 1 when the element has
 * scrolled by `height - viewport`, which is the moment a `sticky; top: 0`
 * child unpins. Negative travel and overshoot are clamped.
 */
export function scrollProgress(
	rectTop: number,
	elementHeight: number,
	viewHeight: number,
	offset = 0,
): number {
	const distance = Math.max(1, elementHeight - viewHeight);
	return clamp01((-rectTop + offset) / distance);
}

const SETTLE = 0.0004;

/**
 * Scroll progress on the shared UI-Lib frame clock.
 *
 * Sampling happens in the scheduler's `input` phase, before compute, springs
 * and the glass render. There is no second `requestAnimationFrame` and no
 * Lenis-style ticker. DOM reads stay on the same frame as the GPU.
 */
export class ScrollTrack implements Disposable {
	private state: ScrollState = SCROLL_IDLE;
	private readonly listeners = new Set<() => void>();
	private readonly stopFrame: () => void;
	private readonly stopMotion: () => void;
	private smoothed = 0;
	private primed = false;
	private reduced = false;
	private disposed = false;

	constructor(
		readonly element: HTMLElement,
		private readonly options: ScrollTrackOptions = {},
	) {
		this.reduced =
			typeof window !== "undefined" &&
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
		this.stopMotion = onReducedMotionChange((reduced) => {
			this.reduced = reduced;
		});
		this.sample(1 / 60);
		this.element.dataset.uiLibScrollProgress = this.state.raw.toFixed(3);
		this.stopFrame = getScheduler().add(this.frame, "input");
	}

	getState(): ScrollState {
		return this.state;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Scroll the document so this track reports `progress`. */
	scrollToProgress(progress: number, behavior: ScrollBehavior = "smooth"): void {
		const reduce =
			typeof window !== "undefined" &&
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
		const view = window.innerHeight || 1;
		const rect = this.element.getBoundingClientRect();
		const distance = Math.max(1, rect.height - view);
		const offset = this.options.offset ?? 0;
		const top = rect.top + window.scrollY + clamp01(progress) * distance - offset;
		window.scrollTo({ top, behavior: reduce ? "auto" : behavior });
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.stopFrame();
		this.stopMotion();
		this.listeners.clear();
	}

	private frame = (info: FrameInfo): void => {
		this.sample(info.dt);
	};

	private sample(dt: number): void {
		const rect = this.element.getBoundingClientRect();
		const view = window.innerHeight || 1;
		const raw = scrollProgress(rect.top, rect.height, view, this.options.offset ?? 0);
		if (!this.primed) {
			this.smoothed = raw;
			this.primed = true;
		}
		const lambda = this.reduced ? 0 : (this.options.smoothing ?? 12);
		const previous = this.smoothed;
		this.smoothed = lambda <= 0 ? raw : damp(this.smoothed, raw, lambda, Math.max(dt, 0));
		if (Math.abs(this.smoothed - raw) < SETTLE) this.smoothed = raw;
		const velocity = dt > 0 ? (this.smoothed - previous) / dt : 0;
		const next: ScrollState = {
			progress: this.smoothed,
			raw,
			velocity,
			active: rect.bottom > 0 && rect.top < view,
		};
		this.publish(next);
	}

	private publish(next: ScrollState): void {
		const prev = this.state;
		if (
			Math.abs(prev.progress - next.progress) < SETTLE &&
			Math.abs(prev.raw - next.raw) < SETTLE &&
			Math.abs(prev.velocity - next.velocity) < 0.01 &&
			prev.active === next.active
		) {
			return;
		}
		this.state = next;
		this.element.dataset.uiLibScrollProgress = next.raw.toFixed(3);
		this.options.onChange?.(next);
		for (const listener of this.listeners) listener();
	}
}
