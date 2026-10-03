// The glyph layout is pure geometry and now lives with the text material in
// @ui-lib/shaders. Re-exported so `@ui-lib/dom`'s surface is unchanged.
export type { BMFont, BMFontChar } from "@ui-lib/shaders";
export { createTextGeometry, sampleTextPoints } from "@ui-lib/shaders";
export type { IrisEffectOptions } from "./iris.js";
export { bubbleBadge, paperButton, softLightPanel, watercolorCard } from "./iris.js";
export type { LiquidGlassHandle, LiquidGlassOptions } from "./liquidGlass.js";
export { liquidGlass } from "./liquidGlass.js";
export * from "./magic.js";
export * from "./text/msdf.js";
