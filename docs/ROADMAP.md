# UI-Lib 规划书

> 目标：一个**GPU 优先的 Web 视觉特效层** —— 3D、粒子、流体、折射、后处理、滚动叙事。
> 不是组件库（不做 Button / Card），而是"让普通开发者几行代码做出 Apple 官网级别、甚至在粒子/流体规模上远超它的效果"。
>
> 状态：**M0 地基、M1 液态玻璃、M2 粒子引擎、M3 后处理、M4 DOM 桥与滚动叙事均已有可运行切片**（更新于 2026-10-01）。
> 六个旗舰页已构建并部署上线，Playwright 语义验收在 headless Chromium 下 17 项通过；体积预算门禁与 CI 流水线已落地。
> 真机帧节奏测量已落地，第一份按 GPU 分桶的记录在 [`benchmarks/2026-10-01-apple-m3-pro.md`](./benchmarks/2026-10-01-apple-m3-pro.md)。**它立刻暴露了三个缺陷**：WebGPU 下 post 的时间性链路格式不匹配、`historyValid` 误报；强制 WebGL2 回退路径每帧抛异常。前两个已修（宿主 `RenderTarget` + `renderer.initRenderTarget()`；`framebufferCopyWouldFail()` 守卫）。修好崩溃后第三个显形：**WebGL2 的 post 链把背景世界整块打黑**，仍在 P0 待修。
> 下文是完整规划；M5 多框架与发布仍为待办。实现过程中与草案不同的决策记录在文末「实现记录」。

---

## 0. 定位与差异化

| 维度 | Apple 官网 / 现有 UI 库 | UI-Lib |
|---|---|---|
| 渲染 | CSS 3D、`backdrop-filter` 近似、预渲染视频 | 实时 WebGPU，自动回退 WebGL2 |
| 玻璃质感 | `backdrop-filter: blur()`（无折射、无色散） | 真实屏幕空间折射 + 色散 + 厚度 + 边缘高光 |
| 粒子 | 几百到几千（CPU / CSS） | **百万级**，物理全部跑在 GPU compute 上 |
| 后处理 | 无 | Bloom / 色散 / DOF / 运动模糊 / TAA 一条 TSL 管线 |
| 滚动 | CSS sticky + 视频 | DOM 与 WebGL 同帧、统一时钟驱动的滚动叙事 |
| 性能策略 | 手工适配 | 设备分级 + 运行时掉帧自动降级 + 离屏暂停 |
| API | 复制粘贴 demo | 声明式组件 + 命令式逃生舱，TypeScript 全类型、可 tree-shake |

三条不可妥协的原则：

1. **Progressive Enhancement（渐进增强）**：任何效果都必须有一个"没有 GPU 也能看"的降级形态（CSS / Canvas2D / 静态图），首屏不白屏。
2. **Deterministic Lifecycle（可确定性销毁）**：每个效果都是可 `dispose()` 的资源对象，禁止全局泄漏；这是绝大多数 demo 级特效库的通病。
3. **Accessible（可访问）**：`prefers-reduced-motion` → 静态降级；不劫持焦点、不破坏键盘导航与读屏。

---

## 1. 技术选型（及理由）

### 1.1 渲染底座：three.js `WebGPURenderer` + TSL ★推荐

- **版本**：three `0.186`（`three/webgpu` 入口）。r171 之后 WebGPU 是零配置的：WebGPU 可用就用，不可用自动回退 WebGL2。
- **着色器语言**：**TSL（Three Shading Language / Node Material）**。一套 node 图，编译期分别产出 WGSL 与 GLSL —— 这是唯一能"一份代码跨两个后端 + 两套后处理"的现实路径，避免维护两套 shader。
- **计算**：`compute()` + StorageBuffer（SoA 布局），WebGPU 下真 compute shader；WebGL2 下退化为 GPGPU ping-pong 纹理（数量级从 ~1M 降到 ~50–100k，但代码路径统一）。

**被否决的方案：**

| 方案 | 否决理由 |
|---|---|
| 裸 WebGPU 自研引擎 | 渲染管线/材质/加载器/数学库一切自建，工期以年计；且必须自己写 WebGL2 回退（≈ 重写一个 three）。 |
| OGL（1.0.11） | 极轻，但无 compute、无 TSL、无生态、无回退，做不出"百万粒子"。 |
| 纯 CSS / Canvas2D | 上限不够，做不到折射与粒子规模。 |
| Babylon.js | 能力强但体积与心智负担重，前端 UI 领域生态弱。 |

### 1.2 框架层

- **核心完全框架无关**（纯 TS，零框架依赖），保证能同时服务 React / Vue / Svelte / 原生。
- React 适配基于 **R3F 9.8**（已支持 WebGPU：`gl` 接受异步工厂返回 `WebGPURenderer`，需 `extend(THREE)` 让 node material 作为 JSX 元素）。
  - ⚠️ 已知坑（须绕开）：drei 的 `<Text>`（troika 通过 `onBeforeCompile` 打补丁）在 WebGPU 下崩溃；`@react-three/postprocessing`（pmndrs/postprocessing 只面向 WebGLRenderer）不能用。
  - → 对策：**后处理自研（TSL 节点链）**；**文本自研 MSDF**（顺带支持逐字揭示动画，比 drei Text 更强）。
- 同时提供**不依赖 R3F 的命令式 API**（`createEffect(el, options) => handle`），给非 React 用户和"只想要一个特效、不想引入 R3F"的场景。

### 1.3 动画 / 滚动 / 状态

- **不把 GSAP 或 Motion 作为核心依赖**。理由：两个独立 ticker 会造成帧撕裂与 GPU/CPU 时钟不一致。
  - 核心自研：`@ui-lib/core` 提供统一帧调度器（单 rAF、优先级队列、固定步长累加器、可见性/离屏暂停）+ spring 求解器 + 时间轴。
  - 互操作层：提供 GSAP / Motion 的 adapter，把它们的补间挂到我们的 ticker 上（可选依赖，peerDependency）。
- **滚动**：`@ui-lib/motion/scroll` 自研（smooth scroll + 视口进度 + 吸附），API 兼容 Lenis 心智模型；不引入 Lenis 作为硬依赖，但提供一行接入。
- 状态：核心用普通类 + 事件；React 侧用 `useSyncExternalStore`，不引入 zustand 作为运行时依赖。

### 1.4 工程栈

| 用途 | 选择 | 备注 |
|---|---|---|
| 包管理 | pnpm workspaces | `packageManager` 已锁 `pnpm@12.6.0`；Node 22 自带 corepack，`corepack enable pnpm` 即可 |
| 任务编排 | Turborepo | 缓存 build/test/lint |
| 构建 | tsup（esbuild）→ 后续评估 rolldown | ESM-only + 类型，多入口 preserve structure 保证 tree-shaking |
| 语言 | TypeScript strict，`.d.ts` 随包 | 面向用户的核心卖点之一：全类型 + JSDoc 悬浮提示 |
| 文档站 | Vite + 自研 Playground | 每个效果一个"可调参数 + 实时预览 + 一键复制代码"的页面，胜过 Storybook 的静态展示 |
| 测试 | Vitest（单元/数学/shader 编译快照）+ Playwright（语义 + 交互 + FPS/掉帧属性断言）+ 真机测量脚本（`scripts/measure-device.mjs`，不进 CI） | 视觉回归基线按 GPU/后端分档；真机数字按 GPU 分桶记录在 `docs/benchmarks/` |
| 质量门禁 | size-limit（每包体积上限）+ bundle 分析 + CI 全绿 | 特效库最怕"为了一个玻璃效果拖进 600KB" |
| 发布 | Changesets + npm provenance | 语义化版本、自动 changelog |
| 代码风格 | Biome（format + lint） | 比 eslint+prettier 快一个量级 |

---

## 2. 包结构（分层架构）

```
@ui-lib/
├─ core          运行时基座（零框架依赖）
│   ├─ device/       能力探测：WebGPU? 最大纹理/StorageBuffer、核心数、内存、刷新率、reduced-motion
│   ├─ quality/      设备分级 Tier(0..3) + 运行时 FPS 监控 + 自动降级策略 + 手动覆盖
│   ├─ scheduler/    统一帧调度器：单 rAF、优先级(compute→update→render→dom)、固定步长、可见性暂停
│   ├─ clock/        统一时钟（音频/视频/动画/scroll 全对齐）
│   ├─ resource/     Lifecycle / Disposable 池、GPU 资源登记表、内存预算
│   ├─ math/         spring、阻尼、缓动、noise（CPU 版，与 shader 版参数一致）、插值、曲线
│   └─ events/       指针/滚轮/手势归一化（Pointer Events + 速度/惯性）
│
├─ shaders       TSL 材质库（依赖 core + three peer）
│   liquid-glass / dispersion / iridescent / aurora-flow / gradient-mesh /
│   caustics / holographic / matcap-x / sheen / fresnel-rim / displacement / sdf-text
│
├─ particles     GPU 粒子引擎
│   SoA StorageBuffer、compute 更新核、Emitter(点/球/盒/锥/圆/网格/SDF 表面)、
│   ForceField(重力/阻力/风/涡旋/curl noise/吸引子/SDF 碰撞/纹理场)、
│   Trail、InstancedSprite / InstancedMesh、颜色-生命周期曲线、可选 CPU 回读
│
├─ post          后处理链（全 TSL，WebGL2 可降级子集）
│   bloom / chromatic-aberration / bokeh-DOF / motion-blur / grain / vignette /
│   TAA / 降采样链 / 自定义 pass 插槽
│
├─ motion        动画层
│   timeline / spring / gesture / scroll-linked / FLIP 布局过渡 / 字符级文本揭示 /
│   stagger / 序列编排
│
├─ dom           DOM ↔ GPU 桥
│   element→texture（HTML 快照进 3D）、3D→DOM 跟随（Html bind）、
│   图片/页面转场、磁吸光标、marquee、magnetic button、view-transition 集成
│
├─ react         React 适配（R3F 组件 + 无 R3F 的 hooks + 命令式 handle）
├─ vue           （M5）Vue 3 适配
├─ svelte        （M5）Svelte 5 适配
└─ cli           （可选）脚手架 + 材质/粒子"配方"生成器
```

**分层铁律**：`core` 无框架、无 three 依赖；`shaders/particles/post` 只依赖 `core` + `three`(peer)；`motion/dom` 只用 `core`；适配层放最后。任何反向依赖都是 bug。

---

## 3. 六个旗舰 Demo（对标 Apple，并在规模上超越）

1. **LiquidGlass Pro** —— 真·折射玻璃：屏幕空间折射 + 色散（RGB 分离）+ 厚度/边缘高光 + 粗糙度 + 环境反射；可"贴"到任意 DOM 元素上（不是 `backdrop-filter` 的近似）。
2. **Aurora Flow** —— curl-noise 流场 + 鼠标涡旋 + 颜色生命周期；WebGPU 走 native compute，WebGL2 自动切 transform feedback。当前旗舰页跑固定 36k，`count: "auto"` 按后端分配 WebGPU 1M / WebGL2 80k——**1M @60fps 尚未在基准机实测，不作为已完成能力宣称**。
3. **Glass Product Hero** —— PBR 产品展示 + 环境反射 + 完整后处理链（bloom/CA/DOF），滚动驱动拆解与相机路径。
4. **Scroll Cinema** —— DOM 与 WebGL 同帧同步的滚动叙事：元素钉住、相机路径、章节玻璃。MSDF 逐字揭示与分屏转场仍未做。
5. **Cursor Field** —— 光标驱动粒子/流体拖尾 + 磁吸 UI + 悬停形变，做"交互手感"。
6. **Wake** —— per-particle 短期位置历史 + 档位预算裁剪，不是跟着指针走的 ribbon。`intensity` 0.46。

每个 Demo 同时是**文档站的一页 + 一个回归测试用例 + 一个性能基准**。

---

## 4. 关键难点与对策

| 难点 | 对策 |
|---|---|
| 跨后端 shader 维护成本 | 全部 TSL，禁止手写裸 GLSL/WGSL（除非在 `shaders/raw/` 且带双份实现）；CI 里对两个后端各编译一次做冒烟测试 |
| 低端机 / 老设备炸掉 | 启动即探测 → Tier 0..3（粒子数、DPR 上限、后处理开关、shader 精度）；运行时滑动窗口 FPS 监控触发逐级降级；电池/省电模式与隐藏 tab 直接停帧 |
| 首屏成本（three ~600KB） | three 作为 peer + 动态 `import()`；shader 离屏预热编译；**先渲染 CSS/Canvas2D 降级版，GPU 就绪后无缝升级** |
| SSR / 水合 | 模块顶层禁止触碰 `window`/`document`；所有能力探测延迟到 `mount()`；Next.js/Nuxt/SvelteKit 各写一个 example |
| 文本在 WebGPU 下崩溃 | 自研 MSDF 文本（SDF 图集 + TSL 材质），顺带获得逐字揭示、描边、液态扭曲 |
| R3F 生态不兼容 | 不用 drei 的 Text / postprocessing；自研等价物并做成我们的差异化能力 |
| 内存泄漏 | 统一 `Disposable` 注册表 + `mount/unmount` 对称；Playwright 用例断言"来回挂载 50 次后 GPU 资源计数归零" |
| 包体积失控 | 每个效果独立入口 + `sideEffects: false`；size-limit 卡在每包 gz 上限；three 与适配层全部 peer/optional |
| 可访问性 | `prefers-reduced-motion` → 静态终态；DOM 语义与焦点顺序不受 canvas 影响；所有装饰性 canvas `aria-hidden` |
| 视觉回归不稳定 | 按 (OS, GPU 后端, 浏览器) 分桶存基线；允许像素阈值 + 只比对关键帧；提供 `--update-baseline` |
| 语义测试抓不到渲染故障 | 帧回调抛异常不影响 DOM 断言——强制 WebGL2 每帧抛 `TypeError` 而 17 项全绿的实例已在 [`benchmarks/2026-10-01-apple-m3-pro.md`](./benchmarks/2026-10-01-apple-m3-pro.md) 记录。用例必须额外断言 `pageerror` 为空、`data-ui-lib-backend` 是真实后端、以及 render target 在帧末已解绑 |
| 真机数字不可复现 | 帧间隔由测量脚本自己的 rAF 循环采样，不读运行时计数器；只把 `p50` 与"是否出现 16.7 ms 台阶"当基线，`max` 与超标帧计数不入门禁 |

---

## 5. 里程碑路线图

> 每个里程碑都交付**一个能在浏览器里看到的东西**，而不是纯基建。

### M0 · 地基 ✅ 已完成
- pnpm workspace + tsup + Biome + Vitest（typecheck / lint / test / build）；Turborepo 与 CI 等包数量上来后补
- `@ui-lib/core`：`device` 探测、`quality` 分级、`scheduler` 单帧循环、spring/缓动、指针事件归一化、`Disposable`
- 文档站骨架（Vite）：路由、Playground 壳子、"降级形态"指示灯（当前跑在 WebGPU / WebGL2 / CSS）
- **验收**：一个页面显示"当前后端 + Tier + 实时 FPS + 三个同步动画"，能手动切降级档位

### M1 · 第一颗明珠：液态玻璃 ✅ 已完成
- `@ui-lib/shaders`：liquid-glass（折射/色散/厚度/边缘高光/粗糙度）+ 辅助的 environment、fresnel
- `@ui-lib/renderer` + `@ui-lib/react`：`createGlassLayer().register(el, opts)` / `<GlassStage>` + `<GlassPanel>`
- Demo：把玻璃贴到真实 DOM 卡片上；CSS `backdrop-filter` 降级版
- **验收**：TSL 图构建 / typecheck / 单测已通过；真实 WebGPU/WebGL2 画面快照与 reduced-motion 浏览器回归待可用浏览器环境

### M2 · 粒子引擎 🚧 首个可见切片已完成
- `@ui-lib/particles`：SoA storage buffers、compute / transform-feedback 更新、Emitter、ForceField（noise flow / vortex / attractor）、球/盒碰撞、颜色-生命曲线、速度热色与软精灵
- `@ui-lib/react`：`<ParticleField>`，粒子进入 `GlassStage` 的同一 canvas，DOM 玻璃可以折射粒子
- Demo **Aurora Flow** 首版已在 playground：24k 粒子；WebGPU native compute / WebGL2 transform feedback 自动切换
- `<ParticleField count="auto">`（options 里的 `count: "auto"`）已按后端选择 WebGPU 1M / WebGL2 80k；
  **下一小步**是基准机压测、动态 LOD 与 per-particle trail buffer。pointer→world ray 已在共享 scheduler 上。Aurora Flow 旗舰页用固定 36k 的 `fieldOptions("aurora")`，不把未经基准的 1M 写成完成
- **验收**：1M 粒子 @60fps（WebGPU 基准机）+ 掉落帧 < 1% + dispose 后资源归零

### M3 · 后处理与相机 🚧 首个链路已完成
- `@ui-lib/post`：TSL viewport chain 已交付 multi-scale separable bloom / wide halo / lens streak / chromatic aberration / grain / exposure / contrast / saturation / vignette / `shoulder` 高光肩 / depth-aware focus blur / directional motion blur / 16-step Halton full TAA / world-object velocity / depth history disocclusion / 3×3 variance clipping / reactive history rejection；支持 `quality: 1 | 2 | 3` 的编译期 tap budget，可通过 `GlassStage post` 动态改 uniform 或关闭，不重建 renderer。`LOOKS` 把 product / cinema / bright / quiet 收成命名 grade，`resolveLook` 让页面只覆盖相机项
- 静态 color / texture backdrop 且没有动态 world / pointer 时跳过整帧重绘与 history copy；auto quality tier 变化会同步重建 post graph tap budget
- 现在的链路作用于 backdrop + particles + liquid glass 的**已经合成画面**，仍然只有一个 canvas；RenderPipeline 负责最后一次 tone mapping / sRGB；history 在 resize / dispose 时显式清理
- 相机重投影已接入离屏 world depth：未抖动的 view-projection 在 CPU 求逆，历史偏移只乘深度遮罩；`cameraMotionBlur` 用注视点屏幕位移缩放作者给定的上限，不改 playground 的常量 motion blur。变形粒子场的 per-pixel velocity MRT 仍未做
- **下一步**：world-only per-pixel velocity MRT（复杂 deforming particle fields）、真正的多 pass bloom pyramid、自定义 pass 插槽。路径相机与 **Glass Product Hero** 已在 `/?demo=product-hero`（Lumen）：`look="product"`，`<Optics look="crystal" mote="quiet" />`，HTML 规格，pin 松开后文档继续。世界透镜采样同一张安静的工作室 equirect（`reflectVector` + `equirectUV`），强度在 `LENS_LOOKS`，Cinema 更弱。页面不传 cubemap
- **验收**：后处理链可拼装、可关闭；关闭前后不崩、不变色（色彩管线统一 sRGB）

### M4 · DOM 桥与滚动叙事
- `@ui-lib/motion` 第一切片已落地：`ScrollTrack` 在共享 scheduler 的 input 相位采样进度（无第二 rAF），`beatWeight` / `sampleTrack` 做章节与相机轨道。React 侧是 `<ScrollTrack>` + `<ScrollPin>`。
- `GlassStage mode="section"` 已落地：canvas 绝对定位在 stage 内，面板坐标相对该元素。默认仍是 `viewport`，避免破坏整页 playground。
- Demo **Scroll Cinema** 已从验收壳换成旗舰页（`/?demo=scroll-cinema`）：sticky pin、相机轨道、章节玻璃、会折光的世界透镜、滚出后文档继续。MSDF、FLIP 仍未做。磁吸已落地：`<Magnetic />`，共享 scheduler，不另开 rAF。HTML 逐词出现已落地：`<Reveal>`，同一时钟；这不是 MSDF。
- Demo **Liquid Glass Pro** 已从验收壳换成旗舰页（`/?demo=liquid-glass`）：同一个 section pin，三块命名玻璃贴在真实 DOM 上，后面一张套准纸作为世界物体走过。不是 element-to-texture，页面不传 cubemap。`GLASS_LOOKS.press` / `milk` 只加档位，不改已有 look 的静止亮度。
- `GlassLayer.createLensMaterial()` + `addWorldObject(..., { refractive: true })`，React 侧是 `<Lens />` 与 `<Optics />`。粒子 `depth="inside"` 只进入透镜拷贝，不盖住页面；`depth="front"` 在透镜之后绘制并做深度测试。光学常数在 `LENS_LOOKS` / `FIELD_LOOKS` / `GLASS_LOOKS`，页面不再抄一墙数字。Cinema 默认 `look="cinema"` + `crystal`，把高光压进肩部；`optic=flare` 仍是原来的热光学。透镜与 Lumen 共用一张工作室探针，Cinema 的 `environment` 更低。DOM 玻璃走同一张探针：`GLASS_LOOKS` 定强度，文字面比 bevel 弱。
- 世界物体跟随 DOM 槽位已落地（不是 element→texture）：`GlassLayer.worldAt` / `follow` 在 render 相位、相机更新之后、TAA jitter 之前把槽位中心解到世界坐标。`fit` 按槽位短边解距离，变焦不呼吸；`distance` 锁射线距离，推拉仍变大。挂锚的粒子在锚点之后 step，与透镜同一帧。不写 React state，粒子系统不因位移重建。Lumen 的空列和 Cinema 的空场都用它。`@ui-lib/dom` 的 HTML 快照、3D→DOM（Html bind）、图片转场仍未开始
- **验收**：滚动 60fps、DOM 与 WebGL 无抖动错位（像素对齐断言）、键盘/读屏可用。真机帧节奏已有第一份数据（DPR 1 六页全部锁 120 fps；DPR 2 中位帧间隔 8.3–8.5 ms，偶发 16.8 ms 台阶），像素对齐与键盘/读屏断言仍待补

### M6 · 真机基线暴露的三个缺陷 🔴 P0

真机测量（见 [`benchmarks/2026-10-01-apple-m3-pro.md`](./benchmarks/2026-10-01-apple-m3-pro.md)）暴露了三个既有缺陷，都不被现有测试覆盖。前两个已修，第三个是修好前两个之后才显形的。

1. **强制 WebGL2 回退路径每帧抛异常。** ✅ 已修。`packages/post/src/postProcessing.ts` 的 `captureDepth()` 把世界深度拷进 `new DepthTexture(1, 1)`——一个没有挂在任何 render target 上的裸深度纹理。three 的 WebGL 后端把深度拷贝实现为两个纹理各自 render target 的 framebuffer 之间的 `blitFramebuffer`，裸纹理的 `renderTarget` 是 `undefined`，`backend.get(undefined)` 触发 `WeakMap.set(undefined, …)` 抛 `TypeError`。抛出点在 `setRenderTarget(backdropRT)` 与 `setRenderTarget(null)` 之间，render target 因此永远停在被绑定状态：此后每帧都画进离屏目标，`reportStats()` 被跳过导致所有观测属性为空。
   **修法**：给 history 深度纹理配一个只作宿主、从不被绘制的 `RenderTarget`，并在拷贝前用 three 的公开方法 `renderer.initRenderTarget(host)` 预建它的 framebuffer。**`setRenderTarget(host)` 不够**——它只设 `_currentRenderTarget`，不会走 `_textures.updateRenderTarget()` / `_renderContexts.get()` / `backend.initRenderTarget()`，framebuffer 根本不会建，深度纹理也不会被登记。`initRenderTarget` 在 three 内部没有任何调用点，专供调用方预建。WebGPU 后端是真正的纹理对纹理拷贝、不需要宿主，所以这份分配只在 WebGL 路径上真正生效。
   **验证**：`Invalid value used as weak map key` 从 693 次降到 0，`data-ui-lib-backend` 由 `unknown` 恢复为 `webgl2`，`tier=3`、`fps=120.0`。
2. **WebGPU 下 post 的时间性链路没有真正生效。** ✅ 已修。`commit()` 把 canvas 格式（`bgra8unorm`）的 `FramebufferTexture` 交给 `copyFramebufferToTexture`，而当前绑定的是 post 链的半浮点中间目标（`rgba16float`）。three 在格式不匹配时只警告并返回，不做拷贝，随后 `historyValid` 仍被置 1。同一路由下另有一个 render pipeline 因 Tint 编译器错误（`swizzle view instruction still has usages after lowering`）编译失败。
   **修法**：新增 `framebufferCopyWouldFail()`，逐字镜像 three 自己的源上下文查找（`_currentRenderContext` → `_renderTarget` → `_getFrameBufferTarget()`，**不是** `getRenderTarget()`——后者在渲染管线内部目标仍绑定时报 null），在拷贝会被拒绝时把 `historyValid` 置 0 并 return。声明一份不存在的历史比不声明更糟。
   **验证**：诊断输出与 three 的警告逐字一致（`source= rgba16float dest= bgra8unorm`），警告从 698 行降到 10 行（每秒约 115 次 → 1 次；剩下那次是首帧帧缓冲纹理尚未登记、无法判定格式，保留原行为）。
3. **WebGL2 下 post 链把背景世界整块打黑。** 🔴 未修。第 1 条修好后崩溃消失，但强制 WebGL2 的页面只剩 DOM 与玻璃面板，透镜、晶体、辉光、轨道线全都不见了——GPU 世界整块缺失。用"临时关掉 post 链"的决胜实验定位：关掉后世界正常出现，说明 **WebGL2 的世界渲染本身是好的，是 post 链把背景打黑**（临时补丁已撤销，`git diff packages/renderer/src/glassLayer.ts` 为空）。这条推翻了此前"崩溃导致黑屏"的表述：崩溃与黑屏是两个独立问题。
   **待决**：是 post 链在 WebGL2 上的合成顺序 / 目标绑定有误，还是某一步 pass 在 WebGL2 上静默失败（`rgba16float` 中间目标在 WebGL2 上是否真的可渲染、TAA / bloom 的哪一步吃掉了背景）。

- **验收**：强制 WebGL2 的页面零 `pageerror`、`data-ui-lib-backend` 为 `webgl2`、背景世界可见；WebGPU 控制台无 `copyFramebufferToTexture` 警告；两条路径都能给出 `docs/benchmarks/` 记录
- **已达成**：零 `pageerror`、`backend=webgl2`、WebGPU 无格式警告；**未达成**：WebGL2 背景世界可见、WebGL2 的 `docs/benchmarks/` 记录

### M5 · 多框架与发布 🚧 工程门禁已就位
- Vue / Svelte 适配、SSR examples（Next / Nuxt / SvelteKit）
- 文档站完整化：配方库（Recipes）、参数面板、复制即用的代码片段
- ✅ 体积预算自动化（`size-budget.json` + `pnpm size`，已并入 `pnpm verify`）
- ✅ CI 流水线（`.github/workflows/ci.yml`：verify job + browser job）
- 待办：Changesets 版本管理、CI browser matrix、npm provenance、CHANGELOG、发布 0.1.0
- **验收**：三个框架各一个 example 可跑；`npm i @ui-lib/react` 后 5 行代码出效果

---

## 6. 建议立刻动手的"垂直切片"

**M0 + M1 一起做**，一次性打通"仓库 → core → shader → API → 文档站 → 能看的 Demo"整条链路：

1. 建 monorepo 骨架与 CI；
2. 实现 `core`（能力探测 / 分级 / 帧调度 / spring）；
3. 实现 liquid-glass 材质（TSL）；
4. 包一层 vanilla + React API；
5. 文档站里跑起来，并给出 `backdrop-filter` 降级版对比。

这条链路通了之后，M2/M3/M4 就是"往同一个管道里灌内容"，风险和未知骤降。

---

## 7. 开放问题 → 已确认

1. **框架优先级**：React 优先（核心框架无关，适配层先只做 React，Vue/Svelte 留到 M5）。
2. **渲染底座**：three.js 作为 peer 依赖，站在 r186 + TSL 生态上。
3. **第一个旗舰效果**：液态玻璃（折射 + 色散）。
4. **下一步**：直接开工做垂直切片（M0 + M1 一起做）。

---

## 8. 实现记录（M0 + M1 落地时与草案的差异）

记录这些是因为它们都是"只有真写了才会撞上"的坑：

1. **折射源改用 `viewportSharedTexture()`，放弃自建 RenderTarget。**
   原计划"先把背景渲进 RT，再让玻璃采样 RT"，但渲染目标纹理在 WebGPU / WebGL 两套后端下的
   采样朝向约定不一致（WebGPU 的纹理原点在左上，WebGL 的在左下），草案里没有可靠的办法在
   Node 侧验证。而 `viewportSharedTexture()` 是 three 官方示例走过的路径，且它的
   `updateBefore` 按 **renderId** 去重 —— 只要背景和玻璃分成两次 `render()` 调用，
   **无论多少个玻璃面板，每帧都只做一次帧缓冲拷贝**。顺带还省掉了一次背景绘制。

2. **`pnpm` 未预装**，用 `corepack enable pnpm`（Node 22 自带 corepack）装到 12.6.0。
   注意 pnpm 12 把 `onlyBuiltDependencies` 改名为 **`allowBuilds`**（写在
   `pnpm-workspace.yaml`），否则 esbuild 的 postinstall 被跳过，Vite / tsup 起不来。

3. **Turborepo 暂缓。** 先用 `pnpm -r` 递归脚本，等包数量上来再引入，减少初期故障面。

4. **`three` 不带类型定义**，需要 `@types/three`（0.186 已覆盖 `three/webgpu` 与 `three/tsl`
   两个子路径，TSL 的 node 类型相当完整：swizzle、泛型 `Node<"vec2">`、方法链都有）。

5. **TSL 的两个坑**：
   - 一个 `TextureNode` 只能带一个 uv，所以 N 次采样需要 N 个节点（共享同一个纹理对象，
     换纹理时逐个改 `.value` 即可）；
   - `vec3(0)` 的推断类型是 `VarNode<...>` 而非 `Node<"vec3">`，用 `let` 累加采样时必须显式
     标注类型，否则后续赋值报 TS2322。

6. **质量分级改变模糊采样数时需要重建材质**（tap 数是编译期常量，进到循环展开里）。
   层里已实现 `rebuildPanelMaterials()`，tier 变化会自动重建并沿用当前参数。

7. **浏览器验证已可用，但只到语义层。** 早期这个沙箱里 Playwright 的浏览器 CDN 不可达、系统依赖也装不了，所以验证只能靠 Node 侧 TSL 图构建冒烟 + 全量 `tsc` + 单测。现在 headless Chromium 已装好，`pnpm test:e2e` 17 项通过，覆盖六个页面的降级与 GPU 路由、滚动轨道、section pin、reduced motion 与 context loss 恢复。但仓库里**没有截图 baseline**，文件里也**没有** `toHaveScreenshot`——它证明的是 DOM、降级路径和生命周期契约，不是真机像素。真机 WebGPU / WebGL2 截图矩阵与 FPS 结论仍待有 GPU 的机器。

8. **M2 粒子不再另开 renderer。** `@ui-lib/particles` 只负责 GPU 状态、compute kernel
   和 sprite material；`GlassLayer.addParticles()` 把它挂到同一个 renderer / scheduler / canvas，
   先执行 compute，再把粒子画到 backdrop 之后、glass 之前。这样液态玻璃天然折射粒子，且
   页面永远只有一个 GPU context。

9. **WebGL2 粒子走 three r186 的 transform-feedback backend。** 不是 CPU 模拟的假 fallback；
   同一份 TSL compute graph 在 WebGPU 是 native compute pass，在 WebGL2 fallback 是
   transform feedback。粒子默认 80k，demo 刻意用 24k 留出玻璃和低端设备余量；1M 基准和动态
   LOD 仍属于 M2 的后续验收，不把未经浏览器验证的数字写成已经完成。

10. **M3 后处理作用于已经合成的 canvas，而不是重新渲染一遍 scene。** `@ui-lib/post` 用
    `viewportTexture()` 抓取 backdrop → particles → glass 的当前 framebuffer，TSL 图做 bloom /
    chromatic aberration / grain / vignette，再由 three `RenderPipeline` 输出。这样仍是一个
    canvas，也不会破坏玻璃在前一 render call 里读取 `viewportSharedTexture()` 的折射语义。
    中间帧暂时切到 working-linear，最终只做一次 tone mapping / sRGB transform；当前已经加入
    history texture、16-step Halton world-camera jitter、depth-aware focus blur、world-object
    screen velocity、conservative history clamp 与 reactive rejection；world-depth mask 只对
    depth-backed world fragments 做 jitter + velocity reprojection，避免把稳定的 DOM glass 整帧
    拖动。当前 TAA 已拥有 colour/depth history、disocclusion rejection 与 variance clipping；
    per-pixel velocity MRT 与 full multi-pass bloom pyramid 继续沿用这个插槽。

11. **world object 也复用 particle scene 与统一 scheduler。** `GlassLayer.addWorldObject(object,
    onFrame)` 给 3D demo 一个受控插槽：对象在 backdrop 之后、glass 之前绘制，DOM 仍然保持真实
    HTML；动画回调走 scheduler 的 update priority，不允许 demo 自己偷偷开第二个 rAF。

12. **DOM 槽位跟随不采样 framebuffer，也不猜世界坐标。** `worldAt` 用当前 `particleCamera.unproject`
    把客户区像素打到 `z = plane`。`follow` 在 `frame()` 里、`syncViewport` 之后、jitter 之前调用，
    所以相机写在 update 相位也不会让透镜晚一帧。平行光或命中在相机背后时保留上一个点。

13. **深度历史不走 `copyFramebufferToTexture`。** 那条 API 拷的是当前绑定的 framebuffer。WebGPU 上颜色附件和深度纹理格式对不上时，拷贝被拒绝，历史一直是空的，控制台每帧报 `rgba16float` / `bgra8unorm`。历史深度改成和世界深度同一份 `DepthTexture` 设置，用 `copyTextureToTexture`。格式仍然不同就直接抛错，不再沉默失败。

14. **首页粒子和 Cinema 章节是结构问题，不是再调亮度。** 首页云的 `boundsCenter` 在标题右侧，曝光下调。Cinema 章节窗口重叠到最亮权重始终 ≥ 0.6；0.02 的重叠配 0.07 的 fade 仍然会空。Lumen / Cursor Field / Aurora 的静止亮度没动。

15. **粒子预算是前缀，不是重建。** `resolveParticleLod` 把作者数量当上限，档位预算和隐藏的 stage 只降低 `active`。`count: "auto"` 按当前预算分配，不再无条件要 1M。历史轨迹默认关闭：`trail.length` 才分配每粒子的样本环，最新一段每帧拉伸，stride 才落下一笔。这不是 Cursor Field 的指针 ribbon。Wake（`/?demo=wake`）用它。旗舰页跑的是固定 36k 与 9k，不是 `count: "auto"` 的百万级配置——1M @ 60fps 仍未测。

16. **第 13 条只修了 WebGPU，把 WebGL2 修坏了。** 那条把历史深度从 `copyFramebufferToTexture` 换成 `copyTextureToTexture(worldDepth, historyDepth)`，在 WebGPU 上成立——那边的 `copyTextureToTexture` 是真正的纹理对纹理拷贝。但 three 的 **WebGL** 后端把深度拷贝实现为两个纹理各自 render target 的 framebuffer 之间的 `blitFramebuffer`，而 `historyDepth` 是一个 `new DepthTexture(1, 1)`，没有 render target，`renderTarget` 为 `undefined`，`backend.get(undefined)` 让 `WeakMap.set` 抛 `TypeError`。更糟的是抛出点夹在 `setRenderTarget(backdropRT)` 与 `setRenderTarget(null)` 之间，render target 停在离屏目标上，之后每帧都画不出去，`reportStats()` 也永远执行不到。

    教训不是"不要用 `copyTextureToTexture`"，而是**两条后端路径必须分别验证**：这条改动只在 WebGPU 上跑过，而当时的验收用例只断言 DOM 语义，帧回调抛异常不影响任何断言。真机测量脚本在两条路径上都抓到了它。同一轮测量还发现 WebGPU 自己的 `commit()` 仍在走第 13 条已经记为失败的 `copyFramebufferToTexture` 路径，并在拷贝被拒绝后把 `historyValid` 置 1。

17. **预建 framebuffer 要用 `renderer.initRenderTarget()`，不是 `setRenderTarget()`。** 修第 16 条的第一次尝试是给历史深度配一个宿主 `RenderTarget` 然后 `renderer.setRenderTarget(host)`——无效，`Invalid value used as weak map key` 仍然是 693 次。原因是 `setRenderTarget` 只写 `_currentRenderTarget`，不会触发 `_textures.updateRenderTarget()` → `_renderContexts.get()` → `backend.initRenderTarget()` 这条链，framebuffer 从未被创建，深度纹理也没被登记进 `backend` 的纹理表，blit 查找照样落空。改成 three 的公开方法 `renderer.initRenderTarget(host)` 后立刻归零——这个方法在 three 内部没有任何调用点，专供调用方预建 framebuffer。附带约束：`RenderTarget.setSize()` 只缩放 `textures[]`，不同步 `depthTexture`，所以深度尺寸要单独跟踪；`options.count` 必须 ≥ 1，否则 `getCacheKey` 读 `texture.format` 会崩。

    第二条修法是**镜像 three 自己的查找顺序，而不是猜**。WebGPU 的 `copyFramebufferToTexture` 在源 / 目标格式不一致时只警告并返回，没有返回值也没有异常。我第一版守卫直接读 `getRenderTarget()`，诊断出来 `source= bgra8unorm dest= bgra8unorm`（看起来匹配、于是放行），而 three 实际报的是 `rgba16float` / `bgra8unorm`。原因是 `Renderer.copyFramebufferToTexture` 用的是私有 `this._currentRenderContext.renderTarget`，并且有 `_currentRenderContext` → `_renderTarget` → `_getFrameBufferTarget()` 三级回退；`getRenderTarget()` 在渲染管线内部目标仍绑定时报 null。逐字照抄这条链之后，诊断输出与 three 的警告一字不差，警告从每秒约 115 次降到 1 次。

    两条修复都**只在真机上验证过**，没有留下回归断言——现有 17 项语义验收既不检查帧回调是否抛异常，也不检查画面是否整块缺失。补断言列为 M6 待办。
