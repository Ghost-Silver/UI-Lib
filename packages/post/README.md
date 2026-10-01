# @ui-lib/post

**UI-Lib 的 TSL 后处理链。** bloom、色散、颗粒、暗角、焦点模糊、方向性动态模糊，以及时间累积。

采样数与昂贵分支由 **编译期预算** 决定，而不是靠 uniform 假装改变已经展开的 shader loop——所以切换画质档位会重建 graph，这是有意为之。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/post three
```

`three` 是 **peer dependency**（`>=0.180.0`），不会被捆绑进包里。

## 主要导出

| 分类 | 导出 |
| --- | --- |
| 主链 | `createPostProcessing` `POST_DEFAULTS` |
| 预设观感 | `LOOKS` `resolveLook` `LookName` |
| 深度历史 | `alignDepthHistory` `depthHistoryCompatible` `assertDepthHistoryFormats` `readGpuTextureFormat` |
| 高光压缩 | `compressHighlight` |

## 用法

```ts
import { createPostProcessing } from "@ui-lib/post";

const post = createPostProcessing({
	quality: 2,                  // 1 | 2 | 3，编译期预算
	bloomStrength: 0.4,
	chromaticAberration: 0.8,
	focusBlur: 1.5,
});
```

`quality` 决定 bloom 金字塔层数、可分离卷积的 tap 数与 TAA 邻域采样数。这三者都是编译期常量，所以降档必须重建 graph——用 uniform 硬撑只会得到「看起来降了档、实际还在跑完整开销」的假象。

## 输入契约

链需要一个输入：**这一层自己的、后处理之前的合成结果**。

```ts
const post = createPostProcessing({
	// …观感参数
	depthTexture: worldDepth,          // 可选：深度历史用
	sourceTexture: compositeRT.texture, // 可选：链路采样它
});
```

- `sourceTexture` 为空时链路退回 `viewportTexture()`，也就是读当前绑定目标——只有在调用方确实把合成结果留在默认帧缓冲上时才成立。
- 有 `sourceTexture` 时，**它必须与 `commit()` 的目标同格式**。`commit()` 用 `renderer.copyTextureToTexture()` 把源拷进历史缓冲；格式不同时 WebGPU 后端只报一行 `Source and destination formats do not match` 然后静默返回，不会抛异常。旧版本用 `copyFramebufferToTexture()` + 一份手写的「这次拷贝会不会被拒绝」守卫来回避这个问题——那是把 three 的私有源上下文查找逐字抄了一遍，脆弱且只能事后补救。改成由调用方显式提供源之后，这条守卫连同它的导出一起删掉了。
- **`sourceTexture` 的 UV 空间是自下而上的**。three 把渲染目标纹理按 GL 约定存储，而 node builder 的 `isFlipY()` 在 WebGPU 与 WebGL 两条路径上**都**返回 `false`——它不会替你补偿。链内部因此显式做 `vec2(screenUV.x, oneMinus(screenUV.y))`。这一条踩过一次：漏掉翻转时画面上下颠倒，但**分界线在画面中部**，看起来像「构图错了」而不是「UV 错了」。

## 帧循环

```ts
renderer.setRenderTarget(compositeRT);
renderer.render(scene, camera);        // 这一层的合成
renderer.setRenderTarget(null);

post.render();                          // 画布由 RenderPipeline 写
post.commit(renderer);                  // 把 compositeRT 拷进历史，供下一帧用
```

`commit()` 必须在 `render()` 之后、且在 `compositeRT` 仍未被覆盖时调用。没有 `sourceTexture` 时它把 `historyValid` 置 0 并直接返回——**声明一份不存在的历史比不声明更糟**。

`setSize()` 会同时调整链内部的目标与历史缓冲；历史缓冲按 `RenderTarget.width/height` 判尺寸，不用 `texture.image`（那是 `unknown`）。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
