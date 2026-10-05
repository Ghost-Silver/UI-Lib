import type { IrisTone } from "@ui-lib/core";
import { GlassPanel, Magnetic } from "@ui-lib/react";
import type { GlassPanelOptions } from "@ui-lib/renderer";
import { PALETTE_OPTIONS, type PaletteId } from "./useIrisSynthesizer.js";

export interface IrisNavCapsuleProps {
	palette: PaletteId;
	setPalette: (p: PaletteId) => void;
	tone: IrisTone;
	pillProps: GlassPanelOptions;
	forceFallback: boolean;
	setForceFallback: (v: boolean) => void;
	backend: "webgl" | "webgpu";
	setBackend: (b: "webgl" | "webgpu") => void;
}

export function IrisNavCapsule({
	palette,
	setPalette,
	tone,
	pillProps,
	forceFallback,
	setForceFallback,
	backend,
	setBackend,
}: IrisNavCapsuleProps) {
	return (
		<header className="iris-nav-wrapper">
			<Magnetic strength={0.2} radius={80}>
				<GlassPanel className="iris-nav-capsule" {...pillProps}>
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
						<a className="iris-nav-item" href={`/?demo=studio&palette=${palette}&tone=${tone}`}>
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

						<span className="iris-tone-badge" title={`当前水墨色调: ${tone}`}>
							{tone.toUpperCase()}
						</span>

						<button
							type="button"
							className={`iris-backend-pill ${backend === "webgl" ? "iris-backend-pill--webgl" : "iris-backend-pill--webgpu"}`}
							onClick={() => setBackend(backend === "webgpu" ? "webgl" : "webgpu")}
							title="点击切换 WebGPU / WebGL2 后端"
						>
							{backend === "webgpu" ? "WebGPU" : "WebGL 2"}
						</button>

						<button
							type="button"
							className={`iris-fallback-btn ${forceFallback ? "iris-fallback-btn--active" : ""}`}
							onClick={() => setForceFallback(!forceFallback)}
							title="切换 CSS 纯滤镜降级与 GPU 渲染"
						>
							{forceFallback ? "CSS" : "GPU"}
						</button>
					</div>
				</GlassPanel>
			</Magnetic>
		</header>
	);
}
