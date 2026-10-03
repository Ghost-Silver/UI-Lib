# UI-Lib

**面向 Web 的 GPU 优先动效与视觉效果运行时。**

UI-Lib 把实时 Liquid Glass、GPU 粒子、3D 场景和 TSL 后处理带到普通网页界面中，目标是服务于产品 Hero、滚动叙事、交互表面和沉浸式展示，而不是用 canvas 替代语义化 HTML。

> **状态：实验性 `0.0.1`。** 渲染底座、Liquid Glass、GPU 粒子、TSL 后处理、section stage 和共享时钟都已落地。六张旗舰页都已接上文档站。Node 侧 typecheck 与 Vitest 不能代替真机画面——真机画面已经有了按 GPU 分桶的记录（[`docs/benchmarks`](docs/benchmarks/README.md)），它暴露出的**四个缺陷现已全部修复**，其中最关键的一条是**post 链在两条后端上其实都没在干活**（WebGL2 画面全黑，WebGPU 的管线根本编译不过、链路静默空转），修好之后又暴露出**自有 render target 的 UV 上下翻转**。修复后复测：WebGPU 在 2880×2000 上六页守住 120 fps，WebGL2 在同分辨率下明显吃不住。细节见[真机基线](#3-真机基线)。

[在线演示](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run) · [路线图](docs/ROADMAP.md) · [交互 Playground](apps/docs) · [P0 浏览器验收](tests/e2e) · [包结构](#包结构)

## 在线演示

六张旗舰页已经构建并部署上线，打开就能滑：

**https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run**

| 页面 | 链接 |
|---|---|
| Liquid Glass Pro | [`/?demo=liquid-glass`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=liquid-glass) |
| Lumen | [`/?demo=product-hero`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=product-hero) |
| Scroll Cinema | [`/?demo=scroll-cinema`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=scroll-cinema) |
| Cursor Field | [`/?demo=cursor-field`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=cursor-field) |
| Aurora Flow | [`/?demo=aurora-flow`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=aurora-flow) |
| Wake | [`/?demo=wake`](https://9222596184d8478fab867413d73b1698.sg2.agentos-app.run/?demo=wake) |

线上部署的是 `apps/docs` 的 `vite build` 静态产物，不是 dev server。`?fallback=1` 强制 CSS fallback，`?backend=webgl` 强制 WebGL2，用来对照降级路径。

## 当前情况

六张旗舰页都在文档站上。仍是一个 canvas、一个 renderer、一个 scheduler。字留在 HTML 里。页面不传 cubemap。没有宣称百万粒子 60 帧。

| 页面 | 地址 | 现在是什么 |
|---|---|---|
| Lumen | `/?demo=product-hero` | 产品页。section pin、相机轨道、`look="product"`、安静的 `<Optics mote="quiet" />`。这轮不再调亮度。 |
| Scroll Cinema | `/?demo=scroll-cinema` | 滚动叙事。钉住、章节窗口互相重叠，滚完松开。接缝不再整屏没字。MSDF 仍未做。静止亮度没动。 |
| Cursor Field | `/?demo=cursor-field` | 同一条射线驱动玻璃高光、短 ribbon 和粒子。手停后 ribbon 散掉，粒子走过去，不跳到指针上。静止时高光仍是圆，至多在移动时加 22% 强度。 |
| Aurora Flow | `/?demo=aurora-flow` | 整页流场，不是参数面板。`<ParticleField flow />` 把局部涡旋沿同一条射线走近。中心有一颗浅色的心，是换色，不抬 `intensity`。手快时涡流略变宽，停住回到原来的半径。后面有一层更暗、更慢的雾。字用 `<Reveal>`。 |
| Liquid Glass Pro | `/?demo=liquid-glass` | section pin。三块命名玻璃贴在真实 DOM 上，后面是一张会走的套准纸。`look="quiet"`。页面不传 cubemap。 |
| Wake | `/?demo=wake` | 每颗粒子自己的历史，不是指针 ribbon。笔画在标题右侧。`intensity` 0.46。档位预算会裁掉多出来的粒子，桌面档位盖得住现有页面。 |

文档站首页不是上表里的一页。粒子云和那颗小晶体都收在标题右侧，`intensity` 从 1.8 降到 0.62，`opacity` 从 0.82 降到 0.38，字留在渐变上。HUD 的 `Panels` 是「视口内 / 已注册」：这一页注册了 12 块玻璃，首屏通常只画到其中几块，其余在折线下面，不是预算没满。

验证到这一步：干净 clone 上先构建再测。`@ui-lib/*` 的入口指向被 gitignore 的 `dist/`，不构建就直接 `vitest` 会报 `Failed to resolve entry`。门禁是：

```bash
pnpm verify   # build → typecheck → test → size budget
pnpm lint
```

这一轮 `pnpm typecheck` 通过（8 个包），`pnpm test` 通过（18 个文件 83 项），体积门禁七个包全部在预算内。浏览器验收也跑起来了：headless Chromium 下 `pnpm test:e2e` 17 项全过，覆盖六个页面的降级与 GPU 路由、滚动轨道 0→1、section pin 与真实可聚焦链接、reduced motion、context loss 恢复。

它仍然是**语义**验收而不是像素门禁——仓库里没有 `toHaveScreenshot`——所以它证明的是 DOM、降级路径和生命周期契约，不是 Metal 或独显上真正画出了什么。

`.github/workflows/ci.yml` 把这两组检查接进了 CI：`verify` job 跑 build → typecheck → test → size → lint，`browser` job 在 headless Chromium 上跑同一套验收。browser job 自己带 8 分钟的全局上限，失败时会留下 HTML 报告与 trace 作为产物——因为卡死的浏览器不会往控制台输出任何东西。

## 下一步

Liquid Glass Pro 已经是旗舰页。还没做的是：

1. 把真机基线暴露出的四个缺陷补上回归断言（四个本身**已全部修复**）。现有 17 项语义验收抓不到帧回调异常、画面缺失，也抓不到"管线编译失败但每帧照跑"。真机着色器门禁（`pnpm check:shaders`）已经覆盖了最后一类，其余仍待补。
2. 1M @ 60fps 仍然没测。旗舰页跑的是固定 36k（Aurora Flow）与 9k（Wake），不是 `count: "auto"` 的百万级配置。动态 LOD 和 per-particle trail 已经在库里，Wake 用了它们。
3. WebGL2 在 DPR 2 上的帧节奏还没调过。六页里五页出现 120/60 Hz 双峰台阶，`aurora-flow` 的 `max` 冲到 750 ms（它同时被降到 tier 2，降档重建很可能是原因，但没做隔离实验）。
4. 跨浏览器与 GPU 设备矩阵：只有本机 Chromium / Apple M3 Pro 一个 bucket。

先不做：world-only velocity MRT、多 pass bloom、自定义 post 插槽、MSDF、element-to-texture、Vue / Svelte、配方库。也不再改 Lumen、Cinema、Cursor Field 和 Aurora 的静止亮度。

---

## 为什么需要 UI-Lib

Web 动效通常会在两种方案之间取舍：

- CSS 容易接入且保留可访问性，但 `backdrop-filter` 主要是模糊近似，无法提供真正的屏幕空间折射、共享 3D 世界或 GPU 粒子模拟。
- canvas demo 可以很漂亮，但经常带来多个 renderer、多个动画循环、不可访问的文本和不可靠的销毁路径。

UI-Lib 的取舍是：

- **DOM 仍然是 DOM。** 文本、链接、表单、焦点和布局留在语义化 HTML 中。
- **一个共享渲染运行时。** 一个页面使用一个 canvas、一个 renderer 和一个 scheduler 承载 UI-Lib 效果。
- **渐进增强。** 优先尝试 WebGPU，自动回退 WebGL2；没有可用 GPU、主动禁用 GPU 或用户要求 reduced motion 时，仍然保留 CSS / 静态形态。
- **只使用 TSL。** 材质和后处理使用 Three Shading Language 节点图，同一套 graph 编译为 WGSL 或 GLSL；不使用 raw GLSL/WGSL 绕开跨后端约束。
- **可确定的生命周期。** renderer、粒子系统、材质、几何体、监听器和 scheduler subscription 都有明确的 dispose 路径。

UI-Lib **不是** Button、Card、表单等通用组件库，而是这些界面下面的视觉运行时。

## 当前能力

### 已实现的渲染切片

#### Liquid Glass

- 真实 DOM 元素上的 Liquid Glass
- rounded-rectangle SDF 轮廓与 bevel shading
- 屏幕空间折射
- RGB chromatic dispersion
- frost / roughness 模糊
- edge highlight、fresnel、tint、specular
- pointer 高光

#### GPU 粒子

- WebGPU compute 路径
- WebGL2 transform-feedback 回退路径
- point、sphere、box、disc、ring、cone emitter
- gravity、drag、turbulence、vortex、attractor、bounds
- color-over-life、speed heat、soft sprite、additive blending
- 与 Liquid Glass 共享同一个 stage、renderer 和 scheduler
- `depth="scene" | "inside" | "front"`：粒子可以留在页面上、只活在透镜里，或画在透镜前面并被它挡住

#### TSL 后处理

- bloom、atmospheric halo、lens streak
- chromatic aberration、grain、exposure、contrast、saturation
- `shoulder`：只压缩大于 1 的高光，中间调不动。默认 0，所以未命名的 stage 不变色
- vignette、focus blur、directional motion blur
- Halton jitter temporal accumulation
- 离屏 world depth 上的相机重投影；`cameraMotionBlur` 只模糊写了深度的世界像素
- 世界透镜与 DOM 玻璃共用一张安静的工作室探针。透镜用世界反射，玻璃用透视射线加 bevel，文字面保持安静。页面不传 cubemap
- depth history、disocclusion rejection、variance clipping、reactive rejection
- `quality: 1 | 2 | 3` 编译期后处理预算
- 静态场景跳过重复 redraw 与 TAA history copy

#### 运行时

- WebGPU 优先、WebGL2 自动 fallback
- adaptive quality tier 与 FPS 采样降级
- 帧耗时、long frame、dropped frame 统计
- hidden tab 暂停共享 scheduler
- `prefers-reduced-motion` 支持
- 无 GPU 或显式关闭时的 CSS fallback
- WebGL context / WebGPU device loss 通知与 React stage 重建路径
- 逻辑资源登记表，可验证 renderer、layer、panel、particle、world object 和 post graph 是否释放

### 目前还不能宣称完成的能力

下面这些仍然是待完成项，而不是 README 中的营销承诺：

- 真机 **WebGL2** 视觉回归基线（WebGPU 侧已有第一份记录；回退路径的崩溃已修，但 post 链在两条后端上都还没在干活，那一组数字要等第三个缺陷修好后重测）
- 跨浏览器 FPS、掉帧和交互延迟门禁（只有本机 Chromium 一个数据点）
- 真实 GPU VRAM 统计与 device-specific benchmark（只有一个 GPU bucket）
- 变形粒子场的 world-only per-pixel velocity MRT（刚体相机重投影已有，不是完整速度缓冲）
- 可复用的真正 multi-pass bloom pyramid
- 自定义 post-pass 插槽
- DOM ↔ GPU bridge（element→texture、3D→DOM 跟随）
- 完整 timeline / gesture / MSDF；滚动进度与章节轨道已有第一切片
- MSDF text
- 完整动态 particle LOD 与 per-particle trail buffer 方案（Wake 已用第一切片：每颗粒子短期历史 + 档位预算裁剪）
- 最终版 imperative `createEffect()` API
- R3F、Vue、Svelte adapter
- Next.js / Nuxt / SvelteKit SSR 与 hydration example
- Changesets 版本管理、npm provenance 与 CI browser matrix（size budget 与基础 CI 已落地）

Playground 中的粒子数量是为了保证展示稳定而选择的工作负载。UI-Lib **不会**在没有真实设备基准的情况下宣称“百万粒子在所有 WebGPU 设备上 60 FPS”。

## 快速开始

要求：

- Node.js `>=20.19`
- pnpm `12.x`
- 加速路径需要支持 WebGPU 或 WebGL2 的浏览器

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:5173`。

执行仓库级验证：

```bash
pnpm verify   # build → typecheck → test → size budget
pnpm lint
```

`pnpm test` 自己也会先 `pnpm build`。包入口指向 `dist/`，跳过构建的话跨包测试解析不到。`pnpm size` 读 `size-budget.json`，按 raw 字节给七个包的 `dist/index.js` 与 `index.d.ts` 设上限，超了就以非零码退出。

执行浏览器验收：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test:e2e` 已在 headless Chromium 上跑通 17 项，覆盖六个 demo 的降级与 GPU 路由、滚动轨道、section pin、reduced motion 和 context loss 恢复。它仍然是**语义**验收而不是像素门禁——仓库里没有截图 baseline，文件里也没有 `toHaveScreenshot`——所以它证明的是 DOM、降级路径和生命周期契约。WebGPU device profile 和实际 FPS 结论必须在有真实 GPU 的机器上生成。

它有一个盲区值得单独记一笔：**它测不到帧回调有没有抛异常，也测不到画面是不是整块缺了，更测不到"管线编译失败但每帧照跑"。**（前两类现在由 `pnpm check:pixels` 覆盖，见下文；最后"画布在不在画"这一类也归它。） 强制 WebGL2 的页面曾经每帧抛一次 `TypeError`、画面不完整，而这 17 项依然全绿——因为 stage 照样到达 `ready`，canvas 照样存在，DOM 语义一条没坏。修复那个异常之后世界仍然缺失，17 项也仍然全绿。WebGPU 上 post 管线编译失败、链路静默空转，画面退化成未经后处理的原始合成，17 项同样全绿。详见[真机基线](#3-真机基线)。

### 着色器编译门禁

上面那个盲区现在有一个专门的门禁：

```bash
pnpm --filter @ui-lib/docs build
pnpm check:shaders              # 有头 Chromium + 真 GPU，六页 × 两条后端
pnpm check:shaders -- --demos wake   # 单页
```

它 patch `GPUDevice.prototype.createShaderModule` 与 `requestDevice`，把 three 从不读取的 `getCompilationInfo()` 结果、无人认领的 `uncapturederror` 事件、以及 `queue.submit` 的次数都收上来，然后逐页断言：没有失败的着色器模块、没有控制台失败模式、没有 page error、没有未捕获的 WebGPU 校验错误；WebGPU 侧还必须**确实创建过 device、创建过着色器模块、提交过命令缓冲**——一个什么都没渲染的页面是安静的，这几条让它无法靠沉默过关。

两条设计约束：

- **它刻意不进 CI。** Tint 的降级失败可以是**适配器特异**的：`swizzle view instruction still has usages after lowering` 在 Metal 适配器上稳定复现，而同一份 WGSL 在 SwiftShader 上通过。headless runner 没有 GPU，这个门禁会在那里长绿而什么也保护不了。改动画布合成或 node graph 之后，在真机跑 `pnpm verify:device` 再推。
- **探针本身要被证伪。** `pnpm check:shaders:self-test` 会喂给探针一段 Tint 解析不了的 WGSL、一个没人开 error scope 的非法 `createBuffer`、一次真实提交，然后要求三者都被记录到。如果它一条都没记到，说明门禁是瞎的，自检直接失败。一个只会说"全绿"的判定器没有价值。

### 像素门禁

上面那个盲区还有另一半：语义验收看不见画布。`pnpm check:pixels` 看画布，只断言两件结构性的事。

```bash
pnpm check:pixels                    # 七个页面，headless
pnpm check:pixels -- --demos iris    # 单页
pnpm check:pixels:self-test          # 探针是不是瞎的
```

1. **画布确实在画。** `ink` 是与该帧自身众数颜色不同的像素占比。什么都没渲染的页面 `ink` 接近 0，而 stage 仍然报 `ready`。
2. **玻璃在它自己元素的位置上。** 一次只隐藏一块面板，比较它矩形内的平均变化与矩形外的平均变化。位置正确时这个比值很高；画到别处时矩形内只剩外溢，比值塌下来。第 1 轮修掉的镜像 bug 在 `liquid-glass` 上把 3.60x 打到 **0.22x**，`scroll-cinema` 从 559x 掉到 **1.45x**，判据是 ≥1.6x。

四条实测出来的约束，写在这里免得下次再犯：

- **必须在冻结的页面上量。** 移除面板会让时间性累积历史失效，下一帧整幅闪变。位置检查因此跑在 `prefers-reduced-motion: reduce` 的页面上——库会停掉共享时钟，隐藏面板成为画面里唯一的变化。门禁顺带断言「冻结确实生效」，否则量到的是场景运动而不是玻璃。
- **要除以矩形外的变化，而不是数「变化落在哪」。** 面板消失会连带改变周围的泛光。早期版本用「落点比例」，修复版上就误报了四页；改成内外均值比之后外溢被约掉。
- **要一次只隐藏一块，不能一次全隐藏。** 全隐藏时只证明「信号落在这些矩形的并集里」——而一个**关于画布中心对称**的面板布局，镜像后映射到它自己，于是带 bug 也拿 0.95 分。`iris` 页正是这样漏过去的。
- **提高阈值没用。** 从 24 扫到 200，结果一模一样：外溢像素的幅度和面板像素相当，靠阈值分不开，只能靠除法。

**它可以进 CI，与 `check:shaders` 相反。** 两个断言都不依赖适配器：「有没有画出东西」和「画在不在元素位置」在 SwiftShader 上同样成立。它**不是**美学基线，判断不了玻璃好不好看——那仍然要靠真机上的 `measure` 与 `check:shaders`。

**它的边界，也一并写清楚**：如果一处错位恰好把面板映到它自己矩形附近（布局对称，或面板本就靠近镜像轴），这个判据看不见。它抓的是**整块挪走**这一类，而那正是实际发生过的 bug。

### 平台预算：第二个后端的接缝

Web 端的渲染预算原本只能**探测**：`detectCapabilities()` 读浏览器，`scoreTier()` 选档，`QUALITY_PRESETS` 填数字。一个不是浏览器的宿主没有东西可探——它知道自己有多少算力，直接说就行。

```ts
import { createGlassLayer } from "@ui-lib/renderer";

// Web：什么都不传，走探测。
await createGlassLayer({ parent });

// 非 Web 宿主：把数字说出来。
await createGlassLayer({
  parent,
  budget: {
    host: "ue5-metal",
    source: "declared",
    tier: 2,                                   // 只用来补没写的字段
    preset: { particleBudget: 900_000, allowCompute: true, maxPanels: 64 },
  },
});
```

React 侧直接传 `budget` 即可（`GlassStage` 的 props 就是 layer options）。页面上可以用 `?budget=declared` 看这条路径。

三条设计约束：

- **只钉住宿主写出来的字段。** `preset` 里没提的（`blurTaps`、`dprCap`、面板上限）仍然跟着档位走，所以一份声明式预算**不会冻结自适应降档**。反过来，宿主写了的字段在降档时也不会被改掉——它不是在猜。
- **声明压过探测。** 同时给 `budget` 和 `capabilities` 时以声明为准，因为说了数字的宿主不需要再猜一遍。
- **来源必须可见。** `data-ui-lib-budget-host` / `-budget-source` 暴露到 DOM，`stats.budgetHost` / `budgetSource` 暴露给代码。一条只在类型里的声明和一个真的限制，验收时要能分开。

```bash
?demo=iris                   # host=web           source=probed    tier=3
?demo=iris&budget=declared   # host=declared-demo source=declared  tier=2
```

#### 顺带发现：`maxPanels` 目前只是建议值

`QUALITY_PRESETS` 每个档位都声明了 `maxPanels`，但 `register()` 超限时**只打一条 warn 然后照常创建并渲染**——而那条 warn 写的是「new panel will not render」，是假的。已改成如实描述，并把超出的数量暴露为 `stats.panelsOverBudget` 与 `data-ui-lib-panels-over-budget`。

**没有在本轮强制执行**：强制执行会让每个注册数超过本档上限的页面掉面板（headless 环境稳定落在 tier 1，上限 8，而 Playground 注册 12），这需要七页逐页目视验证才能安全地改。先让它**可度量**，再谈约束。

### 命名约定与已知冲突

4.2 的命名审计做了一轮机器扫描：把三个 look 注册表的键、以及每个 `*Options` 接口的字段全部抽出来对比。结论是**光学参数名一路是一致的**——`refraction` / `dispersion` / `roughness` / `frost` / `tint` / `tintAmount` / `specular` / `shininess` / `fresnel` / `highlight` / `lightDirection` / `pointerStrength` / `pointerRadius` / `environment` 在 `GlassPanelOptions`、`LiquidGlassOptions`、`WorldLensOptions` 里含义相同、拼写相同。

look 的键**不追求同一套隐喻**，这是有意的：`crystal` / `flare` / `ice` / `ember` 是光学气质，`product` / `cinema` 是使用场景，`pill` / `milk` / `veil` 是材质形态。硬凑成一个家族只会让名字失真。真正要守的是**同一个概念不出现两个叫法**。

审计找出两处**同名不同义**，都属于危险的一类（比同义不同名更容易写出安静的 bug），记录在此，改名需要破坏性变更所以留待 1.0 之前统一处理：

| 名字 | 出现处 | 实际含义 |
|---|---|---|
| `size` | `LiquidGlassOptions.size` | 面板尺寸，**CSS 像素**，`[w, h]` |
| `size` | `ParticleSystemOptions.size` | 精灵尺寸，**世界单位**，`[min, max]` |
| `colors` | `GradientBackdropOptions.colors` | **4** 个颜色，按位置混合 |
| `colors` | `ParticleSystemOptions.colors` | **恰好 3** 个颜色，按生命周期混合 |

`ParticleSystemOptions.colors` 那个三元组是硬约束（着色器按 `life` 在三色间插值），不是惯例；写成四个不会报错，只会静默丢掉一个。

### 距离场字体 atlas

`evaluateMSDF` 写在 `@ui-lib/shaders` 里，一直正确、也一直没人用——**仓库里没有 atlas 给它采样**。这张 atlas 现在由脚本生成：

```bash
pnpm build:font-atlas                              # 默认 112 字形
pnpm build:font-atlas -- --chars "水彩卡片IRIS" --size 64
```

全过程本地完成，无字体解析器、无图像库、无网络：Playwright 用 Canvas2D 栅格化字形，8SSEDT 变换在页面里跑，PNG 由浏览器编码。产物是 `apps/docs/public/fonts/iris-sdf.{png,json}`，JSON 是 BMFont 兼容格式（多一个 `distanceField.distanceRange`）。

**它是 SDF，不是 MSDF，这个区别要说明白而不是含糊过去。** 真正的多通道距离场会给每个通道分配不同的边，让字的**尖角**在中值滤波后仍保持锐利；这里把同一个距离写进三个通道，那就是单通道场。着色器不用改也照样工作——三个相等通道的 `max(min(r,g), min(max(r,g), b))` 就是那个通道——但字形尖角会略圆。把不是它名字所声称的数据发出去，正是这个仓库反复重新发现的失败模式，所以文件叫 `-sdf`，JSON 里也写 `sdf`。

#### `pxRange` 只能推导，不能猜

`createTextMaterial` 的 `pxRange` 是文字这条链上**唯一一个错了也不报错**的数字：小了边缘锯齿，大了字发糊。

atlas 存的是 `0.5 - d / (2·range)`（`d` 为纹素距离），所以 `sigDist` 每个纹素变化 `1 / (2·range)`。每屏幕像素的纹素数是 `fwidth(uv) · scaleW`。而 `evaluateMSDF` 把 `fwidth(uv)` 乘以 `pxRange`，两者恰好相等当且仅当：

```
pxRange = scaleW / (2 · distanceRange)      # 随包 atlas 为 696 / 8 = 87
```

直接传 `distanceRange`（4）是最直觉的错法，会让字软大约四倍。这条推导有断言钉住（`packages/shaders/test/textMaterial.test.ts`）。

#### `CrystalText`

```tsx
const slot = useRef<HTMLDivElement>(null);

<CrystalText text="水彩" anchor={slot} size={0.85} color="#2a0f45" />
<div ref={slot} />
```

`size` 是**世界单位的高度**，不是像素。`createTextGeometry` 按 atlas 像素排版，组件的包围盒会把两者换算过来——早期的版本直接乘上去，把字符串铺到 370 世界单位宽，而相机整个视野只有约 4。

**它活在世界里，所以它前面的 DOM 玻璃会磨砂并折射它。** 这是库在正常工作，不是缺陷，也正是它读起来像「玻璃下的墨迹」而不是贴上去的覆盖层的原因。要让它被某块玻璃折，就把它放在那块玻璃后面。

**它不在文档里**，所以选中、翻译、读屏都拿不到它。旁边留一份真 HTML 的文字，或者让它纯粹作装饰并给槽位加 `aria-hidden`。

##### 找到它为什么一开始什么都不画，花了三轮

三个缺陷叠在一起，**其中两个完全静默**：

| 缺陷 | 为什么没被发现 |
|---|---|
| **背面剔除**：`createTextGeometry` 的四边形绕序（左上→右上→右下）从 +Z 看是顺时针，在 three 默认 `FrontSide` 下是背面 | 网格存在、在场景里、尺度正确，**就是不被绘制**，没有任何报错 |
| **覆盖率乘了两次**：着色器把颜色乘了 alpha，three 的 `srcAlpha` 混合又乘一次 | alpha 接近 1 时看不出来，只在 SDF 软边上把字抽干 |
| **距离场从未饱和**：range 4 纹素 > 48px 下 CJK 笔画半宽 | 笔画内部 `sigDist` 只到约 −0.12，`smoothstep` 输出接近零 |

修法：`side: DoubleSide`（不改索引顺序，因为 `sampleTextPoints` 依赖 `i` 与 `i+2` 是对角）、`colorNode` / `opacityNode` 拆开、atlas 改为 64px + range 2（最亮纹素 207 → 饱和 255）。

##### 三条测量教训

- **WebGPU 画布上用 `drawImage` 读回是空图。** 最小复现第一次报「红 0、绿 0」，读起来像绘制路径坏了。**截图走合成器，才是可靠路径。**
- **从一个正在失败的页面上取到的测量，不是关于被测对象的证据。** 有一次 `follow 回调次数 = 0`，实情是导出被收回而页面仍在引用，模块加载失败，什么都没跑。在正常页面上重测是 400+ 次。
- **"看起来淡" 不一定是渲染错了。** 最后定位到的是：文字被它前面的水彩卡片玻璃**正确地磨砂**了。把槽位挪到没有玻璃的地方，不透明测试立刻渲染成实心深色矩形。

## React 用法

`@ui-lib/react` 是第一个适配层。内容保持普通 DOM，stage 负责共享 GPU layer：

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
      <ParticleField
        options={{
          count: 24_000,
          forces: { turbulence: 2.2, vortex: 1.4 },
          colors: ["#5eead4", "#a78bfa", "#f472b6"],
        }}
      />

      <GlassPanel
        radius={34}
        refraction={46}
        dispersion={0.3}
        roughness={0.2}
        className="product-card"
      >
        <h2>语义化内容仍然在页面上。</h2>
        <p>GPU layer 改变的是表面，而不是文档结构。</p>
      </GlassPanel>
    </GlassStage>
  );
}
```

`ParticleField` 在同一个 stage 内模拟并渲染，玻璃可以同时折射 backdrop 与粒子层，不会为每个效果创建第二个 canvas 或 renderer。

### 嵌进一个 section，而不是接管整页

`mode="viewport"`（默认）仍是一整页一张 fixed canvas。产品页里的 hero 或滚动叙事应该用 `mode="section"`：canvas 绝对定位在 stage 元素内，面板坐标相对这个元素，而不是窗口。浏览器对并发 WebGPU context 有硬上限，所以一个页面只放少数几个 stage。

```tsx
import { GlassPanel, GlassStage, Lens, ParticleField, ScrollPin, ScrollTrack } from "@ui-lib/react";

export function Story() {
  return (
    <ScrollTrack length={4}>
      {(scroll) => (
        <ScrollPin>
          <GlassStage mode="section" style={{ height: "100%" }}>
            <Lens refraction={28 + scroll.progress * 40} />
            <ParticleField depth="inside" options={{ count: 1200 }} />
            <GlassPanel>
              <h2>Hold the light</h2>
              <p>{scroll.progress.toFixed(2)}</p>
            </GlassPanel>
          </GlassStage>
        </ScrollPin>
      )}
    </ScrollTrack>
  );
}
```

`ScrollTrack` 在共享 scheduler 的 `input` 相位采样进度，不另开 `requestAnimationFrame`。`length={4}` 是 400vh；里面的 sticky pin 在滚完后松开，canvas 跟着 section 离开，不会盖住后面的文档。旗舰页在 `/?demo=scroll-cinema`。产品页在 `/?demo=product-hero`：同一套 section stage，grade 用 `look="product"`，透镜用 `<Optics look="crystal" mote="quiet" />`。字是 HTML。滚完 pin 松开，规格表留在文档里。

指针场不要自己听 `pointermove`，也不要去打相机朝向的平面。平面在画面边缘会跑远。`<ParticleField pointer />` 和 `<PointerTrail />` 省略距离时都用相机到目标的长度。它们和玻璃高光用同一次平滑采样，在 render 相位、late particle step 之前解析成固定距离的射线。速度也来自这次采样：移动时高光沿笔势拉长，至多加 22% 强度；静止时回到原来的圆，亮度不变。手停住后 ribbon 在半秒内散掉，不会留一条冻住的线。粒子的出生点跟着射线走过去，不会在指针上突然出现。旗舰页在 `/?demo=cursor-field`，仍是 viewport stage。这不是 per-particle trail buffer。

`<ParticleField flow />` 不搬家、不吸成一团。它只把局部涡旋的中心沿同一条射线走近，手停住之后流场继续走。涡旋中心有一颗浅色的心，是换色，不抬 `intensity`。手快的时候涡流略变宽，停住就回到原来的半径。字用 `<Reveal>`，仍是 HTML，按共享时钟逐词进来；reduced motion 下字停在终态，粒子不再 step，心回到休息点。旗舰页在 `/?demo=aurora-flow`。这不是百万粒子承诺，也不是 MSDF。

### 一个 look，而不是一墙参数

亮度问题用高光肩，不靠把透镜删掉。`look="cinema"` 提高 bloom 门槛并滚掉大于 1 的峰值；`LOOKS.bright` 仍是原来那套不封顶的 grade。透镜本身用 `crystal`（默认，压住核心和高光）或 `flare`（原来的热光学）。`/?demo=scroll-cinema&optic=flare` 可以对照。

```tsx
import { GLASS_LOOKS, GlassPanel, GlassStage, Magnetic, Optics } from "@ui-lib/react";

export function Instrument() {
  return (
    <GlassStage look="cinema" mode="section" style={{ height: "100%" }}>
      <Optics look="crystal" />
      <Magnetic strength={0.35} radius={140}>
        <GlassPanel {...GLASS_LOOKS.cinema}>
          <h2>Hold the light</h2>
        </GlassPanel>
      </Magnetic>
    </GlassStage>
  );
}
```

`<Optics />` 把透镜、内部粒子和前景火花包在一起，火花跟着透镜走，不会另开时钟。`<Magnetic />` 用共享 scheduler 的弹簧追指针；外框不动，所以弹簧不会追自己的位移。里面如果是 GPU 玻璃，它会在同一帧把 stage 标脏，折射框跟着 DOM 走。`prefers-reduced-motion` 时位移为 0。

透镜要让开排版时，不要猜一个世界坐标。空的布局盒子就是槽，光学中心贴着它的中心。跟随发生在共享 scheduler 的 render 相位：视口和相机都已经是这一帧的，TAA jitter 还没加上。命中写进 GPU uniform，不 `setState`，所以粒子系统不会因为槽位在动而重建。挂了锚的粒子改在锚点解算之后才 step，云和透镜同一帧。

`fit` 让投影直径贴着槽位短边的一个比例，相机变焦或槽位重排时大小跟着布局走，不再呼吸。`distance` 则锁住离相机的距离，中心留在槽里，推拉仍然会变大。

```tsx
const slot = useRef<HTMLDivElement>(null);

<Optics look="crystal" mote="quiet" anchor={slot} fit={0.8} />
<div ref={slot} />
```

### 非 React 的 imperative 入口

目前 renderer 可以脱离 React 使用：

```ts
import { createGlassLayer } from "@ui-lib/renderer";

const layer = await createGlassLayer({
  backdrop: { type: "gradient", colors: ["#101827", "#6d28d9"] },
});

const card = document.querySelector<HTMLElement>(".product-card");
if (card) {
  const handle = layer.register(card, {
    radius: 34,
    refraction: 46,
    roughness: 0.2,
  });

  handle.update({ roughness: 0.6 });
  // handle.dispose()：元素或路由被移除时调用
}

// layer.dispose()：拥有该 layer 的页面销毁时调用
```

更完整的 standalone `createEffect()`、统一 external store 和跨框架命令式 API 仍在设计中。当前 imperative API 可用，但不应当被视为最终稳定契约。

## P0：浏览器验收与运行时可靠性

本轮 P0 已加入以下工程切片：

### 1. 六个验收页面

通过 query 参数访问：

```text
/?demo=liquid-glass    Liquid Glass Pro。section pin，DOM 玻璃，仍带 data-ui-lib-acceptance="liquid-glass"
/?demo=aurora-flow     Aurora Flow。viewport stage，仍带 data-ui-lib-acceptance="aurora-flow"
/?demo=product-hero     Lumen，产品页。仍带 data-ui-lib-acceptance="product-hero"
/?demo=scroll-cinema
/?demo=cursor-field     Cursor Field。viewport stage，仍带 data-ui-lib-acceptance="cursor-field"
/?demo=wake            Wake。viewport stage，per-particle trail 与档位预算
```

每个页面都使用一个 `GlassStage`，保留真实 DOM 内容，并可使用：

```text
?fallback=1       强制 CSS fallback
?backend=webgl    强制 WebGL2 路径
```

这六个页面目前用于建立真实浏览器截图和交互基线：

1. **Liquid Glass Pro**：section pin。`GLASS_LOOKS.press` / `milk` / `quiet` 贴在真实 DOM 上。后面的套准纸是世界物体，不是 element-to-texture。字是 HTML。
2. **Aurora Flow**：整页流场、局部涡旋跟着共享射线走、HTML 逐词出现。不是动态 LOD，也不是 1M 基准。
3. **Glass Product Hero**：world object、camera、post graph 基础路径。
4. **Scroll Cinema**：section stage、sticky pin、共享时钟上的相机与章节。
5. **Cursor Field**：同一帧的 pointer ray、短 ribbon、玻璃高光。不是 per-particle trail buffer。
6. **Wake**：每颗粒子维护自己的短期位置历史，档位预算裁掉多余粒子而不重建缓冲区。不是跟着指针走的 ribbon。

六张都已是可打开的旗舰页。MSDF、完整 motion timeline 和真机视觉基线仍然没有完成。

### 2. Playwright 视觉与交互测试

测试位于 [`tests/e2e/acceptance.spec.ts`](tests/e2e/acceptance.spec.ts)，覆盖：

- accelerated / WebGL route smoke
- scroll 后 DOM 内容仍可见
- 语义化标题存在，Liquid Glass 的校对链接可以聚焦
- fallback 状态下没有 canvas
- stage、backend、FPS、dropped frames 等数据属性

仓库里**没有**截图基线，测试文件里也**没有** `toHaveScreenshot`。缺基线的断言会让下一次 `pnpm test:e2e` 必失败，却又保护不了像素，所以先拿掉。`pnpm test:e2e` 因此不是视觉门禁。跨浏览器像素、FPS 和设备矩阵仍未验证。要补基线，得在能装浏览器的机器上把断言和 PNG 同一次加回来：

```bash
pnpm exec playwright install chromium
pnpm test:e2e:update
```

### 3. 真机基线

真机测量不进 CI，也不该进：CI 是 headless 的，macOS 上 headless Chromium 会回退到 SwiftShader，那描述的是软件光栅化器，不是用户的机器。

```bash
pnpm build
pnpm --filter @ui-lib/docs preview --host 127.0.0.1 --port 4173 --strictPort
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --dpr 1
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --dpr 2
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --backend webgl --dpr 2
```

结果写到 `reports/device/<gpu-bucket>-dpr<N>[-webgl2]/`（`measurement.json` + `measurement.md` + 六张 PNG），并按 GPU 分桶。`reports/` 不入库——那些数字描述的是某一台机器，不是这个项目。已跑过的记录整理在 [`docs/benchmarks`](docs/benchmarks/README.md)。

帧间隔由脚本自己的 `rAF` 循环在页面内采样，**不读运行时自己的计数器**。运行时的计数单独记录，两者刻意分开：`droppedFrames` 的定义是 `expectedFrames = max(1, round(raw × 60))`，按固定 60 Hz 预算累计，是累计值而不是掉帧率，只应看窗口内的增量。

按现有数据，**可以当基线的只有 `p50` 和"是否出现 16.7 ms 台阶"**；`max` 与 `>16.7ms` 计数在两次运行之间可以差一倍以上，不适合做门禁。

当前基线（Apple M3 Pro / Metal，1440×1000，后处理链开启）：

| 配置 | 结果 |
|---|---|
| WebGPU @ DPR 1 | 六页锁 120 fps，`p95` 9.0–9.2 ms，零超标帧 |
| WebGPU @ DPR 2（2880×2000） | 六页锁 120 fps，`p95` 9.1–9.3 ms，仅 `liquid-glass` 2 个超标帧 |
| WebGL2 @ DPR 1 | 六页锁 120 fps，`aurora-flow` 59 个超标帧 |
| WebGL2 @ DPR 2 | 五页 `p50` 掉到 8.7–16.2 ms，四页出现双峰台阶，`aurora-flow` 被降到 tier 2 |

两个读表时要注意的坑：`cursor-field` 是指针驱动的场，测量里没有指针输入，它的 120 fps 只描述一个空闲页面；`max` 与 `>16.7ms` 计数不要当门禁用。

**"链路开着"不等于"链路在跑"。** 第一版记录就是栽在这里：后处理链配置上开着，实际在两条后端上都没画任何东西，而当时的性能数字看起来完全正常。确认链路真的生效要用两个独立检查，不要靠看截图：`pnpm check:shaders`（给出确切的着色器模块数与管线数）与「透传态 vs 关闭态」的像素残差（健康值 1 以下，实测 0.92；第一版是 10.61，即链路输入是错的）。

#### 测量抓到的四个缺陷

这轮测量的价值不在数字，在于它在两条后端路径上都抓到了既有测试看不见的问题。四个缺陷现已全部修复；第 4 个是修第 3 个的过程中才暴露出来的。

1. **强制 WebGL2 每帧抛异常**（已修）。`captureDepth()` 把世界深度拷进一个裸 `DepthTexture`；three 的 WebGL 后端把这条拷贝实现为两个 render target 的 framebuffer 之间的 blit，裸纹理没有 framebuffer，于是 `WeakMap.set(undefined, …)` 抛 `TypeError`。抛出点在 `setRenderTarget(backdropRT)` 与 `setRenderTarget(null)` 之间，render target 因此永远停在被绑定状态，`reportStats()` 再也执行不到，观测属性集体为空。修法是给历史深度配一个只作宿主的 `RenderTarget`，并在拷贝前调用 three 的公开方法 `renderer.initRenderTarget(host)` 预建它的 framebuffer——`setRenderTarget(host)` 不够，它不会触发 framebuffer 创建，也不会登记纹理。修后 `Invalid value used as weak map key` 从 693 次降到 0，`data-ui-lib-backend` 由 `unknown` 恢复为 `webgl2`。
2. **WebGPU 的 `historyValid` 误报**（已修）。`commit()` 把 canvas 格式（`bgra8unorm`）的 `FramebufferTexture` 交给 `copyFramebufferToTexture`，而当前绑定的是 post 链的半浮点中间目标（`rgba16float`）。three 在格式不匹配时只警告并返回、不拷贝，随后 `historyValid` 仍被置 1，时间性链路实际未生效。当时的修法是新增 `framebufferCopyWouldFail()`，逐字镜像 three 自己的源上下文查找，在拷贝会被拒绝时把 `historyValid` 置 0。**这条守卫在第 3 条修完后已经删掉**——链路不再去猜"当前输出是谁"，而是由调用方显式传入源纹理，格式在构造期就对齐，事后补救的判据没有存在必要。
3. **post 链在两条后端上都没在干活**（已修，比前两个都严重）。第 1 条修好后崩溃消失，但强制 WebGL2 的页面只剩 DOM 与玻璃面板。逐项排除（关掉 post 链世界就回来 → 把 `enabled` 改成纯透传仍全黑 → 把输出固定成常量红，整块画布变红 → 输出 `vec4(uv.x, uv.y, baseSample.r, 1)`，UV 正确而采样值恒为 0）把根因钉在**链的输入为空**：`renderFrame()` 逐帧切换 `renderer.outputColorSpace` / `toneMapping`，这会翻转 three 的 `needsFrameBufferTarget`，使场景那几趟直接画进画布，而 `copyFramebufferToTexture()` 随后从"内部 framebuffer target"取源——那个 target 从没被写过。
   顺着这一半追下去才发现 WebGPU 那一半：**post 管线的 Tint IR 生成失败**（`swizzle view instruction still has usages after lowering`），three 只打日志不抛异常，每帧继续提交 invalid command buffer。所以 WebGPU 画布上是**未经后处理**的原始合成。关掉 post 链可让这一串错误全部消失，据此确认失败的就是 post 管线。
   **修法**：两半一起修。步骤 3–4 合成到自建的 `compositeRT`，post 链从 `compositeRT.texture` 采样，画布只由 `RenderPipeline` 写（无 post 时由 Node 版全屏 quad 搬一次），于是逐帧切换 `toneMapping` / `outputColorSpace` 整段删除；`commit()` 改用 `renderer.copyTextureToTexture()`，源与历史缓冲的格式在构造期对齐。Tint 的降级失败根因是**模块级 `var<private>` 上的嵌套 swizzle**（`vec3(v.xyz.y, …)` 形式），把该表达式移到函数内 `let` 上即通过；色散基准因此改走 `resolved.g`。
4. **自有 render target 的 UV 上下翻转**（已修，第 3 条修好后显形）。链用 `screenUV` 采样自己的 render target，而 three 按 GL 约定自下而上存储目标纹理，`isFlipY()` 在 WebGPU 与 WebGL 两条 node builder 上**都**返回 `false`，不会替调用方补偿。判定过程：截图看起来像"构图错了"，试过 `rotate(180)`（残差 21.93）与 `FLIP_LEFT_RIGHT`（24.69）都不对，扫描"绕不同水平轴翻转"后定位到**绕画面正中 y=450 翻转**（残差 1.32）——分界线在画面中部，这正是"只翻了 UV"而不是"整页转了 180°"的特征。修法是 `vec2(screenUV.x, oneMinus(screenUV.y))`，源纹理、深度纹理、历史纹理、采样偏移与 reprojection clip 全部改用该空间。
   判定用的硬指标是**「透传态 vs 关闭态」的像素残差**：`enabled: false` 的链路应当等价于完全不跑链路，修前残差 10.61、修后 0.92（噪声地板 0.20）。这比肉眼比对或网格差可靠得多，也是确认"后处理是否真的生效"的通用手段。

### 4. FPS 与掉帧统计

`FrameScheduler` 会记录：

- smoothed FPS
- 累计 dropped frames（相对于 60Hz frame budget）
- 50ms 以上 long frames

`GlassLayerStats` 和 React stage DOM 属性会暴露这些数据，便于浏览器测试或应用自己的 telemetry 使用。统计是运行时观测数据，不是预先写死的性能承诺。

属性清单（都在 `[data-ui-lib-stage]` 上）：`data-ui-lib-stage`、`data-ui-lib-mode`、`data-ui-lib-backend`、`data-ui-lib-tier`、`data-ui-lib-fps`、`data-ui-lib-dropped-frames`、`data-ui-lib-long-frames`、`data-ui-lib-resource-count`。它们由 `onStats` 每 0.25 s 推一次——**帧回调一旦抛异常，这些属性会集体为空**，这是判断降级路径是否健康的第一个信号。

### 5. 资源释放诊断

`@ui-lib/core` 提供逻辑资源登记表：

```ts
import { getResourceSnapshot } from "@ui-lib/core";

const before = getResourceSnapshot();
// mount / register / addParticles / addWorldObject ...
// dispose everything
const after = getResourceSnapshot();

console.log(before, after);
```

登记的资源种类包括：

```text
renderer · layer · backdrop · panel · particle-system · world-object · post-graph
```

这不是浏览器 VRAM 计数器。浏览器没有跨后端、跨驱动的通用 VRAM API；它用于在 mount/unmount 50 次、路由切换和 StrictMode 场景中验证 UI-Lib 是否还持有逻辑资源引用。Three.js backend 的真实显存仍需要浏览器开发工具或 GPU profiling 工具验证。

### 6. Device/context loss

renderer 会监听 Three.js 的 WebGPU device loss / WebGL context loss，并通过 `GlassStage` 触发 layer 重建。重建时 React children 重新绑定到新的 layer；第一次恢复尝试会切换到 WebGL2，避免持续使用已经失效的 WebGPU device。

这条路径仍需要在真实浏览器中注入 device loss、context loss 和恢复事件进行最终验收。

### 7. SSR / hydration smoke test

[`packages/react/test/ssr.test.ts`](packages/react/test/ssr.test.ts) 使用 `react-dom/server` 验证：

- module evaluation 不要求 `window` / `document`
- `GlassStage` 可以输出语义化 HTML
- GPU 尚未启动时输出 fallback 标记
- `GlassPanel` 的 DOM props 和 accessible name 保留

这不是完整 Next.js hydration 测试；Next、Nuxt、SvelteKit example 属于后续发布工作。

## 架构

```text
语义化 DOM / React adapter
              │
              ▼
       @ui-lib/renderer
   一个 canvas · 一个 renderer
              │
       ┌──────┼────────┐
       ▼      ▼        ▼
   backdrop  particles  glass DOM surfaces
              │
              ▼
        @ui-lib/post
       TSL post graph + history
              │
       WebGPU 或 WebGL2
```

共享 frame 顺序：

```text
input → GPU compute → DOM/state update → backdrop → particles → glass → post resolve
```

当 backdrop 是静态颜色/纹理，且没有 world object、pointer 或 layout 变化时，layer 可以跳过整帧 redraw 和 history copy。质量变化会重建编译期 graph budget，而不是用 uniform 假装改变已经展开的 shader loop。

## 包结构

| 包 | Three.js | 职责 | 状态 |
| --- | --- | --- | --- |
| [`@ui-lib/core`](packages/core) | 无 | device、quality、scheduler、pointer、math、lifecycle、resource registry | 已实现 |
| [`@ui-lib/shaders`](packages/shaders) | peer | Liquid Glass、backdrop 和通用 TSL node material | 已实现切片 |
| [`@ui-lib/particles`](packages/particles) | peer | GPU simulation、emitter、force、bounds、particle rendering | 已实现切片 |
| [`@ui-lib/post`](packages/post) | peer | TSL post graph、quality budget、temporal history、color processing | 已实现切片 |
| [`@ui-lib/renderer`](packages/renderer) | peer | WebGPU/WebGL2 bootstrap、stage orchestration、DOM-attached glass | 已实现切片 |
| [`@ui-lib/react`](packages/react) | peer | `GlassStage`、`GlassPanel`、`Lens`、`Optics`、`Magnetic`、`ParticleField`、`PointerTrail`、`ScrollTrack`、CSS fallback、SSR-safe adapter | 第一适配层 |
| [`@ui-lib/motion`](packages/motion) | 无 | 滚动进度、章节权重、数值轨道；挂在 core 的同一帧时钟上 | 第一切片 |
| `@ui-lib/dom` | — | DOM ↔ GPU tracking、snapshot、transition | 规划中 |
| `@ui-lib/vue` / `@ui-lib/svelte` | — | 额外框架 adapter | 规划中 |

渲染相关包把 `three` 声明为 **peer dependency**，不会在包内捆绑私有 Three.js。`@ui-lib/core` 保持框架无关且不依赖 Three.js。

每个已实现的包都有自己的 `README.md`，内含真实 API 表、安装命令与用法片段；发布元数据（`repository` / `homepage` / `bugs` / `keywords` / `publishConfig.access`）已经写进各包的 `package.json`。仓库整体以 [MIT](LICENSE) 授权。

## 渲染与降级策略

### 后端选择

1. 请求一个实际可用的 WebGPU adapter。
2. 使用同一套 TSL source graph 回退到 WebGL2。
3. 两个 GPU 后端都不可用、显式关闭或 reduced-motion 时使用 CSS / 静态 fallback。

最终 backend 取决于浏览器、操作系统、驱动、设备策略和 context 是否可创建。UI-Lib 不会在没有运行 browser matrix 的情况下写死浏览器版本承诺。

> **第 2 条当前只走通了一半。** 强制 WebGL2 时 `postProcessing.captureDepth()` 每帧抛 `TypeError` 的崩溃已修，观测属性恢复，但 post 链会把背后的世界整块打黑——DOM 与玻璃面板正常，透镜与粒子不见。原因是逐帧切换 `renderer.outputColorSpace` / `toneMapping` 翻转了 three 的 `needsFrameBufferTarget`，使链的输入拿到一张空图；WebGPU 侧另有一半：post 管线因 Tint 编译失败而静默空转，所以那条路径上的画面其实是**未经后处理**的。原因、复现与排除实验见 [`docs/benchmarks`](docs/benchmarks/2026-10-01-apple-m3-pro.md)。修好之前，请把 WebGL2 当作"能创建 context、能跑完帧、但画不出完整画面"的路径，并假设两条路径上的画面都不含后处理。

### 质量等级

后处理采样数和昂贵 graph 分支通过编译期预算选择：

| Quality | 适用场景 | 当前策略 |
| --- | --- | --- |
| `1` | 低端设备 | 最小 graph；QualityManager 可以关闭 post FX |
| `2` | 平衡默认值 | 中等 bloom / TAA budget |
| `3` | 高端 / cinematic | 当前完整 bloom / TAA budget |

运行时 FPS 采样可以在 tier 之间降级。重建 graph 是有意为之，因为 TSL 中的 loop 和 tap 数是编译期决定的。

### 可访问性

UI-Lib 是真实 HTML 外面的装饰增强层：

- 没有 GPU 时内容仍然存在；
- `prefers-reduced-motion` 应该收敛到可阅读的低运动状态；
- canvas 是装饰层，不应劫持键盘焦点；
- 语义、焦点顺序和控件行为由应用自己的 DOM 负责；
- canvas 会标记 `aria-hidden="true"`。

可访问性浏览器回归和完整 reduced-motion contract 是发布前的 P0/P1 验收内容。

## 性能原则

UI-Lib 以约束而不是营销数字为中心：

- 一个 stage / 页面使用一个 canvas、一个 renderer 和一个 scheduler；
- 粒子和后处理不创建额外 renderer；
- motion、DOM 同步和 GPU simulation 不各自启动第二套 rAF；
- hidden tab 暂停共享 scheduler；
- 静态场景避免重复 redraw 与 history copy；
- 低 tier 限制 DPR、粒子计算和 post graph 复杂度；
- 所有自有 GPU 资源都有明确 disposal 路径；
- 性能结论必须来自真实浏览器和真实设备测量；
- 测量要能被复现，所以测量脚本与它的原始输出一起入库。

## 路线图

### P0：证明 runtime 可靠

- [x] 六个浏览器验收页面
- [x] Playwright 语义验收骨架与交互 smoke（headless Chromium 17 项通过；仓库里没有 `toHaveScreenshot`，所以它不是像素门禁）
- [x] FPS、掉帧、long frame 统计
- [x] 逻辑资源 registry 与 dispose 断言基础
- [x] WebGPU/WebGL2 loss 通知与 React stage 重建入口
- [x] React SSR smoke test
- [x] 真机帧节奏测量脚本与第一份按 GPU 分桶的记录（[`docs/benchmarks`](docs/benchmarks/README.md)）
- [x] 修掉强制 WebGL2 回退路径每帧抛异常的问题（宿主 `RenderTarget` + `renderer.initRenderTarget()`）
- [x] 修掉 WebGPU 下 post 时间性链路的格式不匹配与 `historyValid` 误报（改为调用方显式传入源纹理，构造期对齐格式）
- [x] 修掉 post 链在两条后端上都没在干活的问题（自建 `compositeRT` + `copyTextureToTexture`；Tint 降级失败根因是模块级 `var<private>` 上的嵌套 swizzle）
- [x] 修掉自有 render target 的 UV 上下翻转（`isFlipY()` 在两条 node builder 上都是 `false`）
- [x] 真机着色器编译门禁（`pnpm check:shaders`，有头 + 真 GPU；`--self-test` 证伪探针本身；**刻意不进 CI**，理由见 `docs/benchmarks`）
- [ ] 为上面几个已修项补回归断言（现有 17 项语义验收抓不到帧回调异常、画面缺失，也抓不到"管线编译失败但每帧照跑"）
- [ ] 真机 WebGL2 帧节奏与像素基线（post 链修好后重测；现有全部数字都不含后处理）
- [ ] 跨浏览器 screenshot baseline
- [ ] GPU 设备矩阵、1M 粒子 FPS 与 GPU memory profiling
- [ ] device lost / context lost 的真实注入与恢复回归

### P1：提高视觉上限

- [ ] world-only per-pixel velocity MRT
- [ ] 真正 multi-pass bloom pyramid
- [ ] custom post-pass 插槽
- [x] 世界透镜的安静环境反射（look 自带同一张工作室探针，页面不传 cubemap）
- [x] DOM 玻璃与透镜共用同一张探针（bevel 反射，文字面更弱，页面不传 cubemap）
- [ ] dynamic particle LOD 与 per-particle trail buffer
- [x] 稳定 pointer-to-world ray（固定距离，与玻璃高光同一采样，render 相位、late step 之前）
- [x] camera path 与 Glass Product Hero（`/?demo=product-hero`，Lumen）

### P1：补齐动效叙事层

- [ ] `@ui-lib/dom`：element-to-texture、DOM/3D tracking
- [x] `@ui-lib/motion` 第一切片：scroll progress、beat、sampleTrack，与 renderer 共用 scheduler
- [x] `GlassStage mode="section"`：canvas 归属嵌入元素，而不是 fixed 到窗口
- [x] Scroll Cinema 旗舰页（sticky pin、相机轨道、章节，DOM 文本保持 HTML）
- [ ] `@ui-lib/motion`：timeline、gesture、完整编排
- [x] magnetic interaction（`<Magnetic />`，与 stage 同一帧）
- [x] cursor field 的短 ribbon 与同一帧 motion-aware glass（静止时高光不变，`/?demo=cursor-field`）。per-particle trail buffer 仍未做
- [x] HTML 逐词出现（`<Reveal>`，共享时钟；不是 MSDF）
- [ ] MSDF text 与 character / word / line animation
- [ ] MSDF 与完整 Scroll Cinema 分镜（相机轨道与章节已在旗舰页）

### P2：生态与发布

- [ ] R3F adapter 与最终 imperative API
- [ ] Vue / Svelte adapter
- [ ] Next.js、Nuxt、SvelteKit example
- [x] size budgets（`size-budget.json` + `pnpm size`，已并入 `pnpm verify`）
- [x] CI 流水线（`.github/workflows/ci.yml`：verify job + browser job）
- [ ] CI browser matrix（把 browser job 扩到多浏览器/多后端）
- [ ] Changesets 与 npm provenance 发布
- [ ] recipes、API reference、copy-ready 文档

## 六个旗舰 Demo

目标产品面不是一个参数 Playground，而是六个可单独回归的真实页面：

1. **LiquidGlass Pro**：`/?demo=liquid-glass`。section pin，三块命名玻璃贴在 DOM 上，套准纸在玻璃后面走。不是验收壳。页面不传 cubemap。
2. **Aurora Flow**：`/?demo=aurora-flow`。viewport stage。`fieldOptions("aurora")` 加 `<ParticleField flow />`。字是 `<Reveal>`。reduced motion 停下粒子，字留在终态。动态 LOD 仍未做。
3. **Glass Product Hero**：Lumen，`/?demo=product-hero`。section pin、相机轨道、`look="product"`、安静的 `<Optics mote="quiet" />`。环境反射由 look 自带的工作室探针提供，页面不传 cubemap。
4. **Scroll Cinema**：section-scoped sticky pin、scroll-linked camera 和章节玻璃。MSDF 仍未做。
5. **Cursor Field**：`/?demo=cursor-field`。viewport stage。`<ParticleField pointer />` 与 `<PointerTrail />` 共用玻璃高光的那一次平滑采样。字是 HTML。reduced motion 停下粒子和 ribbon。
6. **Wake**：`/?demo=wake`。viewport stage。每颗粒子维护自己的短期位置历史，不是跟着指针走的 ribbon；档位预算裁掉多出来的粒子而不重建缓冲区。笔画收在标题右侧，`intensity` 0.46。

六个 acceptance surface 都已是旗舰页。per-particle trail 与档位预算目前是 Wake 用到的第一切片，不等于完整的动态 LOD 方案；MSDF 和 `@ui-lib/dom` 仍未做。下一步见上文。

## 不可妥协的设计规则

- core 不依赖 React、Three.js 或其他框架。
- Three.js 始终是 peer dependency，UI-Lib 包不捆绑 Three.js。
- 所有 shader 与 post 使用 TSL，不用 raw GLSL/WGSL 绕过跨后端契约。
- 功能不能通过额外 canvas、renderer 或 scheduler 逃避架构约束。
- 每个效果必须有显式 lifecycle 和 dispose。
- reduced motion、无 GPU、WebGL2 都是一等产品状态。
- TSL graph 能构建不等于功能完成；完成标准必须同时包含视觉、交互、性能、可访问性和兼容性证据。

## 开发命令

```bash
pnpm install
pnpm dev              # Vite Playground
pnpm verify           # 门禁：build → typecheck → test → size budget
pnpm verify:device    # 上面的全部 + 真机着色器编译门禁
pnpm test             # 先构建 dist，再跑 Vitest
pnpm typecheck        # 全 workspace TypeScript
pnpm size             # 体积预算门禁（读 size-budget.json）
pnpm lint             # Biome check
pnpm build            # 包构建
pnpm test:e2e         # Playwright 浏览器验收（headless Chromium）
pnpm test:e2e:update  # 更新视觉 baseline
pnpm measure          # 真机帧节奏测量（需要真实 GPU；脚本不会启停服务器）
pnpm check:shaders    # 真机着色器/管线编译门禁（需要真实 GPU；先构建 apps/docs）
pnpm check:shaders:self-test  # 证伪探针本身：确认门禁不是瞎的
```

当前仓库仍处在 experimental monorepo 阶段。第一个 stable release 之前，公开 API 可能发生变化；依赖规划中或 experimental 标记的能力前，请先查看 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## License

MIT
