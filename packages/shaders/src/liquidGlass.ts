import { mergeDefined } from "@ui-lib/core";
import {
	abs,
	cos,
	dot,
	equirectUV,
	float,
	fract,
	length,
	luminance,
	max,
	min,
	mix,
	normalize,
	oneMinus,
	pow,
	radians,
	reflect,
	saturate,
	screenUV,
	select,
	sin,
	smoothstep,
	tan,
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
	Vector3,
} from "three/webgpu";
import type {
	ColorUniform,
	FloatUniform,
	SharedUniforms,
	Vec2Uniform,
	Vec3Uniform,
} from "./nodeTypes.js";
import { pointerSheen } from "./pointerSheen.js";
import { studioEnvironment } from "./studioEnvironment.js";

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
	 * Mix of the shared studio probe. The face stays nearly clear so type
	 * remains readable; the bevel carries the window. `0` keeps only the
	 * white rim. Clamped to 1 — this is a mix, not a gain.
	 */
	environment?: number;
	/**
	 * Replaces the shared studio. Omit it. Looks carry the probe, and pages
	 * do not author a cubemap.
	 */
	environmentMap?: Texture | null;
	/**
	 * Texture the panel refracts. Leave `null` (the default) to refract whatever
	 * the layer already drew this frame via `viewportSharedTexture()` — that is
	 * the mode the glass layer uses, and it costs exactly one framebuffer copy
	 * per frame regardless of how many panels exist.
	 */
	backdrop?: Texture | null;
}

export const LIQUID_GLASS_DEFAULTS: Required<
	Omit<LiquidGlassOptions, "size" | "backdrop" | "environmentMap">
> & {
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
	tintAmount: 0.02,
	saturation: 1.16,
	brightness: 1.05,
	contrast: 1.02,
	highlight: "#ffffff",
	specular: 0.85,
	shininess: 38,
	fresnel: 0.55,
	fresnelPower: 2.8,
	edgeGlow: 0.65,
	lightDirection: [-0.45, 0.7],
	grain: 0.012,
	opacity: 1,
	blurTaps: 8,
	pointerStrength: 0.35,
	pointerRadius: 320,
	environment: 0.28,
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
	environment: FloatUniform;
	cameraRight: Vec3Uniform;
	cameraUp: Vec3Uniform;
	cameraBack: Vec3Uniform;
	cameraFov: FloatUniform;
	time: FloatUniform;
	resolution: Vec2Uniform;
	pointer: Vec2Uniform;
	pointerVelocity: Vec2Uniform;
}

export interface LiquidGlassMaterial extends MeshBasicNodeMaterial {
	readonly uniforms: LiquidGlassUniforms;
	/** The probe currently sampled. The shared studio unless a map was passed. */
	readonly environmentMap: Texture;
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
 * 5. the same normal reflects the shared studio. DOM glass is drawn with an
 *    ortho camera, so the ray uses the perspective basis from the layer.
 *
 * Written in TSL, so the same graph compiles to WGSL on WebGPU and GLSL on the
 * WebGL 2 fallback with no second implementation.
 */
export function createLiquidGlassMaterial(
	options: LiquidGlassOptions = {},
	shared: SharedUniforms = {},
): LiquidGlassMaterial {
	const opts = mergeDefined(LIQUID_GLASS_DEFAULTS, options);
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
		environment: uniform(quietEnvironment(opts.environment)),
		cameraRight: shared.cameraRight ?? uniform(new Vector3(1, 0, 0)),
		cameraUp: shared.cameraUp ?? uniform(new Vector3(0, 1, 0)),
		cameraBack: shared.cameraBack ?? uniform(new Vector3(0, 0, 1)),
		cameraFov: shared.cameraFov ?? uniform(52),
		time: shared.time ?? uniform(0),
		resolution: shared.resolution ?? uniform(new Vector2(1, 1)),
		pointer: shared.pointer ?? uniform(new Vector2(-1e5, -1e5)),
		pointerVelocity: shared.pointerVelocity ?? uniform(new Vector2()),
	};

	/**
	 * Every tap needs its own texture node (a node carries a single uv), but in
	 * viewport mode they all resolve to one shared framebuffer copy — three
	 * de-duplicates the copy per render call, so N panels still cost one blit.
	 */
	const backdropNodes: { value: Texture }[] = [];
	const sampleBackdrop = (uvNode: Node<"vec2">) => {
		if (useViewport) return viewportSharedTexture(uvNode);
		// `screenUV` runs top-down; `backdropRT` is stored bottom-up. Flipping
		// here rather than at `baseUv` keeps the refraction offset in the same
		// space it was authored in, so the lens still bends the same way.
		const node = texture(backdropTexture as Texture, vec2(uvNode.x, oneMinus(uvNode.y)));
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

	/* ----------------- continuous curvature 400m stadium capsule profile -- */
	// Inward distance from the silhouette border in pixels.
	const inwardDist = max(dist.negate(), float(0));
	// Clamp bevel span to stay safely within corner radius so the bevel never crosses
	// into the interior Voronoi seam, guaranteeing a seamless continuous capsule profile.
	const maxBevel = min(uniforms.radius.mul(0.75), min(half.x, half.y).mul(0.4));
	const bevelSpan = min(max(uniforms.bevel, float(0.001)), max(maxBevel, float(1.0)));

	// Normalized profile coordinate: 0 at outer rim equator, 1 at interior flat.
	const u = saturate(inwardDist.div(bevelSpan));
	// Inverse coordinate: 1 at outer rim equator, 0 at interior flat.
	const k = oneMinus(u);

	// Quintic polynomial profile for the continuous 400m stadium capsule.
	// C2 continuity: S(0) = 0, S'(0) = 0, S''(0) = 0, completely eliminating
	// the inner facet line / crease ("无棱的双面扁平操场胶囊").
	const k2 = k.mul(k);
	const k3 = k2.mul(k);
	const smoothK = k3.mul(k.mul(k.mul(6).sub(15)).add(10));

	// Continuous rounding angle: tilts from ~87 deg at capsule equator to 0 deg at center.
	const thetaMax = float(Math.PI * 0.485);
	const theta = smoothK.mul(thetaMax);
	const sinTheta = sin(theta);
	const cosTheta = cos(theta);

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

	// Front surface normal: smoothly tilts along capsule profile, seamlessly flat at center.
	const normal = normalize(vec3(outward.mul(sinTheta), cosTheta));

	// Panel UV y is up. screenUV y is down.
	// Incident perspective ray from camera through screen pixel:
	const ndc = vec2(screenUV.x.mul(2).sub(1), oneMinus(screenUV.y).mul(2).sub(1));
	const tanHalf = tan(radians(uniforms.cameraFov).mul(0.5));
	const aspect = uniforms.resolution.x.div(max(uniforms.resolution.y, float(1)));
	const incident = normalize(
		vec3(ndc.x.mul(tanHalf).mul(aspect), ndc.y.mul(tanHalf), float(-1)),
	);

	/* ---------------------- dual-surface volumetric refraction & dispersion -- */
	// Multi-wavelength dual-surface ray refraction through the flat stadium capsule:
	// Ray enters the front curved/flat surface, traverses the slab thickness, and refracts
	// through the symmetrical back surface with Cauchy chromatic dispersion.
	const refractionScale = mix(float(1), float(0.35), uniforms.roughness);
	const baseScale = uniforms.refraction.mul(refractionScale);
	const baseUv = screenUV;

	// In a double-convex stadium capsule, both front and back surfaces curve inward:
	// The deflection angle combines front entry and back exit refraction:
	// At the flat center (smoothK = 0): front & back are parallel, lens deflection is exactly 0.
	// At the curved rim (smoothK > 0): front & back produce smooth liquid lens magnification.
	const lensDeflection = outward.mul(sinTheta.mul(float(1).add(cosTheta.mul(0.5))));
	// Thickness parallax shift across the slab (tapers to 0 at capsule equator):
	const internalShift = incident.xy.mul(oneMinus(smoothK)).mul(0.18);
	const netDisplacement = lensDeflection.add(internalShift);

	const dispScale = uniforms.dispersion.mul(0.35);
	const offsetPxR = netDisplacement
		.mul(baseScale.mul(float(1).add(dispScale)))
		.add(uniforms.shift);
	const offsetPxG = netDisplacement.mul(baseScale).add(uniforms.shift);
	const offsetPxB = netDisplacement
		.mul(baseScale.mul(float(1).sub(dispScale)))
		.add(uniforms.shift);

	const offsetUvR = offsetPxR.div(res);
	const offsetUvG = offsetPxG.div(res);
	const offsetUvB = offsetPxB.div(res);

	const blurRadius = uniforms.roughness.mul(uniforms.frost);

	const sharp = vec3(
		sampleBackdrop(baseUv.add(offsetUvR)).r,
		sampleBackdrop(baseUv.add(offsetUvG)).g,
		sampleBackdrop(baseUv.add(offsetUvB)).b,
	);

	let blurred: Node<"vec3"> = vec3(0);
	if (taps === 1) {
		blurred = sampleBackdrop(baseUv.add(offsetUvG)).rgb;
	} else {
		for (let i = 0; i < taps; i++) {
			const angle = i * GOLDEN_ANGLE;
			const radius = Math.sqrt((i + 0.5) / taps);
			const dir = vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
			blurred = blurred.add(
				sampleBackdrop(baseUv.add(offsetUvG).add(dir.mul(blurRadius).div(res))).rgb,
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

	// Multiplicative transmission filtering (Beer-Lambert optical absorption):
	// Pure white tint (#ffffff) leaves transmission 100% crystal clear with zero milky fog.
	// Colored tints filter passing wavelengths naturally without lifting dark black levels.
	const transmissionFilter = mix(vec3(1), uniforms.tint, uniforms.tintAmount);
	color = color.mul(transmissionFilter);

	// Diffuse surface backscattering only if roughness > 0 and frost > 0 (frosted glass mode):
	const diffuseScatter = uniforms.tint.mul(
		uniforms.tintAmount.mul(saturate(uniforms.roughness.mul(uniforms.frost.div(30)))),
	);
	color = color.add(diffuseScatter);

	/* --------------------------------------------------------- lighting -- */
	const lightDir = normalize(vec3(uniforms.lightDirection, float(1)));
	const halfVec = normalize(lightDir.add(vec3(0, 0, 1)));
	const light2d = normalize(uniforms.lightDirection);

	// Light alignment in 2D along the capsule outward normal:
	// Peak facing (+1) at the upper-left crest, neutral (0) on orthogonal sides.
	const lightFacing = saturate(dot(outward, light2d));
	const topFacing = saturate(outward.y);
	const crestAlignment = max(lightFacing, topFacing.mul(0.85));

	// Dual-lobe directional specular:
	// 1. Sharp pinpoint glint at the specular crest:
	const sharpDot = saturate(normal.dot(halfVec));
	const sharpSpec = pow(sharpDot, uniforms.shininess.mul(2.0)).mul(uniforms.specular.mul(1.4));
	// 2. Silky liquid luster extending along the illuminated bevel curve:
	const broadSpec = pow(sharpDot, uniforms.shininess.mul(0.4)).mul(uniforms.specular.mul(0.42));
	const specular = sharpSpec.add(broadSpec);

	// Directional meniscus crest sheen along the upper rounded edge (Apple visionOS lip):
	// Cylindrical bevel lens catches overhead/key light smoothly along the upper stadium perimeter:
	const meniscusSheen = pow(crestAlignment, float(1.8))
		.mul(sinTheta)
		.mul(smoothstep(float(0.12), float(0.92), smoothK))
		.mul(uniforms.specular.mul(0.85));

	// Physical Fresnel with directional key light enhancement:
	const grazing = pow(saturate(float(1).sub(normal.z)), uniforms.fresnelPower);
	const env = saturate(uniforms.environment);
	const directionalFresnel = grazing
		.mul(uniforms.fresnel)
		.mul(0.68)
		.mul(mix(float(0.12), float(1.3), crestAlignment))
		.mul(oneMinus(env.mul(0.6)));

	// Total Internal Reflection (TIR) caustic light concentration near the meniscus equator:
	const causticRim = pow(sinTheta, float(3.4))
		.mul(smoothstep(float(0.7), float(0.98), smoothK))
		.mul(uniforms.fresnel.mul(0.72))
		.mul(mix(float(0.1), float(1.25), crestAlignment));

	// Polished outer equator edge glint (crisp subpixel gleam, directionally weighted):
	const edge = smoothstep(float(0.91), float(0.998), smoothK)
		.mul(uniforms.edgeGlow.mul(0.85))
		.mul(mix(float(0.12), float(1.35), crestAlignment));

	// Subtle ambient counter-rim bounce along the bottom edge:
	const counterRim = pow(saturate(outward.y.negate()), float(3.5))
		.mul(sinTheta)
		.mul(smoothstep(float(0.35), float(0.96), smoothK))
		.mul(uniforms.specular.mul(0.1));

	const reflected = reflect(incident, normal);
	const roomDir = uniforms.cameraRight
		.mul(reflected.x)
		.add(uniforms.cameraUp.mul(reflected.y))
		.add(uniforms.cameraBack.mul(reflected.z));
	const softened = normalize(mix(roomDir, uniforms.cameraBack, uniforms.roughness.mul(0.35)));
	const roomUv = equirectUV(softened);
	const fringe = uniforms.dispersion.mul(0.03);
	const room = vec3(
		sampleRoom(roomUv.add(vec2(fringe, float(0)))).r,
		sampleRoom(roomUv).g,
		sampleRoom(roomUv.sub(vec2(fringe, float(0)))).b,
	);
	const roomWeight = env.mul(mix(float(0.4), float(1), grazing));

	// Pointer sheen:
	const pointerGlow = pointerSheen(
		screenUV,
		res,
		uniforms.pointer,
		uniforms.pointerVelocity,
		uniforms.pointerRadius,
		uniforms.pointerStrength,
	);

	// Subtle volumetric absorption depth at the extreme outer rim (no dark center!):
	const edgeAbsorption = mix(float(0.96), float(1), oneMinus(smoothK.mul(smoothK).mul(0.08)));
	color = color.mul(edgeAbsorption);

	// Total highlights:
	const totalHighlight = specular
		.add(meniscusSheen)
		.add(causticRim)
		.add(directionalFresnel)
		.add(edge)
		.add(counterRim)
		.add(pointerGlow);

	color = color.add(uniforms.highlight.mul(totalHighlight));
	color = color.add(room.mul(roomWeight));

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
		environmentMap: {
			get: () => environmentTexture,
			enumerable: true,
		},
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
				if (patch.environment !== undefined) {
					uniforms.environment.value = quietEnvironment(patch.environment);
				}
				if (patch.environmentMap !== undefined) {
					environmentTexture = patch.environmentMap ?? studioEnvironment();
					for (const node of environmentNodes) node.value = environmentTexture;
				}
			},
			enumerable: false,
		},
	});

	return material;
}

/** Strength is a mix. Above 1 would punch through the probe cap. */
function quietEnvironment(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}
