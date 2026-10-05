import { IRIS_TONES, type IrisTone } from "@ui-lib/core";
import { PLAYGROUND_FIELD, PLAYGROUND_FIELD_CAMERA } from "@ui-lib/particles";
import { GlassPanel, GlassStage, Magnetic, ParticleField, useGlassStage } from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useMemo, useState } from "react";
import {
	cameraPosition,
	dot,
	mix,
	normalize,
	normalWorld,
	oneMinus,
	positionWorld,
	saturate,
	vec3,
} from "three/tsl";
import {
	AdditiveBlending,
	IcosahedronGeometry,
	Mesh,
	MeshBasicNodeMaterial,
} from "three/webgpu";
import { AcceptanceDemo, type AcceptanceDemoId } from "./AcceptanceDemo.js";
import { AuroraFlowPage } from "./AuroraFlow.js";
import { CursorFieldPage } from "./CursorField.js";
import { Choice, Slider, Toggle } from "./components/Slider.js";
import { StatusHud } from "./components/StatusHud.js";
import { GlassLabPage } from "./GlassLab.js";
import { IrisKitPage, isKitComponent } from "./IrisKit.js";
import { IrisShowcasePage } from "./IrisShowcase.js";
import { KitIndexPage } from "./KitIndex.js";
import { LiquidGlassProPage } from "./LiquidGlassPro.js";
import { ProductHeroPage } from "./ProductHero.js";
import { ScrollCinemaPage } from "./ScrollCinema.js";
import { StackingPage } from "./Stacking.js";
import { StudioPage } from "./Studio.js";
import { ThirdPartySettings } from "./ThirdPartySettings.js";
import { WakePage } from "./Wake.js";
import { WetPaperPage } from "./WetPaper.js";

const PALETTES = {
	aurora: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"],
	ember: ["#240b12", "#c2410c", "#f59e0b", "#7f1d1d"],
	mint: ["#04212a", "#0f766e", "#22d3ee", "#a3e635"],
	ink: ["#05060c", "#1f2937", "#3f4b63", "#8ea0bd"],
} as const;

type PaletteId = keyof typeof PALETTES;

const PALETTE_OPTIONS = [
	{ id: "aurora", name: "Aurora" },
	{ id: "ember", name: "Ember" },
	{ id: "mint", name: "Mint" },
	{ id: "ink", name: "Ink" },
] as const satisfies readonly { id: PaletteId; name: string }[];

interface Params {
	radius: number;
	bevel: number;
	refraction: number;
	dispersion: number;
	roughness: number;
	frost: number;
	specular: number;
	edgeGlow: number;
	tintAmount: number;
	saturation: number;
	bloomStrength: number;
	haloStrength: number;
	flareStrength: number;
	chromaticAberration: number;
	focusBlur: number;
	focusDepth: number;
	motionBlur: number;
	temporalReactive: number;
	grain: number;
	vignette: number;
}

const DEFAULT_PARAMS: Params = {
	radius: 34,
	bevel: 28,
	refraction: 46,
	dispersion: 0.3,
	roughness: 0.2,
	frost: 24,
	specular: 0.6,
	edgeGlow: 0.55,
	tintAmount: 0.05,
	saturation: 1.15,
	bloomStrength: 0.28,
	haloStrength: 0.14,
	flareStrength: 0.1,
	chromaticAberration: 0.35,
	focusBlur: 2.5,
	focusDepth: 0.62,
	motionBlur: 0.05,
	temporalReactive: 0.8,
	grain: 0.018,
	vignette: 0.12,
};

const PARTICLES = PLAYGROUND_FIELD;

/** A deliberately small hero object: the library owns the world scene and clock,
 * while the example owns the look. This is the extension point for product demos. */
function HeroCrystal() {
	const { layer } = useGlassStage();

	useEffect(() => {
		if (!layer) return;
		const geometry = new IcosahedronGeometry(2.25, 5);
		const material = new MeshBasicNodeMaterial({ transparent: true, opacity: 0.88 });
		const viewDirection = normalize(cameraPosition.sub(positionWorld));
		const rim = oneMinus(saturate(dot(normalWorld, viewDirection))).pow(1.7);
		material.colorNode = mix(vec3(0.04, 0.32, 0.5), vec3(0.85, 0.2, 0.68), rim);
		material.opacityNode = mix(0.54, 0.96, rim);
		material.transparent = true;
		material.depthWrite = false;
		material.blending = AdditiveBlending;

		const crystal = new Mesh(geometry, material);
		crystal.name = "ui-lib:hero-crystal";
		crystal.scale.setScalar(1.08);
		// The origin sits under the headline. Keep the crystal with the cloud.
		crystal.position.x = 4.2;
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const attachment = layer.addWorldObject(crystal, (info) => {
			if (prefersReducedMotion) return;
			crystal.rotation.y += info.dt * 0.22;
			crystal.rotation.x = Math.sin(info.elapsed * 0.42) * 0.12;
			crystal.position.y = Math.sin(info.elapsed * 0.68) * 0.28;
		});

		return () => {
			attachment.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [layer]);

	return null;
}

function Playground() {
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const [palette, setPalette] = useState<PaletteId>(() => {
		if (typeof window !== "undefined") {
			const p = new URLSearchParams(window.location.search).get("palette");
			if (p && (p === "aurora" || p === "ember" || p === "mint" || p === "ink")) {
				return p;
			}
		}
		return "aurora";
	});
	const [speed, setSpeed] = useState(0.25);
	const [forceFallback, setForceFallback] = useState(false);
	const [backend, setBackend] = useState<"auto" | "webgl">("auto");

	const backdrop = useMemo<BackdropSpec>(
		() => ({ type: "gradient", colors: [...PALETTES[palette]], speed }),
		[palette, speed],
	);
	const post = useMemo<PostProcessingOptions>(
		() => ({
			bloomStrength: params.bloomStrength,
			haloStrength: params.haloStrength,
			flareStrength: params.flareStrength,
			chromaticAberration: params.chromaticAberration,
			focusBlur: params.focusBlur,
			focusDepth: params.focusDepth,
			motionBlur: params.motionBlur,
			temporalReactive: params.temporalReactive,
			grain: params.grain,
			vignette: params.vignette,
		}),
		[
			params.bloomStrength,
			params.haloStrength,
			params.flareStrength,
			params.chromaticAberration,
			params.focusBlur,
			params.focusDepth,
			params.motionBlur,
			params.temporalReactive,
			params.grain,
			params.vignette,
		],
	);

	const set =
		<K extends keyof Params>(key: K) =>
		(value: Params[K]) =>
			setParams((prev) => ({ ...prev, [key]: value }));

	return (
		<GlassStage
			backdrop={backdrop}
			post={post}
			forceFallback={forceFallback}
			forceWebGL={backend === "webgl"}
			className="stage"
		>
			<HeroCrystal />
			<ParticleField
				options={PARTICLES}
				camera={{
					cameraPosition: PLAYGROUND_FIELD_CAMERA.position,
					cameraTarget: PLAYGROUND_FIELD_CAMERA.target,
					fov: PLAYGROUND_FIELD_CAMERA.fov,
				}}
				pointer
			/>
			<Scene
				params={params}
				set={set}
				setParams={setParams}
				palette={palette}
				setPalette={setPalette}
				speed={speed}
				setSpeed={setSpeed}
				forceFallback={forceFallback}
				setForceFallback={setForceFallback}
				backend={backend}
				setBackend={setBackend}
			/>
		</GlassStage>
	);
}

type Setter = <K extends keyof Params>(key: K) => (value: Params[K]) => void;

interface SceneProps {
	params: Params;
	set: Setter;
	setParams: (value: Params) => void;
	palette: PaletteId;
	setPalette: (value: PaletteId) => void;
	speed: number;
	setSpeed: (value: number) => void;
	forceFallback: boolean;
	setForceFallback: (value: boolean) => void;
	backend: "auto" | "webgl";
	setBackend: (value: "auto" | "webgl") => void;
}

function Scene(props: SceneProps) {
	const { params, set, setParams, palette, setPalette, speed, setSpeed } = props;
	const { forceFallback, setForceFallback, backend, setBackend } = props;
	const { stats, status } = useGlassStage();

	// Shared look for the big panels; small elements override radius.
	const glass = {
		radius: params.radius,
		bevel: params.bevel,
		refraction: params.refraction,
		dispersion: params.dispersion,
		roughness: params.roughness,
		frost: params.frost,
		specular: params.specular,
		edgeGlow: params.edgeGlow,
		tintAmount: params.tintAmount,
		saturation: params.saturation,
	};

	const PALETTE_TO_TONE: Record<PaletteId, IrisTone> = {
		aurora: "iris",
		ember: "blossom",
		mint: "mist",
		ink: "iris",
	};
	const tone = PALETTE_TO_TONE[palette] ?? "iris";

	const pill = { ...glass, radius: 999, bevel: 14, refraction: 18, frost: 12 };
	const card = { ...glass, radius: 22, bevel: 18, refraction: 30 };

	return (
		<div className="page">
			<header className="topbar">
				<div className="brand">
					<span className="brand__mark" aria-hidden="true" />
					UI·LIB <span className="brand__sub">/ liquid glass</span>
				</div>
				<nav className="toplinks" aria-label="Demos">
					<Magnetic strength={0.4} radius={100}>
						<a className="navlink" href="/?demo=aurora-flow">
							Aurora
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={100}>
						<a className="navlink" href="/?demo=product-hero">
							Lumen
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={110}>
						<a className="navlink" href="/?demo=scroll-cinema">
							Scroll Cinema
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={120}>
						<a className="navlink" href="/?demo=cursor-field">
							Cursor Field
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={120}>
						<a className="navlink" href="/?demo=liquid-glass">
							Liquid Glass
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={90}>
						<a className="navlink" href="/?demo=wake">
							Wake
						</a>
					</Magnetic>
					{/*
					 * Core Showcase & Workbench Discovery Links (Preserving tone and palette context)
					 */}
					<Magnetic strength={0.4} radius={90}>
						<a
							className="navlink navlink--moe"
							href={`/?demo=kit-index&palette=${palette}&tone=${tone}`}
							title="全景组件索引"
						>
							全景索引
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={90}>
						<a
							className="navlink navlink--moe"
							href={`/?demo=glass-lab&palette=${palette}`}
							title="液态玻璃实验室"
						>
							玻璃实验室
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={90}>
						<a
							className="navlink navlink--moe"
							href={`/?demo=studio&palette=${palette}&tone=${tone}`}
							title="水彩材质工作台"
						>
							水彩工作台
						</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={90}>
						<a
							className="navlink navlink--moe"
							href={`/?demo=iris-kit&palette=${palette}&tone=${tone}`}
							title="组件陈列室"
						>
							组件陈列室
						</a>
					</Magnetic>
				</nav>
				<GlassPanel className="pill" {...pill}>
					{stats?.backend === "webgpu"
						? "WebGPU"
						: stats?.backend === "webgl2"
							? "WebGL 2"
							: "CSS fallback"}
				</GlassPanel>
			</header>

			<section className="hero">
				<div className="hero__copy">
					<p className="eyebrow">GPU-first visual effects</p>
					<h1>
						Glass that actually
						<br />
						<em>bends light.</em>
					</h1>
					<p className="lede">
						Not <code>backdrop-filter</code>. A rounded-rect SDF drives a quarter-round bevel
						normal; that normal offsets screen-space UVs to refract the backdrop, with a
						per-channel scale for chromatic dispersion and a golden-angle disc blur for frost.
					</p>
					<div className="hero__actions">
						<Magnetic strength={0.42} radius={120}>
							<GlassPanel
								as="button"
								className="cta"
								{...pill}
								onClick={() => setParams(DEFAULT_PARAMS)}
							>
								Reset parameters
							</GlassPanel>
						</Magnetic>
						<Magnetic strength={0.42} radius={120}>
							<GlassPanel
								as="button"
								className="cta cta--ghost"
								{...pill}
								onClick={() => setForceFallback(!forceFallback)}
							>
								{forceFallback ? "Back to GPU glass" : "Compare with CSS"}
							</GlassPanel>
						</Magnetic>
					</div>
				</div>

				<GlassPanel className="panel panel--hero" {...glass}>
					<h2 className="panel__title">Live parameters</h2>
					<div className="sliders">
						<Slider
							label="Refraction"
							value={params.refraction}
							min={0}
							max={140}
							onChange={set("refraction")}
						/>
						<Slider
							label="Dispersion"
							value={params.dispersion}
							min={0}
							max={1}
							step={0.01}
							onChange={set("dispersion")}
						/>
						<Slider
							label="Roughness"
							value={params.roughness}
							min={0}
							max={1}
							step={0.01}
							onChange={set("roughness")}
						/>
						<Slider
							label="Frost radius"
							value={params.frost}
							min={0}
							max={80}
							onChange={set("frost")}
						/>
						<Slider
							label="Corner radius"
							value={params.radius}
							min={0}
							max={90}
							onChange={set("radius")}
						/>
						<Slider
							label="Bevel"
							value={params.bevel}
							min={0}
							max={90}
							onChange={set("bevel")}
						/>
						<Slider
							label="Specular"
							value={params.specular}
							min={0}
							max={2}
							step={0.01}
							onChange={set("specular")}
						/>
						<Slider
							label="Edge glow"
							value={params.edgeGlow}
							min={0}
							max={2}
							step={0.01}
							onChange={set("edgeGlow")}
						/>
						<Slider
							label="Tint"
							value={params.tintAmount}
							min={0}
							max={0.6}
							step={0.01}
							onChange={set("tintAmount")}
						/>
						<Slider
							label="Saturation"
							value={params.saturation}
							min={0}
							max={2}
							step={0.01}
							onChange={set("saturation")}
						/>
						<Slider
							label="Bloom"
							value={params.bloomStrength}
							min={0}
							max={1.2}
							step={0.01}
							onChange={set("bloomStrength")}
						/>
						<Slider
							label="Atmospheric halo"
							value={params.haloStrength}
							min={0}
							max={0.6}
							step={0.01}
							onChange={set("haloStrength")}
						/>
						<Slider
							label="Lens streak"
							value={params.flareStrength}
							min={0}
							max={0.6}
							step={0.01}
							onChange={set("flareStrength")}
						/>
						<Slider
							label="Chromatic aberration"
							value={params.chromaticAberration}
							min={0}
							max={4}
							step={0.01}
							onChange={set("chromaticAberration")}
						/>
						<Slider
							label="Focus blur radius"
							value={params.focusBlur}
							min={0}
							max={18}
							step={0.1}
							onChange={set("focusBlur")}
						/>
						<Slider
							label="Focus depth"
							value={params.focusDepth}
							min={0}
							max={1}
							step={0.01}
							onChange={set("focusDepth")}
						/>
						<Slider
							label="Motion blur"
							value={params.motionBlur}
							min={0}
							max={0.8}
							step={0.01}
							onChange={set("motionBlur")}
						/>
						<Slider
							label="Temporal rejection"
							value={params.temporalReactive}
							min={0}
							max={1}
							step={0.01}
							onChange={set("temporalReactive")}
						/>
						<Slider
							label="Film grain"
							value={params.grain}
							min={0}
							max={0.12}
							step={0.001}
							onChange={set("grain")}
						/>
						<Slider
							label="Vignette"
							value={params.vignette}
							min={0}
							max={1}
							step={0.01}
							onChange={set("vignette")}
						/>
					</div>
				</GlassPanel>
			</section>

			{/* M3 Feature F13: Homepage Discovery Navigation linking visitors to the 4 key surfaces */}
			<section className="discovery-section" aria-label="核心展台与实验室导航">
				<style>{`
					.discovery-section {
						margin: 48px 0 56px;
					}
					.discovery-header {
						margin-bottom: 24px;
					}
					.discovery-title {
						margin: 0 0 8px;
						font-size: 26px;
						font-weight: 700;
						letter-spacing: -0.02em;
						color: var(--ink, #fff);
					}
					.discovery-subtitle {
						margin: 0;
						font-size: 14px;
						line-height: 1.6;
						color: var(--muted, rgba(255, 255, 255, 0.65));
						max-width: 720px;
					}
					.discovery-grid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
						gap: 20px;
						margin-top: 20px;
					}
					.discovery-card {
						display: flex;
						flex-direction: column;
						padding: 24px 22px;
						border-radius: 20px;
						transition: transform 0.22s cubic-bezier(0.28, 1.38, 0.48, 1), box-shadow 0.22s ease;
					}
					.discovery-card:hover {
						transform: translateY(-4px) scale(1.01);
					}
					.discovery-card__link {
						display: flex;
						flex-direction: column;
						height: 100%;
						text-decoration: none;
						color: inherit;
					}
					.discovery-card__tag {
						display: inline-flex;
						align-self: flex-start;
						font-size: 11px;
						font-weight: 700;
						letter-spacing: 0.08em;
						text-transform: uppercase;
						padding: 4px 10px;
						border-radius: 999px;
						background: rgba(255, 255, 255, 0.12);
						color: var(--ink, #fff);
						margin-bottom: 14px;
						border: 1px solid rgba(255, 255, 255, 0.15);
					}
					.discovery-card__title {
						margin: 0 0 10px;
						font-size: 17px;
						font-weight: 700;
						color: var(--ink, #fff);
					}
					.discovery-card__desc {
						margin: 0 0 20px;
						font-size: 13px;
						line-height: 1.65;
						color: var(--muted, rgba(255, 255, 255, 0.65));
						flex: 1;
					}
					.discovery-card__cta {
						display: inline-flex;
						align-items: center;
						gap: 6px;
						font-size: 12.5px;
						font-weight: 600;
						color: #a3e635;
						letter-spacing: 0.04em;
					}
					.discovery-card:hover .discovery-card__cta {
						text-decoration: underline;
					}
				`}</style>
				<div className="discovery-header">
					<p className="eyebrow" style={{ marginBottom: "8px" }}>
						Showcase & Workbenches
					</p>
					<h2 className="discovery-title">全景展台与材质实验室导航</h2>
					<p className="discovery-subtitle">
						探索 UI-Lib 的两大支柱：GPU
						液态玻璃光场渲染与宣纸水彩语义化组件体系，保留当前调色板与材质状态。
					</p>
				</div>
				<div className="discovery-grid">
					<Magnetic strength={0.25} radius={140}>
						<GlassPanel className="panel discovery-card" {...card}>
							<a
								className="discovery-card__link"
								href={`/?demo=kit-index&palette=${palette}&tone=${tone}`}
							>
								<div className="discovery-card__tag">35+ Soft Components</div>
								<h3 className="discovery-card__title">全景组件索引 · Kit Index</h3>
								<p className="discovery-card__desc">
									全套 35+ 个 Soft 基础组件、5 态物理矩阵 [默认·悬停·聚焦·激活·禁用]
									与多材质实时切换 [纯色·水彩·微透·玻璃]。
								</p>
								<div className="discovery-card__cta">
									<span>进入全景索引</span>
									<span aria-hidden="true">→</span>
								</div>
							</a>
						</GlassPanel>
					</Magnetic>

					<Magnetic strength={0.25} radius={140}>
						<GlassPanel className="panel discovery-card" {...card}>
							<a className="discovery-card__link" href={`/?demo=glass-lab&palette=${palette}`}>
								<div className="discovery-card__tag">GPU Refraction SDF</div>
								<h3 className="discovery-card__title">液态玻璃实验室 · Glass Lab</h3>
								<p className="discovery-card__desc">
									真实物理光折射与磨砂透镜模拟，多尺度硬边背景与拉普拉斯边缘能量保持率测试台。
								</p>
								<div className="discovery-card__cta">
									<span>探索玻璃实验室</span>
									<span aria-hidden="true">→</span>
								</div>
							</a>
						</GlassPanel>
					</Magnetic>

					<Magnetic strength={0.25} radius={140}>
						<GlassPanel className="panel discovery-card" {...card}>
							<a
								className="discovery-card__link"
								href={`/?demo=studio&palette=${palette}&tone=${tone}`}
							>
								<div className="discovery-card__tag">Physics & Pigment</div>
								<h3 className="discovery-card__title">水彩材质工作台 · Studio</h3>
								<p className="discovery-card__desc">
									Lucas-Washburn 毛细润湿前沿推进、水分蒸发干燥演化过程与 Kubelka-Munk
									减色调色盘。
								</p>
								<div className="discovery-card__cta">
									<span>进入水彩工作台</span>
									<span aria-hidden="true">→</span>
								</div>
							</a>
						</GlassPanel>
					</Magnetic>

					<Magnetic strength={0.25} radius={140}>
						<GlassPanel className="panel discovery-card" {...card}>
							<a
								className="discovery-card__link"
								href={`/?demo=iris-kit&palette=${palette}&tone=${tone}`}
							>
								<div className="discovery-card__tag">WAI-ARIA & Fixture</div>
								<h3 className="discovery-card__title">组件陈列室 · Iris Kit</h3>
								<p className="discovery-card__desc">
									逐像素视觉验证基准面、无障碍 WAI-ARIA 语义契约与全状态独立标定展示。
								</p>
								<div className="discovery-card__cta">
									<span>访问组件陈列室</span>
									<span aria-hidden="true">→</span>
								</div>
							</a>
						</GlassPanel>
					</Magnetic>
				</div>
			</section>

			<section className="stats">
				<GlassPanel className="panel panel--stat" {...card}>
					<span className="stat__value">{stats ? stats.fps.toFixed(0) : "—"}</span>
					<span className="stat__label">frames per second</span>
				</GlassPanel>
				<GlassPanel className="panel panel--stat" {...card}>
					<span className="stat__value">{stats ? `T${stats.tier}` : "—"}</span>
					<span className="stat__label">adaptive quality tier</span>
				</GlassPanel>
				<GlassPanel className="panel panel--stat" {...card}>
					<span className="stat__value">{stats ? stats.visiblePanels : "—"}</span>
					<span className="stat__label">panels on one canvas</span>
				</GlassPanel>
			</section>

			<section className="row">
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">One canvas, many panels</h2>
					<p>
						Browsers cap concurrent WebGPU/WebGL contexts at roughly 8–16. The layer owns a
						single fixed, pointer-transparent canvas and draws every registered element into it,
						so a dashboard with forty glass cards still costs one device.
					</p>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Progressive by construction</h2>
					<p>
						TSL compiles the same graph to WGSL under WebGPU and GLSL under WebGL 2. No GPU at
						all and the panel quietly becomes a <code>backdrop-filter</code> card — try the
						toggle below to see exactly what a no-GPU visitor gets.
					</p>
				</GlassPanel>
			</section>

			<section className="row">
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Compute particles</h2>
					<p>
						24,000 points are born, advected through a noise-derived flow field, pulled by a
						soft attractor and respawned entirely on the GPU. The volume sits to the right of
						this headline, so the copy stays on the gradient. WebGL 2 uses transform feedback;
						WebGPU uses a native compute pass. The glass beside them refracts the same canvas.
					</p>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Backdrop</h2>
					<Choice
						label="Palette"
						value={palette}
						options={PALETTE_OPTIONS}
						onChange={setPalette}
					/>
					<Slider
						label="Drift speed"
						value={speed}
						min={0}
						max={1.5}
						step={0.01}
						onChange={setSpeed}
					/>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Rendering</h2>
					<Choice
						label="Backend"
						value={backend}
						options={[
							{ id: "auto", name: "Auto" },
							{ id: "webgl", name: "Force WebGL 2" },
						]}
						onChange={setBackend}
					/>
					<Toggle
						label="CSS fallback only"
						hint="no GPU layer at all"
						checked={forceFallback}
						onChange={setForceFallback}
					/>
				</GlassPanel>
			</section>

			<section className="row" aria-label="Iris Design System & Surfaces">
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Kit Index · 全景索引</h2>
					<p>
						三十五个高无障碍标准应用组件的五态并排物理矩阵（默认、悬停、聚焦、激活、禁用），配合纯色、水彩、微透与液态玻璃四重材质基底切换。
					</p>
					<div style={{ marginTop: "16px" }}>
						<a
							className="navlink"
							href="/?demo=kit-index"
							style={{ color: "var(--ink)", fontWeight: 700 }}
						>
							进入全景索引 →
						</a>
					</div>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Studio · 物理工作台</h2>
					<p>
						Lucas-Washburn 毛细润湿动力学扩散进程、非线性水分蒸发模拟与 Kubelka-Munk
						真实减性光谱混色实验台。
					</p>
					<div style={{ marginTop: "16px" }}>
						<a
							className="navlink"
							href="/?demo=studio"
							style={{ color: "var(--ink)", fontWeight: 700 }}
						>
							进入水彩工作台 →
						</a>
					</div>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Glass Lab · 水墨玻璃</h2>
					<p>
						宣纸毛细润湿水痕、纤维肌理与顶层液态玻璃物理折射光学校准，验证页面滚动时水墨底座的高清保真。
					</p>
					<div style={{ marginTop: "16px" }}>
						<a
							className="navlink"
							href="/?demo=glass-lab"
							style={{ color: "var(--ink)", fontWeight: 700 }}
						>
							进入玻璃实验室 →
						</a>
					</div>
				</GlassPanel>
				<GlassPanel className="panel" {...card}>
					<h2 className="panel__title">Iris Kit · 单件陈列室</h2>
					<p>全套组件单体精密测量箱，固定尺寸视口、零光污染基底与极端对比度光学检验。</p>
					<div style={{ marginTop: "16px" }}>
						<a
							className="navlink"
							href="/?demo=iris-kit"
							style={{ color: "var(--ink)", fontWeight: 700 }}
						>
							进入单件陈列室 →
						</a>
					</div>
				</GlassPanel>
			</section>

			<footer className="foot">
				<span>UI-Lib · milestone 1 · liquid glass</span>
				<span>three.js r186 · TSL · WebGPU with WebGL 2 fallback</span>
			</footer>

			<StatusHud stats={stats} status={status} forceFallback={forceFallback} />
		</div>
	);
}

const ACCEPTANCE_IDS: readonly AcceptanceDemoId[] = [
	"aurora-flow",
	"product-hero",
	"cursor-field",
];

function isAcceptanceDemo(value: string): value is AcceptanceDemoId {
	return (ACCEPTANCE_IDS as readonly string[]).includes(value);
}

export default function App() {
	if (typeof window !== "undefined") {
		const query = new URLSearchParams(window.location.search);
		const demo = query.get("demo");
		if (demo === "scroll-cinema") return <ScrollCinemaPage />;
		if (demo === "product-hero") return <ProductHeroPage />;
		if (demo === "cursor-field") return <CursorFieldPage />;
		if (demo === "aurora-flow") return <AuroraFlowPage />;
		if (demo === "liquid-glass") return <LiquidGlassProPage />;
		if (demo === "wake") return <WakePage />;
		if (demo === "kit-index") return <KitIndexPage />;
		if (demo === "third-party") return <ThirdPartyPage />;
		if (demo === "stacking") return <StackingPage />;
		if (demo === "glass-lab") return <GlassLabPage />;
		if (demo === "studio") return <StudioPage />;
		if (demo === "iris") return <IrisShowcasePage />;
		if (demo === "paper") return <WetPaperPage />;
		if (demo === "iris-kit") {
			const component = query.get("component") ?? "";
			const tone = query.get("tone") ?? "iris";
			const targetTone = (IRIS_TONES as readonly string[]).includes(tone)
				? (tone as IrisTone)
				: "iris";
			const targetComponent = isKitComponent(component) ? component : "matrix";
			return <IrisKitPage component={targetComponent} tone={targetTone} />;
		}
		if (demo && isAcceptanceDemo(demo)) return <AcceptanceDemo id={demo} />;
	}
	return <Playground />;
}

/**
 * The third-party page, wrapped so it gets the library's own background.
 *
 * The page itself is written as an outsider would write it — one import from the
 * package entry point and nothing else — so this wrapper is deliberately the only
 * thing here that knows about the application it is being shown in.
 */
function ThirdPartyPage() {
	return (
		<div className="tp-page">
			<ThirdPartySettings />
		</div>
	);
}
