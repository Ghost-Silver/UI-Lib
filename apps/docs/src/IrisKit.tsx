import { IRIS, IRIS_TONES, type IrisTone, type PlatformBudget } from "@ui-lib/core";
import {
	Bling,
	BubbleBadge,
	GlassStage,
	PinkPaperButton,
	SoftInput,
	SoftLightPanel,
	SoftModal,
	SoftSlider,
	SoftSwitch,
	SoftTabs,
	WatercolorCard,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect, useState } from "react";

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
						component === "input"
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
