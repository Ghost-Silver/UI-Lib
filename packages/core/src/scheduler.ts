import { hasDom } from "./device.js";

export const TASK_PRIORITY = {
	/** Read input/pointer state first so everything downstream agrees. */
	input: 0,
	/** GPU compute (particle simulation). */
	compute: 1,
	/** CPU state updates: springs, layout sync, uniform writes. */
	update: 2,
	/** Draw calls and post-processing. */
	render: 3,
} as const;

export type TaskPriorityName = keyof typeof TASK_PRIORITY;

export interface FrameInfo {
	/** Seconds since the previous frame, clamped to avoid physics explosions. */
	dt: number;
	/** Seconds since the scheduler started (excluding paused time). */
	elapsed: number;
	/** Monotonic frame counter. */
	frame: number;
	/** Smoothed frames per second. */
	fps: number;
	/** `performance.now()` at the start of this frame. */
	time: number;
}

export type FrameCallback = (info: FrameInfo) => void;

interface Task {
	cb: FrameCallback;
	priority: number;
	order: number;
}

/** Never advance more than this in a single step (tab was backgrounded). */
const MAX_DT = 1 / 15;

/**
 * One requestAnimationFrame loop for the whole page.
 *
 * Everything in UI-Lib shares this loop so DOM animation, GPU simulation and
 * rendering never run on divergent clocks (the usual cause of "the effect lags
 * one frame behind my spring").
 */
export class FrameScheduler {
	private tasks: Task[] = [];
	private rafId: number | null = null;
	private last = 0;
	private frameValue = 0;
	private elapsedValue = 0;
	private fpsValue = 0;
	private order = 0;
	private readonly onVisibility: () => void;

	constructor() {
		this.onVisibility = () => {
			if (!hasDom()) return;
			if (document.hidden) this.pause();
			else if (this.tasks.length > 0) this.resume();
		};
		if (hasDom()) document.addEventListener("visibilitychange", this.onVisibility);
	}

	/**
	 * Register a per-frame callback.
	 * @returns an unsubscribe function that also stops the loop when idle.
	 */
	add(cb: FrameCallback, priority: TaskPriorityName = "render"): () => void {
		const task: Task = { cb, priority: TASK_PRIORITY[priority], order: this.order++ };
		this.tasks.push(task);
		this.tasks.sort((a, b) => a.priority - b.priority || a.order - b.order);
		if (hasDom() && !document.hidden) this.resume();
		return () => this.remove(task);
	}

	private remove(task: Task): void {
		const i = this.tasks.indexOf(task);
		if (i >= 0) this.tasks.splice(i, 1);
		if (this.tasks.length === 0) this.pause();
	}

	get running(): boolean {
		return this.rafId !== null;
	}

	get fps(): number {
		return this.fpsValue;
	}

	get frame(): number {
		return this.frameValue;
	}

	get elapsed(): number {
		return this.elapsedValue;
	}

	/** Start (or restart) the loop. Idempotent. */
	resume(): void {
		if (this.rafId !== null || !hasDom() || this.tasks.length === 0) return;
		this.last = performance.now();
		const tick = (now: number) => {
			this.rafId = requestAnimationFrame(tick);
			const raw = (now - this.last) / 1000;
			this.last = now;
			const dt = Math.min(Math.max(raw, 0), MAX_DT);

			this.frameValue++;
			this.elapsedValue += dt;
			const instant = raw > 0 ? 1 / raw : 0;
			this.fpsValue = this.fpsValue === 0 ? instant : this.fpsValue * 0.9 + instant * 0.1;

			const info: FrameInfo = {
				dt,
				elapsed: this.elapsedValue,
				frame: this.frameValue,
				fps: this.fpsValue,
				time: now,
			};

			// Snapshot: a callback may unsubscribe during iteration.
			for (const task of this.tasks.slice()) task.cb(info);
		};
		this.rafId = requestAnimationFrame(tick);
	}

	/** Stop the loop without dropping subscribers. */
	pause(): void {
		if (this.rafId === null) return;
		cancelAnimationFrame(this.rafId);
		this.rafId = null;
	}

	dispose(): void {
		this.pause();
		this.tasks.length = 0;
		if (hasDom()) document.removeEventListener("visibilitychange", this.onVisibility);
	}
}

/**
 * Process-wide scheduler. Created lazily so importing this module never
 * references `window` in an SSR bundle.
 */
let shared: FrameScheduler | null = null;

export function getScheduler(): FrameScheduler {
	if (shared === null && hasDom()) shared = new FrameScheduler();
	return shared as FrameScheduler;
}

export function disposeScheduler(): void {
	shared?.dispose();
	shared = null;
}
