import type { IrisTone } from "@ui-lib/core";
import {
	GlassPanel,
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
} from "@ui-lib/react";
import type { GlassPanelOptions } from "@ui-lib/renderer";
import { LiquidGlassCard } from "./LiquidGlass.js";
import type { MaterialMode, OpticalParams } from "./useIrisSynthesizer.js";

export interface MaterialSynthesizerDeckProps {
	params: OpticalParams;
	setParam: <K extends keyof OpticalParams>(key: K, value: OpticalParams[K]) => void;
	tone: IrisTone;
	cardProps: GlassPanelOptions;
	activeTab: number;
	setActiveTab: (tab: number) => void;
	materialMode: MaterialMode;
	setMaterialMode: (mode: MaterialMode) => void;
	zetaDamping: number;
	setZetaDamping: (v: number) => void;
	moisture: number;
	setMoisture: (v: number) => void;
	promptInput: string;
	setPromptInput: (v: string) => void;
	targetExecutor: string;
	setTargetExecutor: (v: string) => void;
	stepperStep: string;
	setStepperStep: (v: string) => void;
	forceSensing: boolean;
	setForceSensing: (v: boolean) => void;
	smoothMotion: boolean;
	setSmoothMotion: (v: boolean) => void;
}

export function MaterialSynthesizerDeck(props: MaterialSynthesizerDeckProps) {
	const {
		params,
		setParam,
		tone,
		cardProps,
		activeTab,
		setActiveTab,
		materialMode,
		setMaterialMode,
		zetaDamping,
		setZetaDamping,
		moisture,
		setMoisture,
		promptInput,
		setPromptInput,
		targetExecutor,
		setTargetExecutor,
		stepperStep,
		setStepperStep,
		forceSensing,
		setForceSensing,
		smoothMotion,
		setSmoothMotion,
	} = props;

	return (
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

			{/* Tab 0: 材质调音台 */}
			{activeTab === 0 && (
				<div className="iris-synthesizer-grid">
					{/* Left Column: Parameters & Controls Dock */}
					<LiquidGlassCard className="iris-dock-card panel" glassOptions={cardProps}>
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
								onChange={(v) => setParam("refraction", v)}
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
								onChange={(v) => setParam("frost", v)}
								format={(v) => `${v.toFixed(0)}px`}
								label="磨砂度"
							/>
						</div>
					</LiquidGlassCard>

					{/* Right Column: Active Soft Components Board */}
					<div className="iris-stage-column">
						<SoftCard
							className={`iris-live-card ${materialMode === "glass" ? "iris-live-card--glass" : "iris-card--frosted"}`}
							material={
								materialMode === "solid"
									? "plain"
									: materialMode === "glass"
										? undefined
										: materialMode
							}
							look={materialMode === "glass" ? "slab" : undefined}
							tone={tone}
							tilt={false}
						>
							<div className="iris-live-header">
								<div>
									<div className="iris-live-card-eyebrow">实机交互矩阵 · SEMANTIC ATELIER</div>
									<h4 className="iris-live-card-title">UI-Lib 交互视界 · 多材质组件调谐台</h4>
								</div>
								<span className="iris-live-card-tag">
									material="{materialMode}" · tone="{tone}"
								</span>
							</div>

							<div className="iris-live-form">
								<div>
									<label htmlFor="agent-prompt-input" className="iris-sublabel">
										语义化表单输入 / SoftInput
									</label>
									<SoftInput
										id="agent-prompt-input"
										value={promptInput}
										onChange={(e) => setPromptInput(e.target.value)}
										placeholder="输入文字体验柔焦光晕 (FOCUS_HALO)..."
									/>
									<span className="iris-control-hint">
										具有物理级无障碍柔焦光晕，支持全键盘 Focus-Visible
									</span>
								</div>

								<div className="iris-form-row">
									<div style={{ flex: 1 }}>
										<label htmlFor="executor-select" className="iris-sublabel">
											交互触感形态 / Tactile Preset
										</label>
										<SoftSelect
											value={targetExecutor}
											onChange={setTargetExecutor}
											options={[
												{ value: "clay", label: "粘土微弹态 (Clay Touch)" },
												{ value: "gummy", label: "软糖高阻尼 (Gummy Damping)" },
												{ value: "flat", label: "微透平展态 (Flat Surface)" },
												{ value: "glass", label: "厚重液态玻璃 (Apple Glass)" },
											]}
										/>
									</div>

									<div className="iris-choice-wrap">
										<span className="iris-sublabel">物理动力学策略</span>
										<SoftCheckbox
											label="无量纲阻尼回弹 (\u03B6 = 0.55)"
											checked={forceSensing}
											onChange={(e) => setForceSensing(e.target.checked)}
										/>
										<SoftCheckbox
											label="毛细扩散光晕 (Capillary Halo)"
											checked={smoothMotion}
											onChange={(e) => setSmoothMotion(e.target.checked)}
										/>
									</div>
								</div>

								<div>
									<span className="iris-sublabel">物理弹簧动力学阶段 (Spring Phase)</span>
									<div className="iris-stepper-wrap">
										<SoftStepper
											label="动力学执行阶段"
											current={stepperStep}
											onChange={setStepperStep}
											steps={[
												{
													id: "press",
													label: "弹性按压",
													note: "触觉形变",
												},
												{
													id: "overshoot",
													label: "单峰超调",
													note: "动力学回弹",
												},
												{
													id: "settle",
													label: "稳态静止",
													note: "无余震停驻",
												},
											]}
										/>
									</div>
								</div>

								<div className="iris-buttons-row">
									<SoftButton
										variant="clay"
										tone={tone}
										onClick={() => {
											setPromptInput("已激活粘土触感按钮（Clay Variant）：柔和反弹力曲线");
										}}
									>
										粘土触感体验
									</SoftButton>
									<SoftButton
										variant="gummy"
										tone={tone}
										onClick={() => {
											setPromptInput("已激活软糖阻尼按钮（Gummy Variant）：高阻尼吸收振动");
										}}
									>
										软糖阻尼手感
									</SoftButton>
									<SoftButton variant="flat" tone={tone} disabled={true}>
										禁用微透态 (Disabled)
									</SoftButton>
								</div>

								<SoftAlert
									tone={tone}
									material={
										materialMode === "solid"
											? "plain"
											: materialMode === "glass"
												? undefined
												: materialMode
									}
								>
									<strong>UI-Lib 语义化架构就绪</strong>
									<div style={{ marginTop: "4px" }}>
										所有 35+ 个 Soft 组件均深度适配信手感与东方水墨/液态玻璃材质，全量通过 463
										项自动化门禁。
									</div>
								</SoftAlert>
							</div>
						</SoftCard>
					</div>
				</div>
			)}

			{/* Tab 1: 具身交互终端 */}
			{activeTab === 1 && (
				<LiquidGlassCard className="iris-dock-card panel" glassOptions={cardProps}>
					<div className="iris-embodied-showcase">
						<div className="iris-embodied-header">
							<span className="iris-live-card-eyebrow">EMBODIED AGI PIPELINE</span>
							<h3 className="iris-dock-title">Iris 具身硬件全链路调度舱</h3>
							<p className="iris-dock-desc">
								原生支持跨平台具身遥控。UI-Lib 提供次世代的数字孪生渲染管线，与 UE5 XR
								视界无缝同频。
							</p>
						</div>

						<div className="iris-embodied-specs">
							<div className="iris-spec-card">
								<span className="iris-spec-badge">HARDWARE</span>
								<h4 className="iris-spec-title">Lyra · 揽星六轴机械臂</h4>
								<p className="iris-spec-body">
									内置高精度应变片式六维力传感器，支持 1000Hz
									动力学重力补偿与触觉反馈，亚毫米级轨迹重复精度。
								</p>
							</div>
							<div className="iris-spec-card">
								<span className="iris-spec-badge">DRONE</span>
								<h4 className="iris-spec-title">OpenInspire 3 无人机</h4>
								<p className="iris-spec-body">
									三目视觉 SLAM 避障导航系统，搭载毫米波测高雷达，支持复杂室内非 GPS
									环境自主建图穿梭。
								</p>
							</div>
							<div className="iris-spec-card">
								<span className="iris-spec-badge">XR BACKEND</span>
								<h4 className="iris-spec-title">UE5.5 XR 空间虚拟引擎</h4>
								<p className="iris-spec-body">
									Lumen 全局光照与 Nanite 几何体流送后端，UI-Lib 组件可直接编译映射至虚幻 3D
									空间交互界面。
								</p>
							</div>
						</div>
					</div>
				</LiquidGlassCard>
			)}

			{/* Tab 2: 光学折射透镜 */}
			{activeTab === 2 && (
				<LiquidGlassCard className="iris-dock-card panel" glassOptions={cardProps}>
					<div className="iris-lens-showcase">
						<div className="iris-lens-intro">
							<span className="iris-live-card-eyebrow">PHYSICAL OPTICS PROBE</span>
							<h3 className="iris-dock-title">双波长色散与空间法线折射透镜</h3>
							<p className="iris-dock-desc">
								移动下方透镜卡片，即可观察底层真实宣纸水墨纤维与 WebGPU 粒子场在圆角矩形 SDF
								下产生的像素级物理光路偏折。
							</p>
						</div>

						<div className="iris-lens-interactive-stage">
							<div className="iris-lens-interactive-card">
								<SoftCard material="wash" tone={tone} tilt={false}>
									<h4
										style={{
											margin: "0 0 10px",
											fontSize: "17px",
											color: "var(--moe-on-material, #241828)",
										}}
									>
										宣纸微孔毛细润湿底色
									</h4>
									<p
										style={{
											margin: "0 0 14px",
											fontSize: "13px",
											lineHeight: "1.6",
											color: "var(--moe-on-material, #241828)",
										}}
									>
										观察浮于上层的液态透镜如何将此段文字的墨色扩散与颗粒折射出彩虹色散光边。
									</p>
									<div style={{ display: "flex", gap: "8px" }}>
										<SoftChip selected={true}>Lucas-Washburn</SoftChip>
										<SoftChip>Kubelka-Munk</SoftChip>
										<SoftChip>SDF Refract</SoftChip>
									</div>
								</SoftCard>

								<GlassPanel
									className="iris-lens-floater"
									radius={28}
									bevel={32}
									refraction={64}
									dispersion={0.45}
									specular={0.8}
									frost={8}
									edgeGlow={0.7}
								>
									<div className="iris-lens-floater-content">
										<span className="iris-lens-crosshair" />
										<span className="iris-lens-tag">GPU 实时光学透镜 (&lambda; 色散 0.45)</span>
									</div>
								</GlassPanel>
							</div>
						</div>
					</div>
				</LiquidGlassCard>
			)}
		</section>
	);
}
