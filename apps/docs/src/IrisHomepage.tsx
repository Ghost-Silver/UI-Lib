import type { IrisTone } from "@ui-lib/core";
import { PLAYGROUND_FIELD, PLAYGROUND_FIELD_CAMERA } from "@ui-lib/particles";
import {
	FrostedGround,
	GlassPanel,
	GlassStage,
	Magnetic,
	ParticleField,
	SoftAlert,
	SoftButton,
	SoftCard,
	SoftCheckbox,
	SoftChip,
	SoftInput,
	SoftSegmentedControl,
	SoftSelect,
	SoftSlider,
	SoftStepper,
	SoftTabs,
	useGlassStage,
} from "@ui-lib/react";
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

type Setter = <K extends keyof Params>(key: K) => (value: Params[K]) => void;

type MaterialMode = "solid" | "wash" | "tint" | "glass";

interface SceneProps {
	params: Params;
	set: Setter;
	palette: PaletteId;
	setPalette: (value: PaletteId) => void;
	forceFallback: boolean;
	setForceFallback: (value: boolean) => void;
}

function Scene(props: SceneProps) {
	const { params, set, palette, setPalette, forceFallback, setForceFallback } = props;
	const { stats } = useGlassStage();

	// Interactive states for the Universal Material Synthesizer
	const [activeTab, setActiveTab] = useState(0);
	const [materialMode, setMaterialMode] = useState<MaterialMode>("wash");
	const [zetaDamping, setZetaDamping] = useState(0.55);
	const [moisture, setMoisture] = useState(65);
	const [promptInput, setPromptInput] = useState("规划 Lyra 机械臂抓取试管并执行微升移液...");
	const [targetExecutor, setTargetExecutor] = useState("lyra");
	const [stepperStep, setStepperStep] = useState("neural");
	const [forceSensing, setForceSensing] = useState(true);
	const [smoothMotion, setSmoothMotion] = useState(true);

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
		<FrostedGround inset={16} radius={24} className="iris-home-ground">
			<div className="iris-home-container">
				{/* 1. Floating Glass Capsule Nav */}
				<header className="iris-nav-wrapper">
					<Magnetic strength={0.2} radius={80}>
						<GlassPanel className="iris-nav-capsule" {...pill}>
							<a className="iris-nav-left" href="/" title="UI-Lib 官方主页">
								<span className="iris-brand-mark" aria-hidden="true" />
								<span className="iris-brand-name">UI·LIB</span>
								<span className="iris-brand-sub">/ IRIS AGI</span>
							</a>
							<nav className="iris-nav-links" aria-label="Main Navigation">
								<a
									className="iris-nav-item"
									href={`/?demo=kit-index&palette=${palette}&tone=${tone}`}
								>
									全景索引
								</a>
								<a
									className="iris-nav-item"
									href={`/?demo=studio&palette=${palette}&tone=${tone}`}
								>
									水彩工作台
								</a>
								<a className="iris-nav-item" href={`/?demo=glass-lab&palette=${palette}`}>
									玻璃实验室
								</a>
								<a
									className="iris-nav-item"
									href={`/?demo=iris-kit&palette=${palette}&tone=${tone}`}
								>
									组件陈列室
								</a>
								<a className="iris-nav-item" href="/?demo=liquid-glass">
									液态折射
								</a>
								<a className="iris-nav-item" href="/?demo=scroll-cinema">
									滚动影院
								</a>
							</nav>
							<div className="iris-nav-right">
								<div className="iris-palette-pills" title="调色板切换">
									{PALETTE_OPTIONS.map((opt) => (
										<button
											key={opt.id}
											type="button"
											className={`iris-palette-btn ${palette === opt.id ? "iris-palette-btn--active" : ""}`}
											onClick={() => setPalette(opt.id)}
											title={`切换至调色板: ${opt.name}`}
										>
											{opt.name}
										</button>
									))}
								</div>
								<div className="iris-tone-badge" title="当前水墨色调">
									{tone}
								</div>
								<button
									type="button"
									className="iris-backend-pill"
									onClick={() => setForceFallback(!forceFallback)}
									title="点击切换 GPU 玻璃 / CSS Fallback"
									style={{ cursor: "pointer", border: "1px solid rgba(163, 230, 53, 0.35)" }}
								>
									{forceFallback
										? "CSS fallback"
										: stats?.backend === "webgpu"
											? "WebGPU"
											: stats?.backend === "webgl2"
												? "WebGL 2"
												: "CSS"}
								</button>
							</div>
						</GlassPanel>
					</Magnetic>
				</header>

				{/* 2. Iris Hero Section */}
				<section className="iris-hero-section">
					<div className="iris-hero-badge-wrap">
						<span className="iris-hero-badge">
							<span className="iris-hero-dot" aria-hidden="true" />
							EMBODIED AGI INTERFACE · WEBGPU / UE5 XR READY
						</span>
					</div>
					<h1 className="iris-hero-maintitle">
						积微成智，<em>万象自生。</em>
					</h1>
					<p className="iris-hero-motto">“Build Intelligence. Give It a World.”</p>
					<p className="iris-hero-summary">
						专为 <strong>Iris 具身智能体</strong> 打造的物理级渲染引擎与次世代人机界面基础设施。
						攻克 Lucas-Washburn 宣纸毛细水彩浸润、GPU 空间光折射、&zeta; = 0.55
						无量纲弹簧触感微交互，并全面赋能 Lyra 六轴机械臂、OpenInspire 3 无人机及混合现实 XR
						后端。
					</p>

					<div className="iris-hero-ctas">
						<SoftButton
							variant="clay"
							tone={tone}
							size="lg"
							onClick={() => {
								window.location.href = `/?demo=kit-index&palette=${palette}&tone=${tone}`;
							}}
						>
							<span>探索 35+ 全套 Soft 组件</span>
							<span aria-hidden="true" style={{ marginLeft: "8px" }}>
								→
							</span>
						</SoftButton>
						<SoftButton
							variant="gummy"
							tone={tone}
							size="lg"
							onClick={() => {
								window.location.href = `/?demo=studio&palette=${palette}&tone=${tone}`;
							}}
						>
							水彩物理工作台 (Studio)
						</SoftButton>
						<SoftButton
							variant="flat"
							tone={tone}
							size="lg"
							onClick={() => {
								window.location.href = `/?demo=glass-lab&palette=${palette}`;
							}}
						>
							液态玻璃实验室 (Glass Lab)
						</SoftButton>
					</div>

					<div className="iris-hero-metrics">
						<div className="iris-metric-item">
							<span className="iris-metric-val">463 / 463</span>
							<span className="iris-metric-lbl">门禁全绿 · 0 类型错误</span>
						</div>
						<div className="iris-metric-item">
							<span className="iris-metric-val">&zeta; = 0.55</span>
							<span className="iris-metric-lbl">无量纲阻尼弹簧手感</span>
						</div>
						<div className="iris-metric-item">
							<span className="iris-metric-val">3.694</span>
							<span className="iris-metric-lbl">拉普拉斯边缘留存率</span>
						</div>
						<div className="iris-metric-item">
							<span className="iris-metric-val">0px</span>
							<span className="iris-metric-lbl">全视口响应式布局溢出</span>
						</div>
					</div>
				</section>

				{/* 3. Centerpiece: Universal Material Synthesizer */}
				<section className="iris-synthesizer-section" aria-label="组件手感与材质调音台">
					<div className="iris-section-head">
						<span className="iris-section-eyebrow">INTERACTIVE STATION</span>
						<h2 className="iris-section-title">多材质全家桶交互调音台</h2>
						<p className="iris-section-subtitle">
							集中体验 10+ 核心 Soft
							语义化组件在不同材质模式（纯色·水彩·微透·玻璃）与物理阻尼下的真实触感反馈，支持参数热插拔与折射透镜放大镜。
						</p>
					</div>

					<div className="iris-synthesizer-tabs-wrap">
						<SoftTabs
							items={["🎛️ 材质调音台", "🤖 具身交互终端", "💎 光学折射透镜"]}
							value={activeTab}
							onChange={setActiveTab}
						/>
					</div>

					{activeTab === 0 && (
						<div className="iris-synthesizer-grid">
							{/* Left Column: Parameters & Controls Dock */}
							<GlassPanel className="iris-dock-card panel" {...card}>
								<h3 className="iris-dock-title">材质与物理参数控制舱</h3>
								<p className="iris-dock-desc">
									调节参数将即时广播至右侧实机组件矩阵与底层材质渲染管线。
								</p>

								<div className="iris-control-group">
									<span className="iris-control-label">表面材质模式 (Surface Material)</span>
									<SoftSegmentedControl
										options={[
											{ value: "solid", label: "纯色 Solid" },
											{ value: "wash", label: "水彩 Wash" },
											{ value: "tint", label: "微透 Tint" },
											{ value: "glass", label: "玻璃 Glass" },
										]}
										value={materialMode}
										onChange={(val) => setMaterialMode(val as MaterialMode)}
									/>
								</div>

								<div className="iris-control-group">
									<span className="iris-control-label">物理阻尼比 (Damping Ratio &zeta;)</span>
									<SoftSlider
										value={zetaDamping}
										min={0.2}
										max={1.0}
										step={0.01}
										onChange={setZetaDamping}
										format={(v) => `\u03B6 = ${v.toFixed(2)}`}
										label="阻尼比"
									/>
									<span className="iris-control-hint">
										标准无量纲阻尼比 &zeta; = 0.55，兼顾迅捷响应与实体回弹。
									</span>
								</div>

								<div className="iris-control-group">
									<span className="iris-control-label">宣纸毛细润湿浓度 (Moisture)</span>
									<SoftSlider
										value={moisture}
										min={0}
										max={100}
										step={1}
										onChange={setMoisture}
										format={(v) => `${v}%`}
										label="水墨湿度"
									/>
									<span className="iris-control-hint">
										驱动 Lucas-Washburn 毛细渗透速率与咖啡环边缘沉降。
									</span>
								</div>

								<div className="iris-control-group">
									<span className="iris-control-label">液态折射深度 (Refraction Index)</span>
									<SoftSlider
										value={params.refraction}
										min={0}
										max={120}
										step={1}
										onChange={set("refraction")}
										format={(v) => `${v.toFixed(0)}px`}
										label="折射率"
									/>
								</div>

								<div className="iris-control-group">
									<span className="iris-control-label">磨砂金角模糊 (Frost Blur)</span>
									<SoftSlider
										value={params.frost}
										min={0}
										max={80}
										step={1}
										onChange={set("frost")}
										format={(v) => `${v.toFixed(0)}px`}
										label="磨砂度"
									/>
								</div>
							</GlassPanel>

							{/* Right Column: Active Soft Components Board */}
							<div className="iris-stage-column">
								<SoftCard
									className="iris-live-card"
									material={
										materialMode === "solid"
											? "plain"
											: materialMode === "glass"
												? undefined
												: materialMode
									}
									tone={tone}
									look={materialMode === "glass" ? "slab" : undefined}
									glossy
									interactive
								>
									<div className="iris-live-card-header">
										<div>
											<span className="iris-live-card-badge">实机交互矩阵 · LIVE BENCH</span>
											<h4 className="iris-live-card-title">Iris 神经控制终端组件簇</h4>
										</div>
										<div className="iris-live-card-tag">
											material="{materialMode}" · tone="{tone}"
										</div>
									</div>

									<div className="iris-live-form">
										<SoftInput
											label="任务指令 / Agent Prompt"
											value={promptInput}
											onChange={(e) => setPromptInput(e.target.value)}
											hint="具有无障碍焦点柔焦光晕 (FOCUS_HALO)，回车触发具身规划"
										/>

										<div className="iris-form-row">
											<div style={{ flex: 1 }}>
												<SoftSelect
													label="执行硬件 / Embodied Executor"
													options={[
														{
															value: "lyra",
															label: "Lyra·揽星 六轴机械臂",
															note: "六自由度力控末端",
														},
														{
															value: "inspire",
															label: "OpenInspire 3 无人机",
															note: "低空自主全景巡航",
														},
														{ value: "xr", label: "UE5 XR 空间锚点", note: "空间混合现实视口" },
													]}
													value={targetExecutor}
													onChange={(val) => val && setTargetExecutor(val)}
												/>
											</div>
											<div style={{ flex: 1 }}>
												<span className="iris-sublabel">运动控制策略</span>
												<div className="iris-choice-wrap">
													<SoftCheckbox
														label="力感知避障 (Force Sensing)"
														checked={forceSensing}
														onChange={(e) => setForceSensing(e.target.checked)}
													/>
													<SoftCheckbox
														label="姿态平滑阻尼 (Smooth Damping)"
														checked={smoothMotion}
														onChange={(e) => setSmoothMotion(e.target.checked)}
													/>
												</div>
											</div>
										</div>

										<div className="iris-stepper-wrap">
											<SoftStepper
												label="具身规划阶段"
												steps={[
													{ id: "perceive", label: "多模态感知", note: "RGB-D点云建图" },
													{ id: "neural", label: "CTorch 推理", note: "大模型决策规划" },
													{ id: "act", label: "动力学执行", note: "闭环力控驱动" },
												]}
												current={stepperStep}
												onChange={setStepperStep}
											/>
										</div>

										<div className="iris-buttons-row">
											<SoftButton
												variant="clay"
												tone={tone}
												size="md"
												onClick={() =>
													alert(`已下发指令至 [${targetExecutor}]: ${promptInput}`)
												}
											>
												🚀 下发并执行指令
											</SoftButton>
											<SoftButton
												variant="gummy"
												tone={tone}
												size="md"
												onClick={() => setPromptInput("重置执行机构并回正姿态...")}
											>
												状态回正
											</SoftButton>
											<SoftButton variant="flat" size="md" disabled>
												硬件急停 (保护中)
											</SoftButton>
										</div>

										<div className="iris-alert-wrap">
											<SoftAlert
												tone="success"
												title="Iris Runtime 通信就绪"
												material={
													materialMode === "solid"
														? "plain"
														: materialMode === "glass"
															? undefined
															: materialMode
												}
											>
												CTorch 推理后端延迟 1.2ms，WebGPU 渲染管线 120 FPS，与底层外设通信正常。
											</SoftAlert>
										</div>
									</div>
								</SoftCard>
							</div>
						</div>
					)}

					{activeTab === 1 && (
						<div className="iris-synthesizer-grid">
							<GlassPanel className="iris-dock-card panel" {...card}>
								<h3 className="iris-dock-title">具身外设遥测监控</h3>
								<p className="iris-dock-desc">
									与 Iris Runtime 协同的真实硬件外设拓扑与遥测状态。
								</p>
								<div className="iris-control-group">
									<span className="iris-control-label">末端执行器负载</span>
									<SoftSlider
										value={42}
										min={0}
										max={100}
										format={(v) => `${v}%`}
										label="末端负载"
									/>
								</div>
								<div className="iris-control-group">
									<span className="iris-control-label">关节伺服温度</span>
									<SoftSlider
										value={36}
										min={20}
										max={80}
										format={(v) => `${v} °C`}
										label="伺服温度"
									/>
								</div>
							</GlassPanel>

							<SoftCard
								className="iris-live-card"
								material={
									materialMode === "solid"
										? "plain"
										: materialMode === "glass"
											? undefined
											: materialMode
								}
								tone={tone}
								look={materialMode === "glass" ? "slab" : undefined}
								glossy
							>
								<div className="iris-live-card-header">
									<div>
										<span className="iris-live-card-badge">EMBODIED TOPOLOGY</span>
										<h4 className="iris-live-card-title">Lyra·揽星 & OpenInspire 3 遥测链路</h4>
									</div>
									<div className="iris-live-card-tag">STATUS: NOMINAL</div>
								</div>
								<div
									style={{
										display: "flex",
										gap: "12px",
										flexWrap: "wrap",
										marginBottom: "16px",
									}}
								>
									<SoftChip selected leading="🦾">
										关节 1: +14.2°
									</SoftChip>
									<SoftChip selected leading="🦾">
										关节 2: -38.6°
									</SoftChip>
									<SoftChip selected leading="🦾">
										关节 3: +92.1°
									</SoftChip>
									<SoftChip leading="🛸">无人机高度: 18.4m</SoftChip>
									<SoftChip leading="🔋">电量: 98%</SoftChip>
								</div>
								<SoftAlert
									tone="info"
									title="沙箱安全边界校验通过"
									material={
										materialMode === "solid"
											? "plain"
											: materialMode === "glass"
												? undefined
												: materialMode
									}
								>
									所有关节动力学力矩均在 ISO/TS 15066 协作机器人安全阈值（&lt; 150N）内运行。
								</SoftAlert>
							</SoftCard>
						</div>
					)}

					{activeTab === 2 && (
						<div className="iris-optics-lens-stage">
							<p
								style={{
									maxWidth: "600px",
									margin: "0 auto 28px",
									color: "var(--muted)",
									lineHeight: 1.7,
								}}
							>
								底层 3D WebGPU
								粒子流与宣纸水墨正持续穿透毛玻璃大板流动。移动鼠标抓取下方透镜，体验实时空间折射率与色散弯折效果：
							</p>
							<Magnetic strength={0.35} radius={180}>
								<GlassPanel
									className="iris-lens-magnifier"
									{...glass}
									refraction={75}
									frost={0}
								>
									<span>
										🔍 磁吸液态玻璃透镜
										<br />
										<small style={{ opacity: 0.7 }}>实时折射下方粒子与宣纸纤维</small>
									</span>
								</GlassPanel>
							</Magnetic>
						</div>
					)}
				</section>

				{/* 4. Four Pillars Section */}
				<section className="iris-pillars-section" aria-label="UI-Lib 四大核心支柱">
					<div className="iris-section-head">
						<span className="iris-section-eyebrow">FOUR PILLARS</span>
						<h2 className="iris-section-title">UI-Lib 的四大技术支柱</h2>
						<p className="iris-section-subtitle">
							兼顾纯粹东方水墨写意美学与硬核物理空间渲染，为 AGI 时代构建具有灵魂的交互底座。
						</p>
					</div>

					<div className="iris-pillars-grid">
						<GlassPanel className="panel iris-pillar-card" {...card}>
							<span className="iris-pillar-icon" aria-hidden="true">
								💎
							</span>
							<h3 className="iris-pillar-title">GPU 物理光学折射</h3>
							<p className="iris-pillar-desc">
								基于圆角矩形 SDF 精确推导四分之一圆倒角法线，多波长色散与金角盘模糊算法，单
								Canvas 调度多面板无缝折射。
							</p>
						</GlassPanel>

						<GlassPanel className="panel iris-pillar-card" {...card}>
							<span className="iris-pillar-icon" aria-hidden="true">
								🖌️
							</span>
							<h3 className="iris-pillar-title">宣纸水彩物理底座</h3>
							<p className="iris-pillar-desc">
								Lucas-Washburn 毛细渗透微分前沿，结合咖啡环暗边沉降与 Kubelka-Munk
								真实减法光谱混色，告别发灰与生硬切边。
							</p>
						</GlassPanel>

						<GlassPanel className="panel iris-pillar-card" {...card}>
							<span className="iris-pillar-icon" aria-hidden="true">
								🎚️
							</span>
							<h3 className="iris-pillar-title">无量纲阻尼微交互</h3>
							<p className="iris-pillar-desc">
								严格校准 &zeta; = 0.55 实体弹簧动效，双层柔焦光晕焦点协议（FOCUS_HALO），48
								组笛卡尔积测试 WCAG AA/AAA 对比度全达标。
							</p>
						</GlassPanel>

						<GlassPanel className="panel iris-pillar-card" {...card}>
							<span className="iris-pillar-icon" aria-hidden="true">
								🌐
							</span>
							<h3 className="iris-pillar-title">Iris 具身与多端生态</h3>
							<p className="iris-pillar-desc">
								深度集成 Iris Runtime 沙箱、CTorch 推理后端、Lyra 六轴机械臂与 UE5 XR
								混合现实空间锚点，赋能次世代真实世界。
							</p>
						</GlassPanel>
					</div>
				</section>

				{/* 5. Gateways Section */}
				<section className="discovery-section" aria-label="核心展台与实验室导航">
					<div className="discovery-header">
						<p className="eyebrow" style={{ marginBottom: "8px" }}>
							Showcase & Workbenches
						</p>
						<h2 className="discovery-title">全景展台与材质实验室直达</h2>
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
								<a
									className="discovery-card__link"
									href={`/?demo=glass-lab&palette=${palette}`}
								>
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

				{/* 6. Footer */}
				<footer className="iris-home-footer">
					<div>
						<strong>UI-LIB</strong> · Iris AGI Framework Visual Foundation
					</div>
					<div>“积微成智，万象自生。” · WebGPU / WebGL 2 with TSL Shaders</div>
				</footer>

				<StatusHud stats={stats} status={status} forceFallback={forceFallback} />
			</div>
		</FrostedGround>
	);
}

export function IrisHomepage() {
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
	const speed = 0.25;
	const [forceFallback, setForceFallback] = useState(false);
	const [backend] = useState<"auto" | "webgl">("auto");

	const backdrop = useMemo<BackdropSpec>(
		() => ({ type: "gradient", colors: [...PALETTES[palette]], speed }),
		[palette],
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
				palette={palette}
				setPalette={setPalette}
				forceFallback={forceFallback}
				setForceFallback={setForceFallback}
			/>
		</GlassStage>
	);
}
