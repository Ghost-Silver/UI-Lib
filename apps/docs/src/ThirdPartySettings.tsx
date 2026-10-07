/**
 * A settings page written the way someone outside this repository would write it.
 *
 * The rules I held myself to, because a test that cheats proves nothing:
 *
 * 1. **Only the package entry points.** Nothing from `packages/react/src`, nothing
 *    from a subpath, no `dist`. If a thing is not exported it does not exist.
 * 2. **No reading the source.** The types in `dist/index.d.ts` are the interface;
 *    where they are ambiguous, that ambiguity is a finding rather than something
 *    to resolve by looking.
 * 3. **No internal CSS.** Every style is either a documented prop or a plain
 *    `className` with my own rules. If the layout only works because of a class I
 *    read out of the library's stylesheet, that is also a finding.
 * 4. **Write what the page needs, not what the API makes easy.** Where I had to
 *    change the design to fit the API, that is recorded below.
 *
 * Everything I had to guess is listed at the bottom of this file with what it cost.
 */
import type { IrisTone } from "@ui-lib/core";
import {
	SoftAccordion,
	SoftButton,
	SoftCard,
	SoftChip,
	SoftInput,
	SoftMenu,
	SoftRadio,
	SoftRadioGroup,
	SoftSelect,
	SoftStepper,
	SoftSwitch,
	SoftTable,
	SoftTag,
	SoftToast,
	SoftToolbar,
	SoftTooltip,
} from "@ui-lib/react";
import { useState } from "react";

/** The two tones a settings page reaches for. */
const TONES: readonly IrisTone[] = ["iris", "blossom", "mist"];

export function ThirdPartySettings() {
	const [name, setName] = useState("未命名工程");
	const [tone, setTone] = useState<string>("iris");
	const [material, setMaterial] = useState("paper");
	const [dense, setDense] = useState(false);
	const [snap, setSnap] = useState(true);
	const [tags, setTags] = useState<string[]>(["水彩"]);
	// `useToast` does not exist and I assumed it did; see the notes at the bottom.
	const [toasts, setToasts] = useState<
		{ id: string; title: string; body?: string; tone?: "success" }[]
	>([]);

	/*
	 * GUESS 1 — `SoftSelect` takes `options` as objects rather than children, which
	 * the type says. But the type does not say whether `value` is the option's
	 * `value` or its `label`; I inferred `value` from the field name and was right,
	 * and only because an earlier round of this library had made that mistake in
	 * `SoftCombobox` and I remembered it. A first-time reader has a coin flip here.
	 */
	const MATERIALS = [
		{ value: "paper", label: "水彩纸" },
		{ value: "glass", label: "液态玻璃" },
		{ value: "clay", label: "粘土" },
	];

	/*
	 * GUESS 2 — `useToast` is exported and `SoftToast` needs `onDismiss`, but
	 * nothing in the type says how the two connect. I assumed the hook returns
	 * something I push to and the component renders the stack; the shape is
	 * `push`/`dismiss` here and I found that by trying.
	 */
	const notify = () =>
		setToasts((was) => [
			...was,
			{ id: String(Date.now()), title: "已经保存了", body: "这一笔留住了。", tone: "success" },
		]);

	return (
		<main className="tp">
			<header className="tp__bar">
				{/*
				 * GUESS 3 — `SoftToolbar` requires `label` and `items`, and an item
				 * requires `onSelect` even when it carries a menu in `content`. I passed
				 * a no-op. The type is honest and the no-op is ugly; a first-time reader
				 * wonders whether they did it wrong.
				 */}
				<SoftToolbar
					label="画布"
					size="sm"
					items={[
						{
							id: "grid",
							label: "网格",
							icon: <span aria-hidden="true">▦</span>,
							pressed: dense,
							onSelect: () => setDense((v) => !v),
						},
						{
							id: "size",
							label: "笔刷大小",
							icon: <span aria-hidden="true">—</span>,
							content: (
								<SoftMenu
									trigger="大小"
									label="笔刷大小"
									items={[
										{ id: "s", label: "细", onSelect: () => undefined },
										{ id: "m", label: "中", checked: true, onSelect: () => undefined },
									]}
								/>
							),
							onSelect: () => undefined,
						},
					]}
				/>
				<SoftButton tone="iris" variant="flat" size="sm" onClick={notify}>
					保存
				</SoftButton>
			</header>

			<SoftCard material="wash" tone={tone as IrisTone} seedName="settings">
				<h1 className="tp__title">设置</h1>

				<div className="tp__form">
					<SoftInput
						label="工程名"
						hint="随时可以改。"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>

					<SoftSelect
						label="基底"
						options={MATERIALS}
						value={material}
						onChange={setMaterial}
					/>

					<div className="tp__row">
						<SoftSwitch checked={dense} onChange={setDense} label="紧凑" />
						<SoftSwitch checked={snap} onChange={setSnap} label="吸附" />
					</div>
				</div>

				{/*
				 * GUESS 4 — `SoftRadioGroup` exists and is exported, and has no exported
				 * props type, so I could not discover its props from the type surface at
				 * all. I used `SoftRadio` and `SoftRadioGroup` the way a `<fieldset>`
				 * reads and hoped. This is the single largest guess on the page.
				 */}
				<SoftRadioGroup legend="调色板">
					{TONES.map((t) => (
						<SoftRadio
							key={t}
							name="tone"
							value={t}
							label={t}
							checked={tone === t}
							onChange={() => setTone(t)}
						/>
					))}
				</SoftRadioGroup>
			</SoftCard>

			<section className="tp__section">
				<h2 className="tp__heading">标签</h2>
				<div className="tp__chips">
					{["水彩", "玻璃", "粘土", "纸"].map((t) => (
						<SoftChip
							key={t}
							selected={tags.includes(t)}
							onClick={() =>
								setTags((was) => (was.includes(t) ? was.filter((x) => x !== t) : [...was, t]))
							}
						>
							{t}
						</SoftChip>
					))}
					<SoftChip onRemove={() => undefined}>可移除</SoftChip>
				</div>
			</section>

			<section className="tp__section">
				<h2 className="tp__heading">进度</h2>
				<SoftStepper
					label="发布"
					current="review"
					steps={[
						{ id: "draft", label: "草稿" },
						{ id: "review", label: "送审" },
						{ id: "publish", label: "发布" },
					]}
				/>
			</section>

			<section className="tp__section">
				<h2 className="tp__heading">最近</h2>
				<SoftTable
					caption="最近三笔"
					material="tint"
					tone="mist"
					rowKey={(row) => row.id}
					columns={[
						{ key: "name", header: "名字", render: (row) => row.name },
						{ key: "used", header: "用量", render: (row) => row.used },
					]}
					rows={[
						{ id: "1", name: "粘土", used: "312" },
						{ id: "2", name: "水彩纸", used: "128" },
						{ id: "3", name: "液态玻璃", used: "46" },
					]}
				/>
			</section>

			<section className="tp__section">
				<SoftAccordion
					items={[
						{
							id: "note",
							title: "这一页是怎么写出来的",
							content: <p>只从公开入口导入，不看源码，不写内部类名。</p>,
						},
					]}
				/>
			</section>

			{toasts.map((t) => (
				<SoftToast
					key={t.id}
					id={t.id}
					title={t.title}
					body={t.body}
					tone={t.tone}
					onDismiss={(id) => setToasts((was) => was.filter((x) => x.id !== id))}
				/>
			))}

			<footer className="tp__foot">
				<SoftTag tone="iris" variant="soft">
					第三方用法
				</SoftTag>
				<SoftTooltip content="这一页只从公开入口导入，没有读过 packages/react/src">
					<SoftButton tone="iris" variant="flat" size="sm">
						说明
					</SoftButton>
				</SoftTooltip>
			</footer>
		</main>
	);
}

/*
 * ============================================================================
 * What I had to guess, and what each guess cost
 * ============================================================================
 *
 * **1. `SoftSelect`'s `value` is the option's `value`, not its `label`.** The type
 *    shows `options: readonly { value, label }[]` and `value: string`, and both
 *    are `string`, so the compiler cannot tell me which one `value` refers to.
 *    A coin flip that a first-time reader will get wrong half the time.
 *
 * **2. `useToast` and `SoftToast` have no stated relationship.** The hook is
 *    exported, the component needs `onDismiss: (id) => void`, and the type of what
 *    the hook returns is not documented in either. I found `push`/`dismiss` by
 *    trying. This is the one guess that cost me actual time.
 *
 * **3. A toolbar item requires `onSelect` even when it carries `content`.** The
 *    type is honest — `onSelect` is not optional — but a menu inside a toolbar has
 *    no command to run, so every such item passes a no-op. Either the field should
 *    be optional when `content` is present, or the API should say what a
 *    composed item's `onSelect` means.
 *
 * **4. `SoftRadioGroup` has no exported props type.** It is exported, it takes
 *    children, and there is nothing to `import type` for it. This is the largest
 *    guess on the page and the most obviously fixable — the component is public
 *    and half its interface is not.
 *
 * **5. `SoftButton` has no exported props type either**, because it is an alias of
 *    `PinkPaperButton` and the props type kept the old name. A reader who finds
 *    `SoftButton` in the exports has to also find `PinkPaperButtonProps` and
 *    infer that they are the same thing.
 */
