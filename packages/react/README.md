# @ui-lib/react

**UI-Lib 的 React 适配层。** 内容保持普通 DOM，`GlassStage` 负责共享那一层 GPU。

玻璃面板、粒子场、透镜、磁性吸附、指针轨迹、揭示动画与滚动钉住，全部走同一个 stage 的同一个渲染器。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/react react react-dom three
```

`react` / `react-dom`（`>=18`）与 `three`（`>=0.180.0`）都是 **peer dependency**，不会被捆绑进包里。

## 主要导出

| 分类 | 导出 |
| --- | --- |
| Stage | `GlassStage` `GlassStageProps` `useGlassStage` `GlassStageContext` |
| 表面 | `GlassPanel` `Lens` `Optics` `Magnetic` `ParticleField` `PointerTrail` `Reveal` |
| 滚动 | `ScrollTrack` `ScrollPin` `useScrollTrack` `useScrollTrackHandle` |
| 帧循环 | `useFrame` |
| 其他 | `useReducedMotion` `ensureStyles` `LOOKS` `resolveLook` |

## 用法

```tsx
import { GlassPanel, GlassStage, ParticleField } from "@ui-lib/react";

export function ProductHero() {
	return (
		<GlassStage
			backdrop={{ type: "gradient", colors: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"] }}
			post={{ bloomStrength: 0.4, chromaticAberration: 0.8, focusBlur: 1.5 }}
		>
			<ParticleField
				options={{ count: 24_000, forces: { turbulence: 2.2, vortex: 1.4 } }}
			/>

			<GlassPanel radius={34} refraction={46} dispersion={0.3} className="product-card">
				<h2>语义化内容仍然在页面上。</h2>
				<p>GPU layer 改变的是表面，而不是文档结构。</p>
			</GlassPanel>
		</GlassStage>
	);
}
```

`ParticleField` 在同一个 stage 内模拟并渲染，所以玻璃可以同时折射 backdrop 与粒子层，而不会为每个效果创建第二个 canvas 或 renderer。

`mode="viewport"`（默认）是一整页一张 fixed canvas；嵌在产品页的某个 section 里应该用 `mode="section"`，此时 canvas 绝对定位在 stage 元素内、面板坐标相对该元素。浏览器对并发 WebGPU context 有硬上限，所以一个页面只放少数几个 stage。

## 服务端渲染

模块求值不要求 `window` / `document`，`GlassStage` 在没有 GPU 时输出语义化 HTML 与 fallback 标记，`GlassPanel` 的 DOM props 与可访问名保持不变。仓库里有对应的 SSR smoke test。

这不是完整的 Next.js hydration 测试；Next / Nuxt / SvelteKit example 仍属后续发布工作。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
