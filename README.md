# UI-Lib

**面向 Web 的 GPU 优先动效与视觉效果运行时。**

UI-Lib 把实时 Liquid Glass、GPU 粒子、3D 场景和 TSL 后处理带到普通网页界面中，目标是服务于产品 Hero、滚动叙事、交互表面和沉浸式展示，而不是用 canvas 替代语义化 HTML。

> **状态：实验性 `0.0.1`。** 渲染底座、Liquid Glass、GPU 粒子、TSL 后处理、section stage 和共享时钟都已落地。五个旗舰里，Lumen、Scroll Cinema、Cursor Field、Aurora Flow 已是可看的页面；Liquid Glass Pro 仍是验收壳。Node 侧 typecheck 与 Vitest 不能代替真机画面。

[路线图](docs/ROADMAP.md) · [交互 Playground](apps/docs) · [P0 浏览器验收](tests/e2e) · [包结构](#包结构)

## 当前情况

这一轮把文档站从参数 Playground 推进到四张旗舰页。仍是一个 canvas、一个 renderer、一个 scheduler。字留在 HTML 里。页面不传 cubemap。没有宣称百万粒子 60 帧。

| 页面 | 地址 | 现在是什么 |
|---|---|---|
| Lumen | `/?demo=product-hero` | 产品页。section pin、相机轨道、`look="product"`、安静的 `<Optics mote="quiet" />`。这轮不再调亮度。 |
| Scroll Cinema | `/?demo=scroll-cinema` | 滚动叙事。钉住、章节、滚完松开。MSDF 仍未做。 |
| Cursor Field | `/?demo=cursor-field` | 同一条射线驱动玻璃高光、短 ribbon 和粒子。手停后 ribbon 散掉，粒子走过去，不跳到指针上。静止时高光仍是圆，至多在移动时加 22% 强度。 |
| Aurora Flow | `/?demo=aurora-flow` | 整页流场，不是参数面板。`<ParticleField flow />` 把局部涡旋沿同一条射线走近。中心有一颗浅色的心，是换色，不抬 `intensity`。手快时涡流略变宽，停住回到原来的半径。后面有一层更暗、更慢的雾。字用 `<Reveal>`。 |
| Liquid Glass Pro | `/?demo=liquid-glass` | 仍是验收壳，不是旗舰页。 |

验证到这一步：`pnpm typecheck` 通过，Vitest 67 项通过。Aurora 页面能返回 200。没有在这台机器上检查真实 GPU 像素，所以亮度和心是否看得清，要以浏览器里的画面为准。Playwright 截图基线仍未生成。

## 下一步

下一张页是 **Liquid Glass Pro**。把它从验收壳做成和 Lumen 同级的旗舰页：真实 DOM 上的折射，字仍是 HTML，一个 canvas。不做参数墙。

做完那一页之后，按这个顺序，不要插队：

1. 动态 particle LOD。Aurora 现在是固定 36k 的页面负载，不是 1M 基准。
2. per-particle trail buffer。Cursor Field 的 ribbon 不是这个。
3. 真机 WebGPU / WebGL2 截图基线、FPS 和掉帧。没有这些数字，不写性能结论。

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

- 真机 WebGPU / WebGL2 视觉回归基线
- 跨浏览器 FPS、掉帧和交互延迟门禁
- 真实 GPU VRAM 统计与 device-specific benchmark
- 变形粒子场的 world-only per-pixel velocity MRT（刚体相机重投影已有，不是完整速度缓冲）
- 可复用的真正 multi-pass bloom pyramid
- 自定义 post-pass 插槽
- DOM ↔ GPU bridge（element→texture、3D→DOM 跟随）
- 完整 timeline / gesture / MSDF；滚动进度与章节轨道已有第一切片
- MSDF text
- 动态 particle LOD 与 per-particle trail buffer。pointer-to-world ray 已在共享 scheduler 上，按固定距离取样
- 最终版 imperative `createEffect()` API
- R3F、Vue、Svelte adapter
- Next.js / Nuxt / SvelteKit SSR 与 hydration example
- Changesets、size budget、CI browser matrix 和 npm 发布流程

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
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

执行浏览器验收：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

在不能下载浏览器或没有系统 GPU 依赖的沙箱中，`pnpm test:e2e` 无法代表真实浏览器验收。测试文件和 five-demo acceptance surface 已经加入仓库，但截图 baseline、WebGPU device profile 和实际 FPS 结论必须在具备这些条件的 CI / 本地机器上生成。

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

### 1. 五个验收页面

通过 query 参数访问：

```text
/?demo=liquid-glass
/?demo=aurora-flow     Aurora Flow。viewport stage，仍带 data-ui-lib-acceptance="aurora-flow"
/?demo=product-hero     Lumen，产品页。仍带 data-ui-lib-acceptance="product-hero"
/?demo=scroll-cinema
/?demo=cursor-field     Cursor Field。viewport stage，仍带 data-ui-lib-acceptance="cursor-field"
```

每个页面都使用一个 `GlassStage`，保留真实 DOM 内容，并可使用：

```text
?fallback=1       强制 CSS fallback
?backend=webgl    强制 WebGL2 路径
```

这五个页面目前用于建立真实浏览器截图和交互基线：

1. **Liquid Glass Pro**：DOM-attached refraction、dispersion、frost。
2. **Aurora Flow**：整页流场、局部涡旋跟着共享射线走、HTML 逐词出现。不是动态 LOD，也不是 1M 基准。
3. **Glass Product Hero**：world object、camera、post graph 基础路径。
4. **Scroll Cinema**：section stage、sticky pin、共享时钟上的相机与章节。
5. **Cursor Field**：同一帧的 pointer ray、短 ribbon、玻璃高光。不是 per-particle trail buffer。

其中 Scroll Cinema 已是可滚动的旗舰页。MSDF、完整 motion timeline 和真机视觉基线仍然没有完成。

### 2. Playwright 视觉与交互测试

测试位于 [`tests/e2e/acceptance.spec.ts`](tests/e2e/acceptance.spec.ts)，覆盖：

- 五个页面的 CSS fallback screenshot
- accelerated / WebGL route smoke
- scroll 后 DOM 内容仍可见
- 语义化标题存在
- fallback 状态下没有 canvas
- stage、backend、FPS、dropped frames 等数据属性

截图按浏览器和 GPU 桶管理，不能跨 GPU 直接混用 baseline。首次在可信浏览器环境中生成 baseline：

```bash
pnpm exec playwright install chromium
pnpm test:e2e:update
```

### 3. FPS 与掉帧统计

`FrameScheduler` 会记录：

- smoothed FPS
- 累计 dropped frames（相对于 60Hz frame budget）
- 50ms 以上 long frames

`GlassLayerStats` 和 React stage DOM 属性会暴露这些数据，便于浏览器测试或应用自己的 telemetry 使用。统计是运行时观测数据，不是预先写死的性能承诺。

### 4. 资源释放诊断

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

### 5. Device/context loss

renderer 会监听 Three.js 的 WebGPU device loss / WebGL context loss，并通过 `GlassStage` 触发 layer 重建。重建时 React children 重新绑定到新的 layer；第一次恢复尝试会切换到 WebGL2，避免持续使用已经失效的 WebGPU device。

这条路径仍需要在真实浏览器中注入 device loss、context loss 和恢复事件进行最终验收。

### 6. SSR / hydration smoke test

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

## 渲染与降级策略

### 后端选择

1. 请求一个实际可用的 WebGPU adapter。
2. 使用同一套 TSL source graph 回退到 WebGL2。
3. 两个 GPU 后端都不可用、显式关闭或 reduced-motion 时使用 CSS / 静态 fallback。

最终 backend 取决于浏览器、操作系统、驱动、设备策略和 context 是否可创建。UI-Lib 不会在没有运行 browser matrix 的情况下写死浏览器版本承诺。

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
- 性能结论必须来自真实浏览器和真实设备测量。

## 路线图

### P0：证明 runtime 可靠

- [x] 五个浏览器验收页面
- [x] Playwright 测试骨架、CSS fallback screenshot 和交互 smoke
- [x] FPS、掉帧、long frame 统计
- [x] 逻辑资源 registry 与 dispose 断言基础
- [x] WebGPU/WebGL2 loss 通知与 React stage 重建入口
- [x] React SSR smoke test
- [ ] 在真实 WebGPU/WebGL2 浏览器生成 screenshot baseline
- [ ] GPU 设备矩阵、真实 FPS 与 GPU memory profiling
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
- [ ] Changesets、size budgets、CI browser matrix、npm provenance
- [ ] recipes、API reference、copy-ready 文档

## 五个旗舰 Demo

目标产品面不是一个参数 Playground，而是五个可单独回归的真实页面：

1. **LiquidGlass Pro**：`/?demo=liquid-glass`。仍是验收壳。下一张旗舰页做这个，不在这一轮。
2. **Aurora Flow**：`/?demo=aurora-flow`。viewport stage。`fieldOptions("aurora")` 加 `<ParticleField flow />`。字是 `<Reveal>`。reduced motion 停下粒子，字留在终态。动态 LOD 仍未做。
3. **Glass Product Hero**：Lumen，`/?demo=product-hero`。section pin、相机轨道、`look="product"`、安静的 `<Optics mote="quiet" />`。环境反射由 look 自带的工作室探针提供，页面不传 cubemap。
4. **Scroll Cinema**：section-scoped sticky pin、scroll-linked camera 和章节玻璃。MSDF 仍未做。
5. **Cursor Field**：`/?demo=cursor-field`。viewport stage。`<ParticleField pointer />` 与 `<PointerTrail />` 共用玻璃高光的那一次平滑采样。字是 HTML。reduced motion 停下粒子和 ribbon。

五个 acceptance surface 已经接入文档站。其中四张是旗舰页，Liquid Glass Pro 仍是壳。per-particle trail buffer、动态 LOD、MSDF 和 `@ui-lib/dom` 仍未做。下一步见上文。

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
pnpm typecheck        # 全 workspace TypeScript
pnpm test             # Vitest
pnpm lint             # Biome check
pnpm build            # 包构建
pnpm test:e2e         # Playwright 浏览器验收
pnpm test:e2e:update  # 更新视觉 baseline
```

当前仓库仍处在 experimental monorepo 阶段。第一个 stable release 之前，公开 API 可能发生变化；依赖规划中或 experimental 标记的能力前，请先查看 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## License

MIT
