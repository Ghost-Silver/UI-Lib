/**
 * `@ui-lib/core` — the framework-agnostic, three.js-free foundation of UI-Lib.
 *
 * Contains everything that must exist before a single pixel is drawn: device
 * probing, adaptive quality, one unified frame loop, math, pointer input and a
 * deterministic lifecycle.
 */

export type { DeviceCapabilities, GpuBackend } from "./device.js";
export {
	detectCapabilities,
	detectCapabilitiesSync,
	hasDom,
	onReducedMotionChange,
} from "./device.js";
export type { Disposable, Teardown } from "./lifecycle.js";
export { Disposer, nextFrame } from "./lifecycle.js";
export type { EasingName, SpringOptions } from "./math.js";
export {
	clamp,
	clamp01,
	damp,
	Easing,
	fbm2D,
	inverseLerp,
	lerp,
	mapRange,
	Spring,
	Spring2,
	smoothstep,
	valueNoise2D,
	wrap,
} from "./math.js";
export { mergeDefined } from "./mergeDefined.js";
export type { PointerState, PointerTrackerOptions } from "./pointer.js";
export { PointerTracker } from "./pointer.js";
export type {
	QualityManagerOptions,
	QualityPreset,
	QualitySettings,
	QualityTier,
} from "./quality.js";
export { QUALITY_PRESETS, QualityManager, scoreTier } from "./quality.js";
export type {
	ResourceHandle,
	ResourceKind,
	ResourceSnapshot,
} from "./resource.js";
export { getResourceSnapshot, ResourceRegistry, resourceRegistry } from "./resource.js";
export type { FrameCallback, FrameInfo, TaskPriorityName } from "./scheduler.js";
export { disposeScheduler, FrameScheduler, getScheduler, TASK_PRIORITY } from "./scheduler.js";
