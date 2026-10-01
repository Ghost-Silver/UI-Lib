import { mergeDefined } from "@ui-lib/core";
import {
	abs,
	dot,
	float,
	fract,
	luminance,
	max,
	min,
	mix,
	oneMinus,
	perspectiveDepthToViewZ,
	pow,
	saturate,
	screenUV,
	sin,
	smoothstep,
	texture,
	uniform,
	vec2,
	vec3,
	vec4,
	viewportDepthTexture,
	viewportTexture,
	viewZToOrthographicDepth,
} from "three/tsl";
import {
	DepthTexture,
	FramebufferTexture,
	Matrix4,
	type Node,
	RenderTarget,
	SRGBColorSpace,
	type Texture,
	Vector2,
	type WebGPURenderer,
} from "three/webgpu";
import {
	alignDepthHistory,
	assertDepthHistoryFormats,
	depthHistoryCompatible,
	framebufferCopyWouldFail,
	readGpuTextureFormat,
} from "./depthCopy.js";

export interface PostProcessingOptions {
	enabled?: boolean;
	/** Bright-pass bloom strength. 0 disables bloom without rebuilding the graph. */
	bloomStrength?: number;
	/** Bright-pass cutoff in the current working colour space. */
	bloomThreshold?: number;
	/** Softness around the bloom cutoff. */
	bloomKnee?: number;
	/** Blur radius in device pixels. */
	bloomRadius?: number;
	/** Wide, low-frequency halo around the bright pass. */
	haloStrength?: number;
	/** Horizontal/diagonal lens streak strength. */
	flareStrength?: number;
	/** Per-channel screen-space shift in device pixels. */
	chromaticAberration?: number;
	/** Direction of chromatic separation in screen space. */
	chromaticDirection?: [number, number];
	/** Animated monochrome grain amount. */
	grain?: number;
	/** Edge darkening amount. */
	vignette?: number;
	/** Exposure multiplier in stops. */
	exposure?: number;
	/**
	 * Reinhard roll-off of channels above 1, in [0, 1]. 0 leaves the image
	 * linear. Midtones are not touched — this is how a bright optic stays an
	 * optic instead of clipping to white.
	 */
	shoulder?: number;
	/** Mid-tone contrast multiplier. */
	contrast?: number;
	/** Colour intensity around luminance 1. */
	saturation?: number;
	/** Previous-frame feedback in [0, 1]. TAA defaults high and rejects history reactively. */
	temporalBlend?: number;
	/** Reactive history rejection for high-contrast changes. 0 disables it. */
	temporalReactive?: number;
	/** Maximum linear colour excursion allowed when clamping history. */
	temporalClamp?: number;
	/** Screen-space world velocity in device pixels, supplied by the shared layer. */
	worldVelocity?: [number, number];
	/**
	 * Scale and aim `motionBlur` from the camera's screen velocity, and apply
	 * it only to world-depth fragments. DOM glass stays sharp.
	 */
	cameraMotionBlur?: boolean;
	/**
	 * Perspective depth of the offscreen world target. When omitted, the graph
	 * samples the canvas depth attachment instead.
	 */
	depthTexture?: Texture | null;
	/** Normalised linear depth at the focus plane. */
	focusDepth?: number;
	/** Screen-space focus blur radius in device pixels. 0 disables the DOF approximation. */
	focusBlur?: number;
	/** Radius around this UV point that stays in focus. */
	focusPoint?: [number, number];
	/** Directional screen-space blur in device pixels. 0 disables motion blur. */
	motionBlur?: number;
	/** Compile-time post tap budget. 1 = low, 2 = balanced, 3 = cinematic. */
	quality?: 1 | 2 | 3;
	/** Motion vector direction in screen space. */
	motionDirection?: [number, number];
}

export const POST_DEFAULTS: Required<PostProcessingOptions> = {
	enabled: true,
	bloomStrength: 0.28,
	bloomThreshold: 0.72,
	bloomKnee: 0.18,
	bloomRadius: 6,
	haloStrength: 0.14,
	flareStrength: 0.1,
	chromaticAberration: 0.35,
	chromaticDirection: [1, 0.38],
	grain: 0.018,
	vignette: 0.12,
	exposure: 0.04,
	shoulder: 0,
	contrast: 1.03,
	saturation: 1.08,
	temporalBlend: 0.88,
	temporalReactive: 0.8,
	temporalClamp: 0.18,
	worldVelocity: [0, 0],
	cameraMotionBlur: false,
	depthTexture: null,
	focusDepth: 0.62,
	focusBlur: 2.5,
	focusPoint: [0.5, 0.5],
	quality: 3,
	motionBlur: 0.05,
	motionDirection: [1, 0],
};

const _floatUniform = uniform(0);
const _vectorUniform = uniform(new Vector2());
type ScalarUniform = typeof _floatUniform;
type VectorUniform = typeof _vectorUniform;

export interface PostProcessingUniforms {
	enabled: ScalarUniform;
	bloomStrength: ScalarUniform;
	bloomThreshold: ScalarUniform;
	bloomKnee: ScalarUniform;
	bloomRadius: ScalarUniform;
	haloStrength: ScalarUniform;
	flareStrength: ScalarUniform;
	chromaticAberration: ScalarUniform;
	chromaticDirection: VectorUniform;
	grain: ScalarUniform;
	vignette: ScalarUniform;
	exposure: ScalarUniform;
	shoulder: ScalarUniform;
	contrast: ScalarUniform;
	saturation: ScalarUniform;
	temporalBlend: ScalarUniform;
	temporalReactive: ScalarUniform;
	temporalClamp: ScalarUniform;
	temporalJitter: VectorUniform;
	worldVelocity: VectorUniform;
	cameraMotionBlur: ScalarUniform;
	velocityValid: ScalarUniform;
	depthRange: VectorUniform;
	focusDepth: ScalarUniform;
	focusBlur: ScalarUniform;
	focusPoint: VectorUniform;
	motionBlur: ScalarUniform;
	motionDirection: VectorUniform;
	historyValid: ScalarUniform;
	resolution: VectorUniform;
	time: ScalarUniform;
}

export interface PostProcessing {
	/** Final vec4 node for `three/webgpu`'s `RenderPipeline.outputNode`. */
	readonly outputNode: Node<"vec4">;
	readonly uniforms: PostProcessingUniforms;
	setSize(width: number, height: number): void;
	/** Copy the just-finished output into the next frame's temporal history. */
	commit(renderer: WebGPURenderer): void;
	resetHistory(): void;
	/** Return the next 16-sample Halton jitter in device pixels for the world camera. */
	nextJitter(): [number, number];
	/** Update the aggregate world-object velocity in device pixels. */
	setWorldVelocity(velocity: [number, number]): void;
	/** Tell depth reprojection which perspective camera produced the world depth. */
	setDepthRange(near: number, far: number): void;
	/**
	 * Current and previous unjittered view-projections. `inverseViewProjection`
	 * is the inverse of the current matrix, computed on the CPU so the graph
	 * does not depend on a mat4 inverse opcode.
	 */
	setViewProjection(inverseViewProjection: Matrix4, previousViewProjection: Matrix4): void;
	/**
	 * Copy the world depth texture into next frame's history. Does not read
	 * the bound framebuffer — that copy is the format mismatch.
	 */
	captureDepth(renderer: WebGPURenderer): void;
	update(options: Partial<PostProcessingOptions>): void;
	/** Advance animated effects from the page scheduler's single clock. */
	step(dt: number): void;
	dispose(): void;
}

const FLARE_OFFSETS: readonly [number, number][] = [
	[-6, 0.045],
	[-3, 0.08],
	[-1.5, 0.12],
	[0, 0.18],
	[1.5, 0.12],
	[3, 0.08],
	[6, 0.045],
];

const DOF_OFFSETS: readonly [number, number][] = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
];

function halton(index: number, base: number): number {
	let result = 0;
	let fraction = 1 / base;
	let value = index;
	while (value > 0) {
		result += (value % base) * fraction;
		value = Math.floor(value / base);
		fraction /= base;
	}
	return result;
}

const BLOOM_PYRAMID_LEVELS: readonly [number, number][] = [
	[1, 0.42],
	[2, 0.28],
	[4, 0.18],
	[8, 0.12],
];

const SEPARABLE_TAPS: readonly [number, number][] = [
	[-1, 0.25],
	[0, 0.5],
	[1, 0.25],
];

const TAA_NEIGHBOUR_OFFSETS: readonly [number, number][] = [
	[-1, -1],
	[-1, 0],
	[-1, 1],
	[0, -1],
	[0, 1],
	[1, -1],
	[1, 0],
	[1, 1],
];

/**
 * Build a small, composable post chain from TSL nodes.
 *
 * The input is the current canvas framebuffer (`viewportTexture`), not a
 * second scene render. That means this chain can be appended after UI-Lib's
 * backdrop → particles → glass sequence while keeping one canvas and one
 * renderer. A single graph emits WGSL or GLSL through three's backend.
 */
export function createPostProcessing(options: PostProcessingOptions = {}): PostProcessing {
	const initial = mergeDefined(POST_DEFAULTS, options);
	const quality = initial.quality;
	const bloomLevels = BLOOM_PYRAMID_LEVELS.slice(0, quality === 1 ? 2 : quality === 2 ? 3 : 4);
	const separableTaps = quality === 1 ? ([[0, 1]] as const) : SEPARABLE_TAPS;
	const taaNeighbourOffsets = TAA_NEIGHBOUR_OFFSETS.slice(0, quality === 1 ? 4 : 8);
	const uniforms: PostProcessingUniforms = {
		enabled: uniform(initial.enabled ? 1 : 0),
		bloomStrength: uniform(initial.bloomStrength),
		bloomThreshold: uniform(initial.bloomThreshold),
		bloomKnee: uniform(initial.bloomKnee),
		bloomRadius: uniform(initial.bloomRadius),
		haloStrength: uniform(initial.haloStrength),
		flareStrength: uniform(initial.flareStrength),
		chromaticAberration: uniform(initial.chromaticAberration),
		chromaticDirection: uniform(new Vector2(...initial.chromaticDirection)),
		grain: uniform(initial.grain),
		vignette: uniform(initial.vignette),
		exposure: uniform(initial.exposure),
		shoulder: uniform(initial.shoulder),
		contrast: uniform(initial.contrast),
		saturation: uniform(initial.saturation),
		temporalBlend: uniform(initial.temporalBlend),
		temporalReactive: uniform(initial.temporalReactive),
		temporalClamp: uniform(initial.temporalClamp),
		temporalJitter: uniform(new Vector2()),
		worldVelocity: uniform(new Vector2(...initial.worldVelocity)),
		cameraMotionBlur: uniform(initial.cameraMotionBlur ? 1 : 0),
		velocityValid: uniform(0),
		depthRange: uniform(new Vector2(0.1, 100)),
		focusDepth: uniform(initial.focusDepth),
		focusBlur: uniform(initial.focusBlur),
		focusPoint: uniform(new Vector2(...initial.focusPoint)),
		motionBlur: uniform(initial.motionBlur),
		motionDirection: uniform(new Vector2(...initial.motionDirection)),
		historyValid: uniform(0),
		resolution: uniform(new Vector2(1, 1)),
		time: uniform(0),
	};
	const historyTexture = new FramebufferTexture(1, 1);
	historyTexture.colorSpace = SRGBColorSpace;
	historyTexture.name = "ui-lib:post-history";
	const historyDepthTexture = new DepthTexture(1, 1);
	historyDepthTexture.name = "ui-lib:post-depth-history";
	// three's WebGL backend implements a depth-texture copy as a `blitFramebuffer`
	// between the two textures' render-target framebuffers, so the destination
	// needs a render target of its own even though nothing is ever drawn into it.
	// A bare `DepthTexture` has no framebuffer, which is what made
	// `copyTextureToTexture` throw `Invalid value used as weak map key` on
	// WebGL2. The WebGPU backend copies texture to texture and needs no host, so
	// the allocation is only ever realised on the WebGL path.
	const historyDepthHost = new RenderTarget(1, 1, {
		depthTexture: historyDepthTexture,
		depthBuffer: true,
		stencilBuffer: false,
	});
	historyDepthHost.texture.name = "ui-lib:post-depth-history-host";
	// `RenderTarget.setSize` resizes the colour attachments but leaves
	// `depthTexture` alone, so the depth size is tracked and applied separately.
	let historyHostSize = { width: 0, height: 0 };
	let jitterIndex = 0;

	const source = viewportTexture();
	const uv = screenUV;
	const depthTexture = options.depthTexture ?? null;
	const depthNode = depthTexture ? texture(depthTexture, uv) : viewportDepthTexture(uv);
	const invViewProjection = uniform(new Matrix4());
	const previousViewProjection = uniform(new Matrix4());
	const sample = (offset: Node<"vec2"> = vec2(0, 0) as Node<"vec2">) =>
		source.sample(uv.add(offset));
	const baseSample = sample();
	const base = baseSample.rgb;

	// A fixed, multi-scale separable kernel. Each level samples one horizontal
	// and one vertical 1D blur and averages them, which gives the visual shape of
	// a bloom pyramid without allocating extra render targets or rendering the
	// scene again. The levels are compile-time constants and stay backend-neutral.
	const sampleSeparable = (radius: Node<"float">): Node<"vec3"> => {
		let horizontal: Node<"vec3"> = vec3(0);
		let vertical: Node<"vec3"> = vec3(0);
		for (const [distance, weight] of separableTaps) {
			horizontal = horizontal.add(
				sample(vec2(distance, 0).mul(radius).div(uniforms.resolution)).rgb.mul(weight),
			);
			vertical = vertical.add(
				sample(vec2(0, distance).mul(radius).div(uniforms.resolution)).rgb.mul(weight),
			);
		}
		return horizontal.add(vertical).mul(0.5);
	};
	const brightPass = (colour: Node<"vec3">): Node<"float"> =>
		smoothstep(
			uniforms.bloomThreshold.sub(uniforms.bloomKnee),
			uniforms.bloomThreshold.add(uniforms.bloomKnee),
			luminance(colour),
		);

	let bloom: Node<"vec3"> = vec3(0);
	for (const [radius, weight] of bloomLevels) {
		const colour = sampleSeparable(uniforms.bloomRadius.mul(radius));
		bloom = bloom.add(colour.mul(brightPass(colour)).mul(weight));
	}

	// A wider copy of the same separable levels creates the atmospheric halo.
	let halo: Node<"vec3"> = vec3(0);
	for (const [radius, weight] of bloomLevels) {
		const colour = sampleSeparable(uniforms.bloomRadius.mul(radius * 3));
		halo = halo.add(colour.mul(brightPass(colour)).mul(weight));
	}

	// A directional streak is the inexpensive lens-flare cue: it follows the
	// chromatic direction so colour separation and glare feel like one optical
	// system rather than unrelated filters.
	let flare: Node<"vec3"> = vec3(0);
	for (const [distance, weight] of FLARE_OFFSETS) {
		const colour = sample(
			uniforms.chromaticDirection
				.mul(distance)
				.mul(uniforms.bloomRadius)
				.div(uniforms.resolution),
		).rgb;
		const brightness = smoothstep(
			uniforms.bloomThreshold.sub(uniforms.bloomKnee),
			uniforms.bloomThreshold.add(uniforms.bloomKnee),
			luminance(colour),
		);
		flare = flare.add(colour.mul(brightness).mul(weight));
	}

	// Red and blue are offset in opposite directions. At zero aberration the
	// graph collapses to the unshifted sample, so the effect is safe to animate.
	const chromaOffset = uniforms.chromaticDirection
		.mul(uniforms.chromaticAberration)
		.div(uniforms.resolution);
	const red = sample(chromaOffset).r;
	const blue = sample(chromaOffset.negate()).b;
	let colour: Node<"vec3"> = vec3(red, base.g, blue);
	colour = colour
		.add(bloom.mul(uniforms.bloomStrength))
		.add(halo.mul(uniforms.haloStrength))
		.add(flare.mul(uniforms.flareStrength));
	colour = colour.mul(pow(float(2), uniforms.exposure));
	const luminanceValue = luminance(colour);
	colour = mix(vec3(luminanceValue), colour, uniforms.saturation);
	colour = colour.sub(0.5).mul(uniforms.contrast).add(0.5);

	// Depth comes from the offscreen world target when the layer provides one.
	// The canvas depth attachment is only the present-quad, so it cannot mask
	// the hero. Linearise with the perspective camera that drew that target.
	const lineariseDepth = (depth: Node<"float">): Node<"float"> =>
		viewZToOrthographicDepth(
			perspectiveDepthToViewZ(depth, uniforms.depthRange.x, uniforms.depthRange.y),
			uniforms.depthRange.x,
			uniforms.depthRange.y,
		);
	const depthRaw = depthNode.r;
	const sceneDepth = lineariseDepth(depthRaw);
	// Far-plane fragments are backdrop. Only closer, depth-written world pixels
	// may reproject or take camera motion blur. DOM glass is not in this target.
	const worldDepthMask = oneMinus(smoothstep(0.92, 0.998, sceneDepth));
	// Same unproject / reproject as `reprojectionVelocity()`: top-left uv,
	// window-Z depth, column-major view-projection. Inverse is supplied by the
	// CPU. velocityValid stays 0 until the first matrix pair arrives.
	const clip = vec4(
		uv.x.mul(2).sub(1),
		oneMinus(uv.y).mul(2).sub(1),
		depthRaw.mul(2).sub(1),
		1,
	);
	const worldH = invViewProjection.mul(clip);
	const world = worldH.div(worldH.w);
	const prevH = previousViewProjection.mul(vec4(world.xyz, 1));
	const prevW = prevH.w;
	const prevUvX = prevH.x.div(prevW).mul(0.5).add(0.5);
	const prevUvY = oneMinus(prevH.y.div(prevW).mul(0.5).add(0.5));
	const pixelVelocity = vec2(uv.x.sub(prevUvX), uv.y.sub(prevUvY)).mul(uniforms.resolution);
	const velocity = mix(uniforms.worldVelocity, pixelVelocity, uniforms.velocityValid);

	// Depth-aware screen-space focus blur. The UV falloff keeps the composition's
	// centre slightly more restrained when the background is the only depth sample.
	let defocus: Node<"vec3"> = vec3(0);
	for (const [x, y] of DOF_OFFSETS) {
		defocus = defocus.add(
			sample(vec2(x, y).mul(uniforms.focusBlur).div(uniforms.resolution)).rgb,
		);
	}
	defocus = defocus.div(DOF_OFFSETS.length);
	const depthDistance = abs(sceneDepth.sub(uniforms.focusDepth));
	const depthOutOfFocus = smoothstep(0.018, 0.22, depthDistance);
	const focusDistance = uv.sub(uniforms.focusPoint).length();
	const spatialOutOfFocus = smoothstep(0.16, 0.74, focusDistance);
	const outOfFocus = mix(spatialOutOfFocus, depthOutOfFocus, 0.78);
	// Camera-driven pages must not defocus DOM glass that sits over the far
	// backdrop. Playground keeps the full-frame mix.
	const focusMask = mix(float(1), worldDepthMask, uniforms.cameraMotionBlur);
	colour = mix(
		colour,
		defocus,
		outOfFocus.mul(focusMask).mul(saturate(uniforms.focusBlur.div(16))),
	);

	// A directional five-tap blur gives moving hero elements a restrained
	// cinematic smear. It is disabled by default and costs only the graph taps
	// required by the selected option.
	let motion: Node<"vec3"> = vec3(0);
	for (const [distance, weight] of [
		[-2, 0.12],
		[-1, 0.2],
		[0, 0.36],
		[1, 0.2],
		[2, 0.12],
	] as const) {
		motion = motion.add(
			sample(uniforms.motionDirection.mul(distance).mul(2).div(uniforms.resolution)).rgb.mul(
				weight,
			),
		);
	}
	const motionAmount = mix(
		uniforms.motionBlur,
		uniforms.motionBlur.mul(worldDepthMask),
		uniforms.cameraMotionBlur,
	);
	colour = mix(colour, motion, motionAmount);

	// Same expression as `compressHighlight`: only the part above 1 rolls off.
	// Applied after focus and motion blur so those raw taps cannot put the
	// clipped peaks back. One mix, no extra samples.
	const excess = max(colour.sub(1), 0);
	const rolled = colour.sub(excess).add(excess.div(excess.add(1)));
	colour = mix(colour, rolled, uniforms.shoulder);

	// A deterministic animated grain pattern: no random texture allocation and
	// no CPU-side noise upload.
	const grainSeed = dot(
		uv.add(vec2(uniforms.time, uniforms.time.mul(1.37))),
		vec2(12.9898, 78.233),
	);
	const grain = fract(sin(grainSeed).mul(43758.5453)).sub(0.5);
	colour = colour.add(grain.mul(uniforms.grain));

	const distanceFromCentre = uv.sub(0.5).length().mul(Math.SQRT2);
	const edgeDarkening = oneMinus(smoothstep(0.18, 0.92, distanceFromCentre));
	colour = colour.mul(mix(float(1), edgeDarkening, uniforms.vignette));

	const effected = vec4(colour, baseSample.a);
	// `temporalJitter` is the previous-minus-current Halton offset and
	// `velocity` is current-minus-previous motion, both in device pixels.
	// Reproject only depth-backed world fragments; DOM glass and the backdrop
	// stay on their stable screen positions.
	const historyOffset = uniforms.temporalJitter.sub(velocity);
	const historyUv = uv.add(historyOffset.div(uniforms.resolution).mul(worldDepthMask));
	const historySample = texture(historyTexture, historyUv);
	const historyDepth = lineariseDepth(texture(historyDepthTexture, historyUv).r);

	// Full TAA resolve: reproject, reject disocclusions, variance-clip an 3x3
	// current neighbourhood, then apply reactive history feedback. Depth
	// history is a copy of the world depth texture, not the present-quad, so a
	// moving object cannot borrow colour from a newly exposed background pixel.
	const depthDifference = abs(historyDepth.sub(sceneDepth));
	const depthAgreement = oneMinus(smoothstep(0.0015, 0.035, depthDifference));
	const depthConfidence = mix(float(1), depthAgreement, worldDepthMask);

	let moment1: Node<"vec3"> = effected.rgb;
	let moment2: Node<"vec3"> = effected.rgb.pow(2);
	for (const [x, y] of taaNeighbourOffsets) {
		const neighbour = sample(vec2(x, y).div(uniforms.resolution)).rgb;
		moment1 = moment1.add(neighbour);
		moment2 = moment2.add(neighbour.pow(2));
	}
	const sampleCount = taaNeighbourOffsets.length + 1;
	const mean = moment1.div(sampleCount);
	const standardDeviation = moment2.div(sampleCount).sub(mean.pow(2)).max(0).sqrt();
	const motionFactor = saturate(historyOffset.length().div(64));
	const varianceGamma = mix(float(1.5), float(0.75), motionFactor);
	const varianceMin = mean.sub(standardDeviation.mul(varianceGamma));
	const varianceMax = mean.add(standardDeviation.mul(varianceGamma));
	const clampedHistory = min(max(historySample.rgb, varianceMin), varianceMax);
	const historyColour = vec4(clampedHistory, historySample.a);

	// Keep history UVs inside the valid texture domain. This also handles the
	// first frame after a camera movement where reprojection reaches an edge.
	const historyBorder = min(
		min(historyUv.x, historyUv.y),
		min(oneMinus(historyUv.x), oneMinus(historyUv.y)),
	);
	const uvConfidence = smoothstep(0, 0.015, historyBorder);
	const luminanceDelta = abs(luminance(clampedHistory).sub(luminance(effected.rgb)));
	const rejection = oneMinus(saturate(luminanceDelta.mul(4)));
	const reactiveFactor = mix(float(1), rejection, saturate(uniforms.temporalReactive));
	// Pixels without world depth cannot be reprojected. If any tracked object is
	// moving, drop their history instead of shifting the whole frame — that is
	// what smears DOM glass. Depth-backed fragments keep the per-pixel offset.
	const objectMotion = saturate(uniforms.worldVelocity.length().div(3));
	const uncoveredMotion = objectMotion.mul(oneMinus(worldDepthMask));
	const temporalWeight = uniforms.temporalBlend
		.mul(uniforms.historyValid)
		.mul(depthConfidence)
		.mul(uvConfidence)
		.mul(reactiveFactor)
		.mul(oneMinus(uncoveredMotion));
	const temporal = mix(effected, historyColour, temporalWeight);
	const outputNode = mix(baseSample, temporal, uniforms.enabled);

	/**
	 * Gives the WebGL backend a framebuffer for the depth history, sized to the
	 * world depth. Activating the target once is what makes the backend create
	 * that framebuffer and stamp the target onto the depth texture; without it
	 * the depth blit has no destination framebuffer to bind and throws. The
	 * WebGPU backend copies texture to texture, so nothing is primed there and
	 * the host is never allocated.
	 */
	const primeDepthHistoryHost = (
		renderer: WebGPURenderer,
		width: number,
		height: number,
	): void => {
		// `isWebGLBackend` is set by three but is not part of the `Backend` type.
		const backend = renderer.backend as { isWebGLBackend?: boolean } | undefined;
		if (backend?.isWebGLBackend !== true) return;
		if (historyHostSize.width === width && historyHostSize.height === height) return;
		historyHostSize = { width, height };
		historyDepthHost.setSize(width, height);
		historyDepthTexture.image.width = width;
		historyDepthTexture.image.height = height;
		historyDepthTexture.needsUpdate = true;
		// `Renderer.initRenderTarget` is the documented way to build a render
		// target's framebuffer ahead of time; nothing inside three calls it. It
		// is what attaches the depth texture to a framebuffer and stamps the
		// render target onto it, which is exactly what the depth blit looks up.
		renderer.initRenderTarget(historyDepthHost);
	};

	return {
		outputNode,
		uniforms,
		setSize(width, height) {
			const nextWidth = Math.max(1, Math.round(width));
			const nextHeight = Math.max(1, Math.round(height));
			uniforms.resolution.value.set(nextWidth, nextHeight);
			if (
				historyTexture.image.width !== nextWidth ||
				historyTexture.image.height !== nextHeight
			) {
				historyTexture.image.width = nextWidth;
				historyTexture.image.height = nextHeight;
				historyTexture.needsUpdate = true;
				historyDepthTexture.image.width = nextWidth;
				historyDepthTexture.image.height = nextHeight;
				historyDepthTexture.needsUpdate = true;
				uniforms.historyValid.value = 0;
				jitterIndex = 0;
				uniforms.temporalJitter.value.set(0, 0);
			}
		},
		commit(renderer) {
			// Colour history is a framebuffer texture, so three sizes its GPU
			// format to the canvas. Depth is not copied here: the screen depth
			// is the present quad, and a depth texture cannot accept that copy.
			//
			// On WebGPU the copy only runs when the bound framebuffer's format
			// matches the history's; otherwise three logs and returns without
			// copying. Claiming the history is valid after a copy that did not
			// happen is worse than not claiming it -- the temporal pass would
			// blend against a texture nothing ever wrote. Ask first.
			if (framebufferCopyWouldFail(renderer, historyTexture)) {
				uniforms.historyValid.value = 0;
				return;
			}
			renderer.copyFramebufferToTexture(historyTexture);
			uniforms.historyValid.value = 1;
		},
		resetHistory() {
			uniforms.historyValid.value = 0;
			uniforms.velocityValid.value = 0;
			jitterIndex = 0;
			uniforms.temporalJitter.value.set(0, 0);
		},
		setViewProjection(inverseViewProjection, previous) {
			invViewProjection.value.copy(inverseViewProjection);
			previousViewProjection.value.copy(previous);
			uniforms.velocityValid.value = 1;
		},
		captureDepth(renderer) {
			if (!depthTexture) {
				throw new Error(
					"ui-lib: captureDepth needs the world depth texture. Copying the bound framebuffer into a depth history is the WebGPU format mismatch.",
				);
			}
			alignDepthHistory(historyDepthTexture, depthTexture);
			if (!depthHistoryCompatible(historyDepthTexture, depthTexture)) {
				throw new Error(
					"ui-lib: depth history could not be aligned to the world depth texture.",
				);
			}
			// `alignDepthHistory` has already written the world depth's extent
			// into the history image; the fallback only satisfies the type.
			primeDepthHistoryHost(
				renderer,
				historyDepthTexture.image.width ?? 1,
				historyDepthTexture.image.height ?? 1,
			);
			renderer.copyTextureToTexture(depthTexture, historyDepthTexture);
			assertDepthHistoryFormats(
				readGpuTextureFormat(renderer, depthTexture),
				readGpuTextureFormat(renderer, historyDepthTexture),
			);
		},
		nextJitter() {
			const previousIndex = jitterIndex === 0 ? 16 : jitterIndex;
			jitterIndex = (jitterIndex % 16) + 1;
			const current: [number, number] = [
				halton(jitterIndex, 2) - 0.5,
				halton(jitterIndex, 3) - 0.5,
			];
			const previous: [number, number] = [
				halton(previousIndex, 2) - 0.5,
				halton(previousIndex, 3) - 0.5,
			];
			uniforms.temporalJitter.value.set(previous[0] - current[0], previous[1] - current[1]);
			return current;
		},
		setWorldVelocity(velocity) {
			uniforms.worldVelocity.value.set(...velocity);
		},
		setDepthRange(near, far) {
			uniforms.depthRange.value.set(Math.max(0.0001, near), Math.max(near + 0.0001, far));
		},
		update(patch) {
			if (patch.enabled !== undefined) uniforms.enabled.value = patch.enabled ? 1 : 0;
			if (patch.bloomStrength !== undefined) uniforms.bloomStrength.value = patch.bloomStrength;
			if (patch.bloomThreshold !== undefined)
				uniforms.bloomThreshold.value = patch.bloomThreshold;
			if (patch.bloomKnee !== undefined) uniforms.bloomKnee.value = patch.bloomKnee;
			if (patch.bloomRadius !== undefined) uniforms.bloomRadius.value = patch.bloomRadius;
			if (patch.haloStrength !== undefined) uniforms.haloStrength.value = patch.haloStrength;
			if (patch.flareStrength !== undefined) uniforms.flareStrength.value = patch.flareStrength;
			if (patch.chromaticAberration !== undefined) {
				uniforms.chromaticAberration.value = patch.chromaticAberration;
			}
			if (patch.chromaticDirection)
				uniforms.chromaticDirection.value.set(...patch.chromaticDirection);
			if (patch.grain !== undefined) uniforms.grain.value = patch.grain;
			if (patch.vignette !== undefined) uniforms.vignette.value = patch.vignette;
			if (patch.exposure !== undefined) uniforms.exposure.value = patch.exposure;
			if (patch.shoulder !== undefined) uniforms.shoulder.value = patch.shoulder;
			if (patch.contrast !== undefined) uniforms.contrast.value = patch.contrast;
			if (patch.saturation !== undefined) uniforms.saturation.value = patch.saturation;
			if (patch.temporalBlend !== undefined) uniforms.temporalBlend.value = patch.temporalBlend;
			if (patch.temporalReactive !== undefined)
				uniforms.temporalReactive.value = patch.temporalReactive;
			if (patch.temporalClamp !== undefined) uniforms.temporalClamp.value = patch.temporalClamp;
			if (patch.worldVelocity) uniforms.worldVelocity.value.set(...patch.worldVelocity);
			if (patch.cameraMotionBlur !== undefined) {
				uniforms.cameraMotionBlur.value = patch.cameraMotionBlur ? 1 : 0;
			}
			if (patch.focusDepth !== undefined) uniforms.focusDepth.value = patch.focusDepth;
			if (patch.focusBlur !== undefined) uniforms.focusBlur.value = patch.focusBlur;
			if (patch.focusPoint) uniforms.focusPoint.value.set(...patch.focusPoint);
			if (patch.motionBlur !== undefined) uniforms.motionBlur.value = patch.motionBlur;
			if (patch.motionDirection) uniforms.motionDirection.value.set(...patch.motionDirection);
		},
		step(dt) {
			uniforms.time.value += Math.max(0, Math.min(dt, 1 / 15));
		},
		dispose() {
			// The viewport framebuffer is owned by three's node renderer and is
			// intentionally shared with any other viewport texture nodes. History is
			// ours, so release it explicitly.
			historyTexture.dispose();
			historyDepthTexture.dispose();
			historyDepthHost.dispose();
			historyHostSize = { width: 0, height: 0 };
		},
	};
}
