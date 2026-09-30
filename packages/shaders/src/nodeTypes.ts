import { uniform } from "three/tsl";
import { Color, Vector2, Vector3 } from "three/webgpu";

/**
 * Structural types for the TSL uniform nodes we hand around between packages.
 *
 * Declaring them via `typeof` on a probe instance keeps `uniform.value` fully
 * typed (so `uniforms.radius.value = 12` type-checks) without re-implementing
 * three's generic node signatures at every call site.
 */

const _float = uniform(0);
const _vec2 = uniform(new Vector2());
const _vec3 = uniform(new Vector3());
const _color = uniform(new Color());

export type FloatUniform = typeof _float;
export type Vec2Uniform = typeof _vec2;
export type Vec3Uniform = typeof _vec3;
export type ColorUniform = typeof _color;

/**
 * Uniforms shared by every material in one render layer, so the layer can
 * advance time / resolution / pointer once per frame instead of per material.
 */
export interface SharedUniforms {
	time?: FloatUniform;
	resolution?: Vec2Uniform;
	pointer?: Vec2Uniform;
	/** Buffer pixels per second. Zero leaves the highlight circular. */
	pointerVelocity?: Vec2Uniform;
	/**
	 * Perspective-camera basis. DOM glass is drawn with an ortho camera, so it
	 * cannot read `cameraWorldMatrix` and still share the lens's room.
	 * `cameraBack` is the camera's +Z axis, toward the viewer.
	 */
	cameraRight?: Vec3Uniform;
	cameraUp?: Vec3Uniform;
	cameraBack?: Vec3Uniform;
	cameraFov?: FloatUniform;
}
