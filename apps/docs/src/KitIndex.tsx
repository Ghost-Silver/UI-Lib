import type { IrisTone } from "@ui-lib/core";
import {
	BubbleBadge,
	PinkPaperButton,
	SoftAccordion,
	SoftAlert,
	SoftAvatar,
	SoftBadge,
	SoftCard,
	SoftCheckbox,
	SoftChip,
	type SoftCommandItem,
	SoftCommandPalette,
	SoftDataTable,
	type SoftDataTableColumn,
	SoftInput,
	SoftList,
	SoftPopover,
	SoftProgress,
	SoftRadio,
	SoftSegmentedControl,
	SoftSelect,
	SoftSlider,
	SoftStepper,
	SoftSwitch,
	SoftTag,
	SoftTextarea,
	SoftTimeline,
	SoftToaster,
	SoftToolbar,
	SoftTooltip,
	SoftTree,
	toast,
} from "@ui-lib/react";
import { useState } from "react";

/**
 * The index for the component layer, and the reason it is a page rather than a
 * list of links.
 *
 * Everything linked from here is a *surface* made of components, and a row of
 * links cannot say what that means. So this page is built from the same parts it
 * points at: the cards lean when the pointer crosses them, the background is the
 * watercolour generator, the chips are real toggles, and the swatch row recolours
 * every ground on the page. A reader who drags the pointer across it has already
 * used the thing.
 *
 * It is also the one page in this application that is the *other* palette — the
 * GPU demos are saturated violet and neon, and this is paper and pigment. That is
 * deliberate: the two halves of the library look different because they are
 * different, and a visitor who sees only one of them has seen half.
 */

interface Surface {
	href: string;
	title: string;
	body: string;
	/** What to look at once you are there. */
	look: string;
	tone: IrisTone;
	material: "wash" | "tint";
}

const SURFACES: Surface[] = [
	{
		href: "/?demo=iris-kit&component=material&tone=iris",
		title: "材质",
		body: "同一份颜料铺在卡片、表格、列表和对话框上。淡染与全量是浓度，不是两种东西。",
		look: "把指针快速划过卡片，看它甩尾。",
		tone: "iris",
		material: "wash",
	},
	{
		href: "/?demo=stacking",
		title: "叠加",
		body: "玻璃能弯 canvas 里的颜料，弯不到 DOM 里的。两种情况并排放着，看第二行的玻璃是平的。",
		look: "对比两行 —— 第一行有位移，第二行没有。",
		tone: "iris",
		material: "wash",
	},
	{
		href: "/?demo=third-party",
		title: "第三方",
		body: "一页只从公开入口导入的用法。写它的过程撞出五个摩擦，其中一个是类型允许调用会崩溃。",
		look: "看页脚那行说明里的清单。",
		tone: "blossom",
		material: "wash",
	},
	{
		href: "/?demo=iris-kit&component=combobox&tone=iris",
		title: "字段",
		body: "输入、下拉、多选、组合框。焦点留在控件上，列表用 aria-activedescendant。",
		look: "点进组合框打「水」，方向键上下。",
		tone: "blossom",
		material: "wash",
	},
	{
		href: "/?demo=iris-kit&component=status&tone=iris",
		title: "状态",
		body: "四种语义状态各有形状：圆圈、圆钩、三角、八角。颜色不是唯一的区分方式。",
		look: "覆盖调色板，看它们跟着换。",
		tone: "mist",
		material: "wash",
	},
	{
		href: "/?demo=studio",
		title: "工作台",
		body: "一页真实的排布：表单、表格、手风琴、进度。材质只给内容容器。",
		look: "按「开始铺纸」，进度条真的在动。",
		tone: "iris",
		material: "wash",
	},
	{
		href: "/?demo=paper",
		title: "宣纸",
		body: "毛细渗透与沉积边缘的研究页。Kubelka-Munk 混色，不是 color-mix。",
		look: "同一个 seed 在两个客户端上画得一样。",
		tone: "blossom",
		material: "wash",
	},
	{
		href: "/?demo=iris",
		title: "水彩印",
		body: "头像按名字生成各自的水彩印，同一个人永远同一枚。",
		look: "刷新几次，印子不变。",
		tone: "mist",
		material: "wash",
	},
];

export type MaterialMode = "solid" | "wash" | "tint" | "glass";

export function KitIndexPage() {
	const [tone, setTone] = useState<IrisTone>(() => {
		if (typeof window !== "undefined") {
			const q = new URLSearchParams(window.location.search);
			const t = q.get("tone");
			if (t === "iris" || t === "blossom" || t === "mist") return t;
			const p = q.get("palette");
			if (p === "ember") return "blossom";
			if (p === "mint") return "mist";
		}
		return "iris";
	});
	const [dense, setDense] = useState(false);
	const [materialMode, setMaterialMode] = useState<MaterialMode>(() => {
		if (typeof window !== "undefined") {
			const m = new URLSearchParams(window.location.search).get("material");
			if (m === "solid" || m === "wash" || m === "tint" || m === "glass") return m;
		}
		return "wash";
	});

	// Interactive component states for live matrix inspection
	const [switchVal, setSwitchVal] = useState(true);
	const [checkVal, setCheckVal] = useState(true);
	const [radioVal, setRadioVal] = useState("a");
	const [sliderVal, setSliderVal] = useState(62);
	const [segVal, setSegVal] = useState("clay");
	const [chipSelected, setChipSelected] = useState(true);
	const [selectVal, setSelectVal] = useState("paper");

	const [paletteOpen, setPaletteOpen] = useState(false);
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set(["crystal", "dew"]));

	const paletteCommands: SoftCommandItem[] = [
		{
			id: "tone-iris",
			label: "切换为 Iris 调色板",
			group: "调色板",
			shortcut: ["⌘", "1"],
			onSelect: () => setTone("iris"),
		},
		{
			id: "tone-blossom",
			label: "切换为 Blossom 调色板",
			group: "调色板",
			shortcut: ["⌘", "2"],
			onSelect: () => setTone("blossom"),
		},
		{
			id: "tone-mist",
			label: "切换为 Mist 调色板",
			group: "调色板",
			shortcut: ["⌘", "3"],
			onSelect: () => setTone("mist"),
		},
		{
			id: "mat-wash",
			label: "应用水彩材质 (Wash)",
			group: "物理材质",
			onSelect: () => setMaterialMode("wash"),
		},
		{
			id: "mat-glass",
			label: "应用液态玻璃材质 (Glass)",
			group: "物理材质",
			onSelect: () => setMaterialMode("glass"),
		},
		{
			id: "mat-solid",
			label: "应用纯色无水材质 (Solid)",
			group: "物理材质",
			onSelect: () => setMaterialMode("solid"),
		},
	];

	interface MaterialSpec {
		id: string;
		name: string;
		ior: number;
		viscosity: number;
		category: string;
	}

	const dataColumns: SoftDataTableColumn<MaterialSpec>[] = [
		{ key: "name", header: "材质预设", sortable: true },
		{ key: "category", header: "光学分类", align: "center" },
		{ key: "ior", header: "折射率 (IOR)", numeric: true, sortable: true },
		{ key: "viscosity", header: "流体阻尼系数", numeric: true, sortable: true },
	];

	const dataRows: MaterialSpec[] = [
		{ id: "crystal", name: "Apple Crystal", ior: 1.52, viscosity: 0.55, category: "超透玻璃" },
		{ id: "dock", name: "Frosted Dock", ior: 1.34, viscosity: 0.82, category: "磨砂背板" },
		{
			id: "capsule",
			name: "Stadium Capsule",
			ior: 1.48,
			viscosity: 0.6,
			category: "C2双凸透镜",
		},
		{ id: "dew", name: "Capillary Dew", ior: 1.33, viscosity: 0.45, category: "表面微露" },
		{
			id: "slab",
			name: "Heavy Optical Slab",
			ior: 1.65,
			viscosity: 0.9,
			category: "重晶石平板",
		},
	];

	const cardMaterial =
		materialMode === "solid" ? "plain" : materialMode === "glass" ? "plain" : materialMode;
	const cardLook = materialMode === "glass" ? ("slab" as const) : undefined;

	return (
		<div className={`kitindex kitindex--${tone}`}>
			<style>{`
				.kitindex__matrix-section {
					overflow: hidden;
					max-width: 980px;
					margin: 48px auto 72px;
					padding: 32px;
					border-radius: var(--moe-radius-lg, 24px);
					background: var(--moe-card, rgba(255, 255, 255, 0.65));
					backdrop-filter: blur(16px);
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
					box-shadow: 0 12px 36px rgba(0, 0, 0, 0.04);
				}
				.kitindex__matrix-head {
					margin-bottom: 24px;
				}
				.kitindex__matrix-title {
					margin: 0 0 8px;
					font-size: 26px;
					font-weight: 800;
					color: var(--moe-cocoa, #2c2523);
				}
				.kitindex__matrix-desc {
					margin: 0 0 20px;
					font-size: 14px;
					line-height: 1.7;
					color: var(--moe-cocoa-soft, #6e645f);
				}
				.kitindex__mat-toggles {
					display: flex;
					align-items: center;
					gap: 12px;
					flex-wrap: wrap;
					margin-bottom: 28px;
					padding: 12px 16px;
					border-radius: 16px;
					background: var(--moe-sand-100, #f5efe6);
				}
				.kitindex__mat-toggles-label {
					font-size: 13px;
					font-weight: 700;
					color: var(--moe-cocoa, #2c2523);
				}
				.kitindex__matrix-table-wrap {
					overflow-x: auto;
					border-radius: 16px;
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
					background: var(--moe-canvas, #faf7f2);
				}
				.kitindex__matrix-table {
					width: 100%;
					border-collapse: collapse;
					min-width: 760px;
					font-size: 13.5px;
				}
				.kitindex__matrix-table th {
					padding: 14px 18px;
					text-align: left;
					background: var(--moe-sand-200, #eee6d8);
					color: var(--moe-cocoa, #2c2523);
					font-weight: 700;
					border-bottom: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
				}
				.kitindex__matrix-table td {
					padding: 16px 18px;
					border-bottom: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.06));
					vertical-align: middle;
				}
				.kitindex__matrix-row-title {
					font-weight: 700;
					color: var(--moe-cocoa, #2c2523);
					white-space: nowrap;
					width: 130px;
				}
				.kitindex__sim-hover {
					display: inline-block;
					transform: translateY(-2px) rotate(-0.5deg);
					filter: brightness(1.05);
					box-shadow: 0 6px 14px rgba(120, 111, 166, 0.22);
					border-radius: 12px;
				}
				.kitindex__sim-focus {
					display: inline-block;
					outline: 2px solid rgba(120, 111, 166, 0.85);
					outline-offset: 3px;
					box-shadow: 0 0 0 2px var(--moe-card, #fff), 0 0 14px 3px var(--moe-taro-500, #786fa6);
					border-radius: 12px;
				}
				.kitindex__sim-active {
					display: inline-block;
					transform: scale(0.96) translateY(1px);
					transition: transform 0.1s var(--moe-ease-press, cubic-bezier(0.28, 1.38, 0.48, 1));
					filter: brightness(0.94);
					border-radius: 12px;
				}
				.kitindex__sim-disabled {
					display: inline-block;
					opacity: 0.45;
					pointer-events: none;
					filter: grayscale(0.35);
					border-radius: 12px;
				}
				.kitindex__cell-mat {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 6px;
					border-radius: 12px;
					transition: all 0.22s ease;
				}
				.kitindex__cell-mat--solid {
					background: var(--moe-card, rgba(255, 255, 255, 0.9));
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
				}
				.kitindex__cell-mat--wash {
					background: radial-gradient(circle at 50% 50%, rgba(120, 111, 166, 0.08) 0%, rgba(120, 111, 166, 0.16) 75%, rgba(100, 85, 150, 0.26) 100%);
					border: 1px solid rgba(120, 111, 166, 0.22);
					box-shadow: inset 0 0 8px rgba(120, 111, 166, 0.08);
				}
				.kitindex__cell-mat--tint {
					background: rgba(120, 111, 166, 0.07);
					border: 1px solid rgba(120, 111, 166, 0.14);
				}
				.kitindex__cell-mat--glass {
					background: rgba(255, 255, 255, 0.45);
					backdrop-filter: blur(14px);
					border: 1px solid rgba(255, 255, 255, 0.65);
					box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.85), 0 4px 14px rgba(0, 0, 0, 0.04);
				}
				.kitindex__card-cell {
					min-width: 110px;
					padding: 10px 12px;
					border-radius: 14px;
					font-size: 12px;
					text-align: center;
				}
			`}</style>

			<header className="kitindex__head">
				<p className="kitindex__eyebrow">组件层 · 三十五件</p>
				<h1 className="kitindex__title">
					另一半。
					<br />
					<em>纸、颜料与玻璃。</em>
				</h1>
				<p className="kitindex__lede">
					上面的六个 demo 是 GPU 表面：一个 canvas、一个渲染器、一页几乎全是着色器。
					这一半是应用组件——三十五个有键盘与读屏契约的控件，一套 seed 化的水彩生成器， 以及跑在
					CSS 自定义属性里的弹簧物理。
					<br />
					<br />
					<strong>它们不是同一种东西，所以它们看起来不一样。</strong>
				</p>

				<div className="kitindex__controls">
					<fieldset className="kitindex__tones">
						<legend>调色板</legend>
						{(["iris", "blossom", "mist"] as const).map((t) => (
							<SoftChip key={t} selected={tone === t} onClick={() => setTone(t)}>
								{t}
							</SoftChip>
						))}
					</fieldset>
					<SoftSwitch checked={dense} onChange={setDense} label="紧凑" />
					<PinkPaperButton tone={tone} onClick={() => setPaletteOpen(true)}>
						⌘K 命令面板
					</PinkPaperButton>
				</div>
			</header>

			{/* F10 & F11: Comprehensive Component State Matrix & Multi-Material Toggles */}
			<section className="kitindex__matrix-section" aria-label="组件全状态矩阵与多材质切换">
				<div className="kitindex__matrix-head">
					<h2 className="kitindex__matrix-title">组件 5 态物理矩阵 & 多材质切换</h2>
					<p className="kitindex__matrix-desc">
						全套核心控件在 <strong>[默认 · 悬停 · 聚焦 · 激活 · 禁用]</strong>{" "}
						五种交互基态下的并排呈现。 通过上方材质切换条，可在{" "}
						<strong>[纯色 (solid) · 水彩 (wash) · 微透 (tint) · 玻璃 (glass)]</strong>{" "}
						之间动态切换材质基底， 实时检验统一物理阻尼比（&zeta; = 0.55）与无障碍视觉反馈。
					</p>

					<div className="kitindex__mat-toggles">
						<span className="kitindex__mat-toggles-label">多材质切换：</span>
						{(
							[
								{ id: "solid", label: "纯色 (solid)" },
								{ id: "wash", label: "水彩 (wash)" },
								{ id: "tint", label: "微透 (tint)" },
								{ id: "glass", label: "玻璃 (glass)" },
							] as const
						).map((m) => (
							<SoftChip
								key={m.id}
								selected={materialMode === m.id}
								onClick={() => setMaterialMode(m.id)}
							>
								{m.label}
							</SoftChip>
						))}
					</div>
				</div>

				<div className="kitindex__matrix-table-wrap">
					<table className="kitindex__matrix-table">
						<thead>
							<tr>
								<th scope="col">组件类别</th>
								<th scope="col">1. 默认 (Default)</th>
								<th scope="col">2. 悬停 (Hover)</th>
								<th scope="col">3. 聚焦 (Focus)</th>
								<th scope="col">4. 激活 (Active)</th>
								<th scope="col">5. 禁用 (Disabled)</th>
							</tr>
						</thead>
						<tbody>
							{/* Row 1: SoftButton (Clay) */}
							<tr>
								<td className="kitindex__matrix-row-title">按钮 · 粘土</td>
								<td>
									<PinkPaperButton tone={tone} variant="clay" size={dense ? "sm" : "md"}>
										粘土按钮
									</PinkPaperButton>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<PinkPaperButton tone={tone} variant="clay" size={dense ? "sm" : "md"}>
											悬停微倾
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<PinkPaperButton
											tone={tone}
											variant="clay"
											size={dense ? "sm" : "md"}
											tabIndex={0}
										>
											光晕聚焦
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<PinkPaperButton tone={tone} variant="clay" size={dense ? "sm" : "md"}>
											弹性按压
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<PinkPaperButton
										tone={tone}
										variant="clay"
										size={dense ? "sm" : "md"}
										disabled
									>
										已禁用
									</PinkPaperButton>
								</td>
							</tr>

							{/* Row 2: SoftButton (Gummy) */}
							<tr>
								<td className="kitindex__matrix-row-title">按钮 · 软糖</td>
								<td>
									<PinkPaperButton tone={tone} variant="gummy" size={dense ? "sm" : "md"}>
										软糖按钮
									</PinkPaperButton>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<PinkPaperButton tone={tone} variant="gummy" size={dense ? "sm" : "md"}>
											果冻微浮
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<PinkPaperButton
											tone={tone}
											variant="gummy"
											size={dense ? "sm" : "md"}
											tabIndex={0}
										>
											双层焦点
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<PinkPaperButton tone={tone} variant="gummy" size={dense ? "sm" : "md"}>
											阻尼回弹
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<PinkPaperButton
										tone={tone}
										variant="gummy"
										size={dense ? "sm" : "md"}
										disabled
									>
										已禁用
									</PinkPaperButton>
								</td>
							</tr>

							{/* Row 3: SoftInput */}
							<tr>
								<td className="kitindex__matrix-row-title">输入框 · Input</td>
								<td>
									<SoftInput placeholder="未聚焦输入框" />
								</td>
								<td>
									<span className="kitindex__sim-hover" style={{ width: "100%" }}>
										<SoftInput defaultValue="指针悬停" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus" style={{ width: "100%" }}>
										<SoftInput defaultValue="键盘获焦" autoFocus={false} />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active" style={{ width: "100%" }}>
										<SoftInput defaultValue="激活输入" />
									</span>
								</td>
								<td>
									<SoftInput defaultValue="已锁定禁用" disabled />
								</td>
							</tr>

							{/* Row 4: SoftSwitch */}
							<tr>
								<td className="kitindex__matrix-row-title">滑动开关 · Switch</td>
								<td>
									<SoftSwitch checked={switchVal} onChange={setSwitchVal} label="开" />
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftSwitch checked={true} label="悬停" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftSwitch checked={true} label="聚焦" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftSwitch checked={true} label="按下" />
									</span>
								</td>
								<td>
									<SoftSwitch checked softDisabled label="禁用" />
								</td>
							</tr>

							{/* Row 5: SoftCheckbox */}
							<tr>
								<td className="kitindex__matrix-row-title">复选框 · Checkbox</td>
								<td>
									<SoftCheckbox
										checked={checkVal}
										onChange={(e) => setCheckVal(e.target.checked)}
										label="宣纸水墨"
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftCheckbox checked={true} readOnly label="悬停高亮" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftCheckbox checked={true} readOnly label="焦点环" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftCheckbox checked={true} readOnly label="弹性回弹" />
									</span>
								</td>
								<td>
									<SoftCheckbox disabled checked={false} label="不可选择" />
								</td>
							</tr>

							{/* Row 6: SoftRadio */}
							<tr>
								<td className="kitindex__matrix-row-title">单选框 · Radio</td>
								<td>
									<SoftRadio
										name="matrix-radio"
										value="a"
										checked={radioVal === "a"}
										onChange={() => setRadioVal("a")}
										label="选项 A"
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftRadio
											name="matrix-radio-hover"
											value="h"
											checked={true}
											readOnly
											label="悬停态"
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftRadio
											name="matrix-radio-focus"
											value="f"
											checked={true}
											readOnly
											label="聚焦态"
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftRadio
											name="matrix-radio-act"
											value="act"
											checked={true}
											readOnly
											label="激活态"
										/>
									</span>
								</td>
								<td>
									<SoftRadio name="matrix-radio-dis" value="d" disabled label="已禁用" />
								</td>
							</tr>

							{/* Row 7: SoftSlider */}
							<tr>
								<td className="kitindex__matrix-row-title">滑块 · Slider</td>
								<td>
									<SoftSlider
										value={sliderVal}
										onChange={setSliderVal}
										label="水分"
										format={(v) => `${v}%`}
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover" style={{ width: "100%" }}>
										<SoftSlider value={72} label="悬停" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus" style={{ width: "100%" }}>
										<SoftSlider value={85} label="聚焦" />
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active" style={{ width: "100%" }}>
										<SoftSlider value={92} label="拖拽" />
									</span>
								</td>
								<td>
									<SoftSlider value={45} softDisabled label="禁用" />
								</td>
							</tr>

							{/* Row 8: SoftChip */}
							<tr>
								<td className="kitindex__matrix-row-title">纸片 · Chip</td>
								<td>
									<SoftChip selected={chipSelected} onClick={() => setChipSelected((v) => !v)}>
										默认纸片
									</SoftChip>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftChip selected={false}>悬停抬升</SoftChip>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftChip selected={false} tabIndex={0}>
											键盘聚焦
										</SoftChip>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftChip selected={true}>按压激活</SoftChip>
									</span>
								</td>
								<td>
									<SoftChip disabled>已禁用</SoftChip>
								</td>
							</tr>

							{/* Row 9: SoftSegmentedControl */}
							<tr>
								<td className="kitindex__matrix-row-title">分段 · Segment</td>
								<td>
									<SoftSegmentedControl
										label="材质选择"
										options={[
											{ value: "clay", label: "粘土" },
											{ value: "wash", label: "水彩" },
										]}
										value={segVal}
										onChange={setSegVal}
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftSegmentedControl
											label="悬停态"
											options={[
												{ value: "clay", label: "粘土" },
												{ value: "wash", label: "水彩" },
											]}
											value="clay"
											onChange={() => undefined}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftSegmentedControl
											label="聚焦态"
											options={[
												{ value: "clay", label: "粘土" },
												{ value: "wash", label: "水彩" },
											]}
											value="clay"
											onChange={() => undefined}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftSegmentedControl
											label="激活态"
											options={[
												{ value: "clay", label: "粘土" },
												{ value: "wash", label: "水彩" },
											]}
											value="wash"
											onChange={() => undefined}
										/>
									</span>
								</td>
								<td>
									<SoftSegmentedControl
										label="禁用态"
										options={[
											{ value: "clay", label: "锁定", disabled: true },
											{ value: "wash", label: "禁用", disabled: true },
										]}
										value="clay"
										onChange={() => undefined}
									/>
								</td>
							</tr>

							{/* Row 10: SoftSelect */}
							<tr>
								<td className="kitindex__matrix-row-title">下拉 · Select</td>
								<td>
									<SoftSelect
										label="基底"
										value={selectVal}
										onChange={setSelectVal}
										options={[
											{ value: "paper", label: "水彩纸" },
											{ value: "glass", label: "液态玻璃" },
										]}
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover" style={{ width: "100%" }}>
										<SoftSelect
											label="悬停"
											value="paper"
											onChange={() => undefined}
											options={[{ value: "paper", label: "水彩纸" }]}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus" style={{ width: "100%" }}>
										<SoftSelect
											label="聚焦"
											value="paper"
											onChange={() => undefined}
											options={[{ value: "paper", label: "水彩纸" }]}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active" style={{ width: "100%" }}>
										<SoftSelect
											label="激活"
											value="glass"
											onChange={() => undefined}
											options={[{ value: "glass", label: "液态玻璃" }]}
										/>
									</span>
								</td>
								<td>
									<SoftSelect label="禁用" disabled placeholder="已锁定" options={[]} />
								</td>
							</tr>

							{/* Row 11: SoftCard (Reflecting the active multi-material toggle) */}
							<tr>
								<td className="kitindex__matrix-row-title">卡片 · Card [{materialMode}]</td>
								<td>
									<SoftCard
										material={cardMaterial}
										look={cardLook}
										tone={tone}
										interactive
										className="kitindex__card-cell"
									>
										默认卡片
									</SoftCard>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftCard
											material={cardMaterial}
											look={cardLook}
											tone={tone}
											interactive
											className="kitindex__card-cell"
										>
											悬停抬升微倾
										</SoftCard>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftCard
											material={cardMaterial}
											look={cardLook}
											tone={tone}
											interactive
											tabIndex={0}
											className="kitindex__card-cell"
										>
											双层光晕聚焦
										</SoftCard>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftCard
											material={cardMaterial}
											look={cardLook}
											tone={tone}
											interactive
											className="kitindex__card-cell"
										>
											阻尼按压回弹
										</SoftCard>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-disabled">
										<SoftCard
											material={cardMaterial}
											look={cardLook}
											tone={tone}
											className="kitindex__card-cell"
										>
											禁用不可点击
										</SoftCard>
									</span>
								</td>
							</tr>

							{/* Row 12: SoftTextarea */}
							<tr>
								<td className="kitindex__matrix-row-title">文本域 · Textarea</td>
								<td>
									<SoftTextarea
										placeholder="未聚焦文本域"
										rows={2}
										material={cardMaterial}
										tone={tone}
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover" style={{ width: "100%" }}>
										<SoftTextarea
											defaultValue="悬停编辑"
											rows={2}
											material={cardMaterial}
											tone={tone}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus" style={{ width: "100%" }}>
										<SoftTextarea
											defaultValue="双层光晕获焦"
											rows={2}
											material={cardMaterial}
											tone={tone}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active" style={{ width: "100%" }}>
										<SoftTextarea
											defaultValue="激活输入"
											rows={2}
											material={cardMaterial}
											tone={tone}
										/>
									</span>
								</td>
								<td>
									<SoftTextarea
										defaultValue="已锁定禁用"
										rows={2}
										disabled
										material={cardMaterial}
										tone={tone}
									/>
								</td>
							</tr>

							{/* Row 13: PinkPaperButton (Flat) */}
							<tr>
								<td className="kitindex__matrix-row-title">按钮 · 扁平</td>
								<td>
									<PinkPaperButton tone={tone} variant="flat" size={dense ? "sm" : "md"}>
										扁平按钮
									</PinkPaperButton>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<PinkPaperButton tone={tone} variant="flat" size={dense ? "sm" : "md"}>
											纸纹悬停
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<PinkPaperButton
											tone={tone}
											variant="flat"
											size={dense ? "sm" : "md"}
											tabIndex={0}
										>
											焦点环
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<PinkPaperButton tone={tone} variant="flat" size={dense ? "sm" : "md"}>
											弹性按压
										</PinkPaperButton>
									</span>
								</td>
								<td>
									<PinkPaperButton
										tone={tone}
										variant="flat"
										size={dense ? "sm" : "md"}
										disabled
									>
										已禁用
									</PinkPaperButton>
								</td>
							</tr>

							{/* Row 14: SoftToolbar */}
							<tr>
								<td className="kitindex__matrix-row-title">工具栏 · Toolbar</td>
								<td>
									<SoftToolbar
										size="sm"
										material={cardMaterial}
										tone={tone}
										label="绘图"
										items={[
											{
												id: "brush",
												label: "画笔",
												icon: "🖌",
												onSelect: () => undefined,
												pressed: true,
											},
											{ id: "fill", label: "填充", icon: "🪣", onSelect: () => undefined },
										]}
									/>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftToolbar
											size="sm"
											material={cardMaterial}
											tone={tone}
											label="悬停"
											items={[
												{ id: "brush", label: "悬停", icon: "🖌", onSelect: () => undefined },
												{ id: "fill", label: "填充", icon: "🪣", onSelect: () => undefined },
											]}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<SoftToolbar
											size="sm"
											material={cardMaterial}
											tone={tone}
											label="聚焦"
											items={[
												{ id: "brush", label: "聚焦", icon: "🖌", onSelect: () => undefined },
											]}
										/>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftToolbar
											size="sm"
											material={cardMaterial}
											tone={tone}
											label="按压"
											items={[
												{
													id: "brush",
													label: "按下",
													icon: "🖌",
													onSelect: () => undefined,
													pressed: true,
												},
											]}
										/>
									</span>
								</td>
								<td>
									<SoftToolbar
										size="sm"
										material={cardMaterial}
										tone={tone}
										label="禁用"
										items={[
											{
												id: "brush",
												label: "锁定",
												icon: "🖌",
												onSelect: () => undefined,
												disabled: true,
											},
										]}
									/>
								</td>
							</tr>

							{/* Row 15: SoftTag & BubbleBadge */}
							<tr>
								<td className="kitindex__matrix-row-title">标签 · Tag & Badge</td>
								<td>
									<SoftTag tone={tone} variant="soft">
										默认标签
									</SoftTag>
								</td>
								<td>
									<span className="kitindex__sim-hover">
										<SoftTag tone={tone} variant="solid">
											悬停微倾
										</SoftTag>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-focus">
										<BubbleBadge tone={tone}>光晕聚焦</BubbleBadge>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-active">
										<SoftTag tone={tone} variant="solid">
											激活回弹
										</SoftTag>
									</span>
								</td>
								<td>
									<span className="kitindex__sim-disabled">
										<SoftTag tone={tone} variant="soft">
											已禁用
										</SoftTag>
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* High-level Composites: SoftCommandPalette & SoftDataTable */}
			<section
				className="kitindex__matrix-section"
				aria-label="高阶复合组件：命令面板与数据网格"
			>
				<div className="kitindex__matrix-head">
					<h2 className="kitindex__matrix-title">高阶复合组件 · 命令面板与数据网格</h2>
					<p className="kitindex__matrix-desc">
						遵循桌面级生产规范的复合交互：包含全键盘无障碍导航的玻璃命令浮层（按 <code>⌘K</code>{" "}
						唤出）与支持多列排序、多行选择的轻量数据网格（<code>SoftDataTable</code>）。
					</p>
				</div>
				<SoftDataTable
					columns={dataColumns}
					rows={dataRows}
					rowKey={(r) => r.id}
					selectionMode="multiple"
					selectedKeys={selectedRows}
					onSelectionChange={setSelectedRows}
					caption="液态玻璃与水彩物理参数一览表"
				/>
			</section>

			{/* Instant Feedback & Micro-Context: SoftTooltip, SoftPopover, and SoftToast */}
			<section
				className="kitindex__matrix-section"
				aria-label="即时反馈与微观上下文：气泡、弹出卡片与通知栈"
			>
				<div className="kitindex__matrix-head">
					<h2 className="kitindex__matrix-title">即时反馈与微观上下文 · 气泡、卡片与通知栈</h2>
					<p className="kitindex__matrix-desc">
						基于自研零依赖物理吸附引擎（<code>floating.ts</code>），驱动具备视口避让与折射箭头的{" "}
						<code>SoftTooltip</code>、富交互弹出卡片 <code>SoftPopover</code>，以及具备 &zeta; =
						0.55 阻尼弹簧出入场、手势划走与卡片堆叠物理的 <code>SoftToast</code>。
					</p>
				</div>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "16px",
						alignItems: "center",
						marginBottom: "16px",
					}}
				>
					<SoftTooltip content="这是遵循 WAI-ARIA 规范的液态玻璃微气泡" placement="top">
						<PinkPaperButton tone={tone}>悬停查看 Tooltip</PinkPaperButton>
					</SoftTooltip>

					<SoftPopover
						trigger={<PinkPaperButton tone={tone}>点击展开 Popover</PinkPaperButton>}
						title="物理材质参数配置"
						actions={
							<PinkPaperButton tone={tone} onClick={() => toast.success("参数已保存至物理层")}>
								保存设置
							</PinkPaperButton>
						}
					>
						<p style={{ margin: 0, fontSize: "13px" }}>
							自研视口避让吸附算法，支持全键盘 Escape 键快速退出并自动复位焦点。
						</p>
					</SoftPopover>

					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
						<PinkPaperButton tone="iris" onClick={() => toast.info("水墨沉降与扩散速度已同步")}>
							派发 Info Toast
						</PinkPaperButton>
						<PinkPaperButton
							tone="mist"
							onClick={() => toast.success("液态玻璃折射图层编译完成！")}
						>
							派发 Success Toast
						</PinkPaperButton>
						<PinkPaperButton
							tone="blossom"
							onClick={() => toast.warning("显存占用已达 85%，自适应降频")}
						>
							派发 Warning Toast
						</PinkPaperButton>
						<PinkPaperButton
							tone="blossom"
							onClick={() => toast.error("WebGPU 渲染管线检测到异常")}
						>
							派发 Error Toast
						</PinkPaperButton>
						<PinkPaperButton
							tone={tone}
							onClick={() => {
								toast.promise(
									new Promise((resolve) => setTimeout(() => resolve("100%"), 1800)),
									{
										loading: "正在烘焙物理焦散图层...",
										success: "焦散光斑烘焙完成！",
										error: "烘焙中断",
									},
								);
							}}
						>
							派发 Promise Toast
						</PinkPaperButton>
					</div>
				</div>
				<SoftToaster position="top-right" />
			</section>

			{/* Hierarchical Tree & Status Badge: SoftTree & SoftBadge */}
			<section
				className="kitindex__matrix-section"
				aria-label="树形层级与状态角标：SoftTree 与 SoftBadge"
			>
				<div className="kitindex__matrix-head">
					<h2 className="kitindex__matrix-title">树形层级与状态角标 · Tree & Status Badge</h2>
					<p className="kitindex__matrix-desc">
						符合 WAI-ARIA Tree APG 规范的层级导航 <code>SoftTree</code>
						，具备全键盘漫游、复选框级联状态与宣纸毛细连线； 搭配支持数值截断与流光脉冲的{" "}
						<code>SoftBadge</code> 状态角标。
					</p>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: "24px",
						alignItems: "start",
					}}
				>
					<div
						style={{
							padding: "16px",
							borderRadius: "12px",
							background: "rgba(255, 255, 255, 0.45)",
							border: "1px solid rgba(0, 0, 0, 0.08)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "12px",
							}}
						>
							<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
								代码工程目录树 (SoftTree)
							</h3>
							<SoftBadge status="processing" text="实时同步" />
						</div>
						<SoftTree
							label="工程目录"
							tone={tone}
							showLines
							checkable
							defaultExpandedKeys={["packages", "react"]}
							defaultCheckedKeys={["index"]}
							nodes={[
								{
									key: "packages",
									label: "packages",
									children: [
										{
											key: "core",
											label: "core (宣纸物理底座)",
											children: [
												{ key: "km", label: "kubelkaMunk.ts", isLeaf: true },
												{ key: "wash", label: "washCanvas.ts", isLeaf: true },
											],
										},
										{
											key: "react",
											label: "react (49 个语义化组件)",
											children: [
												{ key: "index", label: "index.ts", isLeaf: true },
												{
													key: "tree",
													label: "SoftTree.tsx",
													isLeaf: true,
													badge: (
														<SoftTag tone={tone} variant="soft">
															新
														</SoftTag>
													),
												},
												{
													key: "badge",
													label: "SoftBadge.tsx",
													isLeaf: true,
													badge: (
														<SoftTag tone="blossom" variant="soft">
															新
														</SoftTag>
													),
												},
												{
													key: "timeline",
													label: "SoftTimeline.tsx",
													isLeaf: true,
													badge: (
														<SoftTag tone="mist" variant="soft">
															新
														</SoftTag>
													),
												},
												{ key: "toast", label: "SoftToast.tsx", isLeaf: true },
											],
										},
										{
											key: "shaders",
											label: "shaders (WebGPU 物理流体)",
											children: [{ key: "liquid", label: "liquidGlass.ts", isLeaf: true }],
										},
									],
								},
								{
									key: "apps",
									label: "apps (展示系统)",
									children: [{ key: "docs", label: "docs (实时演练场)", isLeaf: true }],
								},
							]}
						/>
					</div>

					<div
						style={{
							padding: "16px",
							borderRadius: "12px",
							background: "rgba(255, 255, 255, 0.45)",
							border: "1px solid rgba(0, 0, 0, 0.08)",
							display: "flex",
							flexDirection: "column",
							gap: "18px",
						}}
					>
						<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
							状态徽标指示器 (SoftBadge)
						</h3>
						<div
							style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}
						>
							<SoftBadge count={8} tone={tone}>
								<SoftAvatar name="陈奕帆" size={40} tone={tone} />
							</SoftBadge>

							<SoftBadge count={128} maxCount={99} tone="blossom">
								<PinkPaperButton tone="blossom">未读通知</PinkPaperButton>
							</SoftBadge>

							<SoftBadge dot tone="mist">
								<PinkPaperButton tone="mist">新动态</PinkPaperButton>
							</SoftBadge>
						</div>

						<div style={{ display: "flex", gap: "16px", flexWrap: "wrap", paddingTop: "8px" }}>
							<SoftBadge status="success" text="GPU 编译就绪" />
							<SoftBadge status="processing" text="水墨毛细推进中" />
							<SoftBadge status="warning" text="显存处于高位" />
							<SoftBadge status="error" text="管线故障捕获" />
						</div>
					</div>

					<div
						style={{
							padding: "16px",
							borderRadius: "12px",
							background: "rgba(255, 255, 255, 0.45)",
							border: "1px solid rgba(0, 0, 0, 0.08)",
							display: "flex",
							flexDirection: "column",
							gap: "14px",
						}}
					>
						<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
							历程时间轴 (SoftTimeline)
						</h3>
						<SoftTimeline
							label="构建历程"
							tone={tone}
							items={[
								{
									key: "optics",
									title: "WebGPU 双面折射光路",
									description: "SDF 倒角无直角 Voronoi 接缝，柯西色散光斑求解完成",
									timestamp: "09:30",
									status: "completed",
								},
								{
									key: "wash",
									title: "宣纸水墨毛细润湿",
									description: "Kubelka-Munk 真实减色沉降，边界水痕干燥扩散",
									timestamp: "10:15",
									status: "completed",
								},
								{
									key: "tree",
									title: "49 个语义化 Soft 组件",
									description: "全键盘 WAI-ARIA 漫游与 ζ = 0.55 物理阻尼弹簧驱动",
									timestamp: "11:00",
									status: "processing",
								},
							]}
						/>
					</div>
				</div>
			</section>

			<SoftCommandPalette
				open={paletteOpen}
				onClose={() => setPaletteOpen(false)}
				items={paletteCommands}
				title="全局命令面板"
			/>

			<section className="kitindex__grid" aria-label="可看的表面">
				{SURFACES.map((surface) => (
					<SoftCard
						key={surface.href}
						interactive
						tilt
						glossy={surface.material === "wash"}
						material={surface.material}
						tone={surface.tone}
						seedName={surface.title}
						className="kitindex__card"
					>
						<a
							className="kitindex__link"
							href={`${surface.href}&palette=${tone}&material=${materialMode}`}
						>
							<h2 className="kitindex__cardtitle">{surface.title}</h2>
							<p className="kitindex__body">{surface.body}</p>
							<p className="kitindex__look">
								<span aria-hidden="true">→</span> {surface.look}
							</p>
						</a>
					</SoftCard>
				))}
			</section>

			<section className="kitindex__proof" aria-labelledby="kitindex-proof">
				<h2 className="kitindex__prooftitle" id="kitindex-proof">
					这些东西不是画上去的
				</h2>
				<p className="kitindex__prose">
					下面每个组件都在这一页上跑着，用同一个包、同一套令牌。
					换上面的调色板，它们一起换——包括凹槽、选中态和四种语义状态。
				</p>

				<div className="kitindex__samples">
					<SoftAlert tone="success" title="已经保存了">
						这一笔留住了。
					</SoftAlert>
					<SoftAlert tone="warn" title="纸张有点湿" urgency="polite">
						再等一下会更均匀。
					</SoftAlert>

					<SoftProgress label="正在铺纸" value={62} showValue />

					<SoftStepper
						label="发布"
						current="review"
						steps={[
							{ id: "draft", label: "草稿" },
							{ id: "review", label: "送审" },
							{ id: "publish", label: "发布" },
						]}
					/>

					<SoftList
						label="基底"
						size={dense ? "sm" : "md"}
						material="tint"
						tone={tone}
						items={[
							{ id: "paper", label: "水彩纸", note: "会吸水，边缘会沉积" },
							{ id: "glass", label: "液态玻璃", note: "折射背后的东西" },
						]}
					/>

					<SoftAccordion
						items={[
							{
								id: "km",
								title: "为什么混色不在线性空间做",
								content: (
									<p>
										青加黄在 Kubelka-Munk 下饱和度 0.529，在 RGB 线性插值下 0.196。
										减性介质在发光空间里插值会穿过灰轴。
									</p>
								),
							},
						]}
					/>
				</div>
			</section>

			<footer className="kitindex__foot">
				<p>
					三十五个组件由 <code>pnpm check:components</code> 逐像素验收， 命名由{" "}
					<code>pnpm check:api</code> 检查， 文档的质检矩阵由 <code>pnpm check:spec</code>{" "}
					执行。
				</p>
				<SoftTag tone="iris" variant="soft">
					实验性 0.0.1
				</SoftTag>
			</footer>
		</div>
	);
}
