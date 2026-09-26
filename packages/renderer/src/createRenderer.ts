import { WebGPURenderer } from "three/webgpu";
import type { DeviceCapabilities, GpuBackend } from "@ui-lib/core";
import { detectCapabilities, hasDom } from "@ui-lib/core";

export interface CreateRendererOptions {
	canvas?: HTMLCanvasElement;
	antialias?: boolean;
	/** Transparent canvas so the page behind it stays visible. */
	alpha?: boolean;
	/** Skip WebGPU entirely (useful for A/B testing the fallback path). */
	forceWebGL?: boolean;
	powerPreference?: "high-performance" | "low-power";
}

export interface UiRenderer {
	readonly renderer: WebGPURenderer;
	readonly backend: GpuBackend;
	readonly capabilities: DeviceCapabilities;
	readonly canvas: HTMLCanvasElement;
	dpr: number;
	/** Resize the drawing buffer. `dprCap` bounds the effective pixel ratio. */
	setSize(width: number, height: number, dprCap: number): void;
	dispose(): void;
}

export class RendererUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RendererUnavailableError";
	}
}

function backendOf(renderer: WebGPURenderer): GpuBackend {
	const backend = (renderer as unknown as { backend?: { isWebGPUBackend?: boolean } }).backend;
	if (!backend) return "none";
	return backend.isWebGPUBackend === true ? "webgpu" : "webgl2";
}

/**
 * Boot a three renderer that prefers WebGPU and falls back to WebGL 2.
 *
 * three's `WebGPURenderer` performs the fallback itself (`forceWebGL` only
 * exists so we can force the comparison in tests and demos), so callers get one
 * code path and one shader language (TSL) for both backends.
 */
export async function createRenderer(options: CreateRendererOptions = {}): Promise<UiRenderer> {
	if (!hasDom()) throw new RendererUnavailableError("A DOM is required to create a renderer.");

	const capabilities = await detectCapabilities();
	if (!capabilities.webgpu && !capabilities.webgl2) {
		throw new RendererUnavailableError("Neither WebGPU nor WebGL 2 is available.");
	}

	const renderer = new WebGPURenderer({
		canvas: options.canvas,
		antialias: options.antialias ?? true,
		alpha: options.alpha ?? true,
		forceWebGL: options.forceWebGL === true,
		powerPreference: options.powerPreference ?? "high-performance",
	});

	await renderer.init();
	renderer.setClearColor(0x000000, 0);
	renderer.autoClear = false;

	let currentDpr = 1;

	return {
		renderer,
		backend: backendOf(renderer),
		capabilities,
		canvas: renderer.domElement,
		get dpr() {
			return currentDpr;
		},
		setSize(width: number, height: number, dprCap: number) {
			currentDpr = Math.min(window.devicePixelRatio || 1, dprCap);
			renderer.setPixelRatio(currentDpr);
			renderer.setSize(width, height, false);
		},
		dispose() {
			renderer.dispose();
		},
	};
}
