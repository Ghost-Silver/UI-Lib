import { Color, MeshBasicNodeMaterial, Vector2, type ColorRepresentation } from "three/webgpu";
import { dot, float, fract, length, mix, sin, uniform, uv, vec2, vec3 } from "three/tsl";
import type { ColorUniform, FloatUniform, SharedUniforms } from "./nodeTypes.js";

export interface GradientBackdropOptions {
	/** Four blob colours, blended by proximity. */
	colors?: [ColorRepresentation, ColorRepresentation, ColorRepresentation, ColorRepresentation];
	/** Base colour showing through where blob influence is low. */
	background?: ColorRepresentation;
	/** Animation speed. `0` freezes the field (the layer can then skip redraws). */
	speed?: number;
	/** Blob field scale; larger = tighter blobs. */
	scale?: number;
	/** Dither/grain amount, kills banding on 8-bit displays. */
	grain?: number;
	/** Corner darkening, 0–1. */
	vignette?: number;
	/** Overall brightness multiplier. */
	intensity?: number;
	/** Viewport aspect ratio (width / height). */
	aspect?: number;
}

export const GRADIENT_BACKDROP_DEFAULTS: Required<GradientBackdropOptions> = {
	colors: ["#1b2f6b", "#7b2ff7", "#f107a3", "#00d4ff"],
	background: "#05060c",
	speed: 0.25,
	scale: 1.35,
	grain: 0.015,
	vignette: 0.55,
	intensity: 1,
	aspect: 1,
};

export interface GradientBackdropMaterial extends MeshBasicNodeMaterial {
	readonly uniforms: {
		time: FloatUniform;
		aspect: FloatUniform;
		scale: FloatUniform;
		grain: FloatUniform;
		vignette: FloatUniform;
		intensity: FloatUniform;
		speed: FloatUniform;
		background: ColorUniform;
		color0: ColorUniform;
		color1: ColorUniform;
		color2: ColorUniform;
		color3: ColorUniform;
		resolution: Vec2Like;
	};
	update(options: Partial<GradientBackdropOptions>): void;
}

type Vec2Like = { value: Vector2 };

/**
 * Animated mesh-gradient backdrop.
 *
 * Four inverse-square-falloff blobs drifting on Lissajous paths, blended by
 * weight, then vignetted and dithered. It runs as a single full-screen triangle
 * pair and is cheap enough to render twice per frame (once into the refraction
 * render target, once to the screen).
 */
export function createGradientBackdropMaterial(
	options: GradientBackdropOptions = {},
	shared: SharedUniforms = {},
): GradientBackdropMaterial {
	const opts = { ...GRADIENT_BACKDROP_DEFAULTS, ...options };

	const uniforms = {
		time: shared.time ?? uniform(0),
		aspect: uniform(opts.aspect),
		scale: uniform(opts.scale),
		grain: uniform(opts.grain),
		vignette: uniform(opts.vignette),
		intensity: uniform(opts.intensity),
		speed: uniform(opts.speed),
		background: uniform(new Color(opts.background)),
		color0: uniform(new Color(opts.colors[0])),
		color1: uniform(new Color(opts.colors[1])),
		color2: uniform(new Color(opts.colors[2])),
		color3: uniform(new Color(opts.colors[3])),
		resolution: shared.resolution ?? uniform(new Vector2(1, 1)),
	};

	const t = uniforms.time.mul(uniforms.speed);

	// Normalised, aspect-corrected coordinates centred on 0.
	const coords = uv().sub(0.5).mul(vec2(uniforms.aspect, 1)).mul(uniforms.scale);

	const blob = (cx: number, cy: number, sx: number, sy: number, phase: number, falloff: number) => {
		const center = vec2(sin(t.mul(sx).add(phase)).mul(cx), sin(t.mul(sy).add(phase * 1.7)).mul(cy));
		const d = length(coords.sub(center));
		return float(1).div(float(1).add(falloff * 1).mul(d.mul(d)));
	};

	const w0 = blob(0.62, 0.48, 0.9, 0.7, 0.0, 7);
	const w1 = blob(0.55, 0.62, 0.6, 1.1, 2.1, 8);
	const w2 = blob(0.7, 0.5, 1.3, 0.8, 4.2, 9);
	const w3 = blob(0.45, 0.7, 0.75, 1.4, 5.6, 6);
	const total = w0.add(w1).add(w2).add(w3).add(0.0001);

	let color = vec3(0)
		.add(uniforms.color0.mul(w0))
		.add(uniforms.color1.mul(w1))
		.add(uniforms.color2.mul(w2))
		.add(uniforms.color3.mul(w3))
		.div(total);

	// Keep a little of the base colour so dark areas never go pure black.
	color = mix(uniforms.background, color, 0.88);

	// Soft diagonal sheen.
	const sheen = float(0.5).add(sin(coords.x.mul(1.2).add(coords.y.mul(0.8)).add(t)).mul(0.06));
	color = color.mul(sheen);

	// Vignette.
	const vig = length(uv().sub(0.5)).mul(1.35);
	color = color.mul(float(1).sub(uniforms.vignette.mul(vig.mul(vig))));
	color = color.mul(uniforms.intensity);

	// Dither: 8-bit output of a smooth gradient bands badly otherwise.
	const grain = fract(
		sin(dot(uv().mul(uniforms.resolution).add(uniforms.time), vec2(12.9898, 78.233))).mul(
			43758.5453,
		),
	);
	color = color.add(grain.sub(0.5).mul(uniforms.grain));

	const material = new MeshBasicNodeMaterial() as GradientBackdropMaterial;
	material.colorNode = color;
	material.depthTest = false;
	material.depthWrite = false;
	material.toneMapped = false;

	Object.defineProperties(material, {
		uniforms: { value: uniforms, enumerable: true },
		update: {
			value: (patch: Partial<GradientBackdropOptions>) => {
				if (patch.colors) {
					uniforms.color0.value.set(patch.colors[0]);
					uniforms.color1.value.set(patch.colors[1]);
					uniforms.color2.value.set(patch.colors[2]);
					uniforms.color3.value.set(patch.colors[3]);
				}
				if (patch.background !== undefined) uniforms.background.value.set(patch.background);
				if (patch.speed !== undefined) uniforms.speed.value = patch.speed;
				if (patch.scale !== undefined) uniforms.scale.value = patch.scale;
				if (patch.grain !== undefined) uniforms.grain.value = patch.grain;
				if (patch.vignette !== undefined) uniforms.vignette.value = patch.vignette;
				if (patch.intensity !== undefined) uniforms.intensity.value = patch.intensity;
				if (patch.aspect !== undefined) uniforms.aspect.value = patch.aspect;
			},
			enumerable: false,
		},
	});

	return material;
}
