# UI-Lib

**面向 Web 的 GPU 优先动效与视觉效果运行时。**

UI-Lib 将实时 Liquid Glass、GPU 粒子、3D 场景和 TSL 后处理带入普通网页界面。它的目标是服务于产品展示（Product Hero）、滚动叙事、交互表面和沉浸式体验，并且**绝对不**使用 Canvas 完全取代语义化 HTML。

> **状态：实验性 `0.0.1`。** 渲染底座、Liquid Glass、GPU 粒子、TSL 后处理、部分渲染编排和共享时钟均已落地。兼容 WebGPU 与 WebGL2。

[在线演示](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run) · [路线图](docs/ROADMAP.md) · [交互 Playground](apps/docs)

## 在线演示

您可以访问以下链接，体验不同场景下的视觉能力：

**https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run**

| 演示场景 | 链接 | 简介 |
|---|---|---|
| **Liquid Glass Pro** | [`/?demo=liquid-glass`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=liquid-glass) | 基于真实 DOM 的多层玻璃与折射。 |
| **Lumen (Product Hero)** | [`/?demo=product-hero`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=product-hero) | 产品展示页，带相机轨道和镜头光学效果。 |
| **Scroll Cinema** | [`/?demo=scroll-cinema`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=scroll-cinema) | 沉浸式滚动叙事，支持 Sticky Pin。 |
| **Cursor Field** | [`/?demo=cursor-field`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=cursor-field) | 基于指针驱动的高光互动粒子场。 |
| **Aurora Flow** | [`/?demo=aurora-flow`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=aurora-flow) | 整页流场与涡旋，纯净的视觉氛围。 |
| **Wake** | [`/?demo=wake`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=wake) | 带有粒子生命周期和光辉拖尾的高级展示。 |

> 提示：在 URL 后追加 `?fallback=1` 强制查看 CSS 降级效果；追加 `?backend=webgl` 强制使用 WebGL2 渲染。

---

## 核心设计理念

Web 动效经常面临一个两难的选择：用 DOM 和 CSS（易于接入、可访问性好，但能力受限）还是用 Canvas Demo（视觉华丽，但破坏文档流、性能失控）。UI-Lib 的设计妥协点是：

- **DOM 仍然是 DOM。** 文本、链接、表单、焦点和布局都保留在语义化 HTML 中。
- **一个共享渲染运行时。** 整个页面仅使用一个 Canvas、一个 Renderer 和一个 Scheduler 来承载所有 UI-Lib 效果，不为每个组件新建上下文。
- **渐进增强。** 优先尝试 WebGPU，自动回退 WebGL2；在没有 GPU 或开启 Reduced Motion 时，平稳回退到 CSS / 静态形态。
- **唯一着色器语言 (TSL)。** 使用 Three Shading Language 节点图，自动编译为 WGSL 或 GLSL，抹平跨端差异。

## 核心能力

### 🧊 Liquid Glass (液体玻璃)
- 真实 DOM 元素映射到 WebGPU 渲染层的实时玻璃面板。
- 基于 Rounded-rectangle SDF 的真实屏幕空间折射。
- 支持 RGB 色散 (Chromatic Dispersion)、霜冻模糊 (Frost/Roughness)、边缘高光等光线追踪级效果。

### ☄️ GPU 粒子场 (GPU Particles)
- WebGPU Compute 路径与 WebGL2 Transform-feedback 回退路径。
- 支持引力、湍流、涡旋、拖拽等流场力学。
- 基于屏幕空间的多层深度混合。

### 🎞️ TSL 后处理 (Post Processing)
- 支持泛光 (Bloom)、镜头光晕、色差 (Chromatic Aberration) 与暗角。
- 支持方向性运动模糊、焦点模糊。
- 自适应质量降级 (Adaptive Quality Tier)。

---

## 快速开始

### 运行环境
- Node.js `>= 20.19`
- pnpm `12.x`

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动本地 Playground
pnpm dev
```
打开 `http://localhost:5173`。

### 工程门禁指令

```bash
# 执行完整验证流程（类型检查、测试、包大小预算校验）
pnpm verify

# 格式化与静态检查
pnpm lint

# 运行浏览器端自动化集成测试（Headless Chromium）
pnpm test:e2e
```

---

## 包结构指南

UI-Lib 是一个 Monorepo 仓库，所有模块严格隔离，支持逐步引入：

| 模块包 | 核心职责 |
| --- | --- |
| [`@ui-lib/core`](packages/core) | 框架无关的基础设施：Device、Quality、Scheduler、Pointer、Lifecycle |
| [`@ui-lib/shaders`](packages/shaders) | Liquid Glass、Backdrop 材质与核心 TSL 节点图 |
| [`@ui-lib/particles`](packages/particles) | GPU 粒子模拟、流场、发射器与渲染 |
| [`@ui-lib/post`](packages/post) | TSL 后处理图、时域混合、颜色管理 |
| [`@ui-lib/renderer`](packages/renderer) | WebGPU/WebGL2 启动、Stage 编排、DOM 关联渲染引擎 |
| [`@ui-lib/react`](packages/react) | React 适配层 (`GlassStage`, `GlassPanel` 等)，包含 SSR 回退与样式 |
| [`@ui-lib/motion`](packages/motion) | 基于共享帧时钟的滚动追踪与动画编排 |

*注意：所有渲染相关的包仅将 `three` 作为 Peer Dependency，不会自动打包 Three.js。*

---

## React 用法示例

在 React 环境下，保持页面语义结构不变，通过 `GlassStage` 和 `GlassPanel` 附加增强效果。

```tsx
import { GlassPanel, GlassStage, ParticleField } from "@ui-lib/react";

export function ProductHero() {
  return (
    <GlassStage
      backdrop={{
        type: "gradient",
        colors: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"],
      }}
      post={{
        bloomStrength: 0.4,
        chromaticAberration: 0.8,
        focusBlur: 1.5,
      }}
    >
      {/* 在统一上下文里添加粒子 */}
      <ParticleField
        options={{
          count: 24_000,
          forces: { turbulence: 2.2, vortex: 1.4 },
          colors: ["#5eead4", "#a78bfa", "#f472b6"],
        }}
      />

      {/* 这个卡片会被映射到 WebGPU 渲染空间中进行屏幕空间折射 */}
      <GlassPanel
        radius={34}
        refraction={46}
        dispersion={0.3}
        className="product-card"
      >
        <h2>语义化内容仍然在页面上。</h2>
        <p>GPU layer 改变的是表面材质，而不是破坏您的 HTML 文档结构。</p>
      </GlassPanel>
    </GlassStage>
  );
}
```

---

## 许可证 (License)

[MIT](LICENSE)
