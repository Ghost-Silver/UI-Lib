import {
	dot,
	float,
	fract,
	luminance,
	mix,
	oneMinus,
	screenUV,
	sin,
	smoothstep,
	uniform,
	vec2,
	vec3,
	vec4,
	viewportTexture,
} from "three/tsl";
import { type Node, Vector2 } from "three/webgpu";

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
	/** Per-channel screen-space shift in device pixels. */
	chromaticAberration?: number;
	/** Direction of chromatic separation in screen space. */
	chromaticDirection?: [number, number];
	/** Animated monochrome grain amount. */
	grain?: number;
	/** Edge darkening amount. */
	vignette?: number;
}

export const POST_DEFAULTS: Required<PostProcessingOptions> = {
	enabled: true,
	bloomStrength: 0.28,
	bloomThreshold: 0.72,
	bloomKnee: 0.18,
	bloomRadius: 6,
	chromaticAberration: 0.35,
	chromaticDirection: [1, 0.38],
	grain: 0.018,
	vignette: 0.12,
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
	chromaticAberration: ScalarUniform;
	chromaticDirection: VectorUniform;
	grain: ScalarUniform;
	vignette: ScalarUniform;
	resolution: VectorUniform;
	time: ScalarUniform;
}

export interface PostProcessing {
	/** Final vec4 node for `three/webgpu`'s `RenderPipeline.outputNode`. */
	readonly outputNode: Node<"vec4">;
	readonly uniforms: PostProcessingUniforms;
	setSize(width: number, height: number): void;
	update(options: Partial<PostProcessingOptions>): void;
	/** Advance animated effects from the page scheduler's single clock. */
	step(dt: number): void;
	dispose(): void;
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
		chromaticAberration: uniform(initial.chromaticAberration),
		chromaticDirection: uniform(new Vector2(...initial.chromaticDirection)),
		grain: uniform(initial.grain),
		vignette: uniform(initial.vignette),
		resolution: uniform(new Vector2(1, 1)),
		time: uniform(0),
	};

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

	// Red and blue are offset in opposite directions. At zero aberration the
	// graph collapses to the unshifted sample, so the effect is safe to animate.
	const chromaOffset = uniforms.chromaticDirection
		.mul(uniforms.chromaticAberration)
		.div(uniforms.resolution);
	const red = sample(chromaOffset).r;
	const blue = sample(chromaOffset.negate()).b;
	let colour: Node<"vec3"> = vec3(red, base.g, blue);
	colour = colour.add(bloom.mul(uniforms.bloomStrength));

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
	const outputNode = mix(baseSample, effected, uniforms.enabled);

	return {
		outputNode,
		uniforms,
		setSize(width, height) {
			uniforms.resolution.value.set(Math.max(1, width), Math.max(1, height));
		},
		update(patch) {
			if (patch.enabled !== undefined) uniforms.enabled.value = patch.enabled ? 1 : 0;
			if (patch.bloomStrength !== undefined) uniforms.bloomStrength.value = patch.bloomStrength;
			if (patch.bloomThreshold !== undefined)
				uniforms.bloomThreshold.value = patch.bloomThreshold;
			if (patch.bloomKnee !== undefined) uniforms.bloomKnee.value = patch.bloomKnee;
			if (patch.bloomRadius !== undefined) uniforms.bloomRadius.value = patch.bloomRadius;
			if (patch.chromaticAberration !== undefined) {
				uniforms.chromaticAberration.value = patch.chromaticAberration;
			}
			if (patch.chromaticDirection)
				uniforms.chromaticDirection.value.set(...patch.chromaticDirection);
			if (patch.grain !== undefined) uniforms.grain.value = patch.grain;
			if (patch.vignette !== undefined) uniforms.vignette.value = patch.vignette;
		},
		step(dt) {
			uniforms.time.value += Math.max(0, Math.min(dt, 1 / 15));
		},
		dispose() {
			// The viewport framebuffer is owned by three's node renderer and is
			// intentionally shared with any other viewport texture nodes.
		},
	};
}
