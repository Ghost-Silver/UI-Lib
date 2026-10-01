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
