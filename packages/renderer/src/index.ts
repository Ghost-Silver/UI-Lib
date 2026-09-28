/**
 * `@ui-lib/renderer` — the three.js runtime behind UI-Lib.
 *
 * `@ui-lib/core` holds the framework-agnostic, three-free primitives; this
 * package is where a GPU actually gets involved.
 */

export { LOOKS, type LookName, type PostProcessingOptions, resolveLook } from "@ui-lib/post";
export type { WorldLensMaterial, WorldLensOptions } from "@ui-lib/shaders";
export type { AnchorPlacement } from "./anchor.js";
export { pointerClient } from "./anchor.js";
export type { BackdropInstance, BackdropSpec } from "./backdrop.js";
export { createBackdrop, DEFAULT_BACKDROP } from "./backdrop.js";
export type {
	CreateRendererOptions,
	RendererLossInfo,
	UiRenderer,
} from "./createRenderer.js";
export { createRenderer, RendererUnavailableError } from "./createRenderer.js";
export type {
	GlassLayerMode,
	GlassLayerOptions,
	GlassLayerStats,
	GlassPanelHandle,
	GlassPanelOptions,
	ParticleDepth,
	ParticleLayerOptions,
	PointerRay,
	WorldObjectOptions,
} from "./glassLayer.js";
export { createGlassLayer, GLASS_PANEL_DEFAULTS, GlassLayer } from "./glassLayer.js";
export { approachPoint, defaultPointerDistance, stirBreath } from "./pointerDistance.js";
export {
	pushTrailSample,
	stepTrail,
	TRAIL_CAPACITY,
	TRAIL_LIFE,
	type TrailPoint,
	trailPresence,
	trailSpacing,
	trailWidth,
	writeRibbon,
	writeRibbonColors,
	writeRibbonIndices,
	writeSoftDisc,
} from "./ribbon.js";
