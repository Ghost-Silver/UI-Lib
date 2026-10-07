# UI-Lib

<p align="center">
  <b>GPU-First Visual Effects Runtime & 50 Semantic Soft Components with Physical Watercolor for the Web</b><br>
  面向 Web 的 GPU 优先动效视觉运行时 · 物理宣纸水墨渲染 · 50 个高阶语义化 Soft 无障碍组件
</p>

<p align="center">
  <a href="#质量门禁矩阵"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square" alt="Build Passing" /></a>
  <a href="#质量门禁矩阵"><img src="https://img.shields.io/badge/tests-530%2F530%20passed-brightgreen.svg?style=flat-square" alt="Tests Passed" /></a>
  <a href="docs/components/README.md"><img src="https://img.shields.io/badge/components-50%20Soft-ff69b4.svg?style=flat-square" alt="Soft Components" /></a>
  <a href="#质量门禁矩阵"><img src="https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=flat-square" alt="TypeScript Strict" /></a>
  <a href="#质量门禁矩阵"><img src="https://img.shields.io/badge/backends-WebGPU%20%7C%20WebGL2%20%7C%20CSS-blueviolet.svg?style=flat-square" alt="Backends" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="#在线演示">在线演示</a> &nbsp;·&nbsp;
  <a href="#快速上手">快速上手</a> &nbsp;·&nbsp;
  <a href="#双支柱架构体系">双支柱架构</a> &nbsp;·&nbsp;
  <a href="#50-个-soft-语义组件图谱">组件图谱</a> &nbsp;·&nbsp;
  <a href="#质量门禁矩阵">质量门禁</a> &nbsp;·&nbsp;
  <a href="#深度技术文档">深度文档</a>
</p>

---

UI-Lib 将实时液态玻璃（Liquid Glass）、GPU 粒子模拟、3D 光学世界与 TSL 后处理管线引入现代 Web 界面，服务于产品 Hero、滚动叙事、交互表面与沉浸式展示——**坚持 DOM 仍然是 DOM，不以牺牲 HTML 语义化与可访问性为代价**。

向上，UI-Lib 构筑了业界首个基于 **Kubelka-Munk 物理减色模型** 与宣纸毛细管浸润扩散的材质系统，并交付了 **50 个严格遵守 WAI-ARIA APG 规范的 `Soft` 语义化应用组件**，配合 $\zeta = 0.55$ 物理阻尼微交互，兼具顶尖视觉表现力与严苛工程鲁棒性。

---

## 在线演示

七大旗舰交互展示页已完成静态构建并部署上线：

**https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run**

| 演示项目 | 在线链接 | 场景与核心技术特征 |
|---|---|---|
| **Liquid Glass Pro** | [`/?demo=liquid-glass`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=liquid-glass) | Section Pin 钉住，真实 DOM 绑定液态玻璃，屏幕空间折射与 RGB 色散，背景走纸校对 |
| **Lumen** | [`/?demo=product-hero`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=product-hero) | 产品展示旗舰页，相机平滑轨道，`look="product"`，安静的工作室环境光反射探针 |
| **Scroll Cinema** | [`/?demo=scroll-cinema`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=scroll-cinema) | 滚动叙事舞台，粘性章节窗口重叠折射，共享调度器时钟同步，滚毕自然平滑松开 |
| **Cursor Field** | [`/?demo=cursor-field`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=cursor-field) | 共享射线采样，统一驱动玻璃高光、动态 Ribbon 轨迹与 GPU 粒子，静止与移动平滑过渡 |
| **Aurora Flow** | [`/?demo=aurora-flow`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=aurora-flow) | 全页流体涡旋场，沿射线走近的涡核换色，暗色背景雾层，HTML 文本逐词优雅展现 |
| **Wake** | [`/?demo=wake`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=wake) | 粒子独立历史轨迹（Per-particle Trail），动态档位显存预算裁剪，高帧率稳态渲染 |
| **Kit Index** | [`/?demo=kit-index`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=kit-index) | 50 个 `Soft` 语义化组件全景交互目录，宣纸水彩物理混色系统，$\zeta = 0.55$ 物理阻尼手感演示 |

> **降级对照调试参数**：向任意 URL 附加 `?fallback=1` 强制激活 CSS Fallback；附加 `?backend=webgl` 强制走 WebGL2 路径。

---

## 双支柱架构体系

```text
                  ┌───────────────────────────────────────────────┐
                  │          语义化 DOM / 现代前端应用             │
                  └───────────────────────┬───────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       【支柱 1：GPU 视觉效果运行时】               【支柱 2：宣纸水墨与 50 个 Soft 组件】
  ┌─────────────────────────────────┐           ┌─────────────────────────────────┐
  │   @ui-lib/renderer (共享舞台)   │           │    50 个语义组件 (@ui-lib/react) │
  │   - 单一 Canvas / 单一 Renderer │           │    - 严格遵循 WAI-ARIA APG      │
  │   - Viewport / Section Stage    │           │    - 完整键盘模型与焦点捕获闭环  │
  ├─────────────────────────────────┤           ├─────────────────────────────────┤
  │   渲染图层与材质 (@ui-lib/shaders)│           │    宣纸水彩物理 (@ui-lib/core)   │
  │   - 实时 Liquid Glass 折射/色散 │           │    - Kubelka-Munk 物理减色混色  │
  │   - GPU Compute 粒子模拟系统    │           │    - 宣纸毛细管浸润扩散生成器   │
  ├─────────────────────────────────┤           ├─────────────────────────────────┤
  │   TSL 后处理管线 (@ui-lib/post) │           │    物理动效手感 (@ui-lib/motion) │
  │   - Bloom / 色散 / 运动重投影   │           │    - ζ = 0.55 黄金欠阻尼微交互  │
  │   - WebGPU / WebGL2 统一 Node 图│           │    - 自适应 --moe-on-material   │
  └─────────────────────────────────┘           └─────────────────────────────────┘
```

### 支柱 1：GPU 视觉效果运行时

1. **DOM 仍然是 DOM**：所有文字、输入框、链接与语义布局完全保留在普通 HTML 文档树中，不以全屏 Canvas 绑架用户体验。
2. **单一共享渲染实例**：全页共用一个 canvas、一个 renderer 和一个 `FrameScheduler`，杜绝多个 requestAnimationFrame 循环与 WebGPU 上下文超限。
3. **渐进增强与全自动降级**：
   - 优先激活高性能 WebGPU Compute 路径；
   - 自动回退至 WebGL2 Transform Feedback 与 TSL 编译管线；
   - 无 GPU 或用户配置 `prefers-reduced-motion` 时，平滑切换至轻量 CSS `backdrop-filter` 静态形态。
4. **全链路纯 TSL（Three Shading Language）**：所有着色器与后处理均通过 TSL 节点图构建，同一套 Graph 跨后端自动转译为 WGSL 或 GLSL，绝不依赖裸语言规避约束。
5. **确定性生命周期治理**：显式追踪所有 Buffer、RenderTarget、粒子系统与事件监听，杜绝内存泄漏。

### 支柱 2：宣纸水墨物理与 50 个 Soft 语义组件

1. **Kubelka-Munk 物理减色混色模型**：
   传统前端的数字 RGB 插值（如 CSS `color-mix`）在互补色相交时会穿过发暗的“死灰轴（Dead Grey Mud Axis）”。UI-Lib 在 `@ui-lib/core` 中实现了基于物理吸收与散射系数（$K/S$）的减色融合，呈现温润通透的东方水彩质感。
2. **宣纸毛细管浸润微结构（Capillary Wash）**：
   通过分形扰动参数与程序化流体方程生成宣纸边缘沉积水痕，支持 `wash`（浓彩）、`tint`（淡染）与 `plain`（素面）三种材质层级。
3. **50 个遵守 WAI-ARIA APG 的高阶组件**：
   拒绝无语义的 `div` 堆砌。涵盖树形导航、多列排序网格、命令面板等复杂形态，具备完整的键盘漫游、读屏器标记与焦点管理。
4. **$\zeta = 0.55$ 物理阻尼手感**：
   组件按下、回弹与拖拽微交互严格遵照二阶微分阻尼方程，微欠阻尼手感灵动自然；系统要求减弱动效时位移瞬时归零。
5. **动态基底对比度适配**：
   内置 `computeEffectiveGroundLuminance`，能实时汇算湿水痕基底的相对明度，动态调节 `--moe-on-material` 文字前景色，坚守 WCAG AA 级可访问性反差标准。

---

## 50 个 Soft 语义组件图谱

组件库包含 50 个带有无障碍契约的应用组件，分为 5 大核心维度。完整键盘快捷键、焦点契约与属性规范请阅读 [**Soft 组件规范与 WAI-ARIA 体系指南**](docs/components/README.md)。

| 维度 | 包含组件与说明 | 核心 WAI-ARIA 契约 |
|---|---|---|
| **表单与选择**<br>*(12 Components)* | `SoftButton`, `SoftInput`, `SoftTextarea`, `SoftSelect`, `SoftCombobox`, `SoftCheckbox`, `SoftRadio`, `SoftRadioGroup`, `SoftSwitch`, `SoftSlider`, `SoftSegmentedControl`, `SoftColorPicker` | `role="button"`, `role="combobox"`, `role="listbox"`, `role="switch"`, `role="slider"`, `role="radiogroup"`, `aria-activedescendant`, `aria-checked` |
| **数据与结构**<br>*(12 Components)* | `SoftCard`, `SoftTable`, `SoftDataTable`, `SoftList`, `SoftTree`, `SoftAccordion`, `SoftTabs`, `SoftDrawer`, `SoftModal`, `SoftToolbar`, `SoftMenu`, `SoftTimeline` | `role="tree"`, `role="treeitem"`, `role="dialog"`, `role="toolbar"`, `role="tablist"`, `aria-sort`, `aria-modal="true"`, 焦点陷阱 (Focus Trap) |
| **反馈与上下文**<br>*(10 Components)* | `SoftToast`, `SoftToaster`, `SoftToastProvider`, `SoftTooltip`, `SoftPopover`, `SoftAlert`, `SoftProgress`, `SoftSkeleton`, `SoftSpinner`, `SoftEmptyState` | `role="status"` / `role="alert"` 动态活区 (`aria-live`), `role="tooltip"` (不抢焦点), `role="progressbar"`, Swipe-to-dismiss 手势划走 |
| **导航与控制**<br>*(8 Components)* | `SoftBreadcrumb`, `SoftPagination`, `SoftStepper`, `SoftCommandPalette`, `SoftFloating`, `SoftOverlay`, `SoftNavigation`, `SoftChipStepper` | `<nav>` 地标导航, `aria-current="page"|"step"`, 纯几何向量自研浮动引擎 (Flip / Shift clamping), Cmd+K 搜索 |
| **标识与表面**<br>*(8 Components)* | `SoftAvatar`, `SoftTag`, `SoftChip`, `SoftBadge`, `SoftDivider`, `SoftLightPanel`, `BubbleBadge`, `WatercolorBoard` | `role="img"`, `role="separator"`, 可交互筛选胶囊 (`aria-pressed`), 状态数值播报, 真实倒角微毛玻璃背板 |

---

## 快速上手

### 环境要求
- Node.js `>=20.19`
- pnpm `12.x`
- 硬件加速支持：WebGPU 或 WebGL2 兼容浏览器

### 1. GPU 渲染层：液态玻璃与折射舞台

```tsx
import { GlassPanel, GlassStage, ParticleField } from "@ui-lib/react";

export function HeroScene() {
  return (
    <GlassStage
      look="cinema"
      mode="viewport"
      backdrop={{
        type: "gradient",
        colors: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"],
      }}
      post={{
        bloomStrength: 0.45,
        chromaticAberration: 0.8,
        focusBlur: 1.2,
      }}
    >
      {/* GPU 计算粒子 */}
      <ParticleField
        options={{
          count: 32_000,
          forces: { turbulence: 2.0, vortex: 1.2 },
          colors: ["#5eead4", "#a78bfa", "#f472b6"],
        }}
      />

      {/* 真实 DOM 元素挂载物理液态玻璃 */}
      <GlassPanel
        radius={28}
        refraction={42}
        dispersion={0.35}
        roughness={0.18}
        className="hero-card"
      >
        <h2>文字与布局仍然属于原生 DOM</h2>
        <p>屏幕空间折射与光学模糊作用于背景与粒子，而非扁平假滤镜。</p>
      </GlassPanel>
    </GlassStage>
  );
}
```

### 2. 语义组件层：宣纸水彩与 Soft 组件

```tsx
import {
  SoftButton,
  SoftCard,
  SoftColorPicker,
  SoftInput,
  SoftTree,
} from "@ui-lib/react";

export function DesignWorkbench() {
  return (
    <SoftCard material="wash" tone="iris" className="p-6">
      <header className="mb-4">
        <h3>工程调色与层级漫游</h3>
      </header>

      <div className="space-y-4">
        {/* 输入与微晕环 */}
        <SoftInput label="项目代号" placeholder="IRIS-01" />

        {/* Kubelka-Munk 物理水彩调色器 */}
        <SoftColorPicker
          mode="subtractive"
          label="宣纸水墨混色标本"
          defaultValue="#8b5cf6"
        />

        {/* 符合 Tree APG 的分层导航 */}
        <SoftTree
          data={[
            {
              key: "src",
              label: "源码工程",
              children: [
                { key: "core", label: "Kubelka-Munk 物理内核", isLeaf: true },
                { key: "react", label: "50 个 Soft 组件", isLeaf: true },
              ],
            },
          ]}
        />

        {/* 带 ζ = 0.55 阻尼手感的粉纸按钮 */}
        <SoftButton tone="blossom" onClick={() => console.log("保存标本")}>
          保存水彩标本
        </SoftButton>
      </div>
    </SoftCard>
  );
}
```

---

## 工作区包结构

仓库由 8 个高内聚、低耦合的子包组成，整体采用 MIT 开源协议：

| 模块包名 | 外部依赖 | 核心职责与设计约束 | 状态 |
|---|:---:|---|:---:|
| [`@ui-lib/core`](packages/core) | **零依赖** | 宿主与档位探测、共享调度时钟、指针数学、Kubelka-Munk 物理混色、宣纸毛细管生成器、资源注册表 | 稳定交付 |
| [`@ui-lib/shaders`](packages/shaders) | Three (peer) | Liquid Glass 材质、SDF 距离场字形着色器、渐变底板与通用 TSL 节点图 | 稳定交付 |
| [`@ui-lib/particles`](packages/particles) | Three (peer) | WebGPU Compute / WebGL2 Transform Feedback 双路径 GPU 粒子系统、力场仿真与发射器 | 稳定交付 |
| [`@ui-lib/post`](packages/post) | Three (peer) | 统一 TSL 后处理节点图、多档编译期质量预算、时间性历史累积 (TAA)、运动重投影 | 稳定交付 |
| [`@ui-lib/renderer`](packages/renderer) | Three (peer) | WebGPU / WebGL2 上下文初始化、Viewport/Section 双舞台编排、DOM 物理玻璃绑定 | 稳定交付 |
| [`@ui-lib/react`](packages/react) | Three (peer) | 50 个 `Soft` 语义化组件、`GlassStage` 渲染宿主、自研轻量浮动引擎、SSR 安全适配器 | 50 组件落地 |
| [`@ui-lib/motion`](packages/motion) | **零依赖** | $\zeta = 0.55$ 物理阻尼弹簧、滚动节拍、数值轨道；与 Core 挂载于同一帧调度时钟 | 稳定交付 |
| [`@ui-lib/dom`](packages/dom) | **零依赖** | 原生 DOM 文本尺寸测量、BMFont 几何排版与无框架基础命令式绑定 | 第一切片 |

> **无私有捆绑约束**：渲染相关包统一将 `three` 声明为 Peer Dependency，绝不在包内私自捆绑 Three.js 副本；`@ui-lib/core`、`@ui-lib/motion` 与 `@ui-lib/dom` 保持对框架的完全独立。

---

## 质量门禁矩阵

UI-Lib 秉持**以可证伪的退出码为准**的自动化质量体系。全套门禁严格杜绝“永远全绿的瞎探针”，分为静态逻辑门禁与真机物理图形门禁：

```bash
pnpm verify          # 静态全量门禁：lint → test → typecheck → size → api → templates → cascade
pnpm verify:device   # 静态门禁 + 真机 WebGPU/WebGL2 着色器与管线编译门禁
```

| 门禁命令 | 覆盖范围与断言目标 | 门禁性质 |
|---|---|:---:|
| `pnpm lint` | Biome 静态语法与风格扫描，全仓 0 错误 | 静态自动化 |
| `pnpm test` | **42 个测试套件 / 530 项单元测试**，100% 绿灯全覆盖 | 逻辑自动化 |
| `pnpm typecheck` | 全工作区 9 个包 TypeScript Strict 严格编译，0 错误 | 静态自动化 |
| `pnpm size` | 7 个发布包严格受限于 `size-budget.json`，确保产物体积冗余 | 产物体积 |
| `pnpm check:api` | **50 个组件命名与 ARIA 契约审计**；208 个导出类型保持中立无私有命名泄露 | 规范守卫 |
| `pnpm check:templates`| CSS 模板字面量游离反引号扫描、同语句重复导入守卫 | 语法守卫 |
| `pnpm check:cascade`  | **738 条 CSS 规则层叠顺序分析**，断言修饰类严格不得早于基础规则生效 | 样式守卫 |
| `pnpm check:shaders`  | 真机环境下 12 张页面的着色器/管线编译审计（捕获 Tint IR Lowering 错误） | 设备图形门禁 |
| `pnpm check:post`     | TSL 后处理链实测校验，断言 Passthrough 像素残差 $< 1.0$ | 设备图形门禁 |
| `pnpm check:pixels`   | 断言 7 个旗舰页面的画布有效输出与玻璃面板几何对齐率 | 像素几何门禁 |
| `pnpm check:components`| 运行时组件树挂载、水墨调色板连线与明度自适应反差判定 | 渲染集成门禁 |
| `pnpm test:e2e`       | Playwright 17 项端到端验收：上下文丢失恢复、滚动钉住、CSS 降级路径 | 浏览器端到端 |

---

## 深度技术文档

- 📘 [**渲染管线缺陷剖析与真机调试复盘**](docs/internals/render-pipeline-debugging.md)：深度复盘 WebGL2 深度拷贝崩溃、WebGPU historyValid 误报、Post 链静默空转、自有 Render Target UV 翻转 4 大底层 Bug 的排查全过程，以及 CrystalText 剔除/双重 Alpha 故障与图形度量方法学。
- 📗 [**Soft 组件规范与 WAI-ARIA 体系指南**](docs/components/README.md)：详述 50 个 Soft 组件的角色定义、WAI-ARIA APG 键盘模型、焦点管理闭环与 $\zeta = 0.55$ 物理阻尼微交互规范。
- 📙 [**真实设备 GPU 基线与帧节奏记录**](docs/benchmarks/README.md)：Apple M3 Pro / Metal 等真实硬件环境下的 120 FPS / 60 FPS 帧间隔分布、掉帧统计与分辨率压力实测。
- 📕 [**演进路线图与架构里程碑**](docs/ROADMAP.md)：查看 P0（运行时可靠性）、P1（视觉上限与动效叙事）与 P2（生态与发布）的研发路线图。

---

## 许可证

本项目基于 [MIT License](LICENSE) 授权。
