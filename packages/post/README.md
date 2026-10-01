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

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
