/** WebGL 2 transform-feedback ceiling. Matches the old `count: "auto"` fallback. */
export const WEBGL_PARTICLE_CAP = 80_000;

/** WebGPU allocation ceiling. Not a measured 1M-at-60fps claim. */
export const WEBGPU_PARTICLE_CAP = 1_000_000;

/** History samples per particle. Longer than this is a second buffer, not a streak. */
export const TRAIL_MAX = 8;

export type ParticleBackend = "webgpu" | "webgl2" | "none";

export interface ParticleLodInput {
	/** Author ceiling. `"auto"` means the tier budget, capped by the backend. */
	authored?: number | "auto";
	/** Quality-tier particle budget. `0` draws nothing and keeps the buffer. */
	budget: number;
	backend: ParticleBackend;
	/**
	 * 0–1 visibility. `0` stops the dispatch without freeing the buffer, so a
	 * section can come back without a respawn puff.
	 */
	visible?: number;
}

export interface ParticleLod {
	/** Buffer size. Fixed until the system is recreated. */
	allocated: number;
	/** How many to simulate and draw. Never above `allocated`. */
	active: number;
}

function finiteCount(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.floor(value);
}

/**
 * How many particles to allocate, and how many of those to actually step.
 * An explicit count is the ceiling. The budget and visibility only lower the
 * active prefix — they do not grow a buffer the author did not ask for.
 */
export function resolveParticleLod(input: ParticleLodInput): ParticleLod {
	const cap =
		input.backend === "webgpu"
			? WEBGPU_PARTICLE_CAP
			: input.backend === "webgl2"
				? WEBGL_PARTICLE_CAP
				: 0;
	const budget = finiteCount(input.budget);
	const visible = input.visible === undefined ? 1 : Math.min(1, Math.max(0, input.visible));
	const authored =
		input.authored === "auto" || input.authored === undefined
			? Math.min(budget, cap)
			: Math.min(finiteCount(input.authored), cap);
	if (authored <= 0 || cap <= 0) return { allocated: 0, active: 0 };
	if (budget <= 0 || visible <= 0) return { allocated: authored, active: 0 };
	const scaled = Math.max(1, Math.round(authored * visible));
	return { allocated: authored, active: Math.min(authored, budget, scaled) };
}

export interface ParticleTrailOptions {
	/** Samples stored per particle. `0` allocates nothing. Clamped to {@link TRAIL_MAX}. */
	length?: number;
	/** Frames between frozen samples. The newest segment still stretches every frame. */
	stride?: number;
	/** Opacity of a fresh segment. Older samples fade to 0. Does not scale intensity. */
	opacity?: number;
	/** Stroke thickness in world units. */
	width?: number;
}

export interface ResolvedTrail {
	length: number;
	stride: number;
	opacity: number;
	width: number;
}

/** `undefined` and `0` allocate no history, so existing fields keep one sprite. */
export function resolveTrail(trail: number | ParticleTrailOptions | undefined): ResolvedTrail {
	if (trail === undefined || trail === 0) {
		return { length: 0, stride: 1, opacity: 0, width: 0 };
	}
	const source = typeof trail === "number" ? { length: trail } : trail;
	const length = Math.max(0, Math.min(TRAIL_MAX, Math.floor(source.length ?? 0)));
	const stride = Math.max(1, Math.min(30, Math.floor(source.stride ?? 5)));
	const opacity = Math.min(1, Math.max(0, source.opacity ?? 0.32));
	const width = Math.max(0, source.width ?? 0.016);
	if (length <= 0) return { length: 0, stride, opacity: 0, width: 0 };
	return { length, stride, opacity, width };
}
