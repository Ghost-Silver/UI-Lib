import type { IrisTone } from "@ui-lib/core";
import { SoftButton } from "@ui-lib/react";
import type { PaletteId } from "./useIrisSynthesizer.js";

export interface IrisHeroSectionProps {
	palette: PaletteId;
	tone: IrisTone;
	onExploreClick?: () => void;
}

export function IrisHeroSection({ palette, tone, onExploreClick }: IrisHeroSectionProps) {
	return (
		<section className="iris-hero-section" aria-label="Iris AGI 旗舰愿景">
			<div className="iris-hero-badge">
				<span className="iris-hero-badge-dot" aria-hidden="true" />
				<span>EMBODIED AGI INTERFACE · WEBGPU / UE5 XR READY</span>
			</div>

			<h1 className="iris-hero-title">积微成智，万象自生。</h1>

			<p className="iris-hero-motto">“Build Intelligence. Give It a World.”</p>

			<p className="iris-hero-desc">
				专为 <strong>Iris 具身智能体</strong> 打造的物理级渲染引擎与次世代人机界面基础设施。
				攻克 Lucas-Washburn 宣纸毛细水彩浸润、GPU 空间光折射、&zeta; = 0.55
				无量纲弹簧触感微交互， 并全面赋能 Lyra 六轴机械臂、OpenInspire 3 无人机及混合现实 XR
				后端。
			</p>

			<div className="iris-hero-actions">
				<SoftButton variant="clay" tone={tone} size="lg" onClick={onExploreClick}>
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
	);
}
