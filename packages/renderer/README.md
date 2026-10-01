# @ui-lib/renderer

**UI-Lib 背后的 three.js 运行时。** `@ui-lib/core` 放着框架无关、不碰 three 的底座；这个包是 GPU 真正参与进来的地方。

WebGPU 优先、WebGL 2 自动回退的渲染器引导、backdrop pass、挂在真实 DOM 元素上的玻璃层、粒子层，以及指针射线与 ribbon 写入。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/renderer three
```

`three` 是 **peer dependency**（`>=0.180.0`），不会被捆绑进包里。

## 主要导出

| 分类 | 导出 |
| --- | --- |
| 渲染器 | `createRenderer` `RendererUnavailableError` |
| 背景 | `createBackdrop` `DEFAULT_BACKDROP` |
| 玻璃层 | `createGlassLayer` `GlassLayer` `GLASS_PANEL_DEFAULTS` |
| 指针 | `pointerClient` `approachPoint` `defaultPointerDistance` `stirBreath` |
| Ribbon | `writeRibbon` `writeRibbonColors` `writeRibbonIndices` `writeSoftDisc` `stepTrail` `pushTrailSample` `trailPresence` `trailWidth` `trailSpacing` `TRAIL_CAPACITY` `TRAIL_LIFE` |
| 转发 | `LOOKS` `resolveLook` `PostProcessingOptions` |

## 用法

不经过 React 也能直接用：

```ts
import { createGlassLayer } from "@ui-lib/renderer";

const layer = await createGlassLayer({
	backdrop: { type: "gradient", colors: ["#101827", "#6d28d9"] },
});

const card = document.querySelector<HTMLElement>(".product-card");
if (card) {
	const handle = layer.register(card, { radius: 34, refraction: 46, roughness: 0.2 });
	handle.update({ roughness: 0.6 });
	// handle.dispose()：元素或路由被移除时调用
}

// layer.dispose()：拥有该 layer 的页面销毁时调用
```

一个页面用一个 canvas、一个 renderer、一个 scheduler。功能不能靠新增 canvas 或 renderer 来绕过这条约束。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
