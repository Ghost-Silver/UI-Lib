/**
 * `@ui-lib/react` — React bindings for UI-Lib.
 *
 * Two pieces:
 * - {@link GlassStage} boots the shared GPU layer for a subtree.
 * - {@link GlassPanel} attaches real refraction to a normal DOM element.
 *
 * Everything degrades: without a stage, on unsupported devices, or when the
 * user prefers reduced motion, panels render a CSS `backdrop-filter` fallback.
 */

export type { GlassPanelHandle, GlassPanelOptions } from "@ui-lib/renderer";
export type { GlassStageStatus, GlassStageValue } from "./context.js";
export { GlassStageContext, useGlassStage } from "./context.js";
export type { GlassPanelProps } from "./GlassPanel.js";
export { GlassPanel } from "./GlassPanel.js";
export type { GlassStageProps } from "./GlassStage.js";
export { GlassStage } from "./GlassStage.js";
export { ensureStyles } from "./injectStyles.js";

export type { ParticleFieldProps } from "./ParticleField.js";
export { ParticleField } from "./ParticleField.js";
