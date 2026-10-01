# @ui-lib/shaders

**UI-Lib 的 TSL 节点材质库。** 一套 graph，两个后端：这里的所有东西在 WebGPU 下编译成 WGSL，在 WebGL 2 回退路径下编译成 GLSL，因为它写在 three 的节点系统里，而不是 raw shader source。

Liquid Glass、渐变背景、工作室环境探针，以及它们共用的 SDF 图元。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/shaders three
```

`three` 是 **peer dependency**（`>=0.180.0`），不会被捆绑进包里。

## 主要导出

| 材质 | 导出 |
| --- | --- |
| Liquid Glass | `createLiquidGlassMaterial` `LIQUID_GLASS_DEFAULTS` |
| 渐变背景 | `createGradientBackdropMaterial` `GRADIENT_BACKDROP_DEFAULTS` |
| 世界透镜 | `createWorldLensMaterial` `WORLD_LENS_DEFAULTS` |
| 环境探针 | `studioEnvironment` `STUDIO_ENVIRONMENT_SIZE` `STUDIO_ENVIRONMENT_PEAK` |
| 工具 | `createFullscreenQuad` |

## 为什么只用 TSL

不用 raw GLSL/WGSL 绕过跨后端契约，是这个项目的硬规则。代价是必须待在 three 的节点系统能表达的范围内；回报是同一份源码不会在 WebGL 2 回退路径上悄悄失真。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
