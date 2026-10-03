import { IRIS, IRIS_TONES, type IrisTone, type PlatformBudget } from "@ui-lib/core";
import {
	Bling,
	BubbleBadge,
	GlassStage,
	PinkPaperButton,
	SoftLightPanel,
	WatercolorCard,
} from "@ui-lib/react";
import type { BackdropSpec } from "@ui-lib/renderer";
import { useEffect } from "react";

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
				<div className="kit__box" data-ui-lib-kit-box>
					<KitSubject component={component} tone={tone} />
				</div>
			</div>
		</GlassStage>
	);
}

function KitSubject({ component, tone }: { component: KitComponent; tone: IrisTone }) {
	switch (component) {
		case "bubble-badge":
			return <BubbleBadge tone={tone}>徽标</BubbleBadge>;
		case "paper-button":
			return <PinkPaperButton tone={tone}>开始</PinkPaperButton>;
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
