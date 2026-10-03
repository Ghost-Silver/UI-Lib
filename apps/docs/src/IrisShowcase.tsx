import type { PlatformBudget } from "@ui-lib/core";
import { IRIS, IRIS_TONES } from "@ui-lib/core";
import {
	Bling,
	BubbleBadge,
	CrystalText,
	fieldOptions,
	GlassStage,
	ParticleField,
	PinkPaperButton,
	Reveal,
	SoftCard,
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

/**
 * World units, not pixels. One world unit is about 73px here.
 *
 * The layer's default particle camera sits at z = 14 looking at the origin with
 * a 52 degree field of view, and nothing on a page moves it unless a page says
 * so. At a 1000px viewport that makes the visible height 2 * 14 * tan(26
 * degrees) = 13.66 world units, so one unit is 1000 / 13.66 = 73.2px — not the
 * ~171px it is easy to assume from the fov and distance a different page
 * happens to use.
 *
 * Getting this wrong is what made a cloud of 1600 motes render as a single
 * dot and a line of type vanish off the edge: every value was out by two to
 * five times, and a shape that far out of scale reads as "nothing was drawn".
 * Anything positioned in the world on this page should be sized against this
 * number rather than against a pixel count.
 */
const WORLD_UNIT_PX = 73.2;

/**
 * Screen position to world position, so the numbers below can be written the
 * way they are reasoned about — "460px right of centre, 240px up" — rather
 * than as world units nobody can check by reading.
 */
function screenToWorld(px: number, py: number, viewport = { width: 1440, height: 1000 }) {
	return [
		(px - viewport.width / 2) / WORLD_UNIT_PX,
		(viewport.height / 2 - py) / WORLD_UNIT_PX,
		0,
	] as [number, number, number];
}

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

	const crystalBand = useRef<HTMLDivElement>(null);

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

					{/* Behind the panels, so their glass has something to bend. Sized and
					    placed in world units against WORLD_UNIT_PX above, not in pixels:
					    6.28 world units right of centre is 460px, which is where the
					    panel column sits. */}
					<ParticleField
						options={fieldOptions("halo")}
						attractor={screenToWorld(1180, 360)}
						depth="scene"
					/>

					<div className="iris__panels">
						<SoftLightPanel tone="iris" className="iris__panel">
							<p className="iris__kicker">柔光面板</p>
							<h2>光，不是窗。</h2>
							<p>重磨砂、宽亮边、几乎不折射——边缘是化开的，不是画出来的。</p>
						</SoftLightPanel>

						<WatercolorCard tone="blossom" className="iris__card">
							{/* Behind the card's glass: slow motes, so the pane has something
							    to bend. Type here was the first attempt and it read as a
							    stain — a wash with nothing moving in it gives refraction
							    nothing to say, and the glass only made the glyphs muddy.
							    The crisp type lives further down, with no pane in front. */}
							<p className="iris__kicker">水彩卡片</p>
							<h3>颜料是自己摊开的。</h3>
							<p>底色是分层的水彩晕染，上面盖的是真玻璃，会折它背后的东西。</p>
							<div className="iris__badges">
								<BubbleBadge tone="blossom">blossom</BubbleBadge>
								<BubbleBadge tone="iris">iris</BubbleBadge>
							</div>
						</WatercolorCard>
					</div>

					{/* No glass in front of this one, so it resolves the way the distance
					    field actually is: solid and sharp. The two instances together
					    are the honest picture — one bent by a pane, one not. */}
					{/* Open ground, no pane in front of it. The motes behind the card
				    are bent by its glass, which is the point of putting them
				    there, but a pane that hides them entirely teaches nothing.
				    This one is the same palette with nothing in the way. */}

					<section className="iris__crystal-band">
						<CrystalText
							text="Iris UI"
							anchor={crystalBand}
							size={2.6}
							color="#3b1d6e"
							opacity={0.9}
							rotation={[0, 0, -0.02]}
						/>
						<div ref={crystalBand} className="iris__crystal-band-slot" aria-hidden="true" />
					</section>

					<section className="iris__cards">
						<SoftCard interactive glossy className="iris__card">
							<h3>点一下试试</h3>
							<p>
								悬停时它浮起 4px 并倾斜 1.5°，按下时收紧到 98.5%。全部由弹簧曲线驱动，
								没有动画库——一次过冲用贝塞尔就能表达，只有按压那两下起伏需要关键帧。
							</p>
						</SoftCard>
						<SoftCard interactive className="iris__card">
							<h3>同心圆角</h3>
							<p>
								内层圆角等于外层减去内边距。两个只是"看起来圆"的圆角并不是同心：
								取值相同时，拐角处缝隙会收窄、边上会鼓出来，读起来像一个瘤。
							</p>
						</SoftCard>
						<SoftCard interactive className="iris__card">
							<h3>粘土三层阴影</h3>
							<p>
								环境落影说明物体被托起，顶部内高光说明光从上面来并发生了漫反射，
								底部内暗影说明下沿在向内收。少任何一层，它就变成一张贴纸。
							</p>
						</SoftCard>
					</section>

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
