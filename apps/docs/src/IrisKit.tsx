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
	SoftSwitch,
	SoftTable,
	SoftTabs,
	SoftTag,
	SoftTextarea,
	SoftToast,
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
	 *
	 * The residual between the first two is the check: they should be the same
	 * picture, because both are the composite with one output transform applied.
	 * When they are not, the chain is reading something other than what the
	 * scene wrote — which is exactly the failure that hid behind a green suite
	 * once already.
	 */
	const postMode = new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	).get("post");
	const post =
		postMode === "off" ? false : postMode === "passthrough" ? { enabled: false } : undefined;

	useEffect(() => {
		document.title = `IRIS kit · ${component} · ${tone}`;
	}, [component, tone]);

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
			<div className="kit" data-ui-lib-acceptance="iris-kit">
				{/* The measured box. Fixed size so every capture is comparable. */}
				<div
					className="kit__box"
					data-ui-lib-kit-box
					data-ui-lib-wide={
						component === "tabs" ||
						component === "switch" ||
						component === "slider" ||
						component === "input" ||
						component === "choice"
							? ""
							: undefined
					}
				>
					<KitSubject component={component} tone={tone} />
				</div>
			</div>
		</GlassStage>
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
function ListKit() {
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
			<SoftList label="基底（单选）" items={items} selected={one} onChange={setOne} />
			<SoftList
				label="色调（多选）"
				size="sm"
				items={[
					{ id: "iris", label: "紫", trailing: <SoftTag tone="iris">主</SoftTag> },
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
function TextareaKit() {
	const [note, setNote] = useState("颜料会往边缘走，\n会沉进纤维。");
	return (
		<div className="kit__textarea">
			<SoftTextarea
				label="说明"
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
				<SoftCard key={n.id} material={n.id} tone="iris" seedName={n.id}>
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
function TableKit() {
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
function AccordionKit() {
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
						tone: "iris",
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
function IdentityKit() {
	return (
		<div className="kit__identity">
			<div className="kit__identity-row">
				<SoftAvatar name="陈奕帆" size={52} />
				<SoftAvatar name="苏璃珞" size={52} tone="blossom" />
				<SoftAvatar name="Iris" size={52} tone="mist" />
				<SoftAvatar name="未命名" size={52} ring />
			</div>
			<div className="kit__identity-row">
				{[28, 36, 44].map((size) => (
					<SoftAvatar key={size} name="小" size={size} />
				))}
			</div>
			<div className="kit__identity-row kit__identity-tags">
				<SoftTag>水彩</SoftTag>
				<SoftTag tone="blossom">主色</SoftTag>
				<SoftTag tone="mist">冷色</SoftTag>
				<SoftTag variant="solid" tone="blossom">
					实心
				</SoftTag>
				<SoftTag variant="outline">描边</SoftTag>
				<SoftTag onRemove={() => undefined}>可移除</SoftTag>
			</div>
		</div>
	);
}

/** A tooltip open, and the three tones of toast. */
function OverlayKit() {
	const [toasts] = useState<SoftToastData[]>([
		{ id: "a", title: "已经保存了", body: "这一笔留住了。", tone: "success", duration: 0 },
		{ id: "b", title: "网络抖了一下", body: "正在重试。", tone: "warn", duration: 0 },
		{ id: "c", title: "三张卡片排好了", tone: "info", duration: 0 },
	]);
	return (
		<div className="kit__overlay">
			<SoftTooltip content="这会丢掉未保存的改动">
				<PinkPaperButton tone="blossom">悬停或 Tab 到这里</PinkPaperButton>
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

function KitSubject({ component, tone }: { component: KitComponent; tone: IrisTone }) {
	switch (component) {
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
		case "combobox":
			return <ComboboxKit />;
		case "list":
			return <ListKit />;
		case "textarea":
			return <TextareaKit />;
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
			return <TableKit />;
		case "accordion":
			return <AccordionKit />;
		case "identity":
			return <IdentityKit />;
		case "overlay":
			return <OverlayKit />;
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
