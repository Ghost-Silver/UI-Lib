/**
 * `@ui-lib/motion` — scroll and authored motion on UI-Lib's one frame clock.
 *
 * The first slice is a scroll track: progress, velocity, chapter weights and
 * numeric tracks. It does not start a second animation loop. Springs, easing
 * and the scheduler stay in `@ui-lib/core`.
 */

export type { TrackKey } from "./beats.js";
export { beatLocal, beatWeight, revealWeight, sampleTrack } from "./beats.js";
export type { ScrollState, ScrollTrackOptions } from "./scrollTrack.js";
export { SCROLL_IDLE, ScrollTrack, scrollProgress } from "./scrollTrack.js";
