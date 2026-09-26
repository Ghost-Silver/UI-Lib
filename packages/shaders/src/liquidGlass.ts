import {
	abs,
	dot,
	float,
	fract,
	length,
	luminance,
	max,
	min,
	mix,
	normalize,
	pow,
	saturate,
	screenUV,
	select,
	sin,
	smoothstep,
	texture,
	uniform,
	uv,
	vec2,
	vec3,
	viewportSharedTexture,
} from "three/tsl";
import {
	Color,
	type ColorRepresentation,
	MeshBasicNodeMaterial,
	type Node,
	type Texture,
	Vector2,
} from "three/webgpu";
import type { ColorUniform, FloatUniform, SharedUniforms, Vec2Uniform } from "./nodeTypes.js";

/** Golden angle — gives an even, low-discrepancy disc sampling pattern. */
const GOLDEN_ANGLE = 2.399963229728653;

export interface LiquidGlassOptions {
	/** Panel size in **device pixels**. */
	size?: [number, number];
	/** Corner radius in device pixels (clamped to half the shorter edge). */
	radius?: number;
	/** Width of the rounded bevel that produces the edge refraction. */
	bevel?: number;
	/** Refraction displacement at the bevel, in device pixels. */
	refraction?: number;
	/** Constant slab displacement applied across the whole surface. */
	shift?: [number, number];
	/** Chromatic dispersion: per-channel scale of the refraction offset. */
	dispersion?: number;
	/** 0 = clear, 1 = fully frosted. Drives both blur radius and dispersion loss. */
	roughness?: number;
	/** Maximum blur radius in device pixels at `roughness = 1`. */
	frost?: number;
	tint?: ColorRepresentation;
	tintAmount?: number;
	saturation?: number;
	brightness?: number;
	contrast?: number;
	/** Colour of specular / fresnel / edge highlights. */
	highlight?: ColorRepresentation;
	specular?: number;
	shininess?: number;
	fresnel?: number;
	fresnelPower?: number;
	/** Thin bright ring hugging the outer border. */
	edgeGlow?: number;
	/** XY direction the key light comes from (Z is fixed at 1). */
	lightDirection?: [number, number];
	/** Film grain, kills banding in large flat gradients. */
	grain?: number;
	opacity?: number;
	/** Blur taps. Set from the quality tier (1 disables blur entirely). */
	blurTaps?: number;
	/** Extra specular near the cursor. */
	pointerStrength?: number;
	/** Radius of the cursor influence in device pixels. */
	pointerRadius?: number;
	/**
	 * Texture the panel refracts. Leave `null` (the default) to refract whatever
	 * the layer already drew this frame via `viewportSharedTexture()` — that is
	 * the mode the glass layer uses, and it costs exactly one framebuffer copy
	 * per frame regardless of how many panels exist.
	 */
	backdrop?: Texture | null;
}

export const LIQUID_GLASS_DEFAULTS: Required<Omit<LiquidGlassOptions, "size" | "backdrop">> & {
	size: [number, number];
	backdrop: Texture | null;
} = {
	size: [100, 100],
	radius: 28,
	bevel: 26,
	refraction: 46,
	shift: [0, 0],
	dispersion: 0.28,
	roughness: 0.24,
	frost: 26,
	tint: "#ffffff",
	tintAmount: 0.06,
	saturation: 1.12,
	brightness: 1.02,
	contrast: 1.04,
	highlight: "#ffffff",
	specular: 0.55,
	shininess: 34,
	fresnel: 0.42,
	fresnelPower: 3.2,
	edgeGlow: 0.5,
	lightDirection: [-0.45, 0.7],
	grain: 0.012,
	opacity: 1,
	blurTaps: 8,
	pointerStrength: 0.35,
	pointerRadius: 320,
	backdrop: null,
};

export interface LiquidGlassUniforms {
	size: Vec2Uniform;
	radius: FloatUniform;
	bevel: FloatUniform;
	refraction: FloatUniform;
	shift: Vec2Uniform;
	dispersion: FloatUniform;
	roughness: FloatUniform;
	frost: FloatUniform;
	tint: ColorUniform;
	tintAmount: FloatUniform;
	saturation: FloatUniform;
	brightness: FloatUniform;
	contrast: FloatUniform;
	highlight: ColorUniform;
	specular: FloatUniform;
	shininess: FloatUniform;
	fresnel: FloatUniform;
	fresnelPower: FloatUniform;
	edgeGlow: FloatUniform;
	lightDirection: Vec2Uniform;
	grain: FloatUniform;
	opacity: FloatUniform;
	pointerStrength: FloatUniform;
	pointerRadius: FloatUniform;
	time: FloatUniform;
	resolution: Vec2Uniform;
	pointer: Vec2Uniform;
}

export interface LiquidGlassMaterial extends MeshBasicNodeMaterial {
	readonly uniforms: LiquidGlassUniforms;
	/**
	 * Point the panel at an explicit texture. No-op in viewport mode, where the
	 * panel refracts the live framebuffer instead.
	 */
	setBackdrop(backdrop: Texture | null): void;
	/** Patch any subset of the options; device-pixel semantics. */
	update(options: Partial<LiquidGlassOptions>): void;
	/** True when the material refracts the live framebuffer (default mode). */
	readonly usesPlaceholderBackdrop: boolean;
}

/**
 * Refraction-capable liquid glass.
 *
 * The look is built entirely from a rounded-rect SDF:
 *
 * 1. the SDF gives an antialiased silhouette **and** a bevel parameter `t`
 *    (0 at the outer rim, 1 on the flat centre);
 * 2. `t` drives a quarter-round surface normal — flat in the middle, curving to
 *    near-vertical at the rim, which is what makes the edge bend light;
 * 3. that normal offsets screen-space UVs to sample the backdrop, with a
 *    per-channel scale for chromatic dispersion;
 * 4. `roughness` cross-fades to a golden-angle disc blur (frosted glass).
 *
 * Written in TSL, so the same graph compiles to WGSL on WebGPU and GLSL on the
 * WebGL 2 fallback with no second implementation.
 */
export function createLiquidGlassMaterial(
	options: LiquidGlassOptions = {},
	shared: SharedUniforms = {},
): LiquidGlassMaterial {
	const opts = { ...LIQUID_GLASS_DEFAULTS, ...options };
	const taps = Math.max(1, Math.round(opts.blurTaps));

	// `null` → refract the live framebuffer (viewportSharedTexture).
	const useViewport = opts.backdrop == null;
	let backdropTexture: Texture | null = opts.backdrop ?? null;

	const uniforms: LiquidGlassUniforms = {
		size: uniform(new Vector2(opts.size[0], opts.size[1])),
		radius: uniform(opts.radius),
		bevel: uniform(opts.bevel),
		refraction: uniform(opts.refraction),
		shift: uniform(new Vector2(opts.shift[0], opts.shift[1])),
		dispersion: uniform(opts.dispersion),
		roughness: uniform(opts.roughness),
		frost: uniform(opts.frost),
		tint: uniform(new Color(opts.tint)),
		tintAmount: uniform(opts.tintAmount),
		saturation: uniform(opts.saturation),
		brightness: uniform(opts.brightness),
		contrast: uniform(opts.contrast),
		highlight: uniform(new Color(opts.highlight)),
		specular: uniform(opts.specular),
		shininess: uniform(opts.shininess),
		fresnel: uniform(opts.fresnel),
		fresnelPower: uniform(opts.fresnelPower),
		edgeGlow: uniform(opts.edgeGlow),
		lightDirection: uniform(new Vector2(opts.lightDirection[0], opts.lightDirection[1])),
		grain: uniform(opts.grain),
		opacity: uniform(opts.opacity),
		pointerStrength: uniform(opts.pointerStrength),
		pointerRadius: uniform(opts.pointerRadius),
		time: shared.time ?? uniform(0),
		resolution: shared.resolution ?? uniform(new Vector2(1, 1)),
		pointer: shared.pointer ?? uniform(new Vector2(-1e5, -1e5)),
	};

	/**
	 * Every tap needs its own texture node (a node carries a single uv), but in
	 * viewport mode they all resolve to one shared framebuffer copy — three
	 * de-duplicates the copy per render call, so N panels still cost one blit.
	 */
	const backdropNodes: { value: Texture }[] = [];
	const sampleBackdrop = (uvNode: Node<"vec2">) => {
		if (useViewport) return viewportSharedTexture(uvNode);
		const node = texture(backdropTexture as Texture, uvNode);
		backdropNodes.push(node as unknown as { value: Texture });
		return node;
	};

	const res = uniforms.resolution;

	/* ------------------------------------------------------- geometry (px) -- */
	const p = uv().sub(0.5).mul(uniforms.size);
	const half = uniforms.size.mul(0.5);
	const inner = half.sub(uniforms.radius);
	const q = abs(p).sub(inner);
	const outer = max(q.x, q.y);
	const dist = length(max(q, vec2(0)))
		.add(min(outer, float(0)))
		.sub(uniforms.radius);

	/* ------------------------------------------------- rounded bevel normal -- */
	// 0 on the rim, 1 once we are `bevel` pixels inside the silhouette.
	const t = saturate(dist.negate().div(max(uniforms.bevel, float(0.001))));
	const theta = t.mul(Math.PI * 0.5);

	// Analytic gradient of the rounded-box SDF: outward direction of the bevel.
	const d2 = max(q, vec2(0));
	const len2 = length(d2);
	const gradient = select(
		len2.greaterThan(0.0001),
		d2.div(max(len2, float(0.0001))),
		select(q.x.greaterThan(q.y), vec2(1, 0), vec2(0, 1)),
	);
	const signX = select(p.x.lessThan(float(0)), float(-1), float(1));
	const signY = select(p.y.lessThan(float(0)), float(-1), float(1));
	const outward = gradient.mul(vec2(signX, signY));

	const normal = normalize(vec3(outward.mul(theta.cos()), theta.sin()));

	/* ---------------------------------------------------------- refraction -- */
	// Frosted glass scatters, so it both blurs and refracts less crisply.
	const refractionScale = mix(float(1), float(0.35), uniforms.roughness);
	const offsetPx = normal.xy.mul(uniforms.refraction).mul(refractionScale).add(uniforms.shift);
	const offsetUv = offsetPx.div(res);
	const baseUv = screenUV;

	const blurRadius = uniforms.roughness.mul(uniforms.frost);

	const sharp = vec3(
		sampleBackdrop(baseUv.add(offsetUv.mul(float(1).add(uniforms.dispersion)))).r,
		sampleBackdrop(baseUv.add(offsetUv)).g,
		sampleBackdrop(baseUv.add(offsetUv.mul(float(1).sub(uniforms.dispersion)))).b,
	);

	let blurred: Node<"vec3"> = vec3(0);
	if (taps === 1) {
		blurred = sampleBackdrop(baseUv.add(offsetUv)).rgb;
	} else {
		for (let i = 0; i < taps; i++) {
			const angle = i * GOLDEN_ANGLE;
			const radius = Math.sqrt((i + 0.5) / taps);
			const dir = vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
			blurred = blurred.add(
				sampleBackdrop(baseUv.add(offsetUv).add(dir.mul(blurRadius).div(res))).rgb,
			);
		}
		blurred = blurred.div(taps);
	}

	let color: Node<"vec3"> = mix(sharp, blurred, saturate(uniforms.roughness));

	/* ------------------------------------------------------------- grading -- */
	const luma = luminance(color);
	color = mix(vec3(luma), color, uniforms.saturation);
	color = color.mul(uniforms.brightness);
	color = mix(vec3(0.5), color, uniforms.contrast);
	color = mix(color, uniforms.tint, uniforms.tintAmount);

	/* --------------------------------------------------------- lighting -- */
	const lightDir = normalize(vec3(uniforms.lightDirection, float(1)));
	const halfVec = normalize(lightDir.add(vec3(0, 0, 1)));
	const specular = pow(saturate(normal.dot(halfVec)), uniforms.shininess).mul(
		uniforms.specular,
	);

	const fresnel = pow(saturate(float(1).sub(normal.z)), uniforms.fresnelPower).mul(
		uniforms.fresnel,
	);

	// Thin ring right at the border — the "polished edge" cue.
	const edge = smoothstep(float(0.62), float(1), float(1).sub(t)).mul(uniforms.edgeGlow);

	// Cursor proximity: a soft specular bloom that follows the pointer.
	const pointerDist = length(screenUV.mul(res).sub(uniforms.pointer));
	const pointerGlow = saturate(
		float(1).sub(pointerDist.div(max(uniforms.pointerRadius, float(1)))),
	)
		.pow(2)
		.mul(uniforms.pointerStrength);

	// Bevel self-shading gives the slab thickness.
	const bevelShade = mix(float(0.78), float(1), t);

	color = color.mul(bevelShade);
	color = color.add(uniforms.highlight.mul(specular.add(fresnel).add(edge).add(pointerGlow)));

	/* -------------------------------------------------------- film grain -- */
	const grainNoise = fract(
		sin(dot(screenUV.mul(res).add(uniforms.time), vec2(12.9898, 78.233))).mul(43758.5453),
	);
	color = color.add(grainNoise.sub(0.5).mul(uniforms.grain));

	/* ------------------------------------------------------------- output -- */
	const shape = smoothstep(float(1), float(-1), dist);
	const alpha = shape.mul(uniforms.opacity);

	const material = new MeshBasicNodeMaterial() as LiquidGlassMaterial;
	material.colorNode = color;
	material.opacityNode = alpha;
	material.transparent = true;
	material.depthWrite = false;
	material.depthTest = false;
	material.toneMapped = false;

	Object.defineProperties(material, {
		uniforms: { value: uniforms, enumerable: true },
		usesPlaceholderBackdrop: { value: useViewport, enumerable: true },
		setBackdrop: {
			value: (next: Texture | null) => {
				if (useViewport || next == null) return;
				backdropTexture = next;
				for (const node of backdropNodes) node.value = next;
			},
			enumerable: false,
		},
		update: {
			value: (patch: Partial<LiquidGlassOptions>) => {
				if (patch.size) uniforms.size.value.set(patch.size[0], patch.size[1]);
				if (patch.radius !== undefined) uniforms.radius.value = patch.radius;
				if (patch.bevel !== undefined) uniforms.bevel.value = patch.bevel;
				if (patch.refraction !== undefined) uniforms.refraction.value = patch.refraction;
				if (patch.shift) uniforms.shift.value.set(patch.shift[0], patch.shift[1]);
				if (patch.dispersion !== undefined) uniforms.dispersion.value = patch.dispersion;
				if (patch.roughness !== undefined) uniforms.roughness.value = patch.roughness;
				if (patch.frost !== undefined) uniforms.frost.value = patch.frost;
				if (patch.tint !== undefined) uniforms.tint.value.set(patch.tint);
				if (patch.tintAmount !== undefined) uniforms.tintAmount.value = patch.tintAmount;
				if (patch.saturation !== undefined) uniforms.saturation.value = patch.saturation;
				if (patch.brightness !== undefined) uniforms.brightness.value = patch.brightness;
				if (patch.contrast !== undefined) uniforms.contrast.value = patch.contrast;
				if (patch.highlight !== undefined) uniforms.highlight.value.set(patch.highlight);
				if (patch.specular !== undefined) uniforms.specular.value = patch.specular;
				if (patch.shininess !== undefined) uniforms.shininess.value = patch.shininess;
				if (patch.fresnel !== undefined) uniforms.fresnel.value = patch.fresnel;
				if (patch.fresnelPower !== undefined) uniforms.fresnelPower.value = patch.fresnelPower;
				if (patch.edgeGlow !== undefined) uniforms.edgeGlow.value = patch.edgeGlow;
				if (patch.lightDirection)
					uniforms.lightDirection.value.set(patch.lightDirection[0], patch.lightDirection[1]);
				if (patch.grain !== undefined) uniforms.grain.value = patch.grain;
				if (patch.opacity !== undefined) uniforms.opacity.value = patch.opacity;
				if (patch.pointerStrength !== undefined)
					uniforms.pointerStrength.value = patch.pointerStrength;
				if (patch.pointerRadius !== undefined)
					uniforms.pointerRadius.value = patch.pointerRadius;
			},
			enumerable: false,
		},
	});

	return material;
}
