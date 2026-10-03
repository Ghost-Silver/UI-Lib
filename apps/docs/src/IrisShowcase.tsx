import type { PlatformBudget } from "@ui-lib/core";
import { IRIS, IRIS_TONES } from "@ui-lib/core";
import {
	Bling,
	BubbleBadge,
	CrystalText,
	GlassStage,
	PinkPaperButton,
	Reveal,
	SoftLightPanel,
	WatercolorCard,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";

/**
 * The IRIS surface: five components on one stage.
 *
 * Still one canvas, one renderer, one scheduler. Every word on this page is
 * real DOM — the badges are focusable, the button takes the keyboard, and the
 * washes are painted behind selectable text.
 */

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: [IRIS.iris[100], "#ffffff", IRIS.blossom[100], IRIS.mist[100]],
	background: IRIS.paper,
	vignette: 0,
	intensity: 1.85,
	grain: 0.003,
	speed: 0.018,
};

const COPY = [
	{ tone: "iris" as const, name: "鸢尾", note: "品牌紫。气泡徽标与按钮的默认档位。" },
	{ tone: "blossom" as const, name: "樱粉", note: "次色。暖一分，但从不抢主色。" },
	{ tone: "mist" as const, name: "雾蓝", note: "冷一档，防止一页粉紫塌成一个色。" },
];

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export function IrisShowcasePage() {
	// The acceptance contract for every demo: these two force the CSS and the
	// WebGL2 routes so the fallbacks are testable, not just theoretical.
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	// `?budget=declared` states the budget instead of probing for it, the way a
	// non-web host would. It exists so the seam is reachable from a URL and can
	// be asserted, rather than only being reachable from a type signature.
	const declared = readFlag("budget", "declared");
	const budget: PlatformBudget | undefined = declared
		? {
				host: "declared-demo",
				source: "declared",
				tier: 2,
				preset: { particleBudget: 5_000, maxPanels: 6 },
			}
		: undefined;

	const crystalSlot = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = "IRIS · UI-Lib";
	}, []);

	return (
		<GlassStage
			className="iris-stage"
			mode="section"
			backdrop={BACKDROP}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
			budget={budget}
		>
			<div className="iris" data-ui-lib-acceptance="iris">
				<Bling count={16} tone="iris" />
				<header className="iris__top">
					<p className="iris__kicker">
						IRIS <span>components</span>
					</p>
					<nav className="iris__links" aria-label="页面">
						<a href="/">Index</a>
						<a href="/?demo=liquid-glass">Glass</a>
						<a href="/?demo=iris">IRIS</a>
					</nav>
				</header>

				<main className="iris__main">
					<div className="iris__copy">
						<Reveal as="h1" by="item" delay={0.12} className="iris__title">
							<span>一套粉紫水彩的</span>
							<span className="iris__accent">组件。</span>
						</Reveal>
						<Reveal as="p" className="iris__lede" delay={0.5}>
							五个组件共享一份调色板与同一套光学参数。字仍然是 HTML，玻璃仍然是屏幕空间折射。
						</Reveal>
						<div className="iris__badges">
							{IRIS_TONES.map((tone) => (
								<BubbleBadge key={tone} tone={tone}>
									{tone}
								</BubbleBadge>
							))}
						</div>
						<div className="iris__buttons">
							<PinkPaperButton tone="blossom">开始</PinkPaperButton>
							<PinkPaperButton tone="iris">了解更多</PinkPaperButton>
							<PinkPaperButton tone="mist" disabled>
								暂不可用
							</PinkPaperButton>
						</div>
					</div>

					<div className="iris__panels">
						<SoftLightPanel tone="iris" className="iris__panel">
							<p className="iris__kicker">柔光面板</p>
							<h2>光，不是窗。</h2>
							<p>重磨砂、宽亮边、几乎不折射——边缘是化开的，不是画出来的。</p>
						</SoftLightPanel>

						<WatercolorCard tone="blossom" className="iris__card">
							<CrystalText text="水彩" anchor={crystalSlot} size={0.85} color="#2a0f45" />
							<div ref={crystalSlot} className="iris__crystal-slot" aria-hidden="true" />
							<p className="iris__kicker">水彩卡片</p>
							<h3>颜料是自己摊开的。</h3>
							<p>底色是分层的水彩晕染，上面盖的是真玻璃，会折它背后的东西。</p>
							<div className="iris__badges">
								<BubbleBadge tone="blossom">blossom</BubbleBadge>
								<BubbleBadge tone="iris">iris</BubbleBadge>
							</div>
						</WatercolorCard>
					</div>

					<ul className="iris__tones">
						{COPY.map((item) => (
							<li key={item.tone}>
								<BubbleBadge tone={item.tone}>{item.name}</BubbleBadge>
								<span>{item.note}</span>
							</li>
						))}
					</ul>
				</main>
			</div>
		</GlassStage>
	);
}
