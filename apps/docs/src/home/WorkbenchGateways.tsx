import type { IrisTone } from "@ui-lib/core";
import { GlassPanel } from "@ui-lib/react";
import type { GlassPanelOptions } from "@ui-lib/renderer";
import type { PaletteId } from "./useIrisSynthesizer.js";

export interface WorkbenchGatewaysProps {
	palette: PaletteId;
	tone: IrisTone;
	cardProps: GlassPanelOptions;
}

export function WorkbenchGateways({ palette, tone, cardProps }: WorkbenchGatewaysProps) {
	return (
		<section className="iris-discovery-section" aria-label="全景展台与工作台直达">
			<div className="iris-discovery-header">
				<span className="iris-section-eyebrow">SHOWCASE & WORKBENCHES</span>
				<h2 className="iris-section-title">全景展台与材质实验室直达</h2>
				<p className="iris-section-subtitle">
					探索 UI-Lib 的两大支柱：GPU
					液态玻璃光场渲染与宣纸水彩语义化组件体系，保留当前调色板与材质状态。
				</p>
			</div>

			<div className="iris-discovery-grid">
				<GlassPanel className="panel discovery-card iris-card--frosted" {...cardProps}>
					<span className="discovery-card__kicker">35+ Soft Components</span>
					<h3 className="discovery-card__title">全景组件索引 · Kit Index</h3>
					<p className="discovery-card__body">
						全套 35+ 个 Soft 基础组件、5
						态物理矩阵（默认·悬停·聚焦·激活·禁用）与多材质实时切换（纯色·水彩·微透·玻璃）。
					</p>
					<a
						className="discovery-card__link"
						href={`/?demo=kit-index&palette=${palette}&tone=${tone}`}
					>
						进入全景索引&rarr;
					</a>
				</GlassPanel>

				<GlassPanel className="panel discovery-card iris-card--frosted" {...cardProps}>
					<span className="discovery-card__kicker">GPU Refraction SDF</span>
					<h3 className="discovery-card__title">液态玻璃实验室 · Glass Lab</h3>
					<p className="discovery-card__body">
						真实物理光折射与磨砂透镜模拟，多尺度硬边背景与拉普拉斯边缘能量保持率测试台。
					</p>
					<a className="discovery-card__link" href={`/?demo=glass-lab&palette=${palette}`}>
						探索玻璃实验室&rarr;
					</a>
				</GlassPanel>

				<GlassPanel className="panel discovery-card iris-card--frosted" {...cardProps}>
					<span className="discovery-card__kicker">Physics & Pigment</span>
					<h3 className="discovery-card__title">水彩材质工作台 · Studio</h3>
					<p className="discovery-card__body">
						Lucas-Washburn 毛细润湿前沿推进、水分蒸发干燥演化过程与 Kubelka-Munk 减色调色盘。
					</p>
					<a
						className="discovery-card__link"
						href={`/?demo=studio&palette=${palette}&tone=${tone}`}
					>
						进入水彩工作台&rarr;
					</a>
				</GlassPanel>

				<GlassPanel className="panel discovery-card iris-card--frosted" {...cardProps}>
					<span className="discovery-card__kicker">WAI-ARIA & Fixture</span>
					<h3 className="discovery-card__title">组件陈列室 · Iris Kit</h3>
					<p className="discovery-card__body">
						逐像素视觉验证基准面、无障碍 WAI-ARIA 语义契约与全状态独立标定展示。
					</p>
					<a
						className="discovery-card__link"
						href={`/?demo=iris-kit&palette=${palette}&tone=${tone}`}
					>
						访问组件陈列室&rarr;
					</a>
				</GlassPanel>
			</div>
		</section>
	);
}
