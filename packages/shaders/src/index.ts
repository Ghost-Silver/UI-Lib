/**
 * `@ui-lib/shaders` — TSL node materials.
 *
 * One graph, two backends: everything here compiles to WGSL under WebGPU and to
 * GLSL under the WebGL 2 fallback, because it is written in three's node system
 * instead of raw shader source.
 */

export type { FloatUniform, Vec2Uniform, ColorUniform, SharedUniforms } from "./nodeTypes.js";

export type { FullscreenQuad } from "./quad.js";
export { createFullscreenQuad } from "./quad.js";

export type {
	LiquidGlassOptions,
	LiquidGlassUniforms,
	LiquidGlassMaterial,
} from "./liquidGlass.js";
export { LIQUID_GLASS_DEFAULTS, createLiquidGlassMaterial } from "./liquidGlass.js";

export type {
	GradientBackdropOptions,
	GradientBackdropMaterial,
} from "./gradientBackdrop.js";
export { GRADIENT_BACKDROP_DEFAULTS, createGradientBackdropMaterial } from "./gradientBackdrop.js";
