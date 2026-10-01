# @ui-lib/core

**UI-Lib 的框架无关底座。** 不依赖 React，也不依赖 three.js——凡是要在一个像素被画出来之前就存在的东西都在这里。

设备探测、自适应画质、统一帧循环、数学与缓动、指针输入、确定性生命周期，以及一张可验证的逻辑资源登记表。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/core
```

## 主要导出

| 分类 | 导出 |
| --- | --- |
| 设备 | `detectCapabilities` `detectCapabilitiesSync` `hasDom` `onReducedMotionChange` |
| 帧循环 | `getScheduler` `FrameScheduler` `disposeScheduler` `TASK_PRIORITY` |
| 画质 | `QualityManager` `QUALITY_PRESETS` `scoreTier` |
| 数学与缓动 | `clamp` `clamp01` `damp` `Easing` `Spring` `Spring2` `lerp` `inverseLerp` `mapRange` `smoothstep` `wrap` `fbm2D` `valueNoise2D` |
| 生命周期 | `Disposer` `nextFrame` `mergeDefined` |
| 输入 | `PointerTracker` |
| 资源登记 | `getResourceSnapshot` `ResourceRegistry` `resourceRegistry` |

## 用法

一个页面只用一个帧循环。第二套 `requestAnimationFrame` 是这个库明确要避免的东西：

```ts
import { getScheduler } from "@ui-lib/core";

const scheduler = getScheduler();
const off = scheduler.add((frame) => {
	// frame.dt      距上一帧的秒数（已做上限钳制）
	// frame.elapsed 自调度器启动以来的秒数（暂停时间不计）
	// frame.fps     平滑后的帧率
	// frame.droppedFrames / frame.longFrames
}, "render");

// 卸载时退订
off();
```

`add()` 返回退订函数。第二个参数是优先级名（`"input"` / `"compute"` / `"update"` / `"render"`，默认 `"render"`）——注意它要的是名字而不是 `TASK_PRIORITY` 里的数值，顺序由优先级决定，而不是由订阅先后决定。

画质档位是 `0 | 1 | 2 | 3`，运行时可降级：

```ts
import { QualityManager } from "@ui-lib/core";

const quality = new QualityManager();
quality.sample(frame.dt);   // 持续采样，必要时降档
quality.setTier(1);         // 或显式指定
```

逻辑资源登记表用来验证 mount / unmount 之后有没有漏掉的引用：

```ts
import { getResourceSnapshot } from "@ui-lib/core";

const before = getResourceSnapshot();
// mount / register / dispose ...
const after = getResourceSnapshot();
```

这不是浏览器显存计数器——浏览器没有跨后端的通用 VRAM API。它验证的是逻辑引用是否释放。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
