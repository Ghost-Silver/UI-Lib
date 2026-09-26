import { Mesh, OrthographicCamera, PlaneGeometry, Scene, Vector2 } from "three/webgpu";
import { uniform } from "three/tsl";
import {
	Disposer,
	PointerTracker,
	QualityManager,
	getScheduler,
	onReducedMotionChange,
	type Disposable,
	type FrameInfo,
	type GpuBackend,
	type QualityTier,
} from "@ui-lib/core";
import {
	createFullscreenQuad,
	createLiquidGlassMaterial,
	type LiquidGlassMaterial,
	type SharedUniforms,
} from "@ui-lib/shaders";
import { createRenderer, type UiRenderer } from "./createRenderer.js";
import {
	DEFAULT_BACKDROP,
	createBackdrop,
	type BackdropInstance,
	type BackdropSpec,
} from "./backdrop.js";

/** Panel tuning knobs, all in **CSS pixels** — the layer scales them by DPR. */
export interface GlassPanelOptions {
	radius?: number;
	bevel?: number;
	refraction?: number;
	shift?: [number, number];
	dispersion?: number;
	roughness?: number;
	frost?: number;
	tint?: string;
	tintAmount?: number;
	saturation?: number;
	brightness?: number;
	contrast?: number;
	highlight?: string;
	specular?: number;
	shininess?: number;
	fresnel?: number;
	fresnelPower?: number;
	edgeGlow?: number;
	lightDirection?: [number, number];
	grain?: number;
	opacity?: number;
	pointerStrength?: number;
	pointerRadius?: number;
	/** Stacking order between panels (higher draws later). */
	z?: number;
}

export const GLASS_PANEL_DEFAULTS: Required<GlassPanelOptions> = {
	radius: 28,
	bevel: 24,
	refraction: 42,
	shift: [0, 0],
	dispersion: 0.28,
	roughness: 0.22,
	frost: 22,
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
	pointerStrength: 0.3,
	pointerRadius: 320,
	z: 0,
};

export interface GlassPanelHandle extends Disposable {
	readonly element: HTMLElement;
	update(options: Partial<GlassPanelOptions>): void;
	setVisible(visible: boolean): void;
	readonly visible: boolean;
}

export interface GlassLayerOptions {
	/** Stacking context of the generated canvas. Content should sit above it. */
	zIndex?: number;
	parent?: HTMLElement;
	backdrop?: BackdropSpec;
	dprCap?: number;
	antialias?: boolean;
	forceWebGL?: boolean;
	tier?: QualityTier | "auto";
	autoQuality?: boolean;
	/** Track the pointer and feed it to materials as a specular bloom. */
	pointer?: boolean;
	/** Re-read element rects every frame instead of on layout/scroll changes. */
	alwaysSyncLayout?: boolean;
	onStats?: (stats: GlassLayerStats) => void;
}

export interface GlassLayerStats {
	backend: GpuBackend;
	tier: QualityTier;
	fps: number;
	dpr: number;
	panels: number;
	visiblePanels: number;
	width: number;
	height: number;
	bufferWidth: number;
	bufferHeight: number;
	reducedMotion: boolean;
}

interface Panel {
	element: HTMLElement;
	mesh: Mesh;
	material: LiquidGlassMaterial;
	options: Required<GlassPanelOptions>;
	userVisible: boolean;
	onScreen: boolean;
}

const OFFSCREEN_MARGIN = 96;
const STATS_INTERVAL = 0.25;

/**
 * The DOM-attached glass layer: one fixed, pointer-transparent canvas that
 * renders the backdrop plus every registered glass panel.
 *
 * Design notes:
 *
 * - **One canvas for the whole page.** N glass effects do not mean N WebGPU
 *   contexts (browsers cap those hard, usually around 8–16).
 * - **The backdrop is ours.** True refraction needs pixels to bend, and only
 *   content we render can be sampled — so the layer owns the backdrop pass and
 *   renders it into a target that the panels refract. DOM content is layered
 *   *above* the canvas, which is exactly how the "text on glass" look is built.
 * - **Everything is reactive to layout.** Element rects are re-read on scroll,
 *   resize and `ResizeObserver` signals rather than assumed static.
 */
export class GlassLayer implements Disposable {
	readonly canvas: HTMLCanvasElement;

	private readonly ui: UiRenderer;
	private readonly disposer = new Disposer();
	private readonly quality: QualityManager;

	private readonly sharedTime = uniform(0);
	private readonly sharedResolution = uniform(new Vector2(1, 1));
	private readonly sharedPointer = uniform(new Vector2(-1e5, -1e5));
	private readonly shared: SharedUniforms;

	private readonly glassScene = new Scene();
	private readonly glassCamera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
	private readonly backdropScene = new Scene();
	private readonly panelGeometry = new PlaneGeometry(1, 1);
	private readonly panels = new Set<Panel>();
	private readonly resizeObserver: ResizeObserver;

	private backdrop: BackdropInstance;
	private readonly backdropQuad: ReturnType<typeof createFullscreenQuad>;
	private pointer: PointerTracker | null = null;

	private width = 0;
	private height = 0;
	private dpr = 1;
	private dirty = true;
	private reducedMotion = false;
	private statsAccum = 0;
	private stopFrame: (() => void) | null = null;
	private readonly onStats?: (stats: GlassLayerStats) => void;

	private constructor(ui: UiRenderer, options: GlassLayerOptions) {
		this.ui = ui;
		this.canvas = ui.canvas;
		this.onStats = options.onStats;

		this.quality = new QualityManager({
			tier: options.tier ?? "auto",
			auto: options.autoQuality ?? true,
			capabilities: ui.capabilities,
			onChange: (settings, previous) => {
				// Blur tap count is baked into the shader graph, so a tier change
				// rebuilds the materials with the new budget.
				this.rebuildPanelMaterials();
				this.dirty = true;
				if (typeof console !== "undefined" && previous !== settings.tier) {
					console.info(`[ui-lib] quality tier ${previous} → ${settings.tier}`);
				}
			},
		});

		this.shared = {
			time: this.sharedTime,
			resolution: this.sharedResolution,
			pointer: this.sharedPointer,
		};

		this.backdrop = createBackdrop(options.backdrop ?? DEFAULT_BACKDROP, this.shared);
		this.backdropQuad = createFullscreenQuad(this.backdrop.material);
		this.backdropScene.add(this.backdropQuad.mesh);

		this.applyCanvasStyles(options);
		const parent = options.parent ?? document.body;
		parent.appendChild(this.canvas);
		this.disposer.add(() => this.canvas.remove());

		this.reducedMotion = ui.capabilities.reducedMotion;
		this.disposer.add(onReducedMotionChange((reduced) => (this.reducedMotion = reduced)));

		this.resizeObserver = new ResizeObserver(() => this.markDirty());
		this.disposer.own({ dispose: () => this.resizeObserver.disconnect() });
		if (options.alwaysSyncLayout !== true) {
			this.resizeObserver.observe(document.documentElement);
		}
		this.disposer.listen(window, "scroll", () => this.markDirty(), {
			passive: true,
			capture: true,
		});
		this.disposer.listen(window, "resize", () => this.markDirty(), { passive: true });

		if (options.pointer !== false) {
			this.pointer = new PointerTracker(window, { smoothing: 14 });
			this.disposer.own(this.pointer);
		}

		this.disposer.add(() => {
			for (const panel of [...this.panels]) this.destroyPanel(panel);
			this.panels.clear();
		});
		this.disposer.add(() => this.backdrop.dispose());
		this.disposer.add(() => this.backdropQuad.dispose());
		this.disposer.add(() => this.panelGeometry.dispose());
		this.disposer.add(() => this.ui.dispose());

		this.syncViewport(true);
		this.stopFrame = getScheduler().add(this.frame, "render");
	}

	static async create(options: GlassLayerOptions = {}): Promise<GlassLayer> {
		const ui = await createRenderer({
			antialias: options.antialias,
			forceWebGL: options.forceWebGL,
		});
		return new GlassLayer(ui, options);
	}

	private applyCanvasStyles(options: GlassLayerOptions): void {
		const style = this.canvas.style;
		style.position = "fixed";
		style.top = "0";
		style.left = "0";
		style.width = "100%";
		style.height = "100%";
		style.pointerEvents = "none";
		style.display = "block";
		style.zIndex = String(options.zIndex ?? 0);
		// Decorative: never expose the canvas to assistive technology.
		this.canvas.setAttribute("aria-hidden", "true");
	}

	/* ------------------------------------------------------------- public -- */

	get backend(): GpuBackend {
		return this.ui.backend;
	}

	get tier(): QualityTier {
		return this.quality.tier;
	}

	getStats(): GlassLayerStats {
		let onScreen = 0;
		for (const panel of this.panels) if (panel.mesh.visible) onScreen++;
		return {
			backend: this.ui.backend,
			tier: this.quality.tier,
			fps: getScheduler().fps,
			dpr: this.dpr,
			panels: this.panels.size,
			visiblePanels: onScreen,
			width: this.width,
			height: this.height,
			bufferWidth: Math.round(this.width * this.dpr),
			bufferHeight: Math.round(this.height * this.dpr),
			reducedMotion: this.reducedMotion,
		};
	}

	register(element: HTMLElement, options: Partial<GlassPanelOptions> = {}): GlassPanelHandle {
		const max = this.quality.settings.maxPanels;
		if (this.panels.size >= max) {
			console.warn(
				`[ui-lib] panel budget exhausted (${max} at tier ${this.quality.tier}); new panel will not render.`,
			);
		}

		const panel = this.createPanel(element, { ...GLASS_PANEL_DEFAULTS, ...options });
		this.panels.add(panel);
		this.resizeObserver.observe(element);
		this.markDirty();

		return {
			element,
			get visible() {
				return panel.userVisible;
			},
			update: (patch) => {
				Object.assign(panel.options, patch);
				this.applyPanelOptions(panel);
				this.markDirty();
			},
			setVisible: (visible) => {
				panel.userVisible = visible;
				this.markDirty();
			},
			dispose: () => {
				this.resizeObserver.unobserve(element);
				this.destroyPanel(panel);
				this.panels.delete(panel);
			},
		};
	}

	setBackdrop(spec: BackdropSpec): void {
		const previous = this.backdrop;
		this.backdrop = createBackdrop(spec, this.shared);
		this.backdropQuad.mesh.material = this.backdrop.material;
		if (spec.type === "texture") {
			const material = this.backdrop.material as unknown as {
				viewportAspect?: { value: number };
				imageAspect?: { value: number };
			};
			if (material.viewportAspect) material.viewportAspect.value = this.width / this.height;
			const img = spec.texture.image as { width?: number; height?: number } | undefined;
			if (material.imageAspect && img?.width && img?.height) {
				material.imageAspect.value = img.width / img.height;
			}
		}
		previous.dispose();
		this.markDirty();
	}

	markDirty(): void {
		this.dirty = true;
	}

	dispose(): void {
		this.stopFrame?.();
		this.stopFrame = null;
		this.disposer.dispose();
	}

	/* ------------------------------------------------------------ private -- */

	private createPanel(
		element: HTMLElement,
		options: Required<GlassPanelOptions>,
	): Panel {
		const material = this.createPanelMaterial(options);
		const mesh = new Mesh(this.panelGeometry, material);
		mesh.frustumCulled = false;
		mesh.visible = false;
		this.glassScene.add(mesh);
		const panel: Panel = { element, mesh, material, options, userVisible: true, onScreen: false };
		this.applyPanelOptions(panel);
		return panel;
	}

	private createPanelMaterial(
		options: Required<GlassPanelOptions>,
	): LiquidGlassMaterial {
		const material = createLiquidGlassMaterial(
			{
				size: [1, 1],
				radius: options.radius,
				bevel: options.bevel,
				refraction: options.refraction,
				shift: options.shift,
				dispersion: options.dispersion,
				roughness: options.roughness,
				frost: options.frost,
				tint: options.tint,
				tintAmount: options.tintAmount,
				saturation: options.saturation,
				brightness: options.brightness,
				contrast: options.contrast,
				highlight: options.highlight,
				specular: options.specular,
				shininess: options.shininess,
				fresnel: options.fresnel,
				fresnelPower: options.fresnelPower,
				edgeGlow: options.edgeGlow,
				lightDirection: options.lightDirection,
				grain: options.grain,
				opacity: options.opacity,
				pointerStrength: options.pointerStrength,
				pointerRadius: options.pointerRadius,
				blurTaps: this.quality.settings.blurTaps,
			},
			this.shared,
		);
		return material;
	}

	private applyPanelOptions(panel: Panel): void {
		panel.mesh.renderOrder = panel.options.z;
		const u = panel.material.uniforms;
		u.radius.value = panel.options.radius;
		u.bevel.value = panel.options.bevel;
		u.refraction.value = panel.options.refraction;
		u.shift.value.set(panel.options.shift[0], panel.options.shift[1]);
		u.dispersion.value = panel.options.dispersion;
		u.roughness.value = panel.options.roughness;
		u.frost.value = panel.options.frost;
		u.tint.value.set(panel.options.tint);
		u.tintAmount.value = panel.options.tintAmount;
		u.saturation.value = panel.options.saturation;
		u.brightness.value = panel.options.brightness;
		u.contrast.value = panel.options.contrast;
		u.highlight.value.set(panel.options.highlight);
		u.specular.value = panel.options.specular;
		u.shininess.value = panel.options.shininess;
		u.fresnel.value = panel.options.fresnel;
		u.fresnelPower.value = panel.options.fresnelPower;
		u.edgeGlow.value = panel.options.edgeGlow;
		u.lightDirection.value.set(panel.options.lightDirection[0], panel.options.lightDirection[1]);
		u.grain.value = panel.options.grain;
		u.opacity.value = panel.options.opacity;
		u.pointerStrength.value = panel.options.pointerStrength;
		u.pointerRadius.value = panel.options.pointerRadius;
	}

	private rebuildPanelMaterials(): void {
		for (const panel of this.panels) {
			const next = this.createPanelMaterial(panel.options);
			panel.mesh.material = next;
			panel.material.dispose();
			panel.material = next;
		}
	}

	private destroyPanel(panel: Panel): void {
		this.glassScene.remove(panel.mesh);
		panel.material.dispose();
	}

	private syncViewport(force = false): void {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const dprCap = Math.min(this.quality.settings.dprCap, Number.POSITIVE_INFINITY);
		const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

		if (!force && width === this.width && height === this.height && dpr === this.dpr) return;

		this.width = width;
		this.height = height;
		this.dpr = dpr;
		this.ui.setSize(width, height, dprCap);

		const bufferWidth = Math.max(1, Math.round(width * dpr));
		const bufferHeight = Math.max(1, Math.round(height * dpr));
		this.sharedResolution.value.set(bufferWidth, bufferHeight);

		this.glassCamera.left = -bufferWidth / 2;
		this.glassCamera.right = bufferWidth / 2;
		this.glassCamera.top = bufferHeight / 2;
		this.glassCamera.bottom = -bufferHeight / 2;
		this.glassCamera.updateProjectionMatrix();

		const imageBackdrop = this.backdrop.material as unknown as {
			viewportAspect?: { value: number };
		};
		if (imageBackdrop.viewportAspect) imageBackdrop.viewportAspect.value = width / height;

		this.dirty = true;
	}

	private syncLayout(): void {
		const { dpr, width: vw, height: vh, glassCamera } = this;
		const halfW = (glassCamera.right - glassCamera.left) / 2;
		const halfH = (glassCamera.top - glassCamera.bottom) / 2;

		for (const panel of this.panels) {
			if (!panel.userVisible) {
				panel.mesh.visible = false;
				continue;
			}
			const rect = panel.element.getBoundingClientRect();
			const w = rect.width;
			const h = rect.height;
			const offscreen =
				rect.bottom < -OFFSCREEN_MARGIN ||
				rect.top > vh + OFFSCREEN_MARGIN ||
				rect.right < -OFFSCREEN_MARGIN ||
				rect.left > vw + OFFSCREEN_MARGIN;

			if (w <= 0 || h <= 0 || offscreen) {
				panel.mesh.visible = false;
				continue;
			}

			panel.mesh.visible = true;
			const pw = w * dpr;
			const ph = h * dpr;
			panel.mesh.scale.set(pw, ph, 1);
			panel.mesh.position.set(
				(rect.left + w / 2) * dpr - halfW,
				halfH - (rect.top + h / 2) * dpr,
				panel.options.z,
			);

			const u = panel.material.uniforms;
			u.size.value.set(pw, ph);
			u.radius.value = Math.min(panel.options.radius * dpr, Math.min(pw, ph) / 2);
			u.bevel.value = Math.min(panel.options.bevel * dpr, Math.min(pw, ph) / 2);
			u.refraction.value = panel.options.refraction * dpr;
			u.frost.value = panel.options.frost * dpr;
			u.pointerRadius.value = panel.options.pointerRadius * dpr;
		}
	}

	private frame = (info: FrameInfo): void => {
		this.quality.sample(info.dt);

		if (!this.reducedMotion) this.sharedTime.value += info.dt;

		if (this.pointer) {
			this.pointer.update(info.dt);
			this.sharedPointer.value.set(
				this.pointer.smoothX * this.dpr,
				this.pointer.smoothY * this.dpr,
			);
		}

		this.syncViewport();
		if (this.dirty) {
			this.syncLayout();
			this.dirty = false;
		}

		if (this.quality.tier === 0) {
			// Tier 0 means "no usable GPU": hide the canvas entirely.
			this.canvas.style.visibility = "hidden";
			return;
		}
		this.canvas.style.visibility = "visible";

		this.renderFrame();

		this.statsAccum += info.dt;
		if (this.statsAccum >= STATS_INTERVAL) {
			this.statsAccum = 0;
			this.onStats?.(this.getStats());
		}
	};

	private renderFrame(): void {
		const { renderer } = this.ui;
		renderer.autoClear = false;
		renderer.setRenderTarget(null);
		renderer.clear(true, true, false);

		// 1. Backdrop first, straight to the screen.
		renderer.render(this.backdropScene, this.backdropQuad.camera);

		// 2. Glass next, in a separate `render()` call. `viewportSharedTexture`
		//    de-duplicates its framebuffer copy per render call, so this is one
		//    blit per frame no matter how many panels are registered — and the
		//    copy happens after the backdrop is already on screen, which is
		//    exactly what refraction needs.
		renderer.render(this.glassScene, this.glassCamera);
	}
}

/** Convenience factory mirroring {@link GlassLayer.create}. */
export function createGlassLayer(options: GlassLayerOptions = {}): Promise<GlassLayer> {
	// Kept as a function so the public API does not expose the class constructor.
	return GlassLayer.create(options);
}
