import { clamp01, smoothstep } from "@ui-lib/core";

/**
 * 0 before a word's turn, 1 after it has arrived. Later indexes wait `stagger`
 * seconds. A non-positive duration snaps. This is the clock `<Reveal>` paints;
 * it does not start its own loop.
 */
export function revealWeight(
	elapsed: number,
	index: number,
	delay = 0.12,
	stagger = 0.07,
	duration = 0.72,
): number {
	const start = Math.max(0, delay) + Math.max(0, index) * Math.max(0, stagger);
	if (!(duration > 0)) return elapsed >= start ? 1 : 0;
	return smoothstep(start, start + duration, elapsed);
}

export interface TrackKey {
	/** Progress position of this key, in [0, 1]. */
	at: number;
	value: readonly number[];
}

/**
 * Weight of a chapter in [0, 1]. 0 outside `[start, end]`, 1 on the plateau,
 * smoothstep across `fade` at each edge. `fade` is clamped so a short chapter
 * still peaks instead of never opening.
 */
export function beatWeight(progress: number, start: number, end: number, fade = 0.08): number {
	if (!(end > start)) return 0;
	const edge = Math.min(Math.max(fade, 0), (end - start) / 2);
	const fadeIn =
		edge === 0 ? (progress >= start ? 1 : 0) : smoothstep(start, start + edge, progress);
	const fadeOut =
		edge === 0 ? (progress <= end ? 1 : 0) : 1 - smoothstep(end - edge, end, progress);
	return clamp01(Math.min(fadeIn, fadeOut));
}

/** 0 at `start`, 1 at `end`, clamped outside. The local clock of a chapter. */
export function beatLocal(progress: number, start: number, end: number): number {
	if (!(end > start)) return progress >= end ? 1 : 0;
	return clamp01((progress - start) / (end - start));
}

/**
 * Piecewise smooth interpolation of a numeric track. Keys should be sorted by
 * `at`. Outside the first and last key the value is held, not extrapolated.
 */
export function sampleTrack(progress: number, keys: readonly TrackKey[]): number[] {
	const first = keys[0];
	if (!first) return [];
	const t = clamp01(progress);
	if (t <= first.at) return [...first.value];
	const last = keys[keys.length - 1] ?? first;
	if (t >= last.at) return [...last.value];

	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (!a || !b || t > b.at) continue;
		const span = b.at - a.at;
		const u = span <= 0 ? 1 : (t - a.at) / span;
		const eased = u * u * (3 - 2 * u);
		return a.value.map((value, index) => {
			const next = b.value[index] ?? value;
			return value + (next - value) * eased;
		});
	}
	return [...last.value];
}
