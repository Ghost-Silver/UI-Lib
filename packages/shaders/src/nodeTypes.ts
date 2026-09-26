import { uniform } from "three/tsl";
import { Color, Vector2 } from "three/webgpu";

/**
 * Structural types for the TSL uniform nodes we hand around between packages.
 *
 * Declaring them via `typeof` on a probe instance keeps `uniform.value` fully
 * typed (so `uniforms.radius.value = 12` type-checks) without re-implementing
 * three's generic node signatures at every call site.
 */

const _float = uniform(0);
const _vec2 = uniform(new Vector2());
const _color = uniform(new Color());

export type FloatUniform = typeof _float;
export type Vec2Uniform = typeof _vec2;
export type ColorUniform = typeof _color;

/**
 * Uniforms shared by every material in one render layer, so the layer can
 * advance time / resolution / pointer once per frame instead of per material.
 */
export interface SharedUniforms {
	time?: FloatUniform;
	resolution?: Vec2Uniform;
	pointer?: Vec2Uniform;
}
