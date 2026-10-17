import { float, mix, uv } from "three/tsl";
import {
	Color,
	type ColorRepresentation,
	DoubleSide,
	MeshBasicNodeMaterial,
	type Texture,
} from "three/webgpu";
import { evaluateMSDF } from "./msdf.js";

/**
 * Source of a signed-distance-field glyph atlas.
 *
 * `scripts/build-font-atlas.mjs` writes both halves: a PNG and a JSON carrying
 * `common.scaleW` plus `distanceField.distanceRange`.
 */
export interface TextAtlas {
	texture: Texture;
	/** Atlas width in texels. `common.scaleW` in the BMFont JSON. */
	scaleW: number;
	/** Texels the 0..1 field spans either side of the edge. */
	distanceRange: number;
}

export interface TextMaterialOptions {
	atlas: TextAtlas;
	color?: ColorRepresentation;
	/** Colour of the soft outermost band. Defaults to `color`. */
	glowColor?: ColorRepresentation;
	/** Overall alpha. */
	opacity?: number;
	/**
	 * Overrides the derived anti-aliasing width. Leave it out.
	 *
	 * The derivation, because the name does not explain itself and a wrong value
	 * is not an error — it is quietly blurry text. The atlas stores
	 * `0.5 - d / (2 * range)` where `d` is the signed distance in texels, so
	 * `sigDist` changes by `1 / (2 * range)` per texel. Texels per screen pixel
	 * is `fwidth(uv) * scaleW`. `evaluateMSDF` multiplies `fwidth(uv)` by
	 * `pxRange`, so the two agree exactly when:
	 *
	 *     pxRange = scaleW / (2 * distanceRange)
	 *
	 * For the shipped atlas that is `696 / 8 = 87`. Passing the raw
	 * `distanceRange` (4) instead is the intuitive mistake and gives text about
	 * four times too soft.
	 */
	pxRange?: number;
}

/**
 * A material that draws SDF glyph geometry.
 *
 * Pair it with `createTextGeometry` from `@ui-lib/dom`, which lays the quads
 * out and writes the atlas UVs this samples. The mesh goes into the world
 * through `GlassLayer.addWorldObject`, so it shares the page's one canvas,
 * renderer and scheduler and can be refracted by DOM glass in front of it.
 */
export function createTextMaterial(options: TextMaterialOptions): MeshBasicNodeMaterial {
	const { atlas } = options;
	const pxRange = options.pxRange ?? atlas.scaleW / (2 * atlas.distanceRange);
	const color = new Color(options.color ?? "#33224f");
	const glow = new Color(options.glowColor ?? options.color ?? "#33224f");
	const opacity = options.opacity ?? 1;

	const alpha = evaluateMSDF(atlas.texture, uv(), float(pxRange));

	const material = new MeshBasicNodeMaterial({
		transparent: true,
		// SDF glyphs overlap at their padded edges; writing depth would let the
		// padding of one quad clip the stroke of the next.
		depthWrite: false,
		// `createTextGeometry` winds its quads top-left -> top-right ->
		// bottom-right, which is clockwise seen from +Z and therefore a back
		// face under three's default. Front-side only culled every glyph, and
		// nothing reported it: the mesh existed, was in the scene, and simply
		// was not drawn. Text is a sheet, so draw both sides.
		side: DoubleSide,
	});

	// Colour and coverage are separate on purpose. Multiplying the colour by
	// alpha here as well would apply it twice — once in the shader and once in
	// three's `srcAlpha` blend — which squares the coverage. Near alpha 1 that
	// is invisible; across an SDF's soft edge it drains the glyph to a wash.
	material.colorNode = mix(glow, color, alpha);
	material.opacityNode = alpha.mul(opacity);
	return material;
}

/** The anti-aliasing width `createTextMaterial` derives, exposed for tests. */
export function textPxRange(atlas: Pick<TextAtlas, "scaleW" | "distanceRange">): number {
	return atlas.scaleW / (2 * atlas.distanceRange);
}
