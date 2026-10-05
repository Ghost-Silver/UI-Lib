import { GlassPanel } from "@ui-lib/react";
import type { GlassPanelOptions } from "@ui-lib/renderer";

export interface TechPillarsGridProps {
	cardProps: GlassPanelOptions;
}

export function TechPillarsGrid({ cardProps }: TechPillarsGridProps) {
	return (
		<section className="iris-pillars-section" aria-label="UI-Lib 四大技术支柱">
			<div className="iris-section-head">
				<span className="iris-section-eyebrow">FOUR PILLARS</span>
				<h2 className="iris-section-title">UI-Lib 的四大技术支柱</h2>
				<p className="iris-section-subtitle">
					兼顾纯粹东方水墨写意美学与硬核物理空间渲染，为 AGI 时代构建具有灵魂的交互底座。
				</p>
			</div>

			<div className="iris-pillars-grid">
				<GlassPanel className="panel iris-pillar-card iris-card--frosted" {...cardProps}>
					<div className="iris-pillar-icon" aria-hidden="true">
						💎
					</div>
					<h3 className="iris-pillar-title">GPU 物理光学折射</h3>
					<p className="iris-pillar-body">
						基于圆角矩形 SDF 精确推导四分之一圆倒角法线，多波长色散与全角焦模糊算法，单 Canvas
						调度多面板无缝折射。
					</p>
				</GlassPanel>

				<GlassPanel className="panel iris-pillar-card iris-card--frosted" {...cardProps}>
					<div className="iris-pillar-icon" aria-hidden="true">
						🖌️
					</div>
					<h3 className="iris-pillar-title">宣纸水彩物理底座</h3>
					<p className="iris-pillar-body">
						Lucas-Washburn 毛细渗透微分前沿，结合咖啡环暗边沉降与 Kubelka-Munk
						真实减法光谱混色，告别发灰与生硬切边。
					</p>
				</GlassPanel>

				<GlassPanel className="panel iris-pillar-card iris-card--frosted" {...cardProps}>
					<div className="iris-pillar-icon" aria-hidden="true">
						🎚️
					</div>
					<h3 className="iris-pillar-title">无量纲阻尼微交互</h3>
					<p className="iris-pillar-body">
						严格校准 &zeta; = 0.55 实体弹簧动效，双层柔焦光晕焦点协议（FOCUS_HALO），48
						组笛卡尔积测试 WCAG AA/AAA 对比度全达标。
					</p>
				</GlassPanel>

				<GlassPanel className="panel iris-pillar-card iris-card--frosted" {...cardProps}>
					<div className="iris-pillar-icon" aria-hidden="true">
						🌐
					</div>
					<h3 className="iris-pillar-title">Iris 具身与多端生态</h3>
					<p className="iris-pillar-body">
						深度集成 Iris Runtime 沙箱、CTorch 推理后端、Lyra 六轴机械臂与 UE5 XR
						混合现实空间锚点，赋能次世代真实世界。
					</p>
				</GlassPanel>
			</div>
		</section>
	);
}
