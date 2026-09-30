import { mergeDefined } from "@ui-lib/core";
import {
	dot,
	equirectUV,
	float,
	max,
	mix,
	normalize,
	normalView,
	oneMinus,
	pow,
	reflectVector,
	saturate,
	screenUV,
	sin,
	texture,
	uniform,
	vec2,
	vec3,
} from "three/tsl";
import {
	Color,
	type ColorRepresentation,
	DataTexture,
	MeshBasicNodeMaterial,
	type Node,
	type Texture,
	Vector2,
} from "three/webgpu";
import type { ColorUniform, FloatUniform, SharedUniforms, Vec2Uniform } from "./nodeTypes.js";
import { pointerSheen } from "./pointerSheen.js";
import { studioEnvironment } from "./studioEnvironment.js";

export interface WorldLensOptions {
	/**
	 * How far the view-space normal pulls the sample toward the centre, in
	 * device pixels. This is a magnifying lens, not a bubble.
	 */
	refraction?: number;
	/** Per-channel scale of the refraction offset. */
	dispersion?: number;
	/** Colour mixed in through the thicker centre. */
	tint?: ColorRepresentation;
	/** How much of `tint` the centre takes on. 0 stays clear. */
	tintAmount?: number;
	/** Fresnel mix toward a reflected sample of the same scene. */
	fresnel?: number;
	fresnelPower?: number;
	/**
	 * Mix of the shared studio probe. `0` keeps only the scene-copy rim.
	 * The probe is dark outside its window, and the value is clamped to 1,
	 * so this cannot lift the clear centre the way a bright cubemap would.
	 */
	environment?: number;
	/**
	 * Replaces the shared studio. Omit it — looks carry the probe, and pages
	 * do not author a cubemap.
	 */
	environmentMap?: Texture | null;
	specular?: number;
	shininess?: number;
	highlight?: ColorRepresentation;
	/** XY key light. Z is fixed at 1. */
	lightDirection?: [number, number];
	/** Soft pool of light at the facing centre. */
	caustic?: number;
	pointerStrength?: number;
	pointerRadius?: number;
	/**
	 * Scene behind the lens. Must be a copy, never the target currently being
	 * drawn — sampling that is the WebGPU read-after-write that blacks the canvas.
	 */
	backdrop?: Texture | null;
}

export const WORLD_LENS_DEFAULTS: Required<
	Omit<WorldLensOptions, "backdrop" | "environmentMap">
> & {
	backdrop: Texture | null;
} = {
	refraction: 36,
	dispersion: 0.14,
	tint: "#d5ebff",
	tintAmount: 0.1,
	fresnel: 0.7,
	fresnelPower: 3.2,
	specular: 0.8,
	shininess: 42,
	highlight: "#fff6e8",
	lightDirection: [-0.35, 0.62],
	caustic: 0.2,
	pointerStrength: 0.4,
	pointerRadius: 280,
	environment: 0.44,
	backdrop: null,
};

export interface WorldLensUniforms {
	refraction: FloatUniform;
	dispersion: FloatUniform;
	tint: ColorUniform;
	tintAmount: FloatUniform;
	fresnel: FloatUniform;
	fresnelPower: FloatUniform;
	specular: FloatUniform;
	shininess: FloatUniform;
	highlight: ColorUniform;
	lightDirection: Vec2Uniform;
	caustic: FloatUniform;
	pointerStrength: FloatUniform;
	pointerRadius: FloatUniform;
	environment: FloatUniform;
	time: FloatUniform;
	resolution: Vec2Uniform;
	pointer: Vec2Uniform;
	pointerVelocity: Vec2Uniform;
}

export interface WorldLensMaterial extends MeshBasicNodeMaterial {
	readonly uniforms: WorldLensUniforms;
	/** The probe currently sampled. The shared studio unless a map was passed. */
	readonly environmentMap: Texture;
	setBackdrop(backdrop: Texture): void;
	update(options: Partial<WorldLensOptions>): void;
}

/**
 * A solid optical lens that magnifies a scene copy.
 *
 * The mesh writes depth, so camera reprojection and masked motion blur can
 * follow it without shifting DOM glass. Colour is the refracted scene copy
 * plus a reflection of one shared studio. The probe is an equirect sampled
 * with `reflectVector`, not another copy of the backdrop. Pages do not pass
 * a cubemap; `environment` only scales the look.
 */
export function createWorldLensMaterial(
	options: WorldLensOptions = {},
	shared: SharedUniforms = {},
): WorldLensMaterial {
	const opts = mergeDefined(WORLD_LENS_DEFAULTS, options);
	let backdropTexture = opts.backdrop ?? new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
	const backdropNodes: { value: Texture }[] = [];
	const sampleBackdrop = (uvNode: Node<"vec2">) => {
		const node = texture(backdropTexture, uvNode);
		backdropNodes.push(node as unknown as { value: Texture });
		return node;
	};
	let environmentTexture = options.environmentMap ?? studioEnvironment();
	const environmentNodes: { value: Texture }[] = [];
	const sampleRoom = (uvNode: Node<"vec2">) => {
		const node = texture(environmentTexture, uvNode);
		environmentNodes.push(node as unknown as { value: Texture });
		return node;
	};

	const uniforms: WorldLensUniforms = {
		refraction: uniform(opts.refraction),
		dispersion: uniform(opts.dispersion),
		tint: uniform(new Color(opts.tint)),
		tintAmount: uniform(opts.tintAmount),
		fresnel: uniform(opts.fresnel),
		fresnelPower: uniform(opts.fresnelPower),
		specular: uniform(opts.specular),
		shininess: uniform(opts.shininess),
		highlight: uniform(new Color(opts.highlight)),
		lightDirection: uniform(new Vector2(opts.lightDirection[0], opts.lightDirection[1])),
		caustic: uniform(opts.caustic),
		pointerStrength: uniform(opts.pointerStrength),
		pointerRadius: uniform(opts.pointerRadius),
		environment: uniform(quietEnvironment(opts.environment)),
		time: shared.time ?? uniform(0),
		resolution: shared.resolution ?? uniform(new Vector2(1, 1)),
		pointer: shared.pointer ?? uniform(new Vector2(-1e5, -1e5)),
		pointerVelocity: shared.pointerVelocity ?? uniform(new Vector2()),
	};

	const normal = normalize(normalView);
	const facing = saturate(normal.z);
	// View Y is up; screenUV Y is down. Outward tilt in pixel space.
	const tilt = vec2(normal.x, normal.y.negate());
	const grazing = pow(oneMinus(facing), uniforms.fresnelPower);
	const fresnel = grazing.mul(uniforms.fresnel);
	const bend = oneMinus(fresnel).mul(uniforms.refraction);
	const resolution = max(uniforms.resolution, vec2(1, 1));
	// Inward sample magnifies. Outward sample is the reflection at the rim.
	const magnify = tilt.negate().mul(bend).div(resolution);
	const reflected = tilt.mul(uniforms.refraction.mul(0.5)).div(resolution);
	const base = screenUV;
	const refracted = vec3(
		sampleBackdrop(base.add(magnify.mul(float(1).add(uniforms.dispersion)))).r,
		sampleBackdrop(base.add(magnify)).g,
		sampleBackdrop(base.add(magnify.mul(float(1).sub(uniforms.dispersion)))).b,
	);
	const reflection = sampleBackdrop(base.add(reflected)).rgb;
	// A little of the page remains in the rim. The room owns the rest, so the
	// old outward backdrop smear does not stack on the window.
	const sceneReflect = saturate(fresnel).mul(oneMinus(saturate(uniforms.environment.mul(1.1))));
	const roomUv = equirectUV(reflectVector);
	const fringe = uniforms.dispersion.mul(0.04);
	const room = vec3(
		sampleRoom(roomUv.add(vec2(fringe, float(0)))).r,
		sampleRoom(roomUv).g,
		sampleRoom(roomUv.sub(vec2(fringe, float(0)))).b,
	);
	// The probe is dark except the pane, so the facing weight can show that
	// window without milking the centre you look through.
	const roomWeight = uniforms.environment.mul(mix(float(0.84), float(1), grazing));
	let color: Node<"vec3"> = mix(refracted, reflection, sceneReflect);
	color = mix(color, color.mul(uniforms.tint), facing.mul(uniforms.tintAmount));
	color = color.mul(mix(float(0.86), float(1), facing));
	color = color.add(room.mul(roomWeight));

	const light = normalize(vec3(uniforms.lightDirection, float(1)));
	const specular = pow(saturate(dot(normal, light)), uniforms.shininess).mul(uniforms.specular);
	const breathe = sin(uniforms.time.mul(0.65)).mul(0.5).add(0.5);
	const caustic = pow(facing, float(7)).mul(uniforms.caustic).mul(breathe.mul(0.4).add(0.6));
	const pointerGlow = pointerSheen(
		screenUV,
		resolution,
		uniforms.pointer,
		uniforms.pointerVelocity,
		uniforms.pointerRadius,
		uniforms.pointerStrength,
	);
	color = color.add(uniforms.highlight.mul(specular.add(caustic).add(pointerGlow)));

	const material = new MeshBasicNodeMaterial() as WorldLensMaterial;
	material.colorNode = color;
	material.transparent = false;
	material.depthWrite = true;
	material.depthTest = true;
	material.toneMapped = false;
	material.name = "ui-lib:world-lens";

	Object.defineProperties(material, {
		uniforms: { value: uniforms, enumerable: true },
		environmentMap: {
			get: () => environmentTexture,
			enumerable: true,
		},
		setBackdrop: {
			value: (next: Texture) => {
				backdropTexture = next;
				for (const node of backdropNodes) node.value = next;
			},
			enumerable: false,
		},
		update: {
			value: (patch: Partial<WorldLensOptions>) => {
				if (patch.refraction !== undefined) uniforms.refraction.value = patch.refraction;
				if (patch.dispersion !== undefined) uniforms.dispersion.value = patch.dispersion;
				if (patch.tint !== undefined) uniforms.tint.value.set(patch.tint);
				if (patch.tintAmount !== undefined) uniforms.tintAmount.value = patch.tintAmount;
				if (patch.fresnel !== undefined) uniforms.fresnel.value = patch.fresnel;
				if (patch.fresnelPower !== undefined) uniforms.fresnelPower.value = patch.fresnelPower;
				if (patch.specular !== undefined) uniforms.specular.value = patch.specular;
				if (patch.shininess !== undefined) uniforms.shininess.value = patch.shininess;
				if (patch.highlight !== undefined) uniforms.highlight.value.set(patch.highlight);
				if (patch.lightDirection) {
					uniforms.lightDirection.value.set(patch.lightDirection[0], patch.lightDirection[1]);
				}
				if (patch.caustic !== undefined) uniforms.caustic.value = patch.caustic;
				if (patch.pointerStrength !== undefined) {
					uniforms.pointerStrength.value = patch.pointerStrength;
				}
				if (patch.pointerRadius !== undefined)
					uniforms.pointerRadius.value = patch.pointerRadius;
				if (patch.environment !== undefined) {
					uniforms.environment.value = quietEnvironment(patch.environment);
				}
				if (patch.environmentMap !== undefined) {
					environmentTexture = patch.environmentMap ?? studioEnvironment();
					for (const node of environmentNodes) node.value = environmentTexture;
				}
				if (patch.backdrop) material.setBackdrop(patch.backdrop);
			},
			enumerable: false,
		},
	});

	return material;
}

/** Strength is a mix, not a gain. Above 1 would punch through the probe cap. */
function quietEnvironment(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}
