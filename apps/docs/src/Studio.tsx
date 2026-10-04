import type { IrisTone } from "@ui-lib/core";
import {
	Bling,
	GlassPanel,
	GlassStage,
	SoftAccordion,
	SoftAvatar,
	SoftButton,
	SoftCard,
	SoftDivider,
	SoftInput,
	SoftProgress,
	SoftRadio,
	SoftRadioGroup,
	SoftSelect,
	SoftSwitch,
	SoftTable,
	SoftTag,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect, useState } from "react";

/**
 * The backdrop, and this is where the first version of the page was wrong.
 *
 * It asked for a gradient with flow and turbulence, which is the effect the
 * library was built around and which produced a saturated magenta-to-blue field
 * with every card floating on top of it. That is not a watercolour under glass,
 * it is a neon sign behind a form.
 *
 * The reason is architectural and it is written in the renderer: **the backdrop
 * is ours**. True refraction needs pixels to bend, and only content the canvas
 * renders can be sampled — the backdrop is drawn into an offscreen target the
 * glass reads, and DOM is layered *above* the canvas. So "pigment underneath,
 * glass refracting it" cannot be built this way at all: a wash in the DOM is
 * above the canvas, and a wash in the canvas is not a DOM element that can be
 * selected, read or reached by a screen reader.
 *
 * What is left is the honest version of the stack, and it is the one the
 * renderer was designed for:
 *
 *   canvas   — the ground the glass will actually bend
 *   DOM      — paper, pigment, text, controls, all of it above
 *
 * So the backdrop is the colour of paper, and the pigment is in the DOM where
 * the content is.
 */
const BACKDROP: BackdropSpec = { type: "color", color: "#f7f3ee" };

/**
 * A page, not a component list.
 *
 * Every showcase in this repository so far puts one component in a known box so
 * that a test can measure it. That is the right shape for a gate and the wrong
 * shape for the question this page exists to answer: **does the material
 * survive real information density?**
 *
 * A wash on a specimen card is being looked at. A wash behind a form, a table
 * and a progress bar is being read past — and a ground that is pleasant in
 * isolation becomes noise once there are thirty of them, or once it sits under
 * eight lines of small text, or once two of them are adjacent and each one's
 * rim reads as a separate object. None of that is visible in a fixture.
 *
 * So this is one screen of an actual product: a settings-and-status panel with
 * a header, a summary, a form, a table and a footer, on paper, under glass.
 */
export function StudioPage() {
	// Read from the query rather than taken as a prop, matching the other pages:
	// this component is mounted from a route table that has no such value in
	// scope, which is what made the first version of this page throw
	// "forceWebGL is not defined" and render nothing at all.
	const forceWebGL =
		typeof window !== "undefined" &&
		new URLSearchParams(window.location.search).get("webgl") === "1";

	const [material, setMaterial] = useState("paper");
	const [name, setName] = useState("未命名工程");
	const [autoSave, setAutoSave] = useState(true);
	const [density, setDensity] = useState("comfortable");

	return (
		<GlassStage
			className="studio-stage"
			mode="section"
			backdrop={BACKDROP}
			forceWebGL={forceWebGL}
		>
			<div className="studio" data-ui-lib-acceptance="studio">
				<Bling count={10} tone="iris" />

				{/*
				 * A header that is a glass pane rather than a coloured bar. This is
				 * the stacking the whole exercise is about: paper and pigment
				 * underneath, a real refracting surface on top, and the two read as
				 * one object rather than as a layer pasted over another.
				 */}
				<header className="studio__head">
					<GlassPanel className="studio__bar">
						<div className="studio__brand">
							<SoftAvatar name="水彩工作台" size={38} />
							<div>
								<h1 className="studio__title">水彩工作台</h1>
								<p className="studio__sub">纸、颜料与玻璃</p>
							</div>
						</div>
						<div className="studio__head-right">
							<SoftTag tone="iris" variant="soft">
								草稿
							</SoftTag>
							<SoftSwitch checked={autoSave} onChange={setAutoSave} label="自动保存" />
						</div>
					</GlassPanel>
				</header>

				<div className="studio__grid">
					{/* The summary: four numbers, each on its own pigment. This is the
					    density test for the material — four grounds adjacent, and
					    either they read as a set or they read as a mess. */}
					<section className="studio__summary" aria-label="概览">
						{SUMMARIES.map((item) => (
							<StatCard key={item.id} {...item} />
						))}
					</section>

					{/* The form. Small text on a ground, which is where contrast
					    failures show up and where a fixture never looks. */}
					<section className="studio__panel" aria-labelledby="studio-settings">
						<h2 className="studio__panel-title" id="studio-settings">
							偏好
						</h2>
						<SoftInput
							label="工程名"
							value={name}
							onChange={(event) => setName(event.target.value)}
							hint="随时可以改。"
						/>
						<SoftSelect
							label="基底"
							value={material}
							onChange={setMaterial}
							options={[
								{ value: "paper", label: "水彩纸", note: "会吸水，边缘会沉积" },
								{ value: "glass", label: "液态玻璃", note: "折射背后的东西" },
								{ value: "clay", label: "粘土", note: "三层阴影" },
							]}
						/>
						<SoftRadioGroup legend="密度">
							<SoftRadio
								name="density"
								value="comfortable"
								label="舒适"
								note="默认行高"
								checked={density === "comfortable"}
								onChange={() => setDensity("comfortable")}
							/>
							<SoftRadio
								name="density"
								value="compact"
								label="紧凑"
								checked={density === "compact"}
								onChange={() => setDensity("compact")}
							/>
						</SoftRadioGroup>
					</section>

					{/* The table, on paper, beside a panel with pigment. Two grounds
					    with different content types next to each other. */}
					<section className="studio__panel studio__panel--wide" aria-labelledby="studio-usage">
						<h2 className="studio__panel-title" id="studio-usage">
							用量
						</h2>
						<SoftTable
							caption="四种材质的用量"
							rowKey={(row) => row.id}
							defaultSort={{ key: "count", direction: "descending" }}
							columns={[
								{ key: "name", header: "名字", sortable: true },
								{ key: "kind", header: "用途" },
								{
									key: "count",
									header: "用量",
									numeric: true,
									sortable: true,
									compare: (a, b) => a.count - b.count,
								},
							]}
							rows={USAGE}
						/>
					</section>

					<section className="studio__panel" aria-labelledby="studio-notes">
						<h2 className="studio__panel-title" id="studio-notes">
							说明
						</h2>
						<WashProgress />
						<SoftDivider />
						<SoftAccordion
							items={[
								{
									id: "why",
									title: "为什么混色不能在线性空间做",
									material: "tint",
									tone: "iris",
									defaultOpen: true,
									content: (
										<p>
											减性介质的叠加与发光不同。在线性空间里插值，蓝和黄会一起走向灰轴——那是 63%
											的饱和度。
										</p>
									),
								},
								{
									id: "how",
									title: "边缘的深色圈是画上去的吗",
									content: <p>不是。它是水流到最后留下的。</p>,
								},
							]}
						/>
					</section>
				</div>

				<footer className="studio__foot">
					<SoftDivider label="四种基底" />
					<div className="studio__tones">
						{(["iris", "blossom", "mist"] as IrisTone[]).map((tone) => (
							<SoftTag key={tone} tone={tone} variant="solid">
								{tone}
							</SoftTag>
						))}
					</div>
				</footer>
			</div>
		</GlassStage>
	);
}

/**
 * One number, on its own ground.
 *
 * Four of these sit next to each other, which is the density test for the
 * material: either four grounds read as a set or they read as four unrelated
 * stains. The seed is the id, so each card keeps its own mark across renders and
 * two cards never share one.
 */
function StatCard({
	id,
	label,
	value,
	tone,
}: {
	id: string;
	label: string;
	value: string;
	tone: IrisTone;
}) {
	return (
		<SoftCard className="studio__stat" material="wash" tone={tone} seedName={id}>
			<span className="studio__stat-value">{value}</span>
			<span className="studio__stat-label">{label}</span>
		</SoftCard>
	);
}

const SUMMARIES = [
	{ id: "papers", label: "张纸", value: "128", tone: "iris" as const },
	{ id: "washes", label: "次水彩", value: "46", tone: "blossom" as const },
	{ id: "panes", label: "块玻璃", value: "12", tone: "mist" as const },
	{ id: "marks", label: "处印章", value: "7", tone: "iris" as const },
];

const USAGE = [
	{ id: "paper", name: "水彩纸", kind: "基底", count: 128 },
	{ id: "glass", name: "液态玻璃", kind: "台面", count: 46 },
	{ id: "clay", name: "粘土", kind: "按钮", count: 312 },
	{ id: "wash", name: "水彩印", kind: "头像", count: 7 },
];

/**
 * A progress bar that is actually measuring something.
 *
 * It used to be `<SoftProgress value={62} />` — a number typed into the page. On
 * a component fixture that is right, because a fixture must not move under its
 * own screenshots. On this page it is a lie: the page is pretending to be a
 * workbench, and a bar frozen at 62 per cent with the label "laying paper" says
 * work is happening when nothing is.
 *
 * So it fills for real, over a fixed duration, and **stops when it is done**
 * rather than looping. A loop would look more alive and mean less — a bar that
 * restarts is decoration, and the honest reading of a bar that restarts is that
 * nothing is being measured.
 *
 * The duration is a constant rather than a real workload because there is no real
 * workload; the point is that the number on screen is produced by something
 * rather than written next to it. If this page ever lays real paper, `value`
 * becomes the real fraction and nothing else here changes.
 */
function WashProgress() {
	const [value, setValue] = useState(0);
	const [wetting, setWetting] = useState(false);

	useEffect(() => {
		if (!wetting) return;
		const started = Date.now();
		const step = setInterval(() => {
			const next = Math.min(100, Math.round(((Date.now() - started) / 2600) * 100));
			setValue(next);
			if (next >= 100) {
				clearInterval(step);
				setWetting(false);
			}
		}, 60);
		return () => clearInterval(step);
	}, [wetting]);

	const done = value >= 100;
	return (
		<div className="studio__progress">
			<SoftProgress
				label={done ? "铺好了" : wetting ? "正在铺纸" : "还没开始铺纸"}
				// `value` is omitted while idle, which makes the bar indeterminate —
				// the honest reading of "we do not know how long this will take"
				// rather than a zero-length bar that looks stuck.
				value={wetting ? value : done ? 100 : undefined}
				showValue={wetting || done}
			/>
			{/*
			 * A real `button`, not a tag wearing `role="button"`.
			 *
			 * The first version was a `SoftTag` with a role and a `tabIndex` and a
			 * key handler written by hand — a span that behaves like a button if
			 * nothing goes wrong. A real button is focusable, is activated by Enter
			 * and Space, is announced as a button, and submits forms when it should;
			 * a span with three attributes imitates the first three of those and is
			 * wrong about the fourth.
			 */}
			<SoftButton
				tone="iris"
				variant="flat"
				size="sm"
				disabled={wetting}
				onClick={() => {
					setValue(0);
					setWetting(true);
				}}
			>
				{wetting ? "铺纸中" : done ? "再铺一次" : "开始铺纸"}
			</SoftButton>
		</div>
	);
}
