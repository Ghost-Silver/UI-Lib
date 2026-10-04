import {
	fieldOptions,
	GLASS_LOOKS,
	GlassStage,
	ParticleField,
	SoftButton,
	SoftCard,
	SoftChip,
	SoftTag,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useMemo, useState } from "react";
import { createProbeBackdrop } from "./probeBackdrop.js";

/**
 * The three layers, laid out so the thickness is the subject.
 *
 * **Bottom** is a paper ground with pigment on it, drawn by the canvas. **Middle**
 * is one quiet pane of glass over the whole field. **Top** is a card made of thick
 * glass, refracting both of the layers under it.
 *
 * The reason this page exists is that the difference is not describable. A card
 * with `bevel: 22` and a card with `bevel: 78` are the same component with the
 * same props except one number, and the only way to know whether the second reads
 * as *two centimetres of glass* rather than *a blurrier card* is to put them next
 * to each other and look.
 *
 * ## What is behind the glass matters more than the glass
 *
 * `GlassPanel` refracts what the **canvas** draws. A wash in the DOM is above the
 * canvas and cannot be bent — measured and written down in the stacking page. So
 * the pigment field here is a canvas backdrop, not a `material="wash"` card:
 * the thickness of the glass is only legible when there is structure behind it to
 * displace, and flat colour gives the eye nothing to measure the bend against.
 */

/**
 * The measurement field, not a mood.
 *
 * The previous version of this page was a four-stop gradient in near-identical
 * pale tints. The comment above it already said that flat colour gives the eye
 * nothing to measure a bend against, and then the code supplied exactly that.
 * It cost two rounds: every `refraction` from 42 to 96 rendered the same, so the
 * page reported "the glass is opaque" when what it actually reported was "this
 * page cannot see displacement".
 *
 * A probe field fixes the apparatus rather than the glass. Hard edges at three
 * spatial scales — 8px hairlines, 64px blocks, a 320px frame and crosshair —
 * plus wordmarks. The frame is the important one: a large displacement at the
 * rim has to have a large mark to drag, or a strong refraction only shuffles
 * hairlines within their own neighbourhood and still reads as static.
 *
 * Built once and held. `GlassStage` keys the backdrop by texture uuid, so a
 * texture rebuilt per render would re-upload the field every frame.
 */
function useProbeBackdrop(): BackdropSpec {
	return useMemo<BackdropSpec>(() => {
		const build = createProbeBackdrop({ size: 1024, repeat: [0.42, 0.42] });
		return { type: "texture", texture: build() };
	}, []);
}

const TIERS: { id: string; label: string; look: keyof typeof GLASS_LOOKS; note: string }[] = [
	{ id: "dew", label: "水珠", look: "dew", note: "毛面、厚边，雾气感" },
	{ id: "pane", label: "窗玻璃", look: "pane", note: "日常厚度，能看清里面" },
	{ id: "product", label: "原版", look: "product", note: "之前所有页面的玻璃" },
	{ id: "slab", label: "厚板", look: "slab", note: "边缘占去四成，折射最强" },
];

export function GlassLabPage() {
	const [look, setLook] = useState<keyof typeof GLASS_LOOKS>("slab");
	const [dense, setDense] = useState(false);
	const backdrop = useProbeBackdrop();

	return (
		<GlassStage backdrop={backdrop} className="glasslab-stage">
			{/*
			 * **Structure behind the glass, and this is not decoration.**
			 *
			 * A pane of glass is legible only against something with edges: the eye
			 * reads thickness from *how far the thing behind it moved*. Against a
			 * smooth gradient a displacement of ninety pixels looks exactly like a
			 * displacement of six, which is the measurement that sent me here —
			 * four cards at `bevel` 56, 34, 22 and 78 rendered identically.
			 *
			 * The field above supplies that structure now. The particles are the
			 * *moving* part, not the measuring part: they are soft glowing motes
			 * with no edge to compare against, so they prove the glass is live
			 * without ever proving how far it bent something. Both layers are the
			 * point — a still hard-edged field to measure against, and a drifting
			 * soft one so a page that is not being scrolled still has motion
			 * behind the rim.
			 */}
			<ParticleField
				pointer
				pointerDistance={7.2}
				camera={{ cameraPosition: [0, 0.1, 8.6], fov: 34 }}
				options={fieldOptions("aurora", { count: 9000 })}
			/>
			<div className="glasslab">
				<header className="glasslab__head">
					<p className="glasslab__kicker">材质研究 · 二</p>
					<h1 className="glasslab__title">厚到什么程度算厚</h1>
					<p className="glasslab__lede">
						四块同样的卡片，只有一支 look 不同。厚玻璃不是更模糊的玻璃 ——
						它是边缘斜面占去更多面积、折射更强、色散拉开，而中间那块平整的窗更小。
					</p>
					<div className="glasslab__picker">
						{TIERS.map((t) => (
							<SoftChip key={t.id} selected={look === t.look} onClick={() => setLook(t.look)}>
								{t.label}
							</SoftChip>
						))}
					</div>
				</header>

				{/* The subject: three cards at three thicknesses, over the same field. */}
				<section className="glasslab__row" aria-label="三种厚度">
					{TIERS.slice(0, 3).map((t) => (
						<SoftCard
							key={t.id}
							look={t.look}
							className="glasslab__slab"
							seedName={t.id}
							material="tint"
							tone="iris"
						>
							<div className="glasslab__slabbody">
								<h2>{t.label}</h2>
								<p>{t.note}</p>
								<SoftTag tone="iris" variant="soft">
									bevel {GLASS_LOOKS[t.look].bevel}
								</SoftTag>
							</div>
						</SoftCard>
					))}
				</section>

				{/* The chosen one, large, where the bend is obvious. */}
				<section className="glasslab__hero" aria-label="放大的一块">
					<SoftCard
						look={look}
						className="glasslab__big"
						seedName="hero"
						material="tint"
						tone="blossom"
					>
						<div className="glasslab__bigbody">
							<h2>一整块 {TIERS.find((t) => t.look === look)?.label}</h2>
							<p>
								把指针划过它，看边缘把背后的颜料推走多少。厚玻璃的特征是
								<strong>位移</strong>，不是模糊 —— 模糊谁都能做，位移需要折射。
							</p>
							<div className="glasslab__controls">
								<SoftChip selected={dense} onClick={() => setDense((v) => !v)}>
									紧凑
								</SoftChip>
								<SoftButton tone="iris" variant="flat" size="sm">
									一个按钮也放在玻璃上
								</SoftButton>
							</div>
						</div>
					</SoftCard>
				</section>

				<footer className="glasslab__foot">
					<p>
						<code>bevel</code> 是边缘斜面的宽度，<code>refraction</code> 是它的位移量，
						<code>dispersion</code> 是位移分成颜色的程度。三个都大，才是厚的。
					</p>
				</footer>
			</div>
		</GlassStage>
	);
}
