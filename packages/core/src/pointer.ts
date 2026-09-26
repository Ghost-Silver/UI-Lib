import { Disposer } from "./lifecycle.js";
import { damp } from "./math.js";

export interface PointerState {
	/** Viewport coordinates in CSS pixels. */
	x: number;
	y: number;
	/** Normalised to [0,1] across the viewport. */
	nx: number;
	ny: number;
	/** Pixels per second (instantaneous, smoothed). */
	vx: number;
	vy: number;
	speed: number;
	down: boolean;
	inside: boolean;
}

export interface PointerTrackerOptions {
	/** Exponential smoothing factor for the reported position. */
	smoothing?: number;
	/** Element the coordinates are relative to. Defaults to the viewport. */
	target?: HTMLElement;
}

/**
 * Normalised pointer input with velocity and smoothing, shared by cursor fields,
 * magnetic UI and parallax. Attaches passive listeners only.
 */
export class PointerTracker {
	readonly state: PointerState = {
		x: 0,
		y: 0,
		nx: 0.5,
		ny: 0.5,
		vx: 0,
		vy: 0,
		speed: 0,
		down: false,
		inside: false,
	};

	/** Smoothed position, what you usually want to drive visuals with. */
	smoothX = 0;
	smoothY = 0;

	private readonly rawX = { value: 0 };
	private readonly rawY = { value: 0 };
	private readonly smoothing: number;
	private readonly disposer = new Disposer();
	private lastX = 0;
	private lastY = 0;
	private lastTime = 0;
	private started = false;

	constructor(
		private readonly element: HTMLElement | Window = globalThis.window as Window,
		options: PointerTrackerOptions = {},
	) {
		this.smoothing = options.smoothing ?? 12;

		const el = this.element as EventTarget;
		this.disposer.listen(el, "pointermove", this.onMove as EventListener, { passive: true });
		this.disposer.listen(el, "pointerdown", this.onDown as EventListener, { passive: true });
		this.disposer.listen(el, "pointerup", this.onUp as EventListener, { passive: true });
		this.disposer.listen(el, "pointercancel", this.onUp as EventListener, { passive: true });
		this.disposer.listen(el, "pointerleave", this.onLeave as EventListener, { passive: true });
	}

	private onMove = (e: PointerEvent) => {
		const rect = this.resolveRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const now = performance.now();
		const dt = this.started ? Math.max((now - this.lastTime) / 1000, 1 / 240) : 1 / 60;

		if (this.started) {
			this.state.vx = (x - this.lastX) / dt;
			this.state.vy = (y - this.lastY) / dt;
			this.state.speed = Math.hypot(this.state.vx, this.state.vy);
		}

		this.rawX.value = x;
		this.rawY.value = y;
		this.state.x = x;
		this.state.y = y;
		this.state.nx = rect.width > 0 ? x / rect.width : 0.5;
		this.state.ny = rect.height > 0 ? y / rect.height : 0.5;
		this.state.inside = true;
		this.lastX = x;
		this.lastY = y;
		this.lastTime = now;
		this.started = true;

		if (this.smoothX === 0 && this.smoothY === 0) {
			this.smoothX = x;
			this.smoothY = y;
		}
	};

	private onDown = () => {
		this.state.down = true;
	};

	private onUp = () => {
		this.state.down = false;
	};

	private onLeave = () => {
		this.state.inside = false;
		this.state.down = false;
		this.state.vx = 0;
		this.state.vy = 0;
		this.state.speed = 0;
	};

	private resolveRect(): { left: number; top: number; width: number; height: number } {
		if (typeof window === "undefined") return { left: 0, top: 0, width: 1, height: 1 };
		if (this.element instanceof HTMLElement) {
			const r = this.element.getBoundingClientRect();
			return { left: r.left, top: r.top, width: r.width, height: r.height };
		}
		return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
	}

	/** Advance the smoothed position. Call once per frame from the scheduler. */
	update(dt: number): void {
		this.smoothX = damp(this.smoothX, this.rawX.value, this.smoothing, dt);
		this.smoothY = damp(this.smoothY, this.rawY.value, this.smoothing, dt);
		// Velocity decays when the pointer stops producing move events.
		if (performance.now() - this.lastTime > 80) {
			this.state.vx = damp(this.state.vx, 0, 8, dt);
			this.state.vy = damp(this.state.vy, 0, 8, dt);
			this.state.speed = Math.hypot(this.state.vx, this.state.vy);
		}
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
