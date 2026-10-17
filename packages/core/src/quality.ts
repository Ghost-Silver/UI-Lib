import type { DeviceCapabilities } from "./device.js";
import { mergeDefined } from "./mergeDefined.js";

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

/**
 * A host's declared rendering budget.
 *
 * On the web the budget is *probed*: `detectCapabilities()` reads the browser,
 * `scoreTier()` picks a rung, `QUALITY_PRESETS` fills in the numbers. A host
 * that is not a browser has nothing to probe — a UE5 shell knows its own
 * numbers and can simply state them. Both arrive here and everything below is
 * identical, which is the whole point of the seam.
 *
 * `host` is free-form and only ever used for reporting; nothing branches on it.
 */
export interface PlatformBudget {
	/** Stable id for the host that produced this budget, e.g. `"ue5-metal"`. */
	readonly host: string;
	/**
	 * Where the numbers came from. `"probed"` means a device probe produced
	 * them, `"declared"` means a host stated them. Reported so a gate can tell
	 * a measured limit from an asserted one.
	 */
	readonly source: "probed" | "declared";
	/** Any subset of the preset. Omitted fields fall back to the tier's. */
	readonly preset?: Partial<QualityPreset>;
	/**
	 * The rung to start and cap at, used only to fill omitted preset fields.
	 * Defaults to `2`.
	 */
	readonly tier?: QualityTier;
}

/**
 * Fold a declared budget onto a preset.
 *
 * Deliberately total: an omitted field is inherited, never `undefined`, so a
 * host that only cares about particle count does not have to restate the DPR
 * cap. Runs through the same `mergeDefined` rule as every other option object
 * in the library.
 */
export function resolveBudget(budget: PlatformBudget): QualitySettings {
	const tier = budget.tier ?? 2;
	return {
		tier,
		...mergeDefined<QualityPreset, Partial<QualityPreset>>(
			QUALITY_PRESETS[tier],
			budget.preset ?? {},
		),
	};
}

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
	/**
	 * A budget stated by the host rather than probed from a browser.
	 *
	 * Takes precedence over `tier` and `capabilities`: a host that knows its
	 * own numbers is not guessing, and it is the only way a non-web backend can
	 * describe itself. Leave it out on the web and the probe is used.
	 */
	budget?: PlatformBudget;
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
	/** Where the budget came from, and which host stated it. */
	readonly budgetHost: string;
	readonly budgetSource: "probed" | "declared";
	private tierValue: QualityTier;
	/** Only the fields the host was explicit about; everything else follows the rung. */
	private readonly declaredPreset?: Partial<QualityPreset>;
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

		if (options.budget) {
			// A stated budget wins outright: the host is not guessing, and the
			// tier below only exists to fill in what it left out.
			const resolved = resolveBudget(options.budget);
			this.declaredPreset = options.budget.preset;
			this.budgetHost = options.budget.host;
			this.budgetSource = options.budget.source;
			this.maxTier = resolved.tier;
			this.tierValue = resolved.tier;
			this.auto = false;
			this.onChange = options.onChange;
			return;
		}

		const initial = requested === "auto" ? scored : requested;
		this.budgetHost = "web";
		this.budgetSource = "probed";
		this.maxTier = requested === "auto" ? scored : requested;
		this.tierValue = initial;
	}

	get tier(): QualityTier {
		return this.tierValue;
	}

	get settings(): QualitySettings {
		const preset = QUALITY_PRESETS[this.tierValue];
		if (!this.declaredPreset) return { tier: this.tierValue, ...preset };
		// Only the fields the host actually stated are pinned. Everything else —
		// blur taps, DPR cap, the panel ceiling — still follows the rung, so a
		// declared budget does not freeze the adaptive walk.
		return {
			tier: this.tierValue,
			...mergeDefined<QualityPreset, Partial<QualityPreset>>(preset, this.declaredPreset),
		};
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
