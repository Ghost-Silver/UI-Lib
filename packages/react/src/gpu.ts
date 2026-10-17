/**
 * The GPU half of `@ui-lib/react`, behind its own entry point.
 *
 * ## Why this exists
 *
 * Fifty-seven source files import from this package and **three of them import
 * `three`**. Those three are enough to put a peer dependency on a 1.2 MB renderer
 * in front of every consumer of `SoftCard`, which is a cost paid by people who
 * never render a triangle.
 *
 * Nothing about `three` is optional inside those three components — they build
 * node materials directly — so the dependency cannot be removed, only scoped.
 * Importing `@ui-lib/react/gpu` is the statement that you are using a GPU
 * component; importing `@ui-lib/react` is not.
 *
 * ## The line is drawn at what renders
 *
 * `GlassStage` and `GlassPanel` are **not** here, and that is deliberate rather
 * than an oversight: they render DOM and delegate to `@ui-lib/renderer`, so they
 * work with the main entry. A component belongs here when it imports a node
 * material itself.
 */
export type { CrystalTextProps } from "./CrystalText.js";
export { CrystalText } from "./CrystalText.js";
export type { LensProps } from "./Lens.js";
export { Lens } from "./Lens.js";
/*
 * `Optics` does not import `three` itself — it composes `Lens`, which does.
 *
 * It belongs here for that reason rather than despite it: the test for this entry
 * is not "does this file say three" but "does importing this file pull three in",
 * and a transitive pull is the same cost to the caller. A rule written against the
 * literal import would have left `Optics` in the main entry and the dependency
 * with it.
 */
export type { OpticsProps } from "./Optics.js";
export { Optics } from "./Optics.js";
export type { PointerTrailProps } from "./PointerTrail.js";
export { PointerTrail } from "./PointerTrail.js";
