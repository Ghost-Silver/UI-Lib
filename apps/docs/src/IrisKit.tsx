import {
	createWash,
	IRIS,
	IRIS_TONES,
	type IrisTone,
	type PlatformBudget,
	washToCanvas,
} from "@ui-lib/core";
import type { SoftToastData } from "@ui-lib/react";
import {
	Bling,
	BubbleBadge,
	GlassStage,
	PinkPaperButton,
	SoftAccordion,
	SoftAlert,
	SoftAvatar,
	SoftBreadcrumb,
	SoftCard,
	SoftCheckbox,
	SoftChip,
	SoftCombobox,
	SoftDivider,
	SoftDrawer,
	SoftEmptyState,
	SoftInput,
	SoftLightPanel,
	SoftList,
	SoftMenu,
	SoftModal,
	SoftPagination,
	SoftProgress,
	SoftRadio,
	SoftRadioGroup,
	SoftSegmentedControl,
	SoftSelect,
	SoftSkeleton,
	SoftSlider,
	SoftSpinner,
	SoftStepper,
	SoftSwitch,
	SoftTable,
	SoftTabs,
	SoftTag,
	SoftTextarea,
	SoftToast,
	SoftToolbar,
	SoftTooltip,
	WatercolorCard,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect, useRef, useState } from "react";

/**
 * One component at a time, in a known box.
 *
 * `pnpm check:components` measures each IRIS component in isolation, and it
 * cannot do that on the showcase page: the components share a wash, a cloud and
 * each other, so a region's pixels are never only that component's. This is the
 * fixture that makes a per-component baseline mean something.
 *
 * `?demo=iris-kit&component=bubble-badge&tone=blossom`
 *
 * It is a test surface, not a demo. It renders one thing, centred, on a flat
 * stage with a still backdrop, so the only thing that moves between two
 * captures is the component under test.
 */

const COMPONENTS = [
	"bubble-badge",
	"paper-button",
	"soft-light-panel",
	"watercolor-card",
	"bling",
	"switch",
	"tabs",
	"slider",
	"modal",
	"input",
	"select",
	"choice",
	"loading",
	"overlay",
	"identity",
	"accordion",
	"table",
	"drawer",
	"material",
	"wash-canvas",
	"segments",
	"status",
	"navigation",
	"menu",
	"textarea",
	"list",
	"combobox",
	"toolbar",
	"chip-stepper",
	"matrix",
] as const;

export type KitComponent = (typeof COMPONENTS)[number];

export function isKitComponent(value: string): value is KitComponent {
	return (COMPONENTS as readonly string[]).includes(value);
}

/**
 * Still, but not sterile. A pure-white ground was the first attempt and it made
 * the fixture useless: these components are translucent fills over a pale
 * sheet, so with nothing behind them their glass has nothing to bend and their
 * own fills have no contrast to show against. Every component read as blank.
 * Stillness is what the measurement needs; whiteness was a mistake.
 *
 * No speed, no grain, nothing that changes between captures.
 *
 * `intensity` is not a preference. `gradientBackdrop` carries a fixed `sheen`
 * term that multiplies the whole colour by roughly half, which the dark pages
 * are designed around; a light page has to ask for it back. At `intensity: 1`
 * this backdrop rendered mid-grey and every GPU capture differed from the
 * fallback by ~60/255 for reasons that had nothing to do with the component
 * under test.
 */
const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: [IRIS.iris[100], IRIS.blossom[100], IRIS.mist[100], IRIS.iris[100]],
	background: IRIS.paper,
	vignette: 0,
	intensity: 2,
	grain: 0,
	speed: 0,
};

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export type MaterialMode = "solid" | "wash" | "tint" | "glass";

export function IrisKitPage({ component, tone }: { component: KitComponent; tone: IrisTone }) {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	const budget: PlatformBudget | undefined = readFlag("budget", "declared")
		? { host: "declared-demo", source: "declared", tier: 2 }
		: undefined;

	/**
	 * Three states, and the gate needs all three.
	 *
	 * `off`          — `post={false}`, the chain is never built and a present
	 *                  quad moves the composite to the canvas.
	 * `passthrough`  — the chain is built with `enabled: false`, which makes its
	 *                  output node `mix(baseSample, colour, 0)`, i.e. the input
	 *                  unchanged.
	 * default        — the library's own grade.
	 */
	const postMode = new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	).get("post");
	const post =
		postMode === "off" ? false : postMode === "passthrough" ? { enabled: false } : undefined;

	const [activeMaterial, setActiveMaterial] = useState<MaterialMode>(() => {
		if (typeof window !== "undefined") {
			const m = new URLSearchParams(window.location.search).get("material");
			if (m === "solid" || m === "wash" || m === "tint" || m === "glass") return m;
		}
		return "wash";
	});
	const [activeTone, setActiveTone] = useState<IrisTone>(tone);

	useEffect(() => {
		setActiveTone(tone);
	}, [tone]);

	useEffect(() => {
		document.title = `IRIS kit · ${component} · ${activeTone}`;
	}, [component, activeTone]);

	return (
		<GlassStage
			className="kit-stage"
			mode="section"
			backdrop={BACKDROP}
			post={post}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
			budget={budget}
		>
			<style>{`
				.kit__header-bar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					flex-wrap: wrap;
					gap: 16px;
					max-width: 980px;
					margin: 0 auto 24px;
					padding: 12px 18px;
					border-radius: 18px;
					background: var(--moe-card, rgba(255, 255, 255, 0.7));
					backdrop-filter: blur(14px);
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
					box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
				}
				.kit__toggles-group {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}
				.kit__toggles-label {
					font-size: 12.5px;
					font-weight: 700;
					color: var(--moe-cocoa, #2c2523);
					margin-right: 4px;
				}
				.kit__box--matrix {
					width: 100% !important;
					max-width: 980px !important;
					height: auto !important;
					min-height: 480px !important;
					padding: 12px !important;
				}
				.kit__nav-link {
					font-size: 12px;
					font-weight: 600;
					padding: 6px 12px;
					border-radius: 999px;
					text-decoration: none;
					color: var(--moe-cocoa-soft, #6e645f);
					background: rgba(0, 0, 0, 0.04);
					transition: all 0.15s ease;
				}
				.kit__nav-link:hover, .kit__nav-link--active {
					background: var(--moe-taro-500, #786fa6);
					color: #fff;
				}
			`}</style>

			<header className="kit__header-bar">
				<div className="kit__toggles-group">
					<span className="kit__toggles-label">陈列导航：</span>
					<a
						className={`kit__nav-link ${component === "matrix" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=matrix&tone=${activeTone}&material=${activeMaterial}`}
					>
						★ 5 态物理全矩阵
					</a>
					<a
						className={`kit__nav-link ${component === "paper-button" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=paper-button&tone=${activeTone}&material=${activeMaterial}`}
					>
						按钮
					</a>
					<a
						className={`kit__nav-link ${component === "material" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=material&tone=${activeTone}&material=${activeMaterial}`}
					>
						材质
					</a>
					<a
						className={`kit__nav-link ${component === "input" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=input&tone=${activeTone}&material=${activeMaterial}`}
					>
						输入框
					</a>
					<a
						className={`kit__nav-link ${component === "switch" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=switch&tone=${activeTone}&material=${activeMaterial}`}
					>
						开关
					</a>
					<a
						className={`kit__nav-link ${component === "table" ? "kit__nav-link--active" : ""}`}
						href={`/?demo=iris-kit&component=table&tone=${activeTone}&material=${activeMaterial}`}
					>
						表格
					</a>
				</div>

				<div className="kit__toggles-group">
					<span className="kit__toggles-label">多材质切换：</span>
					{(
						[
							{ id: "solid", label: "纯色" },
							{ id: "wash", label: "水彩" },
							{ id: "tint", label: "微透" },
							{ id: "glass", label: "玻璃" },
						] as const
					).map((m) => (
						<SoftChip
							key={m.id}
							selected={activeMaterial === m.id}
							onClick={() => setActiveMaterial(m.id)}
						>
							{m.label}
						</SoftChip>
					))}
				</div>

				<div className="kit__toggles-group">
					<span className="kit__toggles-label">色调：</span>
					{(["iris", "blossom", "mist"] as const).map((t) => (
						<SoftChip key={t} selected={activeTone === t} onClick={() => setActiveTone(t)}>
							{t}
						</SoftChip>
					))}
				</div>
			</header>

			<div className="kit" data-ui-lib-acceptance="iris-kit">
				{/* The measured box. Fixed size so every capture is comparable. */}
				<div
					className={`kit__box ${component === "matrix" ? "kit__box--matrix" : ""}`}
					data-ui-lib-kit-box
					data-ui-lib-wide={
						component === "tabs" ||
						component === "switch" ||
						component === "slider" ||
						component === "input" ||
						component === "choice" ||
						component === "matrix"
							? ""
							: undefined
					}
				>
					<KitSubject component={component} tone={activeTone} materialMode={activeMaterial} />
				</div>
			</div>
		</GlassStage>
	);
}

/** Filter chips and a process indicator. */
function ChipStepperKit() {
	const [tones, setTones] = useState<string[]>(["iris"]);
	const [step, setStep] = useState("review");
	const chip = (id: string, text: string) => (
		<SoftChip
			selected={tones.includes(id)}
			onClick={() =>
				setTones((was) => (was.includes(id) ? was.filter((t) => t !== id) : [...was, id]))
			}
		>
			{text}
		</SoftChip>
	);
	return (
		<div className="kit__chipstepper">
			<div className="kit__chip-row">
				{chip("iris", "紫")}
				{chip("blossom", "粉")}
				{chip("mist", "蓝")}
				<SoftChip onRemove={() => undefined}>群青</SoftChip>
				<SoftChip disabled>不可用</SoftChip>
			</div>
			<SoftStepper
				label="发布"
				current={step}
				onChange={setStep}
				steps={[
					{ id: "draft", label: "草稿", note: "3 天前" },
					{ id: "review", label: "送审", note: "进行中" },
					{ id: "publish", label: "发布" },
				]}
			/>
			<SoftStepper
				label="竖排"
				orientation="vertical"
				current="review"
				steps={[
					{ id: "a", label: "第一步", note: "完成了" },
					{ id: "review", label: "第二步", note: "进行中" },
					{ id: "c", label: "第三步" },
				]}
			/>
		</div>
	);
}

/** Two toolbars: a horizontal one and a vertical one. */
function ToolbarKit({ tone }: { tone: IrisTone }) {
	const [tool, setTool] = useState("brush");
	// The menu really sets something, so the composition is exercised rather than
	// merely rendered — a menu whose items do nothing proves the slot but not the wiring.
	const [brush, setBrush] = useState("m");
	const [grid, setGrid] = useState(true);
	const [snap, setSnap] = useState(false);
	const icon = (d: string) => (
		<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
			<path
				d={d}
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
	return (
		<div className="kit__toolbar">
			<SoftToolbar
				label="画布"
				material="wash"
				tone={tone}
				items={[
					{
						id: "brush",
						label: "画笔",
						icon: icon("M2.5 13.5 L5 12.5 L13 4.5 L11.5 3 L3.5 11 Z"),
						pressed: tool === "brush",
						onSelect: () => setTool("brush"),
					},
					{
						id: "size",
						label: "笔刷大小",
						icon: icon("M4 8 H12"),
						// The composition the anatomy asks for: a toolbar that contains
						// another widget. The menu keeps its own name and its own keys,
						// and the toolbar's walk reaches it.
						content: (
							<SoftMenu
								trigger="大小"
								label="笔刷大小"
								align="end"
								items={[
									{ id: "s", label: "细", shortcut: "1", onSelect: () => setBrush("s") },
									{
										id: "m",
										label: "中",
										shortcut: "2",
										checked: brush === "m",
										onSelect: () => setBrush("m"),
									},
									{ id: "l", label: "粗", shortcut: "3", onSelect: () => setBrush("l") },
								]}
							/>
						),
						onSelect: () => undefined,
					},
					{
						id: "fill",
						label: "填充",
						icon: icon(
							"M3 9.5 L7.5 4 L12.5 9 L8 13.5 Z M12.5 11.5 C12.5 11.5 13.5 12.6 13.5 13.2 A1 1 0 0 1 11.5 13.2 C11.5 12.6 12.5 11.5 12.5 11.5 Z",
						),
						pressed: tool === "fill",
						onSelect: () => setTool("fill"),
					},
					{
						id: "grid",
						label: "网格",
						icon: icon("M3 3 H13 V13 H3 Z M3 7 H13 M7 3 V13"),
						pressed: grid,
						onSelect: () => setGrid((v) => !v),
					},
					{
						id: "snap",
						label: "吸附",
						hint: "对齐到网格",
						icon: icon("M8 2 V6 M8 10 V14 M2 8 H6 M10 8 H14"),
						pressed: snap,
						onSelect: () => setSnap((v) => !v),
					},
					{
						id: "lock",
						label: "锁定",
						disabled: true,
						icon: icon("M4.5 7.5 V5.5 A3.5 3.5 0 0 1 11.5 5.5 V7.5 M3.5 7.5 H12.5 V13 H3.5 Z"),
						onSelect: () => undefined,
					},
				]}
			/>
			<div className="kit__toolbar-row">
				<SoftToolbar
					label="图层"
					orientation="vertical"
					size="sm"
					items={[
						{
							id: "up",
							label: "上移",
							icon: icon("M8 12 V4 M4.5 7.5 L8 4 L11.5 7.5"),
							onSelect: () => undefined,
						},
						{
							id: "down",
							label: "下移",
							icon: icon("M8 4 V12 M4.5 8.5 L8 12 L11.5 8.5"),
							onSelect: () => undefined,
						},
						{
							id: "dup",
							label: "复制",
							icon: icon("M5.5 5.5 H12.5 V12.5 H5.5 Z M3.5 10.5 V3.5 H10.5"),
							onSelect: () => undefined,
						},
					]}
				/>
				<p className="kit__toolbar-note">
					当前工具 {tool}，网格 {grid ? "开" : "关"}，吸附 {snap ? "开" : "关"}
				</p>
			</div>
		</div>
	);
}

/** The typing field, opened and filtered. */
function ComboboxKit() {
	const [material, setMaterial] = useState("paper");
	const options = [
		{ value: "paper", label: "水彩纸", note: "会吸水，边缘会沉积" },
		{ value: "glass", label: "液态玻璃", note: "折射背后的东西" },
		{ value: "clay", label: "粘土", note: "三层阴影" },
		{ value: "wash", label: "水彩印", note: "头像上的那一枚" },
	];
	return (
		<div className="kit__combobox">
			<SoftCombobox
				label="材质"
				value={material}
				onChange={setMaterial}
				options={options}
				hint="打字会过滤，方向键选。"
			/>
			<SoftCombobox
				label="标签（可自由输入）"
				value=""
				onChange={() => undefined}
				options={[{ value: "a", label: "已有的一个" }]}
				allowCustom
				placeholder="随便写"
			/>
			<p className="kit__combobox-note">选中：{material}</p>
		</div>
	);
}

/** A selection list, and a multi-select one beside it. */
function ListKit({ tone }: { tone: IrisTone }) {
	const [one, setOne] = useState<string[]>(["paper"]);
	const [many, setMany] = useState<string[]>(["iris"]);
	const items = [
		{ id: "paper", label: "水彩纸", note: "会吸水，边缘会沉积" },
		{ id: "glass", label: "液态玻璃", note: "折射背后的东西" },
		{ id: "clay", label: "粘土", note: "三层阴影" },
		{ id: "none", label: "不可用", disabled: true },
	];
	return (
		<div className="kit__list">
			<SoftList
				label="基底（单选）"
				material="wash"
				tone={tone}
				items={items}
				selected={one}
				onChange={setOne}
			/>
			<SoftList
				label="色调（多选）"
				size="sm"
				items={[
					{ id: "iris", label: "紫", trailing: <SoftTag tone={tone}>主</SoftTag> },
					{ id: "blossom", label: "粉" },
					{ id: "mist", label: "蓝" },
				]}
				selected={many}
				onChange={setMany}
				selection="multiple"
			/>
			<p className="kit__list-note">
				选中 {one.length} 项 / {many.length} 项
			</p>
		</div>
	);
}

/** The multi-line field, with the count and an error. */
function TextareaKit({ tone }: { tone: IrisTone }) {
	const [note, setNote] = useState("颜料会往边缘走，\n会沉进纤维。");
	return (
		<div className="kit__textarea">
			<SoftTextarea
				label="说明"
				material="wash"
				tone={tone}
				value={note}
				onChange={(e) => setNote(e.target.value)}
				hint="写多少都可以，它会自己长高。"
				maxLength={200}
				showCount
			/>
			<SoftTextarea
				label="太长了"
				defaultValue={"太长了".repeat(60)}
				error="已经超出限制。"
				rows={2}
			/>
			<SoftTextarea label="不可用" defaultValue="已锁定" disabled rows={2} />
		</div>
	);
}

/** A command menu, opened so the capture shows the list. */
function MenuKit() {
	const [last, setLast] = useState("(还没选)");
	const [ruled, setRuled] = useState(true);
	return (
		<div className="kit__menu">
			<SoftMenu
				label="画布操作"
				trigger="画布"
				items={[
					{ kind: "label", id: "l1", label: "这一笔" },
					{ id: "new", label: "新建", shortcut: "⌘N", onSelect: () => setLast("新建") },
					{ id: "save", label: "保存", shortcut: "⌘S", onSelect: () => setLast("保存") },
					{ kind: "separator", id: "s1" },
					{
						id: "rule",
						label: "显示辅助线",
						checked: ruled,
						onSelect: () => {
							setRuled((v) => !v);
							setLast("显示辅助线");
						},
					},
					{ id: "wet", label: "保持湿润", disabled: true, onSelect: () => undefined },
					{ kind: "separator", id: "s2" },
					{ id: "share", label: "分享", shortcut: "⌘⇧S", onSelect: () => setLast("分享") },
				]}
			/>
			<p className="kit__menu-note">上次选择：{last}</p>
		</div>
	);
}

/** Pagination and a trail, with the current location not being a control. */
function NavigationKit() {
	const [page, setPage] = useState(6);
	const [here, setHere] = useState("水彩纸");
	return (
		<div className="kit__navigation">
			<SoftBreadcrumb
				items={[
					{ label: "首页", href: "#", onClick: () => setHere("首页") },
					{ label: "材质", href: "#", onClick: () => setHere("材质") },
					{ label: here },
				]}
			/>
			<SoftPagination count={12} page={page} onChange={setPage} />
			<SoftPagination count={4} page={2} onChange={() => undefined} />
			<p className="kit__navigation-note">当前在第 {page} 页。</p>
		</div>
	);
}

/** Four tones and the empty state. */
function StatusKit() {
	return (
		<div className="kit__status">
			<SoftAlert tone="info" title="新的一笔">
				颜料会在边缘沉积。
			</SoftAlert>
			<SoftAlert tone="success" title="已经保存了" onDismiss={() => undefined}>
				这一笔留住了。
			</SoftAlert>
			<SoftAlert tone="warn" title="纸张有点湿" urgency="polite">
				再等一下会更均匀。
			</SoftAlert>
			<SoftAlert tone="danger" title="没有连上" urgency="assertive">
				正在重试。
			</SoftAlert>
			<div className="kit__status-empty">
				<SoftEmptyState
					size="sm"
					title="还没有画过"
					body="第一笔会出现在这里。"
					art={
						<svg viewBox="0 0 32 32" width="34" height="34" fill="none" aria-hidden="true">
							<circle
								cx="16"
								cy="16"
								r="9.5"
								stroke="currentColor"
								strokeWidth="1.6"
								opacity="0.5"
							/>
							<circle
								cx="16"
								cy="16"
								r="5"
								stroke="currentColor"
								strokeWidth="1.6"
								opacity="0.8"
							/>
						</svg>
					}
				/>
			</div>
		</div>
	);
}

/** Both variants, with the keyboard behaviour worth trying. */
function SegmentsKit() {
	const [density, setDensity] = useState("cosy");
	const [align, setAlign] = useState("left");
	return (
		<div className="kit__segments">
			<SoftSegmentedControl
				label="密度"
				value={density}
				onChange={setDensity}
				options={[
					{ value: "compact", label: "紧凑" },
					{ value: "cosy", label: "舒适", note: "默认" },
					{ value: "loose", label: "宽松" },
				]}
			/>
			<SoftSegmentedControl
				label="对齐"
				variant="outline"
				value={align}
				onChange={setAlign}
				options={[
					{ value: "left", label: "左" },
					{ value: "center", label: "中" },
					{ value: "right", label: "右" },
					{ value: "off", label: "不可用", disabled: true },
				]}
			/>
		</div>
	);
}

/**
 * The same wash, drawn two ways.
 *
 * Left is the CSS wash a component renders; right is the canvas one the
 * renderer can sample. They should be recognisably the same mark — same arcs,
 * same silhouette, same fibre — because they are the same generator's output
 * going to two consumers.
 */
function WashCanvasKit() {
	const holder = useRef<HTMLDivElement | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const canvas = await washToCanvas({
					hue: "#b79cf5",
					weight: 0.9,
					seed: 7,
					width: 190,
					height: 190,
				});
				if (cancelled || !holder.current) return;
				canvas.style.width = "190px";
				canvas.style.height = "190px";
				holder.current.replaceChildren(canvas);
			} catch (e) {
				setError(String(e).slice(0, 120));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	const css = createWash({ hue: "#b79cf5", weight: 0.9, seed: 7, size: 190 });
	return (
		<div className="kit__washcanvas">
			<div>
				<p className="kit__washcanvas-label">CSS</p>
				<span className="ui-lib-wash ui-lib-wash--dry" style={css.style as React.CSSProperties}>
					<span className="ui-lib-wash__deposit" />
				</span>
			</div>
			<div>
				<p className="kit__washcanvas-label">Canvas</p>
				<div ref={holder} />
			</div>
			{error && <p className="kit__washcanvas-error">{error}</p>}
		</div>
	);
}

/** The three materials, so the difference between them is visible at once. */
function MaterialKit() {
	const notes: { id: "plain" | "tint" | "wash"; title: string; body: string }[] = [
		{ id: "plain", title: "纸", body: "默认。大部分界面应该是纸。" },
		{ id: "tint", title: "淡染", body: "同一颜料低浓度，用来分组。" },
		{ id: "wash", title: "水彩", body: "颜料铺底，边缘由颜料承担。" },
	];
	return (
		<div className="kit__material">
			{notes.map((n) => (
				<SoftCard
					key={n.id}
					material={n.id}
					tone="iris"
					seedName={n.id}
					tilt
					fibre={n.id === "wash"}
				>
					<h3 className="kit__material-title">{n.title}</h3>
					<p className="kit__material-body">{n.body}</p>
				</SoftCard>
			))}
			<div className="kit__material-row">
				<SoftCard material="wash" tone="blossom" seedName="blossom">
					<p className="kit__material-body">粉</p>
				</SoftCard>
				<SoftCard material="wash" tone="mist" seedName="mist">
					<p className="kit__material-body">蓝</p>
				</SoftCard>
			</div>
		</div>
	);
}

/** The drawer, opened on arrival so one capture shows it. */
function DrawerKit() {
	const [open, setOpen] = useState(true);
	return (
		<div className="kit__drawer">
			<PinkPaperButton tone="iris" onClick={() => setOpen(true)}>
				打开抽屉
			</PinkPaperButton>
			<div className="kit__drawer-lines">
				<p>分隔线下面还有东西。</p>
				<SoftDivider />
				<p>上面这条是无标签的。</p>
				<SoftDivider label="或" />
				<p>这条有标签。</p>
			</div>
			<SoftDrawer
				open={open}
				onClose={() => setOpen(false)}
				title="材质"
				note="四种基底的表现"
				material="tint"
				tone="mist"
				footer={
					<>
						<PinkPaperButton tone="blossom" onClick={() => setOpen(false)}>
							取消
						</PinkPaperButton>
						<PinkPaperButton tone="iris" onClick={() => setOpen(false)}>
							保存
						</PinkPaperButton>
					</>
				}
			>
				<p>水彩纸会吸水，边缘会沉积；液态玻璃会折射背后的东西；粘土用三层阴影堆出厚度。</p>
				<SoftDivider label="换一种说法" />
				<p>它们其实是同一种材料的三种用法。</p>
			</SoftDrawer>
		</div>
	);
}

/** A table with a sorted column, so the capture shows the sort state too. */
function TableKit({ tone }: { tone: IrisTone }) {
	const rows = [
		{ id: "paper", name: "水彩纸", kind: "基底", count: 128 },
		{ id: "glass", name: "液态玻璃", kind: "台面", count: 46 },
		{ id: "clay", name: "粘土", kind: "按钮", count: 312 },
		{ id: "wash", name: "水彩印", kind: "头像", count: 7 },
	];
	return (
		<div className="kit__table">
			<SoftTable
				caption="四种材质的用量"
				material="wash"
				tone={tone}
				rowKey={(r) => r.id}
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
				rows={rows}
			/>
		</div>
	);
}

/** Sections, one of them open so the capture shows both states. */
function AccordionKit({ tone }: { tone: IrisTone }) {
	return (
		<div className="kit__accordion">
			<SoftAccordion
				items={[
					{
						id: "a",
						title: "颜料是怎么待在纸上的",
						note: "边缘沉积与干湿两态",
						defaultOpen: true,
						material: "wash",
						tone,
						content: (
							<p>
								真实的颜料会往边缘走，会沉进纤维。干和湿两种状态下边界完全不同——渐变一个都做不到，这也是水彩和「模糊色块」的全部区别。
							</p>
						),
					},
					{
						id: "b",
						title: "为什么混色不能在线性空间做",
						content: <p>减性介质的叠加与发光不同。</p>,
					},
					{ id: "c", title: "不可用的一节", disabled: true, content: <p>看不到。</p> },
				]}
			/>
		</div>
	);
}

/** Portraits and labels. */
function IdentityKit({ tone }: { tone: IrisTone }) {
	return (
		<div className="kit__identity">
			<div className="kit__identity-row">
				<SoftAvatar name="陈奕帆" size={52} />
				<SoftAvatar name="苏璃珞" size={52} tone={tone} />
				<SoftAvatar name="Iris" size={52} tone={tone} />
				<SoftAvatar name="未命名" size={52} ring />
			</div>
			<div className="kit__identity-row">
				{[28, 36, 44].map((size) => (
					<SoftAvatar key={size} name="小" size={size} />
				))}
			</div>
			<div className="kit__identity-row kit__identity-tags">
				<SoftTag>水彩</SoftTag>
				<SoftTag tone={tone}>主色</SoftTag>
				<SoftTag tone={tone}>冷色</SoftTag>
				<SoftTag variant="solid" tone={tone}>
					实心
				</SoftTag>
				<SoftTag variant="outline">描边</SoftTag>
				<SoftTag onRemove={() => undefined}>可移除</SoftTag>
			</div>
		</div>
	);
}

/** A tooltip open, and the three tones of toast. */
function OverlayKit({ tone }: { tone: IrisTone }) {
	const [toasts] = useState<SoftToastData[]>([
		{ id: "a", title: "已经保存了", body: "这一笔留住了。", tone: "success", duration: 0 },
		{ id: "b", title: "网络抖了一下", body: "正在重试。", tone: "warn", duration: 0 },
		{ id: "c", title: "三张卡片排好了", tone: "info", duration: 0 },
	]);
	return (
		<div className="kit__overlay">
			<SoftTooltip content="这会丢掉未保存的改动">
				<PinkPaperButton tone={tone}>悬停或 Tab 到这里</PinkPaperButton>
			</SoftTooltip>
			<div className="ui-lib-soft-toaster kit__toaster">
				{toasts.map((t) => (
					<SoftToast key={t.id} {...t} onDismiss={() => undefined} />
				))}
			</div>
		</div>
	);
}

/** The three states of not-being-there-yet. */
function LoadingKit() {
	return (
		<div className="kit__loading">
			<SoftProgress label="正在铺纸" value={62} showValue />
			<SoftProgress label="正在等" />
			<SoftProgress label="小号" value={28} size="sm" />
			<div className="kit__loading-row">
				<SoftSpinner />
				<SoftSpinner size={20} label="正在调色" />
			</div>
			<SoftSkeleton variant="text" lines={3} />
			<div className="kit__loading-row">
				<SoftSkeleton variant="circle" width={44} height={44} />
				<SoftSkeleton variant="block" width={180} height={44} />
			</div>
		</div>
	);
}

/** Every state of both controls, so one capture shows all of them. */
function ChoiceKit() {
	const [a, setA] = useState(true);
	const [b, setB] = useState(false);
	const [plan, setPlan] = useState("paper");
	return (
		<div className="kit__choices">
			<SoftCheckbox
				label="记住这一笔"
				note="下次打开时还在"
				checked={a}
				onChange={(e) => setA(e.target.checked)}
			/>
			<SoftCheckbox label="未选中" checked={b} onChange={(e) => setB(e.target.checked)} />
			<SoftCheckbox label="部分选中" indeterminate note="三张里有五张" />
			<SoftCheckbox label="不可用" disabled />
			<SoftRadioGroup legend="材质">
				<SoftRadio
					name="material"
					value="paper"
					label="水彩纸"
					checked={plan === "paper"}
					onChange={() => setPlan("paper")}
				/>
				<SoftRadio
					name="material"
					value="glass"
					label="液态玻璃"
					note="会折射"
					checked={plan === "glass"}
					onChange={() => setPlan("glass")}
				/>
				<SoftRadio name="material" value="clay" label="粘土" disabled />
			</SoftRadioGroup>
		</div>
	);
}

/** The listbox, open, so the capture shows the popover rather than the trigger. */
function SelectKit() {
	const [material, setMaterial] = useState("paper");
	return (
		<div className="kit__inputs">
			<SoftSelect
				label="材质"
				value={material}
				onChange={setMaterial}
				options={[
					{ value: "paper", label: "水彩纸", note: "会吸水，边缘会沉积" },
					{ value: "glass", label: "液态玻璃", note: "折射背后的东西" },
					{ value: "clay", label: "粘土", note: "三层阴影" },
					{ value: "none", label: "无", note: "这个选项不可选", disabled: true },
				]}
			/>
			<SoftSelect label="不可用" placeholder="已锁定" disabled options={[]} />
		</div>
	);
}

/** Every state the field has, so one capture shows all of them. */
function InputKit() {
	const [name, setName] = useState("紫鸢尾");
	const [mail, setMail] = useState("hello@");
	return (
		<div className="kit__inputs">
			<SoftInput
				label="作品名"
				value={name}
				onChange={(event) => setName(event.target.value)}
				hint="随时可以改。"
			/>
			<SoftInput
				label="邮箱"
				type="email"
				value={mail}
				onChange={(event) => setMail(event.target.value)}
				error="这个地址看起来还不完整。"
			/>
			<SoftInput label="不可用" defaultValue="已锁定" disabled />
		</div>
	);
}

/** The dialog, opened on arrival so one capture shows the entry state. */
function ModalKit() {
	const [open, setOpen] = useState(true);
	return (
		<div className="kit__modal">
			<PinkPaperButton tone="iris" onClick={() => setOpen(true)}>
				打开
			</PinkPaperButton>
			<SoftModal
				material="wash"
				tone="iris"
				open={open}
				onClose={() => setOpen(false)}
				title="全部完成"
				confirmLabel="好"
				onConfirm={() => setOpen(false)}
			>
				<p>三张卡片都保存好了。</p>
			</SoftModal>
		</div>
	);
}

/** Two sliders, so the held state and the resting state are both visible. */
function SliderKit() {
	const [a, setA] = useState(62);
	const [b, setB] = useState(0.4);
	return (
		<div className="kit__sliders">
			<SoftSlider value={a} onChange={setA} label="亮度" format={(v) => `${v}%`} />
			<SoftSlider
				value={b}
				onChange={setB}
				min={0}
				max={1}
				step={0.05}
				label="不透明度"
				format={(v) => v.toFixed(2)}
			/>
			<SoftSlider value={30} softDisabled label="禁用" />
		</div>
	);
}

/** Three tabs, so the indicator has somewhere to travel to. */
function TabsKit() {
	const [tab, setTab] = useState(0);
	return (
		<div className="kit__tabs">
			<SoftTabs items={["柔光", "水彩", "玻璃"]} value={tab} onChange={setTab} label="材质" />
			<SoftTabs items={["一", "二"]} value={tab % 2} onChange={setTab} size="sm" label="小号" />
		</div>
	);
}

/** Every state the switch has, so one capture shows all of them. */
function SwitchKit() {
	const [a, setA] = useState(true);
	const [b, setB] = useState(false);
	return (
		// `label` does not associate with a `<button role="switch">` — only with a
		// form control — so the visible text is tied to the control by
		// `aria-label` instead of by wrapping. Biome caught the wrapped version.
		<div className="kit__switches">
			<span className="kit__switch">
				<SoftSwitch checked={a} onChange={setA} label="开启" />
				<span>开启</span>
			</span>
			<span className="kit__switch">
				<SoftSwitch checked={b} onChange={setB} label="关闭" />
				<span>关闭</span>
			</span>
			<span className="kit__switch">
				<SoftSwitch checked softDisabled label="禁用" />
				<span>禁用</span>
			</span>
		</div>
	);
}

/**
 * Full Component State Matrix displaying 5 essential states:
 * [默认 (default), 悬停 (hover), 聚焦 (focus), 激活 (active), 禁用 (disabled)]
 * across core components, with dynamic multi-material switching [solid, wash, tint, glass].
 */
function MatrixKit({ tone, materialMode }: { tone: IrisTone; materialMode: MaterialMode }) {
	const [switchVal, setSwitchVal] = useState(true);
	const [checkVal, setCheckVal] = useState(true);
	const [radioVal, setRadioVal] = useState("a");
	const [sliderVal, setSliderVal] = useState(62);
	const [segVal, setSegVal] = useState("clay");
	const [chipSelected, setChipSelected] = useState(true);
	const [selectVal, setSelectVal] = useState("paper");

	const cardMaterial =
		materialMode === "solid" ? "plain" : materialMode === "glass" ? "plain" : materialMode;
	const cardLook = materialMode === "glass" ? ("slab" as const) : undefined;

	return (
		<div className={`iriskit__matrix-wrap iriskit__matrix--${materialMode}`}>
			<style>{`
				.iriskit__matrix-wrap {
					width: 100%;
					max-width: 960px;
					padding: 24px;
					border-radius: 20px;
					background: var(--moe-canvas, #faf7f2);
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
					overflow-x: auto;
					box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
				}
				.iriskit__matrix-table {
					width: 100%;
					border-collapse: collapse;
					min-width: 760px;
					font-size: 13px;
				}
				.iriskit__matrix-table th {
					padding: 12px 14px;
					text-align: left;
					background: var(--moe-sand-200, #eee6d8);
					color: var(--moe-cocoa, #2c2523);
					font-weight: 700;
					border-bottom: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
				}
				.iriskit__matrix-table td {
					padding: 14px 14px;
					border-bottom: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.06));
					vertical-align: middle;
				}
				.iriskit__matrix-row-title {
					font-weight: 700;
					color: var(--moe-cocoa, #2c2523);
					white-space: nowrap;
					width: 120px;
				}
				.iriskit__cell-mat {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 6px;
					border-radius: 12px;
					transition: all 0.22s ease;
				}
				.iriskit__cell-mat--solid {
					background: var(--moe-card, rgba(255, 255, 255, 0.9));
					border: 1px solid var(--moe-stroke, rgba(0, 0, 0, 0.08));
				}
				.iriskit__cell-mat--wash {
					background: radial-gradient(circle at 50% 50%, rgba(120, 111, 166, 0.08) 0%, rgba(120, 111, 166, 0.16) 75%, rgba(100, 85, 150, 0.26) 100%);
					border: 1px solid rgba(120, 111, 166, 0.22);
				}
				.iriskit__cell-mat--tint {
					background: rgba(120, 111, 166, 0.07);
					border: 1px solid rgba(120, 111, 166, 0.14);
				}
				.iriskit__cell-mat--glass {
					background: rgba(255, 255, 255, 0.45);
					backdrop-filter: blur(14px);
					border: 1px solid rgba(255, 255, 255, 0.65);
					box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.85);
				}
				.iriskit__sim-hover {
					display: inline-block;
					transform: translateY(-2px) rotate(-0.5deg);
					filter: brightness(1.05);
					box-shadow: 0 6px 14px rgba(120, 111, 166, 0.22);
					border-radius: 12px;
				}
				.iriskit__sim-focus {
					display: inline-block;
					outline: 2px solid rgba(120, 111, 166, 0.85);
					outline-offset: 3px;
					box-shadow: 0 0 0 2px var(--moe-card, #fff), 0 0 14px 3px var(--moe-taro-500, #786fa6);
					border-radius: 12px;
				}
				.iriskit__sim-active {
					display: inline-block;
					transform: scale(0.96) translateY(1px);
					transition: transform 0.1s var(--moe-ease-press, cubic-bezier(0.28, 1.38, 0.48, 1));
					filter: brightness(0.94);
					border-radius: 12px;
				}
				.iriskit__sim-disabled {
					display: inline-block;
					opacity: 0.45;
					pointer-events: none;
					filter: grayscale(0.35);
					border-radius: 12px;
				}
			`}</style>
			<table className="iriskit__matrix-table">
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
					{/* Row 1: PinkPaperButton (Clay) */}
					<tr>
						<td className="iriskit__matrix-row-title">按钮 · 粘土</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<PinkPaperButton tone={tone} variant="clay" size="sm">
									粘土按钮
								</PinkPaperButton>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<PinkPaperButton tone={tone} variant="clay" size="sm">
										悬停微倾
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<PinkPaperButton tone={tone} variant="clay" size="sm" tabIndex={0}>
										光晕聚焦
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<PinkPaperButton tone={tone} variant="clay" size="sm">
										弹性按压
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<PinkPaperButton tone={tone} variant="clay" size="sm" disabled>
									已禁用
								</PinkPaperButton>
							</div>
						</td>
					</tr>

					{/* Row 2: PinkPaperButton (Gummy) */}
					<tr>
						<td className="iriskit__matrix-row-title">按钮 · 软糖</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<PinkPaperButton tone={tone} variant="gummy" size="sm">
									软糖按钮
								</PinkPaperButton>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<PinkPaperButton tone={tone} variant="gummy" size="sm">
										果冻微浮
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<PinkPaperButton tone={tone} variant="gummy" size="sm" tabIndex={0}>
										双层焦点
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<PinkPaperButton tone={tone} variant="gummy" size="sm">
										阻尼回弹
									</PinkPaperButton>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<PinkPaperButton tone={tone} variant="gummy" size="sm" disabled>
									已禁用
								</PinkPaperButton>
							</div>
						</td>
					</tr>

					{/* Row 3: SoftInput */}
					<tr>
						<td className="iriskit__matrix-row-title">输入框 · Input</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftInput placeholder="未聚焦输入框" />
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover" style={{ width: "100%" }}>
									<SoftInput defaultValue="指针悬停" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus" style={{ width: "100%" }}>
									<SoftInput defaultValue="键盘获焦" autoFocus={false} />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active" style={{ width: "100%" }}>
									<SoftInput defaultValue="激活输入" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftInput defaultValue="已锁定禁用" disabled />
							</div>
						</td>
					</tr>

					{/* Row 4: SoftSwitch */}
					<tr>
						<td className="iriskit__matrix-row-title">滑动开关 · Switch</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSwitch checked={switchVal} onChange={setSwitchVal} label="开" />
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<SoftSwitch checked={true} label="悬停" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<SoftSwitch checked={true} label="聚焦" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<SoftSwitch checked={true} label="按下" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSwitch checked softDisabled label="禁用" />
							</div>
						</td>
					</tr>

					{/* Row 5: SoftCheckbox */}
					<tr>
						<td className="iriskit__matrix-row-title">复选框 · Checkbox</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftCheckbox
									checked={checkVal}
									onChange={(e) => setCheckVal(e.target.checked)}
									label="水彩"
								/>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<SoftCheckbox checked={true} readOnly label="悬停高亮" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<SoftCheckbox checked={true} readOnly label="焦点环" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<SoftCheckbox checked={true} readOnly label="弹性回弹" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftCheckbox disabled checked={false} label="不可选择" />
							</div>
						</td>
					</tr>

					{/* Row 6: SoftRadio */}
					<tr>
						<td className="iriskit__matrix-row-title">单选框 · Radio</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftRadio
									name="iriskit-radio"
									value="a"
									checked={radioVal === "a"}
									onChange={() => setRadioVal("a")}
									label="选项 A"
								/>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<SoftRadio
										name="iriskit-radio-h"
										value="h"
										checked={true}
										readOnly
										label="悬停态"
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<SoftRadio
										name="iriskit-radio-f"
										value="f"
										checked={true}
										readOnly
										label="聚焦态"
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<SoftRadio
										name="iriskit-radio-act"
										value="act"
										checked={true}
										readOnly
										label="激活态"
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftRadio name="iriskit-radio-dis" value="d" disabled label="已禁用" />
							</div>
						</td>
					</tr>

					{/* Row 7: SoftSlider */}
					<tr>
						<td className="iriskit__matrix-row-title">滑块 · Slider</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSlider
									value={sliderVal}
									onChange={setSliderVal}
									label="水分"
									format={(v) => `${v}%`}
								/>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover" style={{ width: "100%" }}>
									<SoftSlider value={72} label="悬停" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus" style={{ width: "100%" }}>
									<SoftSlider value={85} label="聚焦" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active" style={{ width: "100%" }}>
									<SoftSlider value={92} label="拖拽" />
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSlider value={45} softDisabled label="禁用" />
							</div>
						</td>
					</tr>

					{/* Row 8: SoftChip */}
					<tr>
						<td className="iriskit__matrix-row-title">纸片 · Chip</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftChip selected={chipSelected} onClick={() => setChipSelected((v) => !v)}>
									默认纸片
								</SoftChip>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<SoftChip selected={false}>悬停抬升</SoftChip>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<SoftChip selected={false} tabIndex={0}>
										键盘聚焦
									</SoftChip>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<SoftChip selected={true}>按压激活</SoftChip>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftChip disabled>已禁用</SoftChip>
							</div>
						</td>
					</tr>

					{/* Row 9: SoftCard */}
					<tr>
						<td className="iriskit__matrix-row-title">卡片 · Card</td>
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
							<span className="iriskit__sim-hover">
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
							<span className="iriskit__sim-focus">
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
							<span className="iriskit__sim-active">
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
							<span className="iriskit__sim-disabled">
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

					{/* Row 10: SoftTextarea */}
					<tr>
						<td className="iriskit__matrix-row-title">文本域 · Textarea</td>
						<td>
							<SoftTextarea
								placeholder="未聚焦文本域"
								rows={2}
								material={cardMaterial}
								tone={tone}
							/>
						</td>
						<td>
							<span className="iriskit__sim-hover" style={{ width: "100%" }}>
								<SoftTextarea
									defaultValue="悬停编辑"
									rows={2}
									material={cardMaterial}
									tone={tone}
								/>
							</span>
						</td>
						<td>
							<span className="iriskit__sim-focus" style={{ width: "100%" }}>
								<SoftTextarea
									defaultValue="获焦输入"
									rows={2}
									material={cardMaterial}
									tone={tone}
								/>
							</span>
						</td>
						<td>
							<span className="iriskit__sim-active" style={{ width: "100%" }}>
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
								defaultValue="已禁用"
								rows={2}
								disabled
								material={cardMaterial}
								tone={tone}
							/>
						</td>
					</tr>

					{/* Row 11: SoftSegmentedControl */}
					<tr>
						<td className="iriskit__matrix-row-title">分段 · Segments</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSegmentedControl
									label="密度"
									options={[
										{ value: "clay", label: "粘土" },
										{ value: "wash", label: "水彩" },
									]}
									value={segVal}
									onChange={setSegVal}
								/>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover">
									<SoftSegmentedControl
										label="悬停"
										options={[
											{ value: "clay", label: "粘土" },
											{ value: "wash", label: "水彩" },
										]}
										value="clay"
										onChange={() => undefined}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus">
									<SoftSegmentedControl
										label="聚焦"
										options={[
											{ value: "clay", label: "粘土" },
											{ value: "wash", label: "水彩" },
										]}
										value="clay"
										onChange={() => undefined}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active">
									<SoftSegmentedControl
										label="激活"
										options={[
											{ value: "clay", label: "粘土" },
											{ value: "wash", label: "水彩" },
										]}
										value="wash"
										onChange={() => undefined}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSegmentedControl
									label="禁用"
									options={[
										{ value: "clay", label: "锁定", disabled: true },
										{ value: "wash", label: "禁用", disabled: true },
									]}
									value="clay"
									onChange={() => undefined}
								/>
							</div>
						</td>
					</tr>

					{/* Row 12: SoftSelect */}
					<tr>
						<td className="iriskit__matrix-row-title">下拉 · Select</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSelect
									label="基底"
									value={selectVal}
									onChange={setSelectVal}
									options={[
										{ value: "paper", label: "水彩纸" },
										{ value: "glass", label: "液态玻璃" },
									]}
								/>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-hover" style={{ width: "100%" }}>
									<SoftSelect
										label="悬停"
										value="paper"
										onChange={() => undefined}
										options={[{ value: "paper", label: "水彩纸" }]}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-focus" style={{ width: "100%" }}>
									<SoftSelect
										label="聚焦"
										value="paper"
										onChange={() => undefined}
										options={[{ value: "paper", label: "水彩纸" }]}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<span className="iriskit__sim-active" style={{ width: "100%" }}>
									<SoftSelect
										label="激活"
										value="glass"
										onChange={() => undefined}
										options={[{ value: "glass", label: "液态玻璃" }]}
									/>
								</span>
							</div>
						</td>
						<td>
							<div className={`iriskit__cell-mat iriskit__cell-mat--${materialMode}`}>
								<SoftSelect
									label="禁用"
									value="paper"
									disabled
									onChange={() => undefined}
									options={[{ value: "paper", label: "水彩纸" }]}
								/>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function KitSubject({
	component,
	tone,
	materialMode = "wash",
}: {
	component: KitComponent;
	tone: IrisTone;
	materialMode?: MaterialMode;
}) {
	switch (component) {
		case "matrix":
			return <MatrixKit tone={tone} materialMode={materialMode} />;
		case "bubble-badge":
			return <BubbleBadge tone={tone}>徽标</BubbleBadge>;
		case "paper-button":
			// All three variants and all three sizes, because the differences
			// between them are the whole point and a single button shows none.
			return (
				<div className="kit__row">
					<PinkPaperButton tone={tone} variant="clay" size="lg">
						粘土
					</PinkPaperButton>
					<PinkPaperButton tone={tone} variant="gummy" size="md">
						软糖
					</PinkPaperButton>
					<PinkPaperButton tone={tone} variant="flat" size="sm">
						扁平
					</PinkPaperButton>
				</div>
			);
		case "soft-light-panel":
			return (
				<SoftLightPanel tone={tone} className="kit__subject kit__subject--pane">
					<h3>柔光</h3>
					<p>重磨砂、宽亮边，边缘是化开的。</p>
				</SoftLightPanel>
			);
		case "watercolor-card":
			return (
				<WatercolorCard tone={tone} className="kit__subject kit__subject--pane">
					<h3>水彩</h3>
					<p>颜料是自己摊开的，上面盖着真玻璃。</p>
				</WatercolorCard>
			);
		case "modal":
			return <ModalKit />;
		case "chip-stepper":
			return <ChipStepperKit />;
		case "toolbar":
			return <ToolbarKit tone={tone} />;
		case "combobox":
			return <ComboboxKit />;
		case "list":
			return <ListKit tone={tone} />;
		case "textarea":
			return <TextareaKit tone={tone} />;
		case "menu":
			return <MenuKit />;
		case "navigation":
			return <NavigationKit />;
		case "status":
			return <StatusKit />;
		case "segments":
			return <SegmentsKit />;
		case "wash-canvas":
			return <WashCanvasKit />;
		case "material":
			return <MaterialKit />;
		case "drawer":
			return <DrawerKit />;
		case "table":
			return <TableKit tone={tone} />;
		case "accordion":
			return <AccordionKit tone={tone} />;
		case "identity":
			return <IdentityKit tone={tone} />;
		case "overlay":
			return <OverlayKit tone={tone} />;
		case "loading":
			return <LoadingKit />;
		case "choice":
			return <ChoiceKit />;
		case "select":
			return <SelectKit />;
		case "input":
			return <InputKit />;
		case "slider":
			return <SliderKit />;
		case "tabs":
			return <TabsKit />;
		case "switch":
			return <SwitchKit />;
		case "bling":
			return (
				<div className="kit__subject kit__bling">
					<Bling count={10} tone={tone} seed={5} />
				</div>
			);
		default:
			return null;
	}
}

export const KIT_COMPONENTS = COMPONENTS;
export const KIT_TONES = IRIS_TONES;
