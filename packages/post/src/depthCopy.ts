/**
 * Depth-history copy contract.
 *
 * `copyFramebufferToTexture` copies whatever is bound. On WebGPU a depth
 * texture and a colour attachment are not interchangeable: the console error
 * `rgba16float bgra8unorm` is a colour-format pair, and a default
 * `DepthTexture` is `depth24plus`, not `rgba16float`. Copying the bound
 * framebuffer into the history is how that call fails closed and leaves the
 * history empty. The history has to be another depth texture with the same
 * format, type and size as the world depth, then `copyTextureToTexture`.
 */

export interface DepthHistoryTexture {
	format: number;
	type: number;
	image: unknown;
	needsUpdate?: boolean;
}

interface SizedImage {
	width?: number;
	height?: number;
}

function sizedImage(image: unknown): SizedImage {
	if (image && typeof image === "object" && "width" in image && "height" in image) {
		return image as SizedImage;
	}
	return {};
}

function imageExtent(image: unknown): { width: number; height: number } {
	const sized = sizedImage(image);
	return {
		width: Math.max(1, Math.round(sized.width ?? 1)),
		height: Math.max(1, Math.round(sized.height ?? 1)),
	};
}

export function alignDepthHistory(
	history: DepthHistoryTexture,
	source: DepthHistoryTexture,
): boolean {
	const next = imageExtent(source.image);
	const current = imageExtent(history.image);
	const changed =
		history.format !== source.format ||
		history.type !== source.type ||
		current.width !== next.width ||
		current.height !== next.height;
	history.format = source.format;
	history.type = source.type;
	const image = sizedImage(history.image);
	image.width = next.width;
	image.height = next.height;
	if (changed) history.needsUpdate = true;
	return changed;
}

export function depthHistoryCompatible(
	history: DepthHistoryTexture,
	source: DepthHistoryTexture,
): boolean {
	const left = imageExtent(history.image);
	const right = imageExtent(source.image);
	return (
		history.format === source.format &&
		history.type === source.type &&
		left.width === right.width &&
		left.height === right.height &&
		left.width > 0 &&
		left.height > 0
	);
}

export function readGpuTextureFormat(renderer: object, texture: object): string | null {
	const backend = (
		renderer as { backend?: { get?: (value: object) => { texture?: { format?: string } } } }
	).backend;
	const format = backend?.get?.(texture)?.texture?.format;
	return typeof format === "string" ? format : null;
}

/** Throws when a copy would be the silent no-op WebGPU already logs. */
export function assertDepthHistoryFormats(
	sourceFormat: string | null,
	destFormat: string | null,
): void {
	if (!sourceFormat || !destFormat || sourceFormat === destFormat) return;
	throw new Error(
		`ui-lib: depth history GPU formats differ (${sourceFormat} vs ${destFormat}). Refusing a silent copy.`,
	);
}

interface BoundTarget {
	textures?: readonly object[];
}

interface RendererLike {
	_currentRenderContext?: { renderTarget?: BoundTarget | null } | null;
	_renderTarget?: BoundTarget | null;
	_getFrameBufferTarget?: () => BoundTarget | null;
	getRenderTarget?: () => BoundTarget | null;
	backend?: {
		isWebGPUBackend?: boolean;
		context?: { getCurrentTexture?: () => { format?: string } | null };
	};
}

/**
 * Whether `renderer.copyFramebufferToTexture()` would refuse the copy.
 *
 * three's WebGPU backend compares the bound framebuffer's GPU format against
 * the destination texture's and, when they differ, logs
 * `Source and destination formats do not match` and returns **without
 * copying**. There is no return value and no exception, so the only way to know
 * is to run the same lookup three runs:
 *
 * - a bound render target contributes its first colour attachment;
 * - with nothing bound the source is the presented canvas texture, read
 *   straight off the swap chain rather than through the backend's texture map.
 *
 * The WebGL backend copies through `copyTexSubImage2D`, which converts between
 * internal formats, so it has no such restriction and this reports `false`.
 */
export function framebufferCopyWouldFail(renderer: object, texture: object): boolean {
	const typed = renderer as RendererLike;
	const backend = typed.backend;
	if (backend?.isWebGPUBackend !== true) return false;

	// Mirror three's own source lookup exactly. It reads the render context the
	// last `render()` left behind -- not `getRenderTarget()`, which reports null
	// while a render pipeline still has an internal target current -- and falls
	// back to the frame buffer target when that context is gone. Guessing
	// "nothing is bound, so the source is the canvas" reads `bgra8unorm` and
	// misses the `rgba16float` intermediate three actually copies from.
	const context = typed._currentRenderContext ?? null;
	const bound =
		context?.renderTarget ??
		typed._renderTarget ??
		typed._getFrameBufferTarget?.() ??
		typed.getRenderTarget?.() ??
		null;
	const attachment = bound?.textures?.[0] ?? null;
	const sourceFormat = attachment
		? readGpuTextureFormat(renderer, attachment)
		: (backend.context?.getCurrentTexture?.()?.format ?? null);
	const destinationFormat = readGpuTextureFormat(renderer, texture);

	if (sourceFormat === null || destinationFormat === null) return false;
	return sourceFormat !== destinationFormat;
}
