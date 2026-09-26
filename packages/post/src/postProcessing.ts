import {
	abs,
	dot,
	float,
	fract,
	linearDepth,
	luminance,
	max,
	min,
	mix,
	oneMinus,
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
} from "three/tsl";
import {
	FramebufferTexture,
	type Node,
	SRGBColorSpace,
	Vector2,
	type WebGPURenderer,
} from "three/webgpu";

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
	/** Mid-tone contrast multiplier. */
	contrast?: number;
	/** Colour intensity around luminance 1. */
	saturation?: number;
	/** Previous-frame blend. Small values stabilise shimmer without visible trails. */
	temporalBlend?: number;
	/** Reactive history rejection for high-contrast changes. 0 disables it. */
	temporalReactive?: number;
	/** Maximum linear colour excursion allowed when clamping history. */
	temporalClamp?: number;
	/** Normalised linear depth at the focus plane. */
	focusDepth?: number;
	/** Screen-space focus blur radius in device pixels. 0 disables the DOF approximation. */
	focusBlur?: number;
	/** Radius around this UV point that stays in focus. */
	focusPoint?: [number, number];
	/** Directional screen-space blur in device pixels. 0 disables motion blur. */
	motionBlur?: number;
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
	contrast: 1.03,
	saturation: 1.08,
	temporalBlend: 0.08,
	temporalReactive: 0.8,
	temporalClamp: 0.18,
	focusDepth: 0.62,
	focusBlur: 2.5,
	focusPoint: [0.5, 0.5],
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
	contrast: ScalarUniform;
	saturation: ScalarUniform;
	temporalBlend: ScalarUniform;
	temporalReactive: ScalarUniform;
	temporalClamp: ScalarUniform;
	temporalJitter: VectorUniform;
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
	/** Return the next 8-sample Halton jitter in device pixels for the world camera. */
	nextJitter(): [number, number];
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

const BLOOM_OFFSETS: readonly [number, number, number][] = [
	[0, 0, 0.22],
	[1, 0, 0.09],
	[-1, 0, 0.09],
	[0, 1, 0.09],
	[0, -1, 0.09],
	[Math.SQRT1_2, Math.SQRT1_2, 0.07],
	[-Math.SQRT1_2, Math.SQRT1_2, 0.07],
	[Math.SQRT1_2, -Math.SQRT1_2, 0.07],
	[-Math.SQRT1_2, -Math.SQRT1_2, 0.07],
	[2, 0, 0.045],
	[-2, 0, 0.045],
	[0, 2, 0.045],
	[0, -2, 0.045],
	[Math.SQRT2, Math.SQRT2, 0.035],
	[-Math.SQRT2, Math.SQRT2, 0.035],
	[Math.SQRT2, -Math.SQRT2, 0.035],
	[-Math.SQRT2, -Math.SQRT2, 0.035],
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
	const initial = { ...POST_DEFAULTS, ...options };
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
		contrast: uniform(initial.contrast),
		saturation: uniform(initial.saturation),
		temporalBlend: uniform(initial.temporalBlend),
		temporalReactive: uniform(initial.temporalReactive),
		temporalClamp: uniform(initial.temporalClamp),
		temporalJitter: uniform(new Vector2()),
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
	let jitterIndex = 0;

	const source = viewportTexture();
	const uv = screenUV;
	const sample = (offset: Node<"vec2"> = vec2(0, 0) as Node<"vec2">) =>
		source.sample(uv.add(offset));
	const baseSample = sample();
	const base = baseSample.rgb;

	// Bright-pass, multi-radius disc blur. The loop is deliberately unrolled
	// here: post tap count is fixed at graph-build time, so the backend can
	// optimise it to straight-line shader code.
	let bloom: Node<"vec3"> = vec3(0);
	for (const [x, y, weight] of BLOOM_OFFSETS) {
		const colour = sample(vec2(x, y).mul(uniforms.bloomRadius).div(uniforms.resolution)).rgb;
		const brightness = smoothstep(
			uniforms.bloomThreshold.sub(uniforms.bloomKnee),
			uniforms.bloomThreshold.add(uniforms.bloomKnee),
			luminance(colour),
		);
		bloom = bloom.add(colour.mul(brightness).mul(weight));
	}

	// A second, wider blur gives highlights a soft atmospheric halo instead of
	// the small circular glow alone. It is still an unrolled fixed graph.
	let halo: Node<"vec3"> = vec3(0);
	for (const [x, y, weight] of BLOOM_OFFSETS) {
		const colour = sample(
			vec2(x, y).mul(uniforms.bloomRadius.mul(3)).div(uniforms.resolution),
		).rgb;
		const brightness = smoothstep(
			uniforms.bloomThreshold.sub(uniforms.bloomKnee),
			uniforms.bloomThreshold.add(uniforms.bloomKnee),
			luminance(colour),
		);
		halo = halo.add(colour.mul(brightness).mul(weight));
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

	// The canvas target owns a depth texture even though the backdrop and glass
	// materials do not write depth. World particles / hero objects therefore
	// provide a useful mask for both focus and jitter reprojection.
	const sceneDepth = linearDepth(viewportDepthTexture(uv));

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
	colour = mix(colour, defocus, outOfFocus.mul(saturate(uniforms.focusBlur.div(16))));

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
	colour = mix(colour, motion, uniforms.motionBlur);

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
	const worldDepthMask = oneMinus(smoothstep(0.92, 0.998, sceneDepth));
	// `temporalJitter` is the previous-minus-current Halton offset in device
	// pixels. Reproject only depth-backed world fragments; the DOM glass and
	// empty backdrop remain at their stable screen positions.
	const historyUv = uv.add(
		uniforms.temporalJitter.div(uniforms.resolution).mul(worldDepthMask),
	);
	const historySample = texture(historyTexture, historyUv);

	// History clamping and reactive rejection are the two pieces that keep a
	// jittered accumulation from turning a moving crystal into a ghost trail.
	// This is deliberately conservative: the final framebuffer also contains
	// stable DOM glass, so we do not reproject the whole canvas with a guessed
	// motion vector. A future world-only MRT can replace this without changing
	// the public output node.
	const historyFloor = effected.rgb.sub(uniforms.temporalClamp);
	const historyCeiling = effected.rgb.add(uniforms.temporalClamp);
	const clampedHistory = min(max(historySample.rgb, historyFloor), historyCeiling);
	const historyColour = vec4(clampedHistory, historySample.a);
	const luminanceDelta = abs(luminance(clampedHistory).sub(luminance(effected.rgb)));
	const rejection = oneMinus(saturate(luminanceDelta.mul(4)));
	const reactiveFactor = mix(float(1), rejection, saturate(uniforms.temporalReactive));
	const temporalWeight = uniforms.temporalBlend.mul(uniforms.historyValid).mul(reactiveFactor);
	const temporal = mix(effected, historyColour, temporalWeight);
	const outputNode = mix(baseSample, temporal, uniforms.enabled);

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
				uniforms.historyValid.value = 0;
				jitterIndex = 0;
				uniforms.temporalJitter.value.set(0, 0);
			}
		},
		commit(renderer) {
			renderer.copyFramebufferToTexture(historyTexture);
			uniforms.historyValid.value = 1;
		},
		resetHistory() {
			uniforms.historyValid.value = 0;
			jitterIndex = 0;
			uniforms.temporalJitter.value.set(0, 0);
		},
		nextJitter() {
			const previousIndex = jitterIndex === 0 ? 8 : jitterIndex;
			jitterIndex = (jitterIndex % 8) + 1;
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
			if (patch.contrast !== undefined) uniforms.contrast.value = patch.contrast;
			if (patch.saturation !== undefined) uniforms.saturation.value = patch.saturation;
			if (patch.temporalBlend !== undefined) uniforms.temporalBlend.value = patch.temporalBlend;
			if (patch.temporalReactive !== undefined)
				uniforms.temporalReactive.value = patch.temporalReactive;
			if (patch.temporalClamp !== undefined) uniforms.temporalClamp.value = patch.temporalClamp;
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
		},
	};
}
