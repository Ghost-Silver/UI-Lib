import {
	type Disposable,
	Disposer,
	damp,
	type FrameInfo,
	type GpuBackend,
	getResourceSnapshot,
	getScheduler,
	mergeDefined,
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
	createWorldLensMaterial,
	type LiquidGlassMaterial,
	type SharedUniforms,
	type WorldLensMaterial,
	type WorldLensOptions,
} from "@ui-lib/shaders";
import { uniform } from "three/tsl";
import {
	ClampToEdgeWrapping,
	DepthTexture,
	LinearFilter,
	LinearSRGBColorSpace,
	type Material,
	Matrix4,
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
	type AnchorPlacement,
	clientToNdc,
	pointAtDistance,
	pointerClient,
	pointForSpan,
	rayPlanePoint,
} from "./anchor.js";
import {
	type BackdropInstance,
	type BackdropSpec,
	createBackdrop,
	DEFAULT_BACKDROP,
} from "./backdrop.js";
import { createRenderer, type UiRenderer } from "./createRenderer.js";
import { stepDepthHistory } from "./depthHistory.js";
import { stepSectionViewport } from "./sectionViewport.js";

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
	/**
	 * Mix of the shared studio probe. Looks set this. The face stays quiet;
	 * the bevel carries the window. Pages do not pass a cubemap.
	 */
	environment?: number;
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
	environment: 0.28,
	z: 0,
};

export interface GlassPanelHandle extends Disposable {
	readonly element: HTMLElement;
	update(options: Partial<GlassPanelOptions>): void;
	setVisible(visible: boolean): void;
	readonly visible: boolean;
}

/** `"viewport"` is a page overlay. `"section"` is an embed sized to `parent`. */
export type GlassLayerMode = "viewport" | "section";

export interface GlassLayerOptions {
	/** Stacking context of the generated canvas. Content should sit above it. */
	zIndex?: number;
	parent?: HTMLElement;
	/**
	 * `"viewport"` (default) covers the page with one fixed canvas.
	 * `"section"` sizes that canvas to `parent` and positions panels in the
	 * parent's coordinate space, so a hero or sticky pin owns the effect
	 * without painting over the rest of the document. Requires `parent`.
	 */
	mode?: GlassLayerMode;
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

/**
 * Where a particle system composites relative to refractive lenses.
 *
 * - `scene` — the visible world. DOM glass refracts it. Default, so existing
 *   pages keep their field.
 * - `inside` — drawn only into the lens copy. A lens reveals the motes; the
 *   page around the lens stays clear.
 * - `front` — drawn after the lens and depth-tested, so the lens occludes them.
 */
export type ParticleDepth = "scene" | "inside" | "front";

export interface ParticleLayerOptions {
	/** Camera position in particle world units. */
	cameraPosition?: [number, number, number];
	/** Camera target in particle world units. */
	cameraTarget?: [number, number, number];
	fov?: number;
	/** Defaults to `scene`. */
	depth?: ParticleDepth;
}

export interface WorldObjectOptions {
	/**
	 * Draw after the backdrop and ordinary world objects have been copied.
	 * The material can then refract that copy. Objects in this pass must not
	 * sample `backdropRT` while it is bound.
	 */
	refractive?: boolean;
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
	/** Particles currently stepped, after the tier budget. */
	particleActive: number;
	/** Particles allocated across every attached system. */
	particleAllocated: number;
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

interface AnchorFollow {
	element: HTMLElement | (() => HTMLElement | null);
	apply: (point: readonly [number, number, number]) => void;
	placement: number | AnchorPlacement | (() => number | AnchorPlacement);
	last: [number, number, number] | null;
}

/** One pointer sample. Glass, the ray and the ribbon read this in the same frame. */
export interface PointerRay {
	readonly point: readonly [number, number, number];
	/** Smoothed speed in CSS pixels per second. Zero at rest. */
	readonly speed: number;
	/** Frame delta, clamped by the caller. Followers share this clock. */
	readonly dt: number;
}

interface PointerFollow {
	apply: (ray: PointerRay) => void;
	distance: number | (() => number);
	last: [number, number, number] | null;
}

const OFFSCREEN_MARGIN = 96;
const STATS_INTERVAL = 0.25;

/**
 * The DOM-attached glass layer: one fixed, pointer-transparent canvas that
 * renders the backdrop plus every registered glass panel.
 *
 * Design notes:
 *
 * - **One canvas per stage.** N glass effects do not mean N WebGPU contexts
 *   (browsers cap those hard, usually around 8–16). Viewport mode is one
 *   canvas for the page; section mode is one canvas for the embedding element.
 * - **The backdrop is ours.** True refraction needs pixels to bend, and only
 *   content we render can be sampled. The backdrop is drawn into an offscreen
 *   target the glass samples — never the live backbuffer. Particle effects
 *   are drawn into that target and are refracted too. DOM content is layered
 *   *above* the canvas, which is how the "text on glass" look is built.
 * - **Everything is reactive to layout.** Element rects are re-read on scroll,
 *   resize and `ResizeObserver` signals rather than assumed static.
 */
export class GlassLayer implements Disposable {
	readonly canvas: HTMLCanvasElement;
	readonly mode: GlassLayerMode;

	private readonly ui: UiRenderer;
	/** The embedding element in section mode; `null` when the canvas covers the viewport. */
	readonly boundsElement: HTMLElement | null;
	private readonly bounds = { left: 0, top: 0, width: 1, height: 1 };
	private readonly cameraTarget = new Vector3(0, 0, 0);
	private pointerSeen = false;
	private readonly disposer = new Disposer();
	private readonly resource = resourceRegistry.track("layer");
	private readonly quality: QualityManager;
	private readonly qualityListeners = new Set<(tier: QualityTier, budget: number) => void>();

	private readonly sharedTime = uniform(0);
	private readonly sharedResolution = uniform(new Vector2(1, 1));
	private readonly sharedPointer = uniform(new Vector2(-1e5, -1e5));
	/** Damped tracker velocity, CSS px/s. The uniform is this times DPR. */
	private readonly pointerVelocity = new Vector2();
	private readonly sharedPointerVelocity = uniform(new Vector2());
	private readonly sharedCameraRight = uniform(new Vector3(1, 0, 0));
	private readonly sharedCameraUp = uniform(new Vector3(0, 1, 0));
	private readonly sharedCameraBack = uniform(new Vector3(0, 0, 1));
	private readonly sharedCameraFov = uniform(52);
	private readonly shared: SharedUniforms;

	private readonly glassScene = new Scene();
	private readonly glassCamera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
	private readonly backdropScene = new Scene();
	private readonly particleScene = new Scene();
	/** Motes that exist only in the lens copy, not on the page. */
	private readonly insideScene = new Scene();
	/** Motes drawn after the lens. Depth-tested so the lens occludes them. */
	private readonly frontScene = new Scene();
	/** Refractive objects. Drawn after the refraction copy is filled. */
	private readonly lensScene = new Scene();
	private readonly particleCamera = new PerspectiveCamera(52, 1, 0.1, 100);
	private readonly anchors: AnchorFollow[] = [];
	/** Same smoothed pointer the glass highlight writes, resolved to a ray. */
	private readonly pointerFollowers: PointerFollow[] = [];
	/** Systems that step after anchors resolve, so motes match the lens this frame. */
	private readonly lateParticles = new Set<ParticleSystem>();
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
	/** Perspective depth of that target. The canvas depth is only the present quad. */
	private readonly worldDepth = new DepthTexture(1, 1);
	/**
	 * Color copy of the world target taken before refractive objects draw.
	 * A lens samples this, never the attachment it is rendering into.
	 */
	private readonly refractionRT = new WebGLRenderTarget(1, 1, {
		depthBuffer: false,
		stencilBuffer: false,
	});
	private readonly refractionScene = new Scene();
	private readonly refractionBlit: ReturnType<typeof createFullscreenQuad>;
	private readonly currentVP = new Matrix4();
	private readonly previousVP = new Matrix4();
	private readonly invVP = new Matrix4();
	private vpReady = false;
	private cameraMotionBlur = false;
	private authoredMotionBlur = 0;
	private readonly motionPoint = new Vector3();
	private readonly prevTargetScreen = new Vector2();
	private readonly prevSideScreen = new Vector2();
	private motionPointsReady = false;
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
	/**
	 * True only after a frame actually drew world depth into the history.
	 * A gradient-only frame must not copy the cleared depth attachment, or the
	 * first world object disoccludes against empty depth and smears.
	 */
	private depthHistoryLive = false;
	private readonly lastPointer = new Vector2(Number.NaN, Number.NaN);
	private stopFrame: (() => void) | null = null;
	private readonly onStats?: (stats: GlassLayerStats) => void;

	private constructor(ui: UiRenderer, options: GlassLayerOptions) {
		this.mode = options.mode ?? "viewport";
		if (this.mode === "section" && !options.parent) {
			throw new Error('[ui-lib] GlassLayer mode "section" requires options.parent.');
		}
		this.boundsElement = this.mode === "section" ? (options.parent ?? null) : null;
		if (this.boundsElement && getComputedStyle(this.boundsElement).position === "static") {
			this.boundsElement.style.position = "relative";
		}

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
				this.applyParticleLod();
				this.dirty = true;
				for (const listener of this.qualityListeners) {
					listener(settings.tier, settings.particleBudget);
				}
				if (typeof console !== "undefined" && previous !== settings.tier) {
					console.info(`[ui-lib] quality tier ${previous} → ${settings.tier}`);
				}
			},
		});

		this.shared = {
			time: this.sharedTime,
			resolution: this.sharedResolution,
			pointer: this.sharedPointer,
			pointerVelocity: this.sharedPointerVelocity,
			cameraRight: this.sharedCameraRight,
			cameraUp: this.sharedCameraUp,
			cameraBack: this.sharedCameraBack,
			cameraFov: this.sharedCameraFov,
		};

		this.backdrop = createBackdrop(options.backdrop ?? DEFAULT_BACKDROP, this.shared);
		this.backdropResource = resourceRegistry.track("backdrop");
		this.backdropQuad = createFullscreenQuad(this.backdrop.material);
		this.backdropScene.add(this.backdropQuad.mesh);
		this.presentQuad = createFullscreenQuad(
			new MeshBasicMaterial({ map: this.backdropRT.texture }),
		);
		this.presentScene.add(this.presentQuad.mesh);
		this.worldDepth.name = "ui-lib:world-depth";
		this.backdropRT.depthTexture = this.worldDepth;
		this.refractionRT.texture.name = "ui-lib:refraction-source";
		this.refractionRT.texture.wrapS = ClampToEdgeWrapping;
		this.refractionRT.texture.wrapT = ClampToEdgeWrapping;
		this.refractionRT.texture.magFilter = LinearFilter;
		this.refractionRT.texture.minFilter = LinearFilter;
		this.refractionRT.texture.generateMipmaps = false;
		this.refractionRT.texture.colorSpace = this.backdropRT.texture.colorSpace;
		const blitMaterial = new MeshBasicMaterial({
			map: this.backdropRT.texture,
			toneMapped: false,
		});
		this.refractionBlit = createFullscreenQuad(blitMaterial);
		this.silenceDepth(blitMaterial);
		this.refractionScene.add(this.refractionBlit.mesh);
		// The gradient quad must not fill the depth buffer, or every fragment
		// looks like world geometry and camera reprojection smears the glass.
		this.silenceDepth(this.backdropQuad.mesh.material);
		this.silenceDepth(this.presentQuad.mesh.material);
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
			this.resizeObserver.observe(this.boundsElement ?? document.documentElement);
		}
		this.disposer.listen(window, "scroll", () => this.markDirty(), {
			passive: true,
			capture: true,
		});
		this.disposer.listen(window, "resize", () => this.markDirty(), { passive: true });

		if (options.pointer !== false) {
			this.pointer = new PointerTracker(this.boundsElement ?? window, { smoothing: 14 });
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
				this.lensScene.remove(object);
				this.worldResources.get(object)?.dispose();
			}
			this.lensScene.clear();
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
		this.disposer.add(() => this.worldDepth.dispose());
		this.disposer.add(() => this.refractionRT.dispose());
		this.disposer.add(() => this.refractionBlit.dispose());
		this.disposer.add(() => {
			const material = this.refractionBlit.mesh.material;
			if (!Array.isArray(material)) material.dispose();
		});
		this.disposer.add(() => this.presentQuad.dispose());
		this.disposer.add(() => this.postPipeline?.dispose());
		this.disposer.add(() => this.postProcessing?.dispose());
		this.disposer.add(() => this.postResource?.dispose());
		this.disposer.add(() => this.panelGeometry.dispose());
		this.disposer.add(() => {
			this.anchors.length = 0;
			this.pointerFollowers.length = 0;
			this.lateParticles.clear();
		});
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
		try {
			return new GlassLayer(ui, options);
		} catch (error) {
			ui.dispose();
			throw error;
		}
	}

	private applyCanvasStyles(options: GlassLayerOptions): void {
		const style = this.canvas.style;
		style.pointerEvents = "none";
		style.display = "block";
		if (this.mode === "section") {
			style.position = "absolute";
			style.inset = "0";
			style.width = "100%";
			style.height = "100%";
			style.zIndex = "0";
		} else {
			style.position = "fixed";
			style.top = "0";
			style.left = "0";
			style.width = "100%";
			style.height = "100%";
			style.zIndex = String(options.zIndex ?? 0);
		}
		// Decorative: never expose the canvas to assistive technology.
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.dataset.uiLibCanvas = this.mode;
	}

	/* ------------------------------------------------------------- public -- */

	get backend(): GpuBackend {
		return this.ui.backend;
	}

	get tier(): QualityTier {
		return this.quality.tier;
	}

	/** Particle ceiling for the current tier. `0` means draw none. */
	get particleBudget(): number {
		return this.quality.settings.particleBudget;
	}

	/**
	 * Fires immediately with the current tier, then again when auto quality
	 * walks the tier. Used to grow an `auto` particle buffer. The active
	 * prefix is applied here as well, so a listener is optional.
	 */
	subscribeQuality(listener: (tier: QualityTier, budget: number) => void): Disposable {
		this.qualityListeners.add(listener);
		listener(this.quality.tier, this.quality.settings.particleBudget);
		return {
			dispose: () => {
				this.qualityListeners.delete(listener);
			},
		};
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
			particleActive: this.particleActiveTotal(),
			particleAllocated: this.particleAllocatedTotal(),
			resources: getResourceSnapshot(),
		};
	}

	/** CSS-pixel bounds of the canvas. Section mode is the parent; viewport mode is the window. */
	getBounds(): { left: number; top: number; width: number; height: number } {
		return this.measureBounds();
	}

	getCamera(): {
		position: [number, number, number];
		target: [number, number, number];
		fov: number;
	} {
		return {
			position: [
				this.particleCamera.position.x,
				this.particleCamera.position.y,
				this.particleCamera.position.z,
			],
			target: [this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z],
			fov: this.particleCamera.fov,
		};
	}

	/**
	 * Move the shared world camera. Partial updates keep the previous position,
	 * target or fov. Identical values do not mark the frame dirty.
	 */
	setCamera(options: ParticleLayerOptions): void {
		let changed = false;
		if (options.cameraPosition) {
			const [x, y, z] = options.cameraPosition;
			if (
				x !== this.particleCamera.position.x ||
				y !== this.particleCamera.position.y ||
				z !== this.particleCamera.position.z
			) {
				this.particleCamera.position.set(x, y, z);
				changed = true;
			}
		}
		if (options.cameraTarget) {
			const [x, y, z] = options.cameraTarget;
			if (x !== this.cameraTarget.x || y !== this.cameraTarget.y || z !== this.cameraTarget.z) {
				this.cameraTarget.set(x, y, z);
				changed = true;
			}
		}
		if (options.fov !== undefined && options.fov !== this.particleCamera.fov) {
			this.particleCamera.fov = options.fov;
			changed = true;
		}
		if (!changed) return;
		this.particleCamera.lookAt(this.cameraTarget);
		this.particleCamera.updateProjectionMatrix();
		this.postProcessing?.setDepthRange(this.particleCamera.near, this.particleCamera.far);
		this.markDirty();
	}

	/**
	 * World point on `z = planeZ` under a client pixel.
	 *
	 * Uses the live particle camera, before this frame's TAA view-offset, so
	 * the ray matches the lens pass. A parallel ray or a hit behind the camera
	 * returns null — keep the last point.
	 */
	worldAt(clientX: number, clientY: number, planeZ = 0): [number, number, number] | null {
		return this.placeAt(clientX, clientY, { plane: planeZ });
	}

	/**
	 * Glue a callback to a DOM element's center. Applied at the start of the
	 * render phase, after viewport sync and after any update-phase `setCamera`,
	 * so registration order cannot leave the follower on last frame's camera.
	 * A number is the plane Z. An {@link AnchorPlacement} can instead lock the
	 * distance or fit the slot. Pass a getter if the node or the fit changes
	 * after registration.
	 */
	follow(
		element: HTMLElement | (() => HTMLElement | null),
		apply: (point: readonly [number, number, number]) => void,
		placement: number | AnchorPlacement | (() => number | AnchorPlacement) = 0,
	): Disposable {
		const entry: AnchorFollow = { element, apply, placement, last: null };
		this.anchors.push(entry);
		this.markDirty();
		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				const index = this.anchors.indexOf(entry);
				if (index >= 0) this.anchors.splice(index, 1);
			},
		};
	}

	/**
	 * Step this system after DOM anchors resolve instead of in the compute
	 * phase. Anchored motes then share the lens position of the frame being drawn.
	 */
	holdParticleStep(system: ParticleSystem): Disposable {
		this.lateParticles.add(system);
		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				this.lateParticles.delete(system);
			},
		};
	}

	/**
	 * World point on the shared pointer ray, `distance` units from the camera.
	 *
	 * This is the smoothed sample already written to the glass highlight this
	 * frame — not a second listener, and not a hit on a camera-facing plane.
	 * A plane runs away at the edge of the view; a fixed distance does not.
	 * Returns null until the pointer has entered, or when the stage has no area.
	 */
	pointerAt(distance: number): [number, number, number] | null {
		if (!this.pointer || !this.pointerSeen || !(distance > 0)) return null;
		const bounds = this.measureBounds();
		const [clientX, clientY] = pointerClient(
			this.pointer.smoothX,
			this.pointer.smoothY,
			bounds,
			this.boundsElement !== null,
		);
		return this.placeAt(clientX, clientY, { distance });
	}

	/**
	 * Apply the pointer ray during the render phase, after the highlight sample
	 * is written and before late particle steps. Glass, trail and attractor
	 * then read one pointer in the frame being drawn.
	 */
	followPointer(
		apply: (ray: PointerRay) => void,
		distance: number | (() => number) = 8,
	): Disposable {
		const entry: PointerFollow = { apply, distance, last: null };
		this.pointerFollowers.push(entry);
		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				const index = this.pointerFollowers.indexOf(entry);
				if (index >= 0) this.pointerFollowers.splice(index, 1);
			},
		};
	}

	private prepareAnchorCamera(): {
		left: number;
		top: number;
		width: number;
		height: number;
	} | null {
		const bounds = this.measureBounds();
		if (bounds.width < 1 || bounds.height < 1) return null;
		const aspect = bounds.width / bounds.height;
		if (Math.abs(this.particleCamera.aspect - aspect) > 1e-4) {
			this.particleCamera.aspect = aspect;
			this.particleCamera.updateProjectionMatrix();
		}
		// Jitter is applied later in the draw. A leaked offset would walk the slot.
		if (this.particleCamera.view !== null) this.particleCamera.clearViewOffset();
		this.particleCamera.updateMatrixWorld();
		return bounds;
	}

	private placeAt(
		clientX: number,
		clientY: number,
		placement: AnchorPlacement,
		slotMinPx = 0,
	): [number, number, number] | null {
		const bounds = this.prepareAnchorCamera();
		if (!bounds) return null;
		const ndc = clientToNdc(clientX, clientY, bounds);
		if (!ndc) return null;
		const fit = placement.fit;
		const radius = placement.radius;
		if (fit !== undefined && fit > 0 && radius !== undefined && radius > 0 && slotMinPx > 1) {
			const span = Math.min(fit * slotMinPx, bounds.height * 0.92);
			return pointForSpan(this.particleCamera, ndc[0], ndc[1], radius, span, bounds.height);
		}
		if (placement.distance !== undefined && placement.distance > 0) {
			return pointAtDistance(this.particleCamera, ndc[0], ndc[1], placement.distance);
		}
		return rayPlanePoint(this.particleCamera, ndc[0], ndc[1], placement.plane ?? 0);
	}

	private syncAnchors(): void {
		if (this.anchors.length === 0) return;
		let moved = false;
		for (const anchor of this.anchors) {
			const element = typeof anchor.element === "function" ? anchor.element() : anchor.element;
			if (!element?.isConnected || element.getClientRects().length === 0) continue;
			const rect = element.getBoundingClientRect();
			const raw =
				typeof anchor.placement === "function" ? anchor.placement() : anchor.placement;
			const placement = typeof raw === "number" ? { plane: raw } : raw;
			const point = this.placeAt(
				rect.left + rect.width * 0.5,
				rect.top + rect.height * 0.5,
				placement,
				Math.min(rect.width, rect.height),
			);
			if (!point) continue;
			const last = anchor.last;
			if (
				last === null ||
				Math.abs(last[0] - point[0]) > 1e-4 ||
				Math.abs(last[1] - point[1]) > 1e-4 ||
				Math.abs(last[2] - point[2]) > 1e-4
			) {
				anchor.last = point;
				moved = true;
			}
			anchor.apply(anchor.last ?? point);
		}
		if (moved) this.markDirty();
	}

	private syncPointerFollowers(dt: number): void {
		if (this.pointerFollowers.length === 0) return;
		for (const follower of this.pointerFollowers) {
			const distance = follower.distance;
			const raw = typeof distance === "function" ? distance() : distance;
			const point = this.pointerAt(raw);
			if (point) follower.last = [point[0], point[1], point[2]];
			if (follower.last) {
				follower.apply({
					point: follower.last,
					speed: Math.hypot(this.pointerVelocity.x, this.pointerVelocity.y),
					dt,
				});
			}
		}
	}

	private stepLateParticles(dt: number): void {
		if (this.reducedMotion || this.quality.tier === 0 || this.lateParticles.size === 0) return;
		if (this.bounds.width < 1 || this.bounds.height < 1) return;
		for (const system of this.lateParticles) {
			const active = Math.min(system.count, this.quality.settings.particleBudget);
			if (system.active !== active) system.setActive(active);
			if (active > 0) system.step(this.ui.renderer, dt);
		}
	}

	private particleActiveCount(system: ParticleSystem): number {
		if (this.quality.tier === 0 || this.bounds.width < 1 || this.bounds.height < 1) return 0;
		return Math.min(system.count, this.quality.settings.particleBudget);
	}

	private applyParticleLod(): void {
		for (const system of this.particleSystems) {
			system.setActive(this.particleActiveCount(system));
		}
	}

	private particleActiveTotal(): number {
		let total = 0;
		for (const system of this.particleSystems) total += system.active;
		return total;
	}

	private particleAllocatedTotal(): number {
		let total = 0;
		for (const system of this.particleSystems) total += system.count;
		return total;
	}

	register(element: HTMLElement, options: Partial<GlassPanelOptions> = {}): GlassPanelHandle {
		const max = this.quality.settings.maxPanels;
		if (this.panels.size >= max) {
			console.warn(
				`[ui-lib] panel budget exhausted (${max} at tier ${this.quality.tier}); new panel will not render.`,
			);
		}

		const panel = this.createPanel(element, mergeDefined(GLASS_PANEL_DEFAULTS, options));
		this.panels.add(panel);
		this.resizeObserver.observe(element);
		this.markDirty();

		return {
			element,
			get visible() {
				return panel.userVisible;
			},
			update: (patch) => {
				panel.options = mergeDefined(panel.options, patch);
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
	 * Attach a GPU particle system. Simulation is registered at the scheduler's
	 * `compute` priority, so every system advances before the layer's single
	 * draw pass. `depth` chooses whether the sprites sit in the page, inside a
	 * lens, or in front of one. The returned handle owns the system.
	 */
	addParticles(system: ParticleSystem, options: ParticleLayerOptions = {}): Disposable {
		this.setCamera({
			cameraPosition: options.cameraPosition ?? [0, 0, 14],
			cameraTarget: options.cameraTarget ?? [0, 0, 0],
			fov: options.fov ?? 52,
		});

		const depth = options.depth ?? "scene";
		this.prepareParticleDepth(system, depth);
		const scene =
			depth === "inside"
				? this.insideScene
				: depth === "front"
					? this.frontScene
					: this.particleScene;
		scene.add(system.object);
		this.particleSystems.add(system);
		system.reset(this.ui.renderer);
		system.setActive(this.particleActiveCount(system));

		const stop = getScheduler().add((info) => {
			if (this.lateParticles.has(system)) return;
			const active = this.particleActiveCount(system);
			if (system.active !== active) system.setActive(active);
			if (active <= 0 || this.reducedMotion) return;
			system.step(this.ui.renderer, info.dt);
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
				this.insideScene.remove(system.object);
				this.frontScene.remove(system.object);
				system.dispose();
				this.particleResources.get(system)?.dispose();
				this.particleResources.delete(system);
			},
		};
	}

	/**
	 * A lens material bound to this layer's scene copy and shared pointer.
	 * It also samples the shared studio probe; `environment` only scales that.
	 * Pair it with `addWorldObject(mesh, onFrame, { refractive: true })` so the
	 * mesh is drawn after the copy, not into the texture it samples.
	 */
	createLensMaterial(options: WorldLensOptions = {}): WorldLensMaterial {
		return createWorldLensMaterial(
			{ ...options, backdrop: this.refractionRT.texture },
			this.shared,
		);
	}

	/**
	 * Add a regular three Object3D to the world/effects scene behind DOM glass.
	 * The optional callback runs on the shared scheduler, so examples can animate
	 * a hero object without creating a second requestAnimationFrame loop.
	 * `refractive` objects are drawn in a later pass and can sample the scene copy.
	 */
	addWorldObject(
		object: Object3D,
		onFrame?: (info: FrameInfo) => void,
		options: WorldObjectOptions = {},
	): Disposable {
		(options.refractive ? this.lensScene : this.particleScene).add(object);
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
				this.lensScene.remove(object);
				this.worldResources.get(object)?.dispose();
				this.worldResources.delete(object);
			},
		};
	}

	setPostProcessing(options: PostProcessingOptions | false): void {
		this.postOptions = options;
		this.syncMotionAuthorship(options);
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
				depthTexture: this.worldDepth,
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
		this.silenceDepth(this.backdropQuad.mesh.material);
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
		// The studio sample uses the perspective basis, not this ortho camera.
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
				environment: options.environment,
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
		u.environment.value = clamp01(panel.options.environment);
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

	private measureBounds(): { left: number; top: number; width: number; height: number } {
		if (this.mode === "section" && this.boundsElement) {
			const rect = this.boundsElement.getBoundingClientRect();
			return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
		}
		return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
	}

	private syncViewport(force = false): void {
		const measured = this.measureBounds();
		this.bounds.left = measured.left;
		this.bounds.top = measured.top;
		this.bounds.width = measured.width;
		this.bounds.height = measured.height;
		const width = measured.width;
		const height = measured.height;
		const dprCap = Math.min(this.quality.settings.dprCap, Number.POSITIVE_INFINITY);
		const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
		// Collapse stores 0, and a usable box shows itself before the size guard.
		// Tier 0 stays hidden. See stepSectionViewport.
		const step = stepSectionViewport(
			{ width: this.width, height: this.height, dpr: this.dpr },
			{ width, height, dpr, tier: this.quality.tier, force },
		);
		this.canvas.style.visibility = step.visible ? "visible" : "hidden";
		if (step.collapsed) {
			this.dirty = true;
			this.width = step.width;
			this.height = step.height;
			return;
		}
		if (!step.resize) return;

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
		this.refractionRT.setSize(bufferWidth, bufferHeight);
		for (const sample of this.worldVelocitySamples.values()) sample.initialized = false;
		this.vpReady = false;
		this.motionPointsReady = false;
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
		const { dpr, bounds, glassCamera } = this;
		const vw = bounds.width;
		const vh = bounds.height;
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
			const localLeft = rect.left - bounds.left;
			const localTop = rect.top - bounds.top;
			const offscreen =
				localTop + h < -OFFSCREEN_MARGIN ||
				localTop > vh + OFFSCREEN_MARGIN ||
				localLeft + w < -OFFSCREEN_MARGIN ||
				localLeft > vw + OFFSCREEN_MARGIN;

			if (w <= 0 || h <= 0 || offscreen) {
				panel.mesh.visible = false;
				continue;
			}

			panel.mesh.visible = true;
			const pw = w * dpr;
			const ph = h * dpr;
			panel.mesh.scale.set(pw, ph, 1);
			panel.mesh.position.set(
				(localLeft + w / 2) * dpr - halfW,
				halfH - (localTop + h / 2) * dpr,
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
			if (this.pointer.state.inside) this.pointerSeen = true;
			// Stay off-canvas until the pointer has actually entered, so a
			// section stage does not glow its top-left corner at rest.
			if (this.pointerSeen) {
				this.sharedPointer.value.set(
					this.pointer.smoothX * this.dpr,
					this.pointer.smoothY * this.dpr,
				);
			}
			// Reduced motion keeps the position response and drops the stretch.
			const targetX = this.reducedMotion ? 0 : this.pointer.state.vx;
			const targetY = this.reducedMotion ? 0 : this.pointer.state.vy;
			this.pointerVelocity.x = damp(this.pointerVelocity.x, targetX, 8, info.dt);
			this.pointerVelocity.y = damp(this.pointerVelocity.y, targetY, 8, info.dt);
			this.sharedPointerVelocity.value.set(
				this.pointerVelocity.x * this.dpr,
				this.pointerVelocity.y * this.dpr,
			);
		}
		const pointerChanged =
			Number.isNaN(this.lastPointer.x) ||
			this.lastPointer.distanceToSquared(this.sharedPointer.value) > 0.01;
		this.lastPointer.copy(this.sharedPointer.value);

		this.syncViewport();
		if (this.bounds.width < 1 || this.bounds.height < 1) {
			this.canvas.style.visibility = "hidden";
			this.reportStats(info.dt);
			return;
		}
		// After the update-phase camera write, before layout skip and before
		// TAA jitter. A moved slot must mark dirty or a static page would skip.
		this.syncAnchors();
		// Same smoothed pointer the highlight just wrote. Before the skip, so a
		// trail mesh is current if we draw, and before late particle steps.
		this.syncPointerFollowers(info.dt);
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
		const sheenLive = this.sharedPointerVelocity.value.lengthSq() > 4;
		if (
			!layoutWasDirty &&
			this.hasRendered &&
			!hasAnimatedSources &&
			!pointerChanged &&
			!sheenLive
		) {
			// The framebuffer and both TAA histories already contain the finished
			// image. Do not rerun the post graph or copy history on a truly static
			// page; the scheduler remains alive for future pointer/layout activity.
			this.reportStats(info.dt);
			return;
		}

		this.stepLateParticles(info.dt);
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

	/**
	 * Unjittered view-projection for per-pixel reprojection, plus a camera
	 * motion-blur amount scaled from how fast the look-at point (and a point
	 * one unit beside it) crosses the screen. The authored slider stays put
	 * unless `cameraMotionBlur` is on, so a constant playground smear is unchanged.
	 */
	private captureViewProjection(): void {
		if (!this.postProcessing) return;
		this.particleCamera.updateMatrixWorld();
		this.currentVP.multiplyMatrices(
			this.particleCamera.projectionMatrix,
			this.particleCamera.matrixWorldInverse,
		);
		if (!this.vpReady) {
			this.previousVP.copy(this.currentVP);
			this.vpReady = true;
		}
		this.invVP.copy(this.currentVP).invert();
		this.postProcessing.setViewProjection(this.invVP, this.previousVP);
		this.previousVP.copy(this.currentVP);
		if (!this.cameraMotionBlur) return;

		const bufferWidth = Math.max(1, Math.round(this.sharedResolution.value.x));
		const bufferHeight = Math.max(1, Math.round(this.sharedResolution.value.y));
		const target = this.cameraTarget;
		const targetDelta = this.screenDelta(
			target.x,
			target.y,
			target.z,
			this.prevTargetScreen,
			bufferWidth,
			bufferHeight,
		);
		const sideDelta = this.screenDelta(
			target.x + 1,
			target.y,
			target.z,
			this.prevSideScreen,
			bufferWidth,
			bufferHeight,
		);
		const delta = Math.max(targetDelta, sideDelta);
		const amount = this.reducedMotion ? 0 : this.authoredMotionBlur * Math.min(1, delta / 18);
		this.motionPointsReady = true;
		this.postProcessing.update({ motionBlur: amount });
	}

	private screenDelta(
		x: number,
		y: number,
		z: number,
		previous: Vector2,
		bufferWidth: number,
		bufferHeight: number,
	): number {
		this.motionPoint.set(x, y, z).project(this.particleCamera);
		const currentX = this.motionPoint.x * bufferWidth * 0.5;
		const currentY = -this.motionPoint.y * bufferHeight * 0.5;
		const delta = this.motionPointsReady
			? Math.hypot(currentX - previous.x, currentY - previous.y)
			: 0;
		previous.set(currentX, currentY);
		return delta;
	}

	private syncMotionAuthorship(options: PostProcessingOptions | false): void {
		if (options === false) {
			this.cameraMotionBlur = false;
			return;
		}
		if (options.cameraMotionBlur !== undefined)
			this.cameraMotionBlur = options.cameraMotionBlur;
		if (options.motionBlur !== undefined) this.authoredMotionBlur = options.motionBlur;
	}

	private prepareParticleDepth(system: ParticleSystem, depth: ParticleDepth): void {
		for (const material of system.materials) {
			material.depthWrite = false;
			// Front motes test against the lens. Inside motes draw into a color
			// copy that has no depth buffer, so a depth test would discard them.
			material.depthTest = depth === "front";
		}
	}

	private silenceDepth(material: Material | Material[]): void {
		const materials = Array.isArray(material) ? material : [material];
		for (const entry of materials) {
			entry.depthWrite = false;
			entry.depthTest = false;
		}
	}

	private syncRoomBasis(): void {
		this.particleCamera.updateMatrixWorld();
		const e = this.particleCamera.matrixWorld.elements;
		this.sharedCameraRight.value.set(e[0] ?? 1, e[1] ?? 0, e[2] ?? 0);
		this.sharedCameraUp.value.set(e[4] ?? 0, e[5] ?? 1, e[6] ?? 0);
		this.sharedCameraBack.value.set(e[8] ?? 0, e[9] ?? 0, e[10] ?? 1);
		this.sharedCameraFov.value = this.particleCamera.fov;
	}

	private renderFrame(): void {
		const { renderer } = this.ui;
		const previousToneMapping = renderer.toneMapping;
		const previousColorSpace = renderer.outputColorSpace;
		const usesPost = this.postPipeline !== null && this.postProcessing !== null;

		this.syncRoomBasis();
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
		if (usesPost) {
			this.updateWorldVelocity();
			this.captureViewProjection();
		}

		// 2. World effects are jittered by a short Halton sequence when temporal
		//    accumulation is active. The DOM-attached glass camera stays unjittered,
		//    so text and panel edges never swim while particles / hero geometry get
		//    true sub-pixel coverage over several frames.
		const hasLens = this.lensScene.children.length > 0;
		const hasInside = this.insideScene.children.length > 0;
		const hasFront = this.frontScene.children.length > 0;
		const hasWorldObjects =
			this.particleSystems.size > 0 ||
			this.worldStops.size > 0 ||
			hasLens ||
			hasInside ||
			hasFront;
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
			if (this.particleScene.children.length > 0) {
				renderer.render(this.particleScene, this.particleCamera);
			}
			// Blit the visible world, then add inside-only motes to that copy.
			// The lens samples the copy. Those motes never land on the page,
			// so a bright field cannot curtain the type or the gradient.
			if (hasLens || hasInside) {
				renderer.setRenderTarget(this.refractionRT);
				// The blit is a fullscreen copy of the world target. A clear
				// here is a second full-target write that the quad replaces.
				renderer.render(this.refractionScene, this.refractionBlit.camera);
				if (hasInside) renderer.render(this.insideScene, this.particleCamera);
				renderer.setRenderTarget(this.backdropRT);
				if (hasLens) renderer.render(this.lensScene, this.particleCamera);
				else if (hasInside) renderer.render(this.insideScene, this.particleCamera);
			}
			if (hasFront) renderer.render(this.frontScene, this.particleCamera);
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
		const depth = stepDepthHistory(
			{ live: this.depthHistoryLive },
			{ usesPost, hasWorldObjects },
		);
		if (depth.resetHistory) this.postProcessing?.resetHistory();
		if (usesPost) {
			renderer.toneMapping = previousToneMapping;
			renderer.outputColorSpace = previousColorSpace;
			this.postPipeline?.render();
			this.postProcessing?.commit(renderer);
			// History depth is a texture copy of `worldDepth`, not a framebuffer
			// copy. The target is bound first so the world pass has stored
			// its depth attachment. Skip the copy when this frame drew none.
			if (depth.captureDepth) {
				renderer.setRenderTarget(this.backdropRT);
				this.postProcessing?.captureDepth(renderer);
				renderer.setRenderTarget(null);
			}
		}
		this.depthHistoryLive = depth.live;

		renderer.toneMapping = previousToneMapping;
		renderer.outputColorSpace = previousColorSpace;
	}
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}

/** Convenience factory mirroring {@link GlassLayer.create}. */
export function createGlassLayer(options: GlassLayerOptions = {}): Promise<GlassLayer> {
	// Kept as a function so the public API does not expose the class constructor.
	return GlassLayer.create(options);
}
