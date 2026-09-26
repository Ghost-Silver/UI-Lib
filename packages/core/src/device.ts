/**
 * Device capability probing.
 *
 * This module never touches `window`/`document` at module evaluation time so it
 * stays importable from SSR bundles; every probe happens inside a function.
 */

export type GpuBackend = "webgpu" | "webgl2" | "none";

export interface DeviceCapabilities {
	/** Best backend we can actually use. */
	readonly backend: GpuBackend;
	/** WebGPU is present *and* an adapter could be acquired. */
	readonly webgpu: boolean;
	/** WebGL 2 is present (used as the automatic fallback backend). */
	readonly webgl2: boolean;
	/** `navigator.hardwareConcurrency`, clamped to a sane minimum of 1. */
	readonly cores: number;
	/** `navigator.deviceMemory` in GB, `null` when unavailable. */
	readonly memoryGB: number | null;
	/** `MAX_TEXTURE_SIZE` reported by the WebGL 2 context, 0 when unavailable. */
	readonly maxTextureSize: number;
	readonly devicePixelRatio: number;
	readonly mobile: boolean;
	readonly touch: boolean;
	/** `prefers-reduced-motion: reduce`. */
	readonly reducedMotion: boolean;
	/** `navigator.connection.saveData`. */
	readonly saveData: boolean;
}

const EMPTY: DeviceCapabilities = {
	backend: "none",
	webgpu: false,
	webgl2: false,
	cores: 1,
	memoryGB: null,
	maxTextureSize: 0,
	devicePixelRatio: 1,
	mobile: false,
	touch: false,
	reducedMotion: false,
	saveData: false,
};

/** `true` when we are in a browser-like environment with a DOM. */
export function hasDom(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

interface WebGLProbe {
	supported: boolean;
	maxTextureSize: number;
}

let webglProbe: WebGLProbe | null = null;

function probeWebGL2(): WebGLProbe {
	if (webglProbe !== null) return webglProbe;
	if (!hasDom()) return { supported: false, maxTextureSize: 0 };
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2");
		if (!gl) {
			webglProbe = { supported: false, maxTextureSize: 0 };
			return webglProbe;
		}
		const maxTextureSize = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 4096;
		// Release the probe context immediately; browsers cap concurrent contexts.
		gl.getExtension("WEBGL_lose_context")?.loseContext();
		webglProbe = { supported: true, maxTextureSize };
	} catch {
		webglProbe = { supported: false, maxTextureSize: 0 };
	}
	return webglProbe;
}

interface NavigatorExtras {
	deviceMemory?: number;
	connection?: { saveData?: boolean };
	maxTouchPoints?: number;
}

function envInfo() {
	const nav = (typeof navigator === "undefined" ? {} : navigator) as NavigatorExtras;
	const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
	return {
		cores: Math.max(1, (typeof navigator === "undefined" ? 1 : navigator.hardwareConcurrency) || 1),
		memoryGB: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
		saveData: nav.connection?.saveData === true,
		devicePixelRatio: hasDom() ? window.devicePixelRatio || 1 : 1,
		mobile:
			/AAndroid|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) ||
			((nav.maxTouchPoints ?? 0) > 0 && /Macintosh/.test(ua)),
		touch: hasDom() ? (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window : false,
		reducedMotion: hasDom()
			? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
			: false,
	};
}

/**
 * Synchronous capability probe. Cheap and never async: WebGPU presence is
 * detected but no adapter is requested, so `webgpu` may be optimistic.
 */
export function detectCapabilitiesSync(): DeviceCapabilities {
	if (!hasDom()) return EMPTY;
	const gl = probeWebGL2();
	const env = envInfo();
	const gpuPresent = typeof navigator !== "undefined" && "gpu" in navigator;
	return {
		backend: gl.supported ? "webgl2" : "none",
		webgpu: gpuPresent,
		webgl2: gl.supported,
		cores: env.cores,
		memoryGB: env.memoryGB,
		maxTextureSize: gl.maxTextureSize,
		devicePixelRatio: env.devicePixelRatio,
		mobile: env.mobile,
		touch: env.touch,
		reducedMotion: env.reducedMotion,
		saveData: env.saveData,
	};
}

/**
 * Full capability probe. Requests a WebGPU adapter, so it is async and should
 * be awaited once during boot (the result is cached).
 */
export async function detectCapabilities(): Promise<DeviceCapabilities> {
	const base = detectCapabilitiesSync();
	if (!hasDom()) return base;

	let webgpu = false;
	try {
		const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
		if (gpu) webgpu = (await gpu.requestAdapter()) !== null;
	} catch {
		webgpu = false;
	}

	return {
		...base,
		webgpu,
		backend: webgpu ? "webgpu" : base.webgl2 ? "webgl2" : "none",
	};
}

/** Live-updating reduced-motion subscription. Returns an unsubscribe function. */
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
	if (!hasDom() || !window.matchMedia) return () => {};
	const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
	const handler = (e: MediaQueryListEvent) => cb(e.matches);
	mq.addEventListener("change", handler);
	return () => mq.removeEventListener("change", handler);
}
