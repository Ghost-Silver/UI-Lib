import {
	IRIS,
	type IrisTone,
	mixMultiPigments,
	mixMultiPigmentsToCss,
	toneToPigment,
} from "@ui-lib/core";
import {
	Bling,
	FrostedGround,
	GlassPanel,
	GlassStage,
	SoftAccordion,
	SoftAvatar,
	SoftButton,
	SoftCard,
	SoftDivider,
	SoftInput,
	SoftRadio,
	SoftRadioGroup,
	SoftSelect,
	SoftSlider,
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
			<FrostedGround inset={14} radius={20} className="studio" data-ui-lib-acceptance="studio">
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
								{
									id: "fiber",
									title: "纸张纤维在水彩中起到什么作用",
									content: (
										<p>
											宣纸与水彩纸交织的纤维提供各向异性的毛细孔隙。水分沿着纤维微孔产生非线性毛细导流，蒸发时咖啡环效应将悬浮微粒推挤至接触边缘，析出具有自然微观齿感与深浅起伏的沉积边，而非机械均一的同心环带。
										</p>
									),
								},
								{
									id: "thickness",
									title: "液态玻璃厚度是如何自适应缩放的",
									content: (
										<p>
											玻璃面板的倒角斜面与折射位移基于 200px 基准参考卡，根据面板短边
											Math.min(width, height)
											等比例自适应缩放。无论小尺寸胶囊还是大屏展板，折射与边缘聚光都能呈现符合菲涅尔透镜与
											Kubelka-Munk 介质规律的真实厚薄比例。
										</p>
									),
								},
							]}
						/>
					</section>

					<KubelkaMunkWorkbench />
					<WaterEvaporationWorkbench />
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
			</FrostedGround>
		</GlassStage>
	);
}

/**
 * Interactive Kubelka-Munk Pigment Mixing Workbench.
 *
 * Watercolor pigment is subtractive: color mixing occurs in K/S absorption/scattering
 * space rather than naive sRGB interpolation. Multi-pigment mixing across IRIS brand
 * tones (iris, blossom, mist) models true subtractive reflectance vs naive sRGB.
 */
function KubelkaMunkWorkbench() {
	const [ratioIris, setRatioIris] = useState(40);
	const [ratioBlossom, setRatioBlossom] = useState(35);
	const [ratioMist, setRatioMist] = useState(25);
	const [thickness, setThickness] = useState(1.0);
	const [backing, setBacking] = useState(1.0);

	const total = Math.max(1, ratioIris + ratioBlossom + ratioMist);
	const wIris = ratioIris / total;
	const wBlossom = ratioBlossom / total;
	const wMist = ratioMist / total;

	const pigIris = toneToPigment("iris", 500);
	const pigBlossom = toneToPigment("blossom", 500);
	const pigMist = toneToPigment("mist", 500);

	const kmCss = mixMultiPigmentsToCss(
		[
			{ pigment: pigIris, weight: wIris },
			{ pigment: pigBlossom, weight: wBlossom },
			{ pigment: pigMist, weight: wMist },
		],
		{ thickness, backing },
	);

	const reflectance = mixMultiPigments(
		[
			{ pigment: pigIris, weight: wIris },
			{ pigment: pigBlossom, weight: wBlossom },
			{ pigment: pigMist, weight: wMist },
		],
		{ thickness, backing },
	);

	// Naive sRGB linear interpolation for comparison
	const parseHexToRgb = (hex: string): [number, number, number] => {
		const h = hex.replace("#", "");
		return [
			Number.parseInt(h.slice(0, 2), 16) || 0,
			Number.parseInt(h.slice(2, 4), 16) || 0,
			Number.parseInt(h.slice(4, 6), 16) || 0,
		];
	};
	const [rI, gI, bI] = parseHexToRgb(IRIS.iris[500]);
	const [rB, gB, bB] = parseHexToRgb(IRIS.blossom[500]);
	const [rM, gM, bM] = parseHexToRgb(IRIS.mist[500]);

	const naiveR = Math.round(wIris * rI + wBlossom * rB + wMist * rM);
	const naiveG = Math.round(wIris * gI + wBlossom * gB + wMist * gM);
	const naiveB = Math.round(wIris * bI + wBlossom * bB + wMist * bM);
	const naiveCss = `rgb(${naiveR}, ${naiveG}, ${naiveB})`;

	const refR = Math.min(100, Math.max(0, Math.round(reflectance[0] * 100)));
	const refG = Math.min(100, Math.max(0, Math.round(reflectance[1] * 100)));
	const refB = Math.min(100, Math.max(0, Math.round(reflectance[2] * 100)));

	return (
		<section className="studio__panel studio__panel--wide" aria-labelledby="studio-km-title">
			<style>{`
				.studio__km-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 24px;
					margin-top: 18px;
				}
				@media (max-width: 760px) {
					.studio__km-grid {
						grid-template-columns: 1fr;
					}
				}
				.studio__km-sliders {
					display: flex;
					flex-direction: column;
					gap: 16px;
				}
				.studio__km-display {
					display: flex;
					flex-direction: column;
					gap: 18px;
					padding: 22px;
					border-radius: var(--moe-radius-md, 16px);
					background: var(--moe-canvas, #faf7f2);
					border: 1px solid var(--moe-stroke, rgba(0,0,0,0.08));
				}
				.studio__km-swatches {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 16px;
				}
				.studio__km-swatch-card {
					height: 120px;
					border-radius: 14px;
					padding: 14px;
					display: flex;
					flex-direction: column;
					justify-content: flex-end;
					color: #fff;
					text-shadow: 0 1px 3px rgba(0,0,0,0.65);
					box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05);
					position: relative;
					overflow: hidden;
				}
				.studio__km-bars {
					display: flex;
					flex-direction: column;
					gap: 8px;
					background: rgba(255, 255, 255, 0.6);
					padding: 12px 14px;
					border-radius: 12px;
					border: 1px solid var(--moe-stroke, rgba(0,0,0,0.06));
				}
				.studio__km-bar-row {
					display: flex;
					align-items: center;
					gap: 10px;
					font-size: 12px;
				}
				.studio__km-bar-track {
					flex: 1;
					height: 8px;
					border-radius: 999px;
					background: rgba(0,0,0,0.08);
					overflow: hidden;
				}
				.studio__km-bar-fill {
					height: 100%;
					border-radius: 999px;
					transition: width 0.15s ease;
				}
			`}</style>
			<h2 className="studio__panel-title" id="studio-km-title">
				Kubelka-Munk 颜料减色混色工作台
			</h2>
			<p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "var(--moe-cocoa-soft)" }}>
				宣纸水墨是真正的减色吸收介质。多颜料在吸收 (K) 与散射 (S)
				系数空间线性叠加，呈现自然饱满的光学混色与反射光谱。
			</p>
			<div className="studio__km-grid">
				<div className="studio__km-sliders">
					<SoftSlider
						label={`紫鸢尾 Iris 配比 (${(wIris * 100).toFixed(0)}%)`}
						value={ratioIris}
						onChange={setRatioIris}
						format={(v) => `${v}%`}
					/>
					<SoftSlider
						label={`粉樱 Blossom 配比 (${(wBlossom * 100).toFixed(0)}%)`}
						value={ratioBlossom}
						onChange={setRatioBlossom}
						format={(v) => `${v}%`}
					/>
					<SoftSlider
						label={`青雾 Mist 配比 (${(wMist * 100).toFixed(0)}%)`}
						value={ratioMist}
						onChange={setRatioMist}
						format={(v) => `${v}%`}
					/>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<SoftSlider
							label="墨层厚度 (Thickness)"
							value={Math.round(thickness * 100)}
							onChange={(v) => setThickness(v / 100)}
							min={20}
							max={300}
							format={(v) => `${(v / 100).toFixed(2)}x`}
						/>
						<SoftSlider
							label="纸张反射率 (Backing)"
							value={Math.round(backing * 100)}
							onChange={(v) => setBacking(v / 100)}
							min={50}
							max={100}
							format={(v) => `${(v / 100).toFixed(2)}`}
						/>
					</div>
				</div>

				<div className="studio__km-display">
					<div className="studio__km-swatches">
						<div className="studio__km-swatch-card" style={{ background: kmCss }}>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>Kubelka-Munk</div>
							<div style={{ fontSize: "11px", opacity: 0.9 }}>真实减色 (K/S 空间)</div>
						</div>
						<div className="studio__km-swatch-card" style={{ background: naiveCss }}>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>Naive sRGB</div>
							<div style={{ fontSize: "11px", opacity: 0.9 }}>朴素加性线性插值</div>
						</div>
					</div>

					<div className="studio__km-bars">
						<div style={{ fontSize: "12px", fontWeight: 700, color: "var(--moe-cocoa)" }}>
							减色反射率通道 (Subtractive Spectral Reflectance)
						</div>
						<div className="studio__km-bar-row">
							<span style={{ width: "36px", color: "#e056fd", fontWeight: 700 }}>R (红)</span>
							<div className="studio__km-bar-track">
								<div
									className="studio__km-bar-fill"
									style={{ width: `${refR}%`, background: "#e056fd" }}
								/>
							</div>
							<span style={{ width: "42px", textAlign: "right" }}>{refR}%</span>
						</div>
						<div className="studio__km-bar-row">
							<span style={{ width: "36px", color: "#2ed573", fontWeight: 700 }}>G (绿)</span>
							<div className="studio__km-bar-track">
								<div
									className="studio__km-bar-fill"
									style={{ width: `${refG}%`, background: "#2ed573" }}
								/>
							</div>
							<span style={{ width: "42px", textAlign: "right" }}>{refG}%</span>
						</div>
						<div className="studio__km-bar-row">
							<span style={{ width: "36px", color: "#1e90ff", fontWeight: 700 }}>B (蓝)</span>
							<div className="studio__km-bar-track">
								<div
									className="studio__km-bar-fill"
									style={{ width: `${refB}%`, background: "#1e90ff" }}
								/>
							</div>
							<span style={{ width: "42px", textAlign: "right" }}>{refB}%</span>
						</div>
					</div>

					<div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--moe-cocoa-soft)" }}>
						<div>
							<strong>KM 输出色彩：</strong>
							<code>{kmCss}</code> · <strong>sRGB 输出：</strong>
							<code>{naiveCss}</code>
						</div>
						<div>
							<strong>物理对比：</strong>发光空间 RGB 线性插值会穿越灰轴（发灰污浊），KM
							减色插值忠实保持颜料在宣纸上的微孔多重反射与饱和纯度。
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/**
 * Interactive Water Evaporation Progression Simulation.
 *
 * Watercolor drying models the physics of contact line pinning, convective capillary
 * flow, and the coffee-ring effect (Deegan et al. 1997). As water evaporates from the
 * droplet surface, outward capillary advection carries suspended colloidal pigment
 * particles toward the contact boundary, creating a characteristic dark deposit ring.
 */
function WaterEvaporationWorkbench() {
	const [evaporation, setEvaporation] = useState(55);
	const [isEvaporating, setIsEvaporating] = useState(false);

	useEffect(() => {
		if (!isEvaporating) return;
		const interval = setInterval(() => {
			setEvaporation((prev) => {
				if (prev >= 100) {
					setIsEvaporating(false);
					return 100;
				}
				return prev + 1;
			});
		}, 45);
		return () => clearInterval(interval);
	}, [isEvaporating]);

	const evapFrac = evaporation / 100;
	// Core moisture thins as evaporation progresses
	const coreMoisture = Math.max(0, 100 - evaporation);
	// Coffee ring pigment enrichment factor surges at edge
	const coffeeRingEnrichment = 1 + 3.2 * evapFrac ** 1.8;
	// Outward capillary flow rate peaks mid-evaporation
	const capillaryFlux = Math.round(Math.sin(evapFrac * Math.PI) * 100);
	// Dark deposit ring density and width
	const ringOpacity = Math.min(1, 0.25 + evapFrac * 0.75);
	const ringThickness = Math.round(3 + evapFrac * 9);

	const stageLabel =
		evaporation === 0
			? "丰沛水膜 · 颜料微粒均匀悬浮"
			: evaporation < 35
				? "接触线锚定 · 边缘微小毛细补偿流启动"
				: evaporation < 75
					? "对流蒸发活跃 · 咖啡环效应驱动颗粒向边界富集"
					: evaporation < 98
						? "边缘析出固化 · 形成致密深色水痕沉积环"
						: "完全干燥 · 水痕固化在宣纸微孔中";

	return (
		<section className="studio__panel studio__panel--wide" aria-labelledby="studio-evap-title">
			<style>{`
				.studio__evap-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 24px;
					margin-top: 18px;
				}
				@media (max-width: 760px) {
					.studio__evap-grid {
						grid-template-columns: 1fr;
					}
				}
				.studio__evap-controls {
					display: flex;
					flex-direction: column;
					gap: 16px;
				}
				.studio__evap-stage {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					padding: 22px;
					border-radius: var(--moe-radius-md, 16px);
					background: var(--moe-canvas, #faf7f2);
					border: 1px solid var(--moe-stroke, rgba(0,0,0,0.08));
					position: relative;
					overflow: hidden;
				}
				.studio__evap-drop {
					position: relative;
					width: 160px;
					height: 160px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: all 0.2s ease;
				}
				.studio__evap-sheen {
					position: absolute;
					border-radius: 50%;
					transition: all 0.2s ease;
					pointer-events: none;
				}
			`}</style>
			<h2 className="studio__panel-title" id="studio-evap-title">
				水分蒸发干燥演化 & 咖啡环效应模拟
			</h2>
			<p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "var(--moe-cocoa-soft)" }}>
				宣纸上的水痕边缘并非生硬画出，而是水珠在接触线锚定（Contact line pinning）后，
				边缘蒸发速率高于中心，引发向外的毛细补偿流将颜料悬浮微粒推向边缘析出。
			</p>

			<div className="studio__evap-grid">
				<div className="studio__evap-controls">
					<SoftSlider
						label={`蒸发干燥进度 (Evaporation: ${evaporation}%)`}
						value={evaporation}
						onChange={(v) => {
							setIsEvaporating(false);
							setEvaporation(v);
						}}
						format={(v) => `${v}%`}
					/>
					<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
						<SoftButton
							tone="iris"
							variant="flat"
							size="sm"
							onClick={() => setIsEvaporating((v) => !v)}
						>
							{isEvaporating ? "暂停蒸发" : evaporation >= 100 ? "重新模拟" : "模拟自然蒸发"}
						</SoftButton>
						<SoftButton
							tone="iris"
							variant="gummy"
							size="sm"
							onClick={() => {
								setIsEvaporating(false);
								setEvaporation(0);
							}}
						>
							重置为初润 (0%)
						</SoftButton>
						<SoftButton
							tone="iris"
							variant="gummy"
							size="sm"
							onClick={() => {
								setIsEvaporating(false);
								setEvaporation(100);
							}}
						>
							完全干燥 (100%)
						</SoftButton>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "10px",
							marginTop: "4px",
						}}
					>
						<div
							style={{
								background: "rgba(255,255,255,0.6)",
								padding: "10px 12px",
								borderRadius: "12px",
								border: "1px solid var(--moe-stroke, rgba(0,0,0,0.06))",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--moe-cocoa-soft)" }}>
								核心水膜厚度
							</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--moe-cocoa)" }}>
								{coreMoisture}%
							</div>
						</div>
						<div
							style={{
								background: "rgba(255,255,255,0.6)",
								padding: "10px 12px",
								borderRadius: "12px",
								border: "1px solid var(--moe-stroke, rgba(0,0,0,0.06))",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--moe-cocoa-soft)" }}>
								边缘颗粒富集倍率
							</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--moe-cocoa)" }}>
								{coffeeRingEnrichment.toFixed(2)}x
							</div>
						</div>
					</div>

					<div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "var(--moe-cocoa-soft)" }}>
						<div>
							<strong>当前阶段：</strong>
							{stageLabel}
						</div>
						<div>
							<strong>毛细向外通量：</strong>
							{capillaryFlux}% · <strong>沉积边厚度：</strong>
							{ringThickness}px (不透明度: {(ringOpacity * 100).toFixed(0)}%)
						</div>
					</div>
				</div>

				<div className="studio__evap-stage">
					<div
						className="studio__evap-drop"
						style={{
							background: `radial-gradient(circle at center, rgba(120, 111, 166, ${Math.max(0.08, 0.35 - evapFrac * 0.25)}) 0%, rgba(120, 111, 166, ${0.25 + evapFrac * 0.45}) 85%, rgba(100, 85, 150, ${ringOpacity}) 100%)`,
							boxShadow: `0 0 0 ${ringThickness}px rgba(90, 75, 140, ${ringOpacity * 0.85}), 0 8px 24px rgba(120, 111, 166, 0.15)`,
						}}
					>
						{/* Water sheen reflecting light while wet */}
						<div
							className="studio__evap-sheen"
							style={{
								width: `${coreMoisture}%`,
								height: `${coreMoisture}%`,
								background:
									"radial-gradient(circle, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.1) 70%, transparent 100%)",
								opacity: coreMoisture / 100,
								filter: "blur(2px)",
							}}
						/>
						<span
							style={{
								fontSize: "12px",
								fontWeight: 700,
								color: "#fff",
								textShadow: "0 1px 3px rgba(0,0,0,0.6)",
								zIndex: 1,
							}}
						>
							{coreMoisture > 15 ? `水分 ${coreMoisture}%` : "已固化沉积"}
						</span>
					</div>

					{/* Cross-section SVG */}
					<div style={{ width: "100%", marginTop: "18px", textAlign: "center" }}>
						<svg
							viewBox="0 0 240 40"
							width="100%"
							height="40"
							style={{ overflow: "visible" }}
							aria-label="水珠截面曲线"
						>
							{/* Xuan paper substrate */}
							<line
								x1="20"
								y1="35"
								x2="220"
								y2="35"
								stroke="var(--moe-stroke, #ccc)"
								strokeWidth="2"
								strokeDasharray="3,3"
							/>
							{/* Meniscus height curve */}
							<path
								d={`M 20 35 Q 120 ${35 - (coreMoisture / 100) * 25} 220 35`}
								fill="none"
								stroke="#786fa6"
								strokeWidth="2.5"
								strokeOpacity={Math.max(0.2, coreMoisture / 100)}
							/>
							{/* Edge coffee-ring deposition points */}
							<circle
								cx="20"
								cy="35"
								r={Math.min(8, 2 + evapFrac * 6)}
								fill="#574b90"
								opacity={ringOpacity}
							/>
							<circle
								cx="220"
								cy="35"
								r={Math.min(8, 2 + evapFrac * 6)}
								fill="#574b90"
								opacity={ringOpacity}
							/>
						</svg>
						<div style={{ fontSize: "11px", color: "var(--moe-cocoa-soft)", marginTop: "2px" }}>
							截面模型：水膜高度曲线 h(r) 下降 · 边缘锚定点析出咖啡环 C(r)
						</div>
					</div>
				</div>
			</div>
		</section>
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
function getCapillaryPhaseLabel(val: number, isWetting: boolean): string {
	if (!isWetting && val === 0) return "纸面未润 · 点击开始铺纸";
	if (val >= 100) return "纸面平整 · 铺展完成";
	if (val <= 35) return "触纸浸润 · 水膜迅速附着";
	if (val <= 80) return "毛细导流 · 纤维吸湿展开";
	return "渗透饱和 · 边缘析出固化";
}

/**
 * A capillary-front wetting progression that models the physics of watercolor paper.
 *
 * Rather than a generic linear progress bar, capillary absorption across cellulose
 * fibers follows non-linear Lucas-Washburn diffusion kinetics (x ~ sqrt(t/T)),
 * where water rapidly attaches to dry paper and then steadily decelerates as viscous
 * drag across saturated micro-pores increases.
 *
 * Visually renders an advancing capillary meniscus front with fibrous micro-tooth,
 * a saturated wash body core behind the front, and phased preparation labels.
 */
function WashProgress() {
	const [value, setValue] = useState(0);
	const [wetting, setWetting] = useState(false);

	useEffect(() => {
		if (!wetting) return;
		const started = Date.now();
		const DURATION = 2600;
		const step = setInterval(() => {
			const elapsed = Date.now() - started;
			if (elapsed >= DURATION) {
				setValue(100);
				setWetting(false);
				clearInterval(step);
				return;
			}
			// Lucas-Washburn non-linear capillary diffusion kinetics: x(t) ~ sqrt(t / T)
			const progressRatio = Math.min(1, elapsed / DURATION);
			const capillaryRatio = Math.sqrt(progressRatio);
			const next = Math.min(99, Math.max(1, Math.round(capillaryRatio * 100)));
			setValue(next);
		}, 40);
		return () => clearInterval(step);
	}, [wetting]);

	const done = value >= 100;
	const phaseLabel = getCapillaryPhaseLabel(value, wetting);

	return (
		<div className="studio__progress">
			<style>{`
				.studio__capillary-track {
					position: relative;
					height: 12px;
					border-radius: 999px;
					background: var(--moe-sand-100, #f2ede4);
					overflow: hidden;
					box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
				}
				.studio__capillary-stream {
					position: relative;
					height: 100%;
					border-radius: 999px;
					background: linear-gradient(90deg, var(--moe-sakura-400, #f8a5c2) 0%, var(--moe-sakura-500, #f78fb3) 55%, var(--moe-taro-500, #786fa6) 100%);
					transition: width 0.04s linear;
				}
				.studio__capillary-stream--done {
					background: linear-gradient(90deg, var(--moe-sakura-500, #f78fb3) 0%, var(--moe-taro-500, #786fa6) 100%);
					box-shadow: 0 0 8px rgba(120, 111, 166, 0.35);
				}
				.studio__capillary-meniscus {
					position: absolute;
					right: 0;
					top: 0;
					bottom: 0;
					width: 14px;
					border-radius: 0 999px 999px 0;
					background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 60%, var(--moe-taro-400, #8874ba) 100%);
					box-shadow: 2px 0 6px var(--moe-taro-500, #786fa6), 0 0 8px var(--moe-sakura-400, #f8a5c2);
					animation: capillaryPulse 0.4s ease-in-out infinite alternate;
				}
				@keyframes capillaryPulse {
					from { opacity: 0.85; transform: scaleX(0.9); }
					to { opacity: 1; transform: scaleX(1.15); }
				}
			`}</style>
			<div className="ui-lib-soft-progress studio__capillary" data-ui-lib-size="md">
				<div className="ui-lib-soft-progress__head">
					<span className="ui-lib-soft-progress__label">{phaseLabel}</span>
					<span className="ui-lib-soft-progress__value" aria-hidden="true">
						{value}%
					</span>
				</div>
				<div
					className="ui-lib-soft-progress__track studio__capillary-track"
					role="progressbar"
					aria-label={phaseLabel}
					aria-valuenow={value}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						className={`studio__capillary-stream ${wetting ? "studio__capillary-stream--active" : ""} ${done ? "studio__capillary-stream--done" : ""}`}
						style={{
							width: `${value}%`,
						}}
					>
						{value > 0 && value < 100 && (
							<span className="studio__capillary-meniscus" aria-hidden="true" />
						)}
					</div>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					gap: "10px",
					alignItems: "center",
					marginTop: "10px",
					flexWrap: "wrap",
				}}
			>
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
					{wetting ? "毛细浸润中..." : done ? "再铺一次" : "开始铺纸 (Lucas-Washburn)"}
				</SoftButton>
				<div style={{ flex: 1, minWidth: "160px" }}>
					<SoftSlider
						label="手动毛细推进"
						value={value}
						onChange={(v) => {
							setWetting(false);
							setValue(v);
						}}
						format={(v) => `${v}%`}
					/>
				</div>
			</div>
			<div style={{ fontSize: "11px", color: "var(--moe-cocoa-soft)", marginTop: "6px" }}>
				动力学方程：x(t) &prop; &radic;t (初期渗透极快，随微孔粘滞阻力增加递减减速)
			</div>
		</div>
	);
}
