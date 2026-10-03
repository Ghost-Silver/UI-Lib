import type { ParticleSystemOptions } from "@ui-lib/particles";

export interface MagicTextParticleOptions {
	text: string;
	/** URL of a BMFont JSON atlas. There is no atlas in this repository. */
	fontUrl: string;
	particleOptions?: ParticleSystemOptions;
	density?: number;
}

/**
 * Not implemented. Throws, deliberately, rather than pretending.
 *
 * The previous body passed `attractorCloud` and `attractorMode: "cloud"` to
 * `magicText`. Neither option exists in `@ui-lib/particles`, and the comment
 * claiming they had been "monkeypatched dynamically" pointed at a monkeypatch
 * that was never written. The call therefore succeeded and produced nothing
 * text-shaped at all — a silent no-op wearing the name of a feature.
 *
 * `attractorCloud` escaped the type checker because it sat behind a spread,
 * and a spread suppresses excess-property checking. `attractorMode` was caught,
 * and the error was silenced with `@ts-expect-error` — the one place a type
 * error was telling the truth.
 *
 * What implementing it would take, so the next attempt starts in the right
 * place: `ParticleEmitterOptions.shape` has no cloud case, and
 * `ParticleForceOptions` attracts every particle to a single point rather than
 * to a per-particle target. Shaping particles to glyphs needs a buffer of
 * points indexed by particle id, plus a WebGL2 path that has no storage
 * buffers. That touches the compute graph on both backends and has to be
 * verified on a real GPU, so it is a change of its own rather than a quiet
 * edit here.
 *
 * Use `magicText` for particles anchored to an element, or the exports of
 * `./layout.js` to build and sample the text geometry yourself.
 */
export async function magicParticleText(
	_element: HTMLElement,
	_options: MagicTextParticleOptions,
): Promise<never> {
	throw new Error(
		"[ui-lib] magicParticleText is not implemented: the particle system has no " +
			"cloud emitter, so nothing here can shape particles to text. It used to " +
			"resolve and do nothing. Use magicText(element, options) for particles " +
			"anchored to an element, or createTextGeometry/sampleTextPoints from " +
			"@ui-lib/dom to build the point cloud yourself.",
	);
}
