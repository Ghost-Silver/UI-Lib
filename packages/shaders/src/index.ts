/**
 * `@ui-lib/shaders` — TSL node materials.
 *
 * One graph, two backends: everything here compiles to WGSL under WebGPU and to
 * GLSL under the WebGL 2 fallback, because it is written in three's node system
 * instead of raw shader source.
 */

export type {
	GradientBackdropMaterial,
	GradientBackdropOptions,
} from "./gradientBackdrop.js";
export {
	createGradientBackdropMaterial,
	GRADIENT_BACKDROP_DEFAULTS,
} from "./gradientBackdrop.js";
export type {
	LiquidGlassMaterial,
	LiquidGlassOptions,
	LiquidGlassUniforms,
} from "./liquidGlass.js";
export { createLiquidGlassMaterial, LIQUID_GLASS_DEFAULTS } from "./liquidGlass.js";
export type {
	ColorUniform,
	FloatUniform,
	SharedUniforms,
	Vec2Uniform,
	Vec3Uniform,
} from "./nodeTypes.js";
export type { FullscreenQuad } from "./quad.js";
export { createFullscreenQuad } from "./quad.js";
export {
	STUDIO_ENVIRONMENT_PEAK,
	STUDIO_ENVIRONMENT_SIZE,
	studioEnvironment,
} from "./studioEnvironment.js";
export { evaluateMSDF } from "./text/msdf.js";
export type { WorldLensMaterial, WorldLensOptions, WorldLensUniforms } from "./worldLens.js";
export { createWorldLensMaterial, WORLD_LENS_DEFAULTS } from "./worldLens.js";
