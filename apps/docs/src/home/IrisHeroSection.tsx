import type { IrisTone } from "@ui-lib/core";
import {
	SoftAlert,
	SoftButton,
	SoftCheckbox,
	SoftInput,
	SoftSegmentedControl,
	SoftSlider,
} from "@ui-lib/react";
import { LiquidGlassCard } from "./LiquidGlass.js";
import type { MaterialMode, PaletteId, useIrisSynthesizer } from "./useIrisSynthesizer.js";

export interface IrisHeroSectionProps {
	palette: PaletteId;
	tone: IrisTone;
	onExploreClick?: () => void;
	synth: ReturnType<typeof useIrisSynthesizer>;
}

export function IrisHeroSection({
	palette,
	tone,
	onExploreClick,
	synth,
}: IrisHeroSectionProps) {
	return (
		<section className="iris-hero-section" aria-label="Iris AGI 旗舰愿景与 UI-Lib 液态组件工坊">
			{/* Split Hero: Left Slogan & Right UI-Lib Component Atelier */}
			<div className="iris-hero-split">
				{/* Left Column: Slogan, Vision & CTAs */}
				<div className="iris-hero-left">
					<div className="iris-hero-badge">
						<span className="iris-hero-badge-dot" aria-hidden="true" />
						<span>EMBODIED AGI INTERFACE · WEBGPU / UE5 XR READY</span>
					</div>

					<h1 className="iris-hero-title">
						<span className="iris-title-part">积微成智，</span>
						<span className="iris-title-part">万象自生。</span>
					</h1>

					<p className="iris-hero-motto">“Build Intelligence. Give It a World.”</p>

					<p className="iris-hero-desc">
						专为 <strong>Iris 具身智能体</strong> 打造的物理级渲染引擎与次世代人机界面基础设施。
						攻克 Lucas-Washburn 宣纸毛细水彩浸润、GPU 空间光折射、&zeta; = 0.55
						无量纲弹簧触感微交互， 并全面赋能 Lyra 六轴机械臂、OpenInspire 3 无人机及混合现实 XR
						后端。
					</p>

					<div className="iris-hero-actions">
						<SoftButton variant="clay" tone={tone} size="md" onClick={onExploreClick}>
							<span>探索 35+ 全套 Soft 组件</span>
							<span aria-hidden="true" style={{ marginLeft: "8px" }}>
								→
							</span>
						</SoftButton>
						<SoftButton
							variant="gummy"
							tone={tone}
							size="md"
							onClick={() => {
								window.location.href = `/?demo=studio&palette=${palette}&tone=${tone}`;
							}}
						>
							水彩工作台 (Studio)
						</SoftButton>
						<SoftButton
							variant="flat"
							tone={tone}
							size="md"
							onClick={() => {
								window.location.href = `/?demo=glass-lab&palette=${palette}`;
							}}
						>
							玻璃实验室 (Glass Lab)
						</SoftButton>
					</div>
				</div>

				{/* Right Column: UI-Lib Interactive Bench · Apple-Grade Thick Liquid Glass Card */}
				<div className="iris-hero-right">
					<LiquidGlassCard
						className="iris-hero-glass-card"
						thickness={synth.thickness}
						opticalParams={synth.params}
					>
						<div className="iris-live-header">
							<div>
								<div className="iris-live-card-eyebrow">
									UI-LIB COMPONENT ATELIER · APPLE LIQUID GLASS
								</div>
								<h3 className="iris-live-card-title">UI-Lib 交互视界 · 液态组件工坊</h3>
							</div>
							<span className="iris-live-card-tag">
								{synth.thickness}mm 厚度 · &zeta; = {synth.zetaDamping.toFixed(2)}
							</span>
						</div>

						<div className="iris-live-form">
							{/* 1. Interactive Soft Button tactile variants */}
							<div>
								<span className="iris-sublabel">物理触感变体 (Tactile Feel Variants)</span>
								<div
									className="iris-buttons-row"
									style={{ display: "flex", gap: "10px", marginTop: "6px" }}
								>
									<SoftButton variant="clay" tone={tone} size="sm">
										粘土触感 (Clay)
									</SoftButton>
									<SoftButton variant="gummy" tone={tone} size="sm">
										软糖阻尼 (Gummy)
									</SoftButton>
									<SoftButton variant="flat" tone={tone} size="sm">
										微透平展 (Flat)
									</SoftButton>
								</div>
							</div>

							{/* 2. Apple Liquid Glass thickness & spring damping sliders */}
							<div className="iris-form-row">
								<div style={{ flex: 1 }}>
									<SoftSlider
										label="玻璃物理厚度 (Glass Thickness)"
										min={12}
										max={40}
										step={1}
										value={synth.thickness}
										onChange={synth.setThickness}
										format={(v) => `${v}mm 厚晶板`}
									/>
									<span className="iris-control-hint">
										Apple 级厚重液态玻璃，强双面法线高光与色散
									</span>
								</div>
								<div style={{ flex: 1 }}>
									<SoftSlider
										label="物理阻尼比 (Damping Ratio &zeta;)"
										min={0.2}
										max={1.0}
										step={0.01}
										value={synth.zetaDamping}
										onChange={synth.setZetaDamping}
										format={(v) => `\u03B6 = ${v.toFixed(2)}`}
									/>
									<span className="iris-control-hint">标准物理无量纲阻尼，迅捷回弹手感</span>
								</div>
							</div>

							{/* 3. Surface Material switcher */}
							<div>
								<span className="iris-sublabel">次世代表面材质管线 (Surface Material)</span>
								<SoftSegmentedControl
									options={[
										{ value: "solid", label: "纯色 Solid" },
										{ value: "wash", label: "水彩 Wash" },
										{ value: "tint", label: "微透 Tint" },
										{ value: "glass", label: "玻璃 Glass" },
									]}
									value={synth.materialMode}
									onChange={(val) => synth.setMaterialMode(val as MaterialMode)}
								/>
							</div>

							{/* 4. Form input with Focus Halo & checkboxes */}
							<div>
								<label htmlFor="hero-prompt-input" className="iris-sublabel">
									语义化表单交互与柔焦光晕 (FOCUS_HALO)
								</label>
								<SoftInput
									id="hero-prompt-input"
									value={synth.promptInput}
									onChange={(e) => synth.setPromptInput(e.target.value)}
									placeholder="输入文字体验柔焦光晕 (FOCUS_HALO)..."
								/>
							</div>

							<div className="iris-check-group" style={{ display: "flex", gap: "18px" }}>
								<SoftCheckbox
									checked={synth.forceSensing}
									onChange={(e) => synth.setForceSensing(e.target.checked)}
									label="Lucas-Washburn 宣纸毛细润湿"
								/>
								<SoftCheckbox
									checked={synth.smoothMotion}
									onChange={(e) => synth.setSmoothMotion(e.target.checked)}
									label="Apple 级厚度全角焦物理折射"
								/>
							</div>

							{/* 5. Live Accessibility status */}
							<SoftAlert tone={synth.tone}>
								<strong>35+ 全套 Soft 语义化组件已就绪</strong>
								<div style={{ marginTop: "4px" }}>
									深度适配 Apple 级厚重液态玻璃与东方宣纸水墨材质，全键盘 WAI-ARIA 无障碍达标。
								</div>
							</SoftAlert>
						</div>
					</LiquidGlassCard>
				</div>
			</div>

			{/* Bottom Metrics Bar across the full hero */}
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
	);
}
