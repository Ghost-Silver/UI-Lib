/**
 * `@ui-lib/renderer` — the three.js runtime behind UI-Lib.
 *
 * `@ui-lib/core` holds the framework-agnostic, three-free primitives; this
 * package is where a GPU actually gets involved.
 */

export type { CreateRendererOptions, UiRenderer } from "./createRenderer.js";
export { createRenderer, RendererUnavailableError } from "./createRenderer.js";

export type { BackdropSpec, BackdropInstance } from "./backdrop.js";
export { createBackdrop, DEFAULT_BACKDROP } from "./backdrop.js";

export type {
	GlassLayerOptions,
	GlassLayerStats,
	GlassPanelHandle,
	GlassPanelOptions,
} from "./glassLayer.js";
export { GlassLayer, GLASS_PANEL_DEFAULTS, createGlassLayer } from "./glassLayer.js";
