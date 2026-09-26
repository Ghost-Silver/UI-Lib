import {
	type Disposable,
	Disposer,
	type FrameInfo,
	type GpuBackend,
	getResourceSnapshot,
	getScheduler,
	onReducedMotionChange,
	PointerTracker,
	QualityManager,
	type QualityTier,
	type ResourceHandle,
	type ResourceSnapshot,
	resourceRegistry,
} from "@ui-lib/core";
import type { ParticleSystem } from "@ui-lib/particles";
import {
	createPostProcessing,
	type PostProcessing,
	type PostProcessingOptions,
} from "@ui-lib/post";
import {
	createFullscreenQuad,
	createLiquidGlassMaterial,
	type LiquidGlassMaterial,
	type SharedUniforms,
} from "@ui-lib/shaders";
import { uniform } from "three/tsl";
import {
	LinearSRGBColorSpace,
	Mesh,
	MeshBasicMaterial,
	NoToneMapping,
	type Object3D,
	OrthographicCamera,
	PerspectiveCamera,
	PlaneGeometry,
	RenderPipeline,
	Scene,
	Vector2,
	Vector3,
	WebGLRenderTarget,
} from "three/webgpu";
import {
	type BackdropInstance,
	type BackdropSpec,
	createBackdrop,
	DEFAULT_BACKDROP,
} from "./backdrop.js";
import { createRenderer, type UiRenderer } from "./createRenderer.js";

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
	/** TSL post chain. Pass `false` to keep the raw scene output. */
	post?: PostProcessingOptions | false;
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
	/** Called after a GPU device/context loss; the owner should recreate the layer. */
	onDeviceLost?: (error: Error) => void;
	onContextRestored?: () => void;
}

export interface ParticleLayerOptions {
	/** Camera position in particle world units. */
	cameraPosition?: [number, number, number];
	/** Camera target in particle world units. */
	cameraTarget?: [number, number, number];
	fov?: number;
}

export interface GlassLayerStats {
	backend: GpuBackend;
	tier: QualityTier;
	fps: number;
	droppedFrames: number;
	longFrames: number;
	dpr: number;
	panels: number;
	visiblePanels: number;
	width: number;
	height: number;
	bufferWidth: number;
	bufferHeight: number;
	reducedMotion: boolean;
	/** Logical owned-resource counts; this is not a VRAM estimate. */
	resources: ResourceSnapshot;
}

interface Panel {
	element: HTMLElement;
	mesh: Mesh;
	material: LiquidGlassMaterial;
	resource: ResourceHandle;
	options: Required<GlassPanelOptions>;
	userVisible: boolean;
	onScreen: boolean;
}

interface WorldVelocitySample {
	readonly screen: Vector2;
	initialized: boolean;
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
 *   uses three's shared viewport texture for the glass pass. Particle effects
 *   are drawn between those two passes and are refracted too. DOM content is
 *   layered *above* the canvas, which is exactly how the "text on glass" look is built.
 * - **Everything is reactive to layout.** Element rects are re-read on scroll,
 *   resize and `ResizeObserver` signals rather than assumed static.
 */
export class GlassLayer implements Disposable {
	readonly canvas: HTMLCanvasElement;

	private readonly ui: UiRenderer;
	private readonly disposer = new Disposer();
	private readonly resource = resourceRegistry.track("layer");
	private readonly quality: QualityManager;

	private readonly sharedTime = uniform(0);
	private readonly sharedResolution = uniform(new Vector2(1, 1));
	private readonly sharedPointer = uniform(new Vector2(-1e5, -1e5));
	private readonly shared: SharedUniforms;

	private readonly glassScene = new Scene();
	private readonly glassCamera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
	private readonly backdropScene = new Scene();
	private readonly particleScene = new Scene();
	private readonly particleCamera = new PerspectiveCamera(52, 1, 0.1, 100);
	private readonly panelGeometry = new PlaneGeometry(1, 1);
	private readonly particleSystems = new Set<ParticleSystem>();
	private readonly particleStops = new Map<ParticleSystem, () => void>();
	private readonly particleResources = new Map<ParticleSystem, ResourceHandle>();
	private readonly worldStops = new Map<Object3D, () => void>();
	private readonly worldResources = new Map<Object3D, ResourceHandle>();
	private readonly worldAnimations = new Set<Object3D>();
	private readonly worldVelocitySamples = new Map<Object3D, WorldVelocitySample>();
	private readonly worldPosition = new Vector3();
	private readonly projectedWorldPosition = new Vector3();
	private readonly panels = new Set<Panel>();
	private readonly resizeObserver: ResizeObserver;

	private backdrop: BackdropInstance;
	private backdropResource: ResourceHandle | null = null;
	private readonly backdropQuad: ReturnType<typeof createFullscreenQuad>;
	/** Background renders into this off-screen target; glass samples it directly. */
	private readonly backdropRT = new WebGLRenderTarget(1, 1);
	private readonly presentScene = new Scene();
	private readonly presentQuad: ReturnType<typeof createFullscreenQuad>;
	private postOptions: PostProcessingOptions | false = {};
	private postProcessing: PostProcessing | null = null;
	private postPipeline: RenderPipeline | null = null;
	private postResource: ResourceHandle | null = null;
	private pointer: PointerTracker | null = null;

	private width = 0;
	private height = 0;
	private dpr = 1;
	private dirty = true;
	private reducedMotion = false;
	private statsAccum = 0;
	private hasRendered = false;
	private readonly lastPointer = new Vector2(Number.NaN, Number.NaN);
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
				this.rebuildPostProcessing();
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
		this.backdropResource = resourceRegistry.track("backdrop");
		this.backdropQuad = createFullscreenQuad(this.backdrop.material);
		this.backdropScene.add(this.backdropQuad.mesh);
		this.presentQuad = createFullscreenQuad(
			new MeshBasicMaterial({ map: this.backdropRT.texture }),
		);
		this.presentScene.add(this.presentQuad.mesh);
		this.setPostProcessing(options.post ?? {});

		this.particleCamera.position.set(0, 0, 14);
		this.particleCamera.lookAt(0, 0, 0);
		this.postProcessing?.setDepthRange(this.particleCamera.near, this.particleCamera.far);

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
			for (const [system, stop] of this.particleStops) {
				stop();
				system.dispose();
				this.particleResources.get(system)?.dispose();
			}
			this.particleStops.clear();
			this.particleResources.clear();
			this.particleSystems.clear();
			for (const [object, stop] of this.worldStops) {
				stop();
				this.particleScene.remove(object);
				this.worldResources.get(object)?.dispose();
			}
			this.worldStops.clear();
			this.worldResources.clear();
			this.worldAnimations.clear();
			this.worldVelocitySamples.clear();
		});
		this.disposer.add(() => {
			for (const panel of [...this.panels]) this.destroyPanel(panel);
			this.panels.clear();
		});
		this.disposer.add(() => this.backdrop.dispose());
		this.disposer.add(() => this.backdropResource?.dispose());
		this.disposer.add(() => this.backdropQuad.dispose());
		this.disposer.add(() => this.backdropRT.dispose());
		this.disposer.add(() => this.presentQuad.dispose());
		this.disposer.add(() => this.postPipeline?.dispose());
		this.disposer.add(() => this.postProcessing?.dispose());
		this.disposer.add(() => this.postResource?.dispose());
		this.disposer.add(() => this.panelGeometry.dispose());
		this.disposer.add(() => this.resource.dispose());
		this.disposer.add(() => this.ui.dispose());

		this.syncViewport(true);
		this.stopFrame = getScheduler().add(this.frame, "render");
	}

	static async create(options: GlassLayerOptions = {}): Promise<GlassLayer> {
		const ui = await createRenderer({
			antialias: options.antialias,
			forceWebGL: options.forceWebGL,
			onDeviceLost: (info) => {
				const message = `${info.api} device/context lost: ${info.message}`;
				options.onDeviceLost?.(new Error(message));
			},
			onContextRestored: options.onContextRestored,
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
		const scheduler = getScheduler();
		return {
			backend: this.ui.backend,
			tier: this.quality.tier,
			fps: scheduler.fps,
			droppedFrames: scheduler.droppedFrames,
			longFrames: scheduler.longFrames,
			dpr: this.dpr,
			panels: this.panels.size,
			visiblePanels: onScreen,
			width: this.width,
			height: this.height,
			bufferWidth: Math.round(this.width * this.dpr),
			bufferHeight: Math.round(this.height * this.dpr),
			reducedMotion: this.reducedMotion,
			resources: getResourceSnapshot(),
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

	/**
	 * Attach a GPU particle system behind the glass panels. Simulation is
	 * registered at the scheduler's `compute` priority, so every particle system
	 * advances before the layer's single draw pass. The returned handle owns the
	 * system and disposes it on removal.
	 */
	addParticles(system: ParticleSystem, options: ParticleLayerOptions = {}): Disposable {
		const position = options.cameraPosition ?? [0, 0, 14];
		const target = options.cameraTarget ?? [0, 0, 0];
		this.particleCamera.position.set(...position);
		this.particleCamera.fov = options.fov ?? 52;
		this.particleCamera.lookAt(...target);
		this.particleCamera.updateProjectionMatrix();
		this.postProcessing?.setDepthRange(this.particleCamera.near, this.particleCamera.far);

		this.particleScene.add(system.object);
		this.particleSystems.add(system);
		system.reset(this.ui.renderer);

		const stop = getScheduler().add((info) => {
			if (!this.reducedMotion && this.quality.tier > 0) system.step(this.ui.renderer, info.dt);
		}, "compute");
		this.particleStops.set(system, stop);
		this.particleResources.set(system, resourceRegistry.track("particle-system"));

		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				stop();
				this.particleStops.delete(system);
				this.particleSystems.delete(system);
				this.particleScene.remove(system.object);
				system.dispose();
				this.particleResources.get(system)?.dispose();
				this.particleResources.delete(system);
			},
		};
	}

	/**
	 * Add a regular three Object3D to the world/effects scene behind DOM glass.
	 * The optional callback runs on the shared scheduler, so examples can animate
	 * a hero object without creating a second requestAnimationFrame loop.
	 */
	addWorldObject(object: Object3D, onFrame?: (info: FrameInfo) => void): Disposable {
		this.particleScene.add(object);
		this.worldVelocitySamples.set(object, {
			screen: new Vector2(),
			initialized: false,
		});
		if (onFrame) this.worldAnimations.add(object);
		const stop = onFrame ? getScheduler().add(onFrame, "update") : () => {};
		this.worldStops.set(object, stop);
		this.worldResources.set(object, resourceRegistry.track("world-object"));
		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				stop();
				this.worldStops.delete(object);
				this.worldAnimations.delete(object);
				this.worldVelocitySamples.delete(object);
				this.particleScene.remove(object);
				this.worldResources.get(object)?.dispose();
				this.worldResources.delete(object);
			},
		};
	}

	setPostProcessing(options: PostProcessingOptions | false): void {
		this.postOptions = options;
		if (options !== false && this.postProcessing !== null && this.postPipeline !== null) {
			this.postProcessing.update(options);
			this.markDirty();
			return;
		}
		this.rebuildPostProcessing();
	}

	private postQuality(): 1 | 2 | 3 {
		if (this.quality.tier <= 1) return 1;
		return this.quality.tier === 2 ? 2 : 3;
	}

	private rebuildPostProcessing(): void {
		this.postPipeline?.dispose();
		this.postProcessing?.dispose();
		this.postResource?.dispose();
		this.postPipeline = null;
		this.postProcessing = null;
		this.postResource = null;

		if (this.postOptions !== false && this.quality.settings.allowPostFx) {
			const post = createPostProcessing({
				...this.postOptions,
				quality: this.postQuality(),
			});
			const pipeline = new RenderPipeline(this.ui.renderer);
			pipeline.outputNode = post.outputNode;
			pipeline.needsUpdate = true;
			this.postProcessing = post;
			this.postPipeline = pipeline;
			this.postResource = resourceRegistry.track("post-graph");
			post.setDepthRange(this.particleCamera.near, this.particleCamera.far);
			post.setSize(Math.max(1, this.width * this.dpr), Math.max(1, this.height * this.dpr));
		}
		this.markDirty();
	}

	setBackdrop(spec: BackdropSpec): void {
		const previous = this.backdrop;
		const previousResource = this.backdropResource;
		this.backdrop = createBackdrop(spec, this.shared);
		this.backdropResource = resourceRegistry.track("backdrop");
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
		previousResource?.dispose();
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

	private createPanel(element: HTMLElement, options: Required<GlassPanelOptions>): Panel {
		const material = this.createPanelMaterial(options);
		const mesh = new Mesh(this.panelGeometry, material);
		mesh.frustumCulled = false;
		mesh.visible = false;
		this.glassScene.add(mesh);
		const panel: Panel = {
			element,
			mesh,
			material,
			resource: resourceRegistry.track("panel"),
			options,
			userVisible: true,
			onScreen: false,
		};
		this.applyPanelOptions(panel);
		return panel;
	}

	private createPanelMaterial(options: Required<GlassPanelOptions>): LiquidGlassMaterial {
		// Always sample an explicit backdrop target, never the live framebuffer:
		// `viewportSharedTexture` reads the color buffer that is being written,
		// a read-after-write that fails WebGPU's strict pass validation (and
		// clashes with antialiasing's sample count). The backdropRT is rendered
		// in `renderFrame`. See docs/review-ui-lib-gpu-blackout.md.
		const material = createLiquidGlassMaterial(
			{
				backdrop: this.backdropRT.texture,
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
		u.lightDirection.value.set(
			panel.options.lightDirection[0],
			panel.options.lightDirection[1],
		);
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
		panel.resource.dispose();
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
		this.particleCamera.aspect = width / Math.max(height, 1);
		this.particleCamera.updateProjectionMatrix();

		const bufferWidth = Math.max(1, Math.round(width * dpr));
		const bufferHeight = Math.max(1, Math.round(height * dpr));
		this.sharedResolution.value.set(bufferWidth, bufferHeight);
		this.backdropRT.setSize(bufferWidth, bufferHeight);
		for (const sample of this.worldVelocitySamples.values()) sample.initialized = false;
		this.postProcessing?.setSize(bufferWidth, bufferHeight);
		this.postProcessing?.setWorldVelocity([0, 0]);

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

	private reportStats(dt: number): void {
		this.statsAccum += dt;
		if (this.statsAccum >= STATS_INTERVAL) {
			this.statsAccum = 0;
			this.onStats?.(this.getStats());
		}
	}

	private frame = (info: FrameInfo): void => {
		this.quality.sample(info.dt);

		if (!this.reducedMotion) {
			this.sharedTime.value += info.dt;
			this.postProcessing?.step(info.dt);
		}

		if (this.pointer) {
			this.pointer.update(info.dt);
			this.sharedPointer.value.set(
				this.pointer.smoothX * this.dpr,
				this.pointer.smoothY * this.dpr,
			);
		}
		const pointerChanged =
			Number.isNaN(this.lastPointer.x) ||
			this.lastPointer.distanceToSquared(this.sharedPointer.value) > 0.01;
		this.lastPointer.copy(this.sharedPointer.value);

		this.syncViewport();
		const layoutWasDirty = this.dirty;
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

		const hasAnimatedSources =
			!this.reducedMotion &&
			(this.backdrop.animated ||
				this.particleSystems.size > 0 ||
				this.worldAnimations.size > 0);
		if (!layoutWasDirty && this.hasRendered && !hasAnimatedSources && !pointerChanged) {
			// The framebuffer and both TAA histories already contain the finished
			// image. Do not rerun the post graph or copy history on a truly static
			// page; the scheduler remains alive for future pointer/layout activity.
			this.reportStats(info.dt);
			return;
		}

		this.renderFrame();
		this.hasRendered = true;
		this.reportStats(info.dt);
	};

	private updateWorldVelocity(): void {
		if (this.postProcessing === null || this.worldVelocitySamples.size === 0) {
			this.postProcessing?.setWorldVelocity([0, 0]);
			return;
		}

		const bufferWidth = Math.max(1, this.sharedResolution.value.x);
		const bufferHeight = Math.max(1, this.sharedResolution.value.y);
		let velocityX = 0;
		let velocityY = 0;
		let largestSpeed = 0;

		for (const [object, sample] of this.worldVelocitySamples) {
			object.updateMatrixWorld(true);
			object.getWorldPosition(this.worldPosition);
			this.projectedWorldPosition.copy(this.worldPosition).project(this.particleCamera);
			const currentX = this.projectedWorldPosition.x * bufferWidth * 0.5;
			const currentY = -this.projectedWorldPosition.y * bufferHeight * 0.5;

			if (sample.initialized) {
				const dx = currentX - sample.screen.x;
				const dy = currentY - sample.screen.y;
				const speed = dx * dx + dy * dy;
				// A max-magnitude representative is more useful for a hero than an
				// average that would cancel two objects travelling in opposite ways.
				if (speed > largestSpeed) {
					largestSpeed = speed;
					velocityX = dx;
					velocityY = dy;
				}
			}

			sample.screen.set(currentX, currentY);
			sample.initialized = true;
		}

		// Clamp extreme tab-resume / teleport jumps: reactive rejection handles
		// the discontinuity, while a huge reprojection offset would sample outside
		// the history texture and create a bright edge smear.
		const maxVelocity = Math.max(bufferWidth, bufferHeight) * 0.18;
		const speed = Math.hypot(velocityX, velocityY);
		if (speed > maxVelocity) {
			const scale = maxVelocity / speed;
			velocityX *= scale;
			velocityY *= scale;
		}
		this.postProcessing.setWorldVelocity([velocityX, velocityY]);
	}

	private renderFrame(): void {
		const { renderer } = this.ui;
		const previousToneMapping = renderer.toneMapping;
		const previousColorSpace = renderer.outputColorSpace;
		const usesPost = this.postPipeline !== null && this.postProcessing !== null;

		renderer.autoClear = false;

		// Keep the intermediate buffers in working-linear space. The RenderPipeline
		// applies tone mapping and the output colour transform exactly once after the
		// bloom / aberration / grain nodes have sampled it.
		if (usesPost) {
			renderer.toneMapping = NoToneMapping;
			renderer.outputColorSpace = LinearSRGBColorSpace;
		}

		// 1. Backdrop + world objects render into a dedicated off-screen target.
		//    Glass samples this target directly (never the live framebuffer), so
		//    WebGPU sees no read-after-write and no MSAA sample-count clash.
		renderer.setRenderTarget(this.backdropRT);
		renderer.clear(true, true, false);
		renderer.render(this.backdropScene, this.backdropQuad.camera);

		// Update object motion before applying this frame's camera jitter. The
		// velocity is measured in the unjittered camera and consumed only by the
		// depth-backed world branch of the post history lookup.
		if (usesPost) this.updateWorldVelocity();

		// 2. World effects are jittered by a short Halton sequence when temporal
		//    accumulation is active. The DOM-attached glass camera stays unjittered,
		//    so text and panel edges never swim while particles / hero geometry get
		//    true sub-pixel coverage over several frames.
		const hasWorldObjects = this.particleSystems.size > 0 || this.worldStops.size > 0;
		let jitteredWorld = false;
		if (usesPost && hasWorldObjects && !this.reducedMotion) {
			const jitter = this.postProcessing?.nextJitter() ?? [0, 0];
			const bufferWidth = Math.max(1, Math.round(this.sharedResolution.value.x));
			const bufferHeight = Math.max(1, Math.round(this.sharedResolution.value.y));
			this.particleCamera.setViewOffset(
				bufferWidth,
				bufferHeight,
				jitter[0],
				jitter[1],
				bufferWidth,
				bufferHeight,
			);
			jitteredWorld = true;
		}
		if (hasWorldObjects) {
			renderer.render(this.particleScene, this.particleCamera);
			if (jitteredWorld) this.particleCamera.clearViewOffset();
		}
		renderer.setRenderTarget(null);

		// 3. Screen base = the rendered backdrop (also the glass refraction source).
		renderer.clear(true, true, false);
		renderer.render(this.presentScene, this.presentQuad.camera);

		// 4. Glass panels on top, sampling `backdropRT` in a separate render call.
		renderer.render(this.glassScene, this.glassCamera);

		// 5. The final canvas image becomes a TSL input. Put the renderer's output
		// settings back before `_update()` so RenderPipeline captures the real
		// target transform and applies tone mapping / sRGB exactly once.
		if (usesPost) {
			renderer.toneMapping = previousToneMapping;
			renderer.outputColorSpace = previousColorSpace;
			this.postPipeline?.render();
			this.postProcessing?.commit(renderer);
		}

		renderer.toneMapping = previousToneMapping;
		renderer.outputColorSpace = previousColorSpace;
	}
}

/** Convenience factory mirroring {@link GlassLayer.create}. */
export function createGlassLayer(options: GlassLayerOptions = {}): Promise<GlassLayer> {
	// Kept as a function so the public API does not expose the class constructor.
	return GlassLayer.create(options);
}
