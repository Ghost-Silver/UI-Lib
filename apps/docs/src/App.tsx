import type { ParticleSystemOptions } from "@ui-lib/particles";
import { GlassPanel, GlassStage, ParticleField, useGlassStage } from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useMemo, useState } from "react";
import { Choice, Slider, Toggle } from "./components/Slider.js";
import { StatusHud } from "./components/StatusHud.js";

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
	chromaticAberration: number;
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
	chromaticAberration: 0.35,
	grain: 0.018,
	vignette: 0.12,
};

const PARTICLES: ParticleSystemOptions = {
	count: 24_000,
	emitter: {
		shape: "sphere",
		radius: 3.8,
		direction: [0, 0.15, 0],
		speed: 0.8,
		spread: 0.92,
	},
	forces: {
		gravity: [0, 0.06, 0],
		drag: 0.12,
		turbulence: 2.2,
		noiseScale: 0.3,
		noiseDrift: 0.24,
		vortex: 1.8,
		attractor: 0.8,
		attractorRadius: 7,
	},
	life: [4, 10],
	size: [0.035, 0.12],
	colors: ["#4de8d5", "#8d7bff", "#f778c8"],
	hotColor: "#ffffff",
	hotAmount: 0.32,
	intensity: 1.8,
	opacity: 0.82,
	bounds: "sphere",
	boundsRadius: 8,
	blending: "additive",
};

export default function App() {
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const [palette, setPalette] = useState<PaletteId>("aurora");
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
			chromaticAberration: params.chromaticAberration,
			grain: params.grain,
			vignette: params.vignette,
		}),
		[params.bloomStrength, params.chromaticAberration, params.grain, params.vignette],
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
			<ParticleField
				options={PARTICLES}
				camera={{ cameraPosition: [0, 0.5, 13], cameraTarget: [0, 0.3, 0], fov: 50 }}
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

	const pill = { ...glass, radius: 999, bevel: 14, refraction: 18, frost: 12 };
	const card = { ...glass, radius: 22, bevel: 18, refraction: 30 };

	return (
		<div className="page">
			<header className="topbar">
				<div className="brand">
					<span className="brand__mark" aria-hidden="true" />
					UI·LIB <span className="brand__sub">/ liquid glass</span>
				</div>
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
						<GlassPanel
							as="button"
							className="cta"
							{...pill}
							onClick={() => setParams(DEFAULT_PARAMS)}
						>
							Reset parameters
						</GlassPanel>
						<GlassPanel
							as="button"
							className="cta cta--ghost"
							{...pill}
							onClick={() => setForceFallback(!forceFallback)}
						>
							{forceFallback ? "Back to GPU glass" : "Compare with CSS"}
						</GlassPanel>
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
							label="Chromatic aberration"
							value={params.chromaticAberration}
							min={0}
							max={4}
							step={0.01}
							onChange={set("chromaticAberration")}
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
						soft attractor and respawned entirely on the GPU. WebGL 2 uses transform feedback;
						WebGPU uses a native compute pass. The glass above refracts them through the same
						canvas.
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

			<footer className="foot">
				<span>UI-Lib · milestone 1 · liquid glass</span>
				<span>three.js r186 · TSL · WebGPU with WebGL 2 fallback</span>
			</footer>

			<StatusHud stats={stats} status={status} forceFallback={forceFallback} />
		</div>
	);
}
