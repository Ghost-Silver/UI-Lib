import { mergeDefined } from "@ui-lib/core";
import type { GlassPanelOptions } from "@ui-lib/renderer";

/**
 * The shared base for the IRIS components.
 *
 * Five components wrapping the same glass panel would otherwise each invent
 * their own way of deciding which props are optics and which are DOM. One
 * split, one merge rule, so `frost` means the same thing on every component
 * and `onClick` never gets swallowed into an options object.
 */

/** Every key {@link GlassPanelOptions} reads as an optical setting. */
export const GLASS_OPTION_KEYS = [
	"radius",
	"bevel",
	"refraction",
	"shift",
	"dispersion",
	"roughness",
	"frost",
	"tint",
	"tintAmount",
	"saturation",
	"brightness",
	"contrast",
	"highlight",
	"specular",
	"shininess",
	"fresnel",
	"fresnelPower",
	"edgeGlow",
	"lightDirection",
	"grain",
	"opacity",
	"pointerStrength",
	"pointerRadius",
	"environment",
	"z",
] as const satisfies readonly (keyof GlassPanelOptions)[];

const OPTION_SET: ReadonlySet<string> = new Set(GLASS_OPTION_KEYS);

export interface SplitGlassProps<P> {
	/** The look, with the caller's overrides merged over it. */
	options: GlassPanelOptions;
	/** Everything that is not an optical setting, to spread onto the element. */
	rest: P;
}

/**
 * Separate optical props from DOM props, then merge the optics over `look`.
 *
 * `mergeDefined` is what makes omission safe: a caller that never mentions
 * `shift` must not end up with an explicit `undefined` that clobbers the
 * look's value.
 */
export function splitGlassProps<P extends GlassPanelOptions & Record<string, unknown>>(
	props: P,
	look: GlassPanelOptions,
): SplitGlassProps<Omit<P, keyof GlassPanelOptions>> {
	const overrides: Record<string, unknown> = {};
	const rest: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(props)) {
		if (OPTION_SET.has(key)) overrides[key] = value;
		else rest[key] = value;
	}

	return {
		options: mergeDefined<GlassPanelOptions, GlassPanelOptions>(
			look,
			overrides as GlassPanelOptions,
		),
		rest: rest as Omit<P, keyof GlassPanelOptions>,
	};
}

/** `ui-lib-<block>` plus the caller's own classes, in that order. */
export function irisClass(block: string, tone: string, className?: string): string {
	const base = `ui-lib-${block} ui-lib-${block}--${tone}`;
	return className ? `${base} ${className}` : base;
}
