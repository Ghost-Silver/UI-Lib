import { IRIS } from "@ui-lib/core";
import { GlassPanel, GlassStage, LiquidGlass } from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect, useState } from "react";

/**
 * Wet paper — material study.
 *
 * Not a component showcase. This page exists to work out whether three
 * properties of real watercolour can be built at all, because a `radial-
 * gradient` has none of them and they are the whole difference between a wash
 * and a blurred colour block:
 *
 * 1. **Edge darkening.** Pigment is carried to the rim as water evaporates, so
 *    a wet mark is darker at its border than at its centre. A gradient gets
 *    this exactly backwards.
 * 2. **Fibre.** Paper is not smooth. Pigment settles into it unevenly, and the
 *    unevenness is what the eye reads as "this is on something".
 * 3. **Dry edges.** While a pool is wet its boundary is soft; once it dries the
 *    boundary is sharp. The same pigment has two different edges depending on
 *    how much water was there.
 *
 * Everything below is CSS. No shader, because these are texture problems
 * rather than lighting problems, and a shader that could fake them would cost
 * far more than the compositor charges for a blur.
 */

const PAPER: BackdropSpec = {
	type: "gradient",
	colors: [IRIS.blossom[100], IRIS.iris[100], IRIS.mist[100], IRIS.blossom[100]],
	background: "#fdfaf6",
	vignette: 0,
	// A light page has to ask for the sheen back; at 1 the backdrop renders
	// mid-grey, which is what the first version of this did.
	intensity: 2,
	grain: 0,
	speed: 0,
};

/** A pool of pigment. `weight` is how much water carried it. */
interface Wash {
	name: string;
	/** Wet: soft edge. Dried: a hard rim. */
	dry: boolean;
	size: number;
	hue: string;
	weight: number;
	/** Shifts this specimen's silhouette so four of them are not one blob. */
	lobes: number;
}

const WASHES: Wash[] = [
	{ name: "湿 · 重", dry: false, size: 210, hue: IRIS.iris[500], weight: 0.9, lobes: 3 },
	{ name: "湿 · 轻", dry: false, size: 160, hue: IRIS.blossom[500], weight: 0.5, lobes: -2 },
	{ name: "干 · 重", dry: true, size: 210, hue: IRIS.mist[500], weight: 0.9, lobes: -3 },
	{ name: "干 · 轻", dry: true, size: 160, hue: IRIS.iris[500], weight: 0.5, lobes: 2 },
];

export function WetPaperPage() {
	// Bumping this remounts the specimen, which is how a CSS animation is
	// replayed: the element has to be new, or the browser keeps the finished
	// state and nothing happens on the second click.
	const [lay, setLay] = useState(0);

	useEffect(() => {
		document.title = "水彩纸 · Iris";
	}, []);

	/*
	 * `section`, and the page is kept to one screen.
	 *
	 * Both modes were wrong for a long page and the reason is the same in each: a
	 * section canvas is sized to its parent, so anything below the first screen
	 * falls through to the stage's own background; a fixed canvas only covers the
	 * viewport, so a full-page capture finds nothing. A material study is three
	 * specimens and a comparison — it fits.
	 */
	return (
		<GlassStage className="paper-stage" mode="section" backdrop={PAPER}>
			<div className="paper" data-ui-lib-acceptance="wet-paper">
				<header className="paper__head">
					<p className="paper__kicker">材质研究 · 一</p>
					<h1 className="paper__title">颜料是怎么待在纸上的</h1>
					<p className="paper__lede">
						真实的颜料会往边缘走、会沉进纤维、干湿两种状态下边界完全不同。
						渐变一个都做不到——这也是水彩和「模糊色块」的全部区别。
					</p>
				</header>

				{/* The three claims, each shown as the pair it is about. */}
				<section className="paper__row">
					<h2 className="paper__label">边缘沉积</h2>
					<div className="paper__pair">
						<figure className="paper__specimen">
							<span className="wash wash--flat" style={{ width: 180, height: 180 }} />
							<figcaption>渐变：中心最深</figcaption>
						</figure>
						<figure className="paper__specimen">
							<span
								className="wash wash--wet"
								style={{ width: 180, height: 180, ["--wash" as string]: IRIS.iris[500] }}
							/>
							<figcaption>水彩：边缘最深</figcaption>
						</figure>
					</div>
				</section>

				<section className="paper__row">
					<h2 className="paper__label">干湿两态</h2>
					<div className="paper__pair">
						{WASHES.map((wash) => (
							<figure key={wash.name} className="paper__specimen">
								<span
									className={`${wash.dry ? "wash wash--dry" : "wash wash--wet"}${wash.dry ? "" : " wash--living"}`}
									style={{
										width: wash.size,
										height: wash.size,
										["--wash" as string]: wash.hue,
										["--weight" as string]: String(wash.weight),
										["--lobes" as string]: String(wash.lobes),
									}}
								>
									{wash.dry && <span className="wash__deposit" />}
								</span>
								<figcaption>{wash.name}</figcaption>
							</figure>
						))}
					</div>
				</section>

				<section className="paper__row">
					<h2 className="paper__label">颜料会在水里走</h2>
					<div className="paper__pair">
						<figure className="paper__specimen">
							<span
								key={lay}
								className="wash wash--wet wash--spreading"
								style={{
									width: 190,
									height: 190,
									["--wash" as string]: IRIS.iris[500],
									["--weight" as string]: "0.85",
									["--lobes" as string]: "3",
								}}
							>
								<span className="wash__deposit" />
							</span>
							<figcaption>
								<button
									type="button"
									className="paper__relay"
									onClick={() => setLay((n) => n + 1)}
								>
									再画一笔
								</button>
							</figcaption>
						</figure>
						<p className="paper__note">
							湿的时候水还在搬颜料：从落笔处往外走，沿着纤维走，走到边界停住。
							<strong>边缘那圈深色不是画上去的，是水流到最后留下的。</strong>
						</p>
					</div>
				</section>

				<section className="paper__row">
					<h2 className="paper__label">纸与水的界面</h2>
					<div className="paper__panels">
						<LiquidGlass tint="iris" className="paper__film">
							<span className="paper__film-text">水膜</span>
						</LiquidGlass>
						<GlassPanel
							className="paper__pane"
							tint={IRIS.blossom[100]}
							tintAmount={0.3}
							frost={9}
							refraction={22}
						>
							<p className="paper__pane-title">玻璃下的湿纸</p>
							<p className="paper__pane-body">折射让底下的纸会动，但不会把它变成塑料。</p>
						</GlassPanel>
					</div>
				</section>
			</div>
		</GlassStage>
	);
}
