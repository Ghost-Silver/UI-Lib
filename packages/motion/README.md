# @ui-lib/motion

**UI-Lib 的滚动与编排运动层。** 第一切片是一条滚动轨道：进度、速度、章节权重与数值轨道。

它**不启动第二个动画循环**。采样发生在共享调度器的 `input` 阶段——在 compute、弹簧和玻璃渲染之前。没有 Lenis 式的 ticker，DOM 读取与 GPU 处在同一帧上。

弹簧、缓动与调度器本身留在 `@ui-lib/core`。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/motion
```

不依赖 three.js，也不依赖 React。

## 主要导出

| 分类 | 导出 |
| --- | --- |
| 滚动轨道 | `ScrollTrack` `ScrollTrackOptions` `SCROLL_IDLE` `ScrollState` |
| 纯函数 | `scrollProgress` |
| 章节与拍点 | `sampleTrack` `beatLocal` `beatWeight` `brightestBeat` `minBrightestBeat` `revealWeight` |
| 预设 | `SCROLL_CINEMA_BEATS` `SCROLL_CINEMA_FADE` |

## 用法

```ts
import { ScrollTrack } from "@ui-lib/motion";

const track = new ScrollTrack(sectionElement, {
	offset: 0,        // 视为钉住线的视口 Y，与 sticky 子元素的 top 对齐
	smoothing: 12,    // 指数平滑；0 表示完全跟随滚动位置
	onChange: (state) => {
		// state.progress  平滑后的 [0, 1]，用它驱动相机与揭示
		// state.raw       未滤波的 [0, 1]
		// state.velocity  平滑后的每秒进度单位
		// state.active    轨道是否与视口相交
	},
});

const off = track.subscribe(() => render());
track.scrollToProgress(0.5);

// 卸载时
off();
track.dispose();
```

`prefers-reduced-motion` 为 reduce 时，轨道**始终**直接对齐滚动位置，忽略 `smoothing`。这不是可选项。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
