import type { PostProcessingOptions } from "./postProcessing.js";

/**
 * Named grades. They only set the knobs a page usually should not invent.
 *
 * `cinema` is the capped version of the scroll-cinema optic: the bloom shape
 * stays, highlights above 1 roll off. `bright` is the previous uncapped grade,
 * kept so that look can be chosen instead of deleted.
 */
export const LOOKS = {
	product: {
		shoulder: 0.35,
		bloomStrength: 0.22,
		bloomThreshold: 0.78,
		haloStrength: 0.08,
		flareStrength: 0.04,
		exposure: 0,
		vignette: 0.16,
		grain: 0.012,
		saturation: 1.04,
		contrast: 1.04,
	},
	cinema: {
		shoulder: 0.7,
		bloomStrength: 0.38,
		bloomThreshold: 0.76,
		bloomKnee: 0.14,
		haloStrength: 0.15,
		flareStrength: 0.045,
		vignette: 0.4,
		grain: 0.012,
		saturation: 1.04,
		contrast: 1.04,
		chromaticAberration: 0.18,
	},
	bright: {
		shoulder: 0,
		bloomStrength: 0.74,
		bloomThreshold: 0.58,
		haloStrength: 0.34,
		flareStrength: 0.1,
		chromaticAberration: 0.22,
		vignette: 0.36,
		grain: 0.012,
	},
	quiet: {
		shoulder: 0.5,
		bloomStrength: 0.08,
		bloomThreshold: 0.86,
		haloStrength: 0.04,
		flareStrength: 0,
		exposure: -0.08,
		vignette: 0.2,
		grain: 0.01,
		saturation: 0.96,
		contrast: 1.02,
	},
} as const satisfies Record<string, PostProcessingOptions>;

export type LookName = keyof typeof LOOKS;

/**
 * Merge a named grade with page overrides. `false` still disables the chain.
 * An omitted look returns the overrides unchanged, so existing stages keep
 * {@link POST_DEFAULTS}.
 */
export function resolveLook(
	look?: LookName,
	overrides?: PostProcessingOptions | false,
): PostProcessingOptions | false | undefined {
	if (overrides === false) return false;
	if (!look) return overrides;
	return { ...LOOKS[look], ...overrides };
}
