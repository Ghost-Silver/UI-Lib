import type { IrisTone } from "@ui-lib/core";
import {
	SoftAccordion,
	SoftAlert,
	SoftCard,
	SoftChip,
	SoftList,
	SoftProgress,
	SoftStepper,
	SoftSwitch,
	SoftTag,
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

export function KitIndexPage() {
	const [tone, setTone] = useState<IrisTone>("iris");
	const [dense, setDense] = useState(false);

	return (
		<div className={`kitindex kitindex--${tone}`}>
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
				</div>
			</header>

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
						<a className="kitindex__link" href={surface.href}>
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
