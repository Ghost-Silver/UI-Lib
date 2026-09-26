/**
 * `@ui-lib/core` — the framework-agnostic, three.js-free foundation of UI-Lib.
 *
 * Contains everything that must exist before a single pixel is drawn: device
 * probing, adaptive quality, one unified frame loop, math, pointer input and a
 * deterministic lifecycle.
 */

export type { GpuBackend, DeviceCapabilities } from "./device.js";
export {
	hasDom,
	detectCapabilities,
	detectCapabilitiesSync,
	onReducedMotionChange,
} from "./device.js";

export type { QualityTier, QualitySettings, QualityPreset, QualityManagerOptions } from "./quality.js";
export { QUALITY_PRESETS, scoreTier, QualityManager } from "./quality.js";

export type { FrameCallback, FrameInfo, TaskPriorityName } from "./scheduler.js";
export { FrameScheduler, TASK_PRIORITY, getScheduler, disposeScheduler } from "./scheduler.js";

export type { Disposable, Teardown } from "./lifecycle.js";
export { Disposer, nextFrame } from "./lifecycle.js";

export {
	Easing,
	Spring,
	Spring2,
	clamp,
	clamp01,
	damp,
	fbm2D,
	inverseLerp,
	lerp,
	mapRange,
	smoothstep,
	valueNoise2D,
	wrap,
} from "./math.js";
export type { EasingName, SpringOptions } from "./math.js";

export type { PointerState, PointerTrackerOptions } from "./pointer.js";
export { PointerTracker } from "./pointer.js";
