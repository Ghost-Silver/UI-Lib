/**
 * `@ui-lib/renderer` — the three.js runtime behind UI-Lib.
 *
 * `@ui-lib/core` holds the framework-agnostic, three-free primitives; this
 * package is where a GPU actually gets involved.
 */

export type { PostProcessingOptions } from "@ui-lib/post";
export type { BackdropInstance, BackdropSpec } from "./backdrop.js";
export { createBackdrop, DEFAULT_BACKDROP } from "./backdrop.js";
export type { CreateRendererOptions, UiRenderer } from "./createRenderer.js";
export { createRenderer, RendererUnavailableError } from "./createRenderer.js";

export type {
	GlassLayerOptions,
	GlassLayerStats,
	GlassPanelHandle,
	GlassPanelOptions,
	ParticleLayerOptions,
} from "./glassLayer.js";
export { createGlassLayer, GLASS_PANEL_DEFAULTS, GlassLayer } from "./glassLayer.js";
