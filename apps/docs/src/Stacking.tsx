/**
 * What can and cannot be stacked, measured rather than asserted.
 *
 * The library has two halves that were built for different jobs. The GPU side
 * draws one canvas and refracts what is inside it; the component side draws DOM
 * that sits above that canvas. This page exists to put a number on where the seam
 * between them is, because the answer is not "they compose" and is not "they do
 * not" — it depends which way the effect points.
 *
 * ## The four combinations, and which of them work
 *
 * | | inside the canvas | in the DOM |
 * | --- | --- | --- |
 * | **material under glass** | the glass bends it | **the glass cannot see it** |
 * | **glass under DOM** | nothing | the DOM draws over the glass |
 *
 * The bottom-left cell is the one people expect to work and it is the one that
 * cannot: a `GlassPanel` samples the offscreen target the canvas renders into,
 * and DOM is painted above the canvas by the browser's own compositor. A
 * watercolour card in the DOM is not in that target, so there is nothing to
 * refract. Measured with a solid probe rectangle inserted directly beneath a
 * glass bar: the bar drew over it, the probe's pixels were unchanged, and the
 * glass showed no displacement — only the flat colour, and the bar's own
 * contents on top.
 *
 * ## What that means for a designer, in one line
 *
 * **Glass bends pigment only if the pigment is painted by the canvas.** A DOM
 * watercolour is a flat layer under a transparent pane, and calling that "glass"
 * is a lie the screenshot can disprove.
 *
 * `@ui-lib/core`'s generator therefore produces two kinds of ground for two kinds
 * of result: `--wash-ground` for a DOM surface, which is a texture you look at
 * directly, and the canvas wash for a ground a `GlassPanel` can bend. They are the
 * same pigment; only one of them is in a place glass can reach.
 */
import { GlassPanel, GlassStage, LiquidGlass, SoftCard, SoftTag } from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";

/** A calm backdrop, because the demonstration is about the seam and not the show. */
const BACKDROP: BackdropSpec = { type: "color", color: "#f7f3ee" };

export function StackingPage() {
	return (
		<GlassStage backdrop={BACKDROP} className="stack-stage">
			{/*
			 * ROW 1 — material *is* reachable by glass, because it is in the canvas.
			 *
			 * This is the honest version of "watercolour under glass": the pigment is
			 * drawn into the same offscreen target the panel samples, so the panel has
			 * pixels to bend. The pigment here is the canvas wash, not a DOM card.
			 */}
			<section className="stack__row">
				<div className="stack__label">
					<h2>玻璃能弯到的水彩</h2>
					<p>
						颜料画在 canvas 里，所以 <code>GlassPanel</code> 采样得到它。
						边缘的位移和高光是像素证据 —— 平铺的色块不会这样。
					</p>
					<SoftTag tone="iris" variant="soft">
						可以叠加
					</SoftTag>
				</div>
				<LiquidGlass tint="iris" className="stack__glass">
					canvas 颜料
				</LiquidGlass>
			</section>

			{/*
			 * ROW 2 — the cell that does not work, shown as it actually is.
			 *
			 * A DOM card sits directly behind a GlassPanel. The card renders, the panel
			 * renders, and the panel bends nothing — because the card was never in the
			 * target the panel samples. Shown rather than described, because the
			 * failure is invisible in a description and obvious in a screenshot.
			 */}
			<section className="stack__row stack__row--dom">
				<div className="stack__label">
					<h2>玻璃弯不到的</h2>
					<p>
						同一块 <code>GlassPanel</code>，背后换成 DOM 的水彩卡片。
						卡片照常显示，而玻璃什么都没弯 —— 它在 canvas 里，DOM 在 canvas 之上。
					</p>
					<SoftTag tone="blossom" variant="solid">
						不能叠加
					</SoftTag>
				</div>
				<div className="stack__overlap">
					<SoftCard material="wash" tone="iris" seedName="under" className="stack__under">
						<span>DOM 水彩</span>
					</SoftCard>
					<GlassPanel className="stack__glass stack__glass--over">玻璃</GlassPanel>
				</div>
			</section>

			<section className="stack__notes">
				<h2>所以该怎么叠</h2>
				<ul>
					<li>
						<strong>要玻璃弯颜料</strong> —— 颜料交给 canvas，玻璃用 <code>GlassPanel</code>。
						<code>@ui-lib/core</code> 的 canvas wash 就是为此。
					</li>
					<li>
						<strong>要颜料承托玻璃</strong> —— 颜料在 DOM，玻璃在外面只是透明，
						那不是折射。见上面第二行的实际效果。
					</li>
					<li>
						<strong>两者都在一页</strong> —— 可以，而且这一页就是。 它们只是不互相穿透：canvas
						层和 DOM 层各自叠在自己那一侧。
					</li>
				</ul>
			</section>
		</GlassStage>
	);
}
