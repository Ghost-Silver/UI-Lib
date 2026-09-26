import type { DeviceCapabilities } from "./device.js";

/** 0 = no GPU (pure CSS/DOM fallback), 3 = desktop-class discrete/integrated GPU. */
export type QualityTier = 0 | 1 | 2 | 3;

export interface QualitySettings {
	readonly tier: QualityTier;
	/** Upper bound applied to `devicePixelRatio`. */
	readonly dprCap: number;
	/** Number of texture taps used by frosted/refraction blur. */
	readonly blurTaps: number;
	/** Particle budget for a single effect instance. */
	readonly particleBudget: number;
	/** GPU compute shaders (WebGPU only). */
	readonly allowCompute: boolean;
	/** Post-processing chain. */
	readonly allowPostFx: boolean;
	/** Maximum number of simultaneously tracked DOM-attached effects. */
	readonly maxPanels: number;
}

export type QualityPreset = Omit<QualitySettings, "tier">;

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
	// No usable GPU: everything degrades to CSS.
	0: {
		dprCap: 1,
		blurTaps: 1,
		particleBudget: 0,
		allowCompute: false,
		allowPostFx: false,
		maxPanels: 0,
	},
	// Low-end mobile / older integrated GPUs.
	1: {
		dprCap: 1.5,
		blurTaps: 5,
		particleBudget: 20_000,
		allowCompute: false,
		allowPostFx: false,
		maxPanels: 8,
	},
	// Modern laptop, WebGL 2 or WebGPU.
	2: {
		dprCap: 2,
		blurTaps: 8,
		particleBudget: 150_000,
		allowCompute: true,
		allowPostFx: true,
		maxPanels: 24,
	},
	// Discrete GPU / Apple Silicon with WebGPU.
	3: {
		dprCap: 2,
		blurTaps: 12,
		particleBudget: 1_000_000,
		allowCompute: true,
		allowPostFx: true,
		maxPanels: 48,
	},
};

/** Map raw device capabilities onto an initial quality tier. */
export function scoreTier(caps: DeviceCapabilities): QualityTier {
	if (caps.backend === "none") return 0;

	let score = 1;
	if (caps.webgpu) score += 1;
	if (caps.cores >= 8) score += 1;
	if ((caps.memoryGB ?? 4) >= 8) score += 1;
	if (caps.mobile) score -= 1;
	if (caps.maxTextureSize > 0 && caps.maxTextureSize < 4096) score -= 1;
	if (caps.saveData) score -= 1;

	return Math.max(0, Math.min(3, score)) as QualityTier;
}

export interface QualityManagerOptions {
	/** `"auto"` (default) derives the tier from device capabilities. */
	tier?: QualityTier | "auto";
	/** Enable runtime downgrade/upgrade based on measured FPS. Default `true`. */
	auto?: boolean;
	capabilities?: DeviceCapabilities;
	onChange?: (settings: QualitySettings, previous: QualityTier) => void;
}

const FRAMES_PER_SAMPLE = 30;
const DOWNGRADE_STREAK = 3;
const UPGRADE_STREAK = 20;
const FPS_BAD = 45;
const FPS_GOOD = 57;

/**
 * Owns the current quality tier, exposes its settings, and — when `auto` is on —
 * watches real frame times to walk the tier down (or back up) on the fly.
 */
export class QualityManager {
	readonly maxTier: QualityTier;
	private tierValue: QualityTier;
	private readonly auto: boolean;
	private readonly onChange?: (s: QualitySettings, prev: QualityTier) => void;

	private acc = 0;
	private count = 0;
	private bad = 0;
	private good = 0;
	private cooldown = 0;

	constructor(options: QualityManagerOptions = {}) {
		const caps = options.capabilities;
		this.auto = options.auto ?? true;
		this.onChange = options.onChange;

		const requested = options.tier ?? "auto";
		const scored = caps ? scoreTier(caps) : 2;
		const initial = requested === "auto" ? scored : requested;
		this.maxTier = requested === "auto" ? scored : requested;
		this.tierValue = initial;
	}

	get tier(): QualityTier {
		return this.tierValue;
	}

	get settings(): QualitySettings {
		return { tier: this.tierValue, ...QUALITY_PRESETS[this.tierValue] };
	}

	setTier(tier: QualityTier): void {
		const next = Math.max(0, Math.min(3, tier)) as QualityTier;
		if (next === this.tierValue) return;
		const previous = this.tierValue;
		this.tierValue = next;
		this.bad = 0;
		this.good = 0;
		this.onChange?.(this.settings, previous);
	}

	/** Feed one frame duration (seconds). Cheap; safe to call every frame. */
	sample(dt: number): void {
		if (!this.auto || !(dt > 0)) return;

		if (this.cooldown > 0) this.cooldown--;

		this.acc += dt;
		this.count++;
		if (this.count < FRAMES_PER_SAMPLE) return;

		const fps = this.count / this.acc;
		this.acc = 0;
		this.count = 0;

		if (fps < FPS_BAD) {
			this.bad++;
			this.good = 0;
		} else if (fps > FPS_GOOD) {
			this.good++;
			this.bad = 0;
		} else {
			this.bad = 0;
			this.good = 0;
		}

		if (this.bad >= DOWNGRADE_STREAK && this.tierValue > 0) {
			this.setTier((this.tierValue - 1) as QualityTier);
			this.cooldown = 6; // ~180 frames before we consider going back up
			return;
		}

		if (this.cooldown === 0 && this.good >= UPGRADE_STREAK && this.tierValue < this.maxTier) {
			this.setTier((this.tierValue + 1) as QualityTier);
			this.cooldown = 20;
		}
	}

	dispose(): void {
		this.acc = 0;
		this.count = 0;
	}
}
