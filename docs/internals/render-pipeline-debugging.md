# 渲染管线缺陷剖析与真机调试复盘

> 本文档汇集 UI-Lib 在 WebGPU / WebGL2 双后端图形运行时演进中定位并修复的核心缺陷、着色器编译陷阱、SDF 文字引擎故障剖析，以及自动化图形度量方法学。

---

## 1. 核心渲染管线缺陷与复盘（The Four Core Bugs）

在建立真实设备帧节奏与像素基线前，既有的语义自动化测试（17 项 E2E 测试）全部绿灯。然而接入真机着色器检查与像素探针后，暴露出了四个严重的底层渲染缺陷。本节记录详细的故障现象、根本原因、排查路径与修复方案。

### 1.1 WebGL2 深度拷贝 Blit 异常（Depth Copy Blit Exception）

- **故障现象**：在强制 WebGL2 回退模式（`?backend=webgl`）下，页面每帧抛出 `TypeError: Invalid value used as weak map key`，控制台累计 693 次异常。由于未捕获异常中断了帧生命周期，`setRenderTarget(null)` 之后的 `reportStats()` 永远无法执行，导致 DOM 上的 `data-ui-lib-backend` 由 `webgl2` 沦陷为 `unknown`，性能统计指标全部为空。
- **根本原因**：
  - `captureDepth()` 尝试将世界深度缓冲拷贝至一个独立的 `DepthTexture` 中。
  - Three.js 的 WebGL 后端将该深度拷贝实现为两个 RenderTarget 的 framebuffer 之间的硬件 `blitFramebuffer`。
  - 裸 `DepthTexture` 并未绑定任何宿主 Framebuffer，Three.js 内部的 Framebuffer 缓存 `WeakMap` 在以 `undefined` 为键时抛出 `TypeError`。
  - 异常抛出点位于 `setRenderTarget(backdropRT)` 与 `setRenderTarget(null)` 之间，导致渲染状态机永远被锁死在绑定离屏目标的状态。
- **修复方案**：
  - 为历史深度分配一个专门的宿主 `RenderTarget`。
  - 在调用拷贝前，显式调用 Three.js 的底层初始化方法 `renderer.initRenderTarget(host)`，预先为其分配并注册底层 WebGL Framebuffer（注：单纯调用 `setRenderTarget(host)` 不足以触发 Framebuffer 实例化与纹理登记）。
- **验证结果**：`Invalid value used as weak map key` 异常降至 0，`data-ui-lib-backend` 正确恢复为 `webgl2`。

---

### 1.2 WebGPU `historyValid` 时间性历史假阳性（historyValid False Positive）

- **故障现象**：WebGPU 后端下，时间性后处理（TAA、运动重投影累积）在配置开启时虽然将内部状态标记为 `historyValid = 1`，但画面实际并无任何时间性平滑累积效果。
- **根本原因**：
  - `commit()` 方法把 Canvas 输出格式（`bgra8unorm`）的 `FramebufferTexture` 传给了 `copyFramebufferToTexture()`。
  - 当时管线当前绑定的目标是后处理链的半浮点中间目标（`rgba16float`）。
  - Three.js WebGPU 节点管线在源与目标纹理格式不匹配时，只在内部打出静默 Warning 并提前 return，并未真正执行 GPU 拷贝命令。
  - 但调用方代码未校验拷贝状态，盲目将 `historyValid` 置为 1，导致时间性历史累积链条静默断裂。
- **修复方案**：
  - 初期方案：引入 `framebufferCopyWouldFail()` 守卫函数，镜像 Three.js 源上下文查找逻辑，在格式不一致时强制置 `historyValid = 0`。
  - 最终根本方案：彻底取消后处理链对“当前绑定输出是谁”的隐式猜测，由调用方显式传入源纹理对象，并在管线构造期完成纹理格式的严格对齐。

---

### 1.3 Post 链在两条后端上静默空转（Empty Input & Tint IR Failure）

- **故障现象**：
  - WebGL2 路径下：修复 Bug 1 后，页面崩溃消失，但画面中世界层（粒子与透镜）全部变黑，仅剩 DOM 与玻璃边框。
  - WebGPU 路径下：虽然有画面，但后处理效果（Bloom、色散、颗粒、高光压制）完全没有作用在最终合成上。
- **排查路径**：
  1. 关闭后处理链（`enabled: false`）时，世界画面完全恢复；
  2. 将后处理改写为纯透传（Passthrough）Shader，画面仍然全黑；
  3. 将输出强制固定为常量红色 `vec4(1, 0, 0, 1)`，整幅画布变红；
  4. 输出采样值 `vec4(uv.x, uv.y, baseSample.r, 1)`，发现 UV 坐标完全正确，但从源采得的 `baseSample` 恒为 0。
- **根本原因**：
  - **WebGL2 一侧（输入为空）**：`renderFrame()` 逐帧动态切换 `renderer.outputColorSpace` 与 `toneMapping`，这触发了 Three.js 内部的 `needsFrameBufferTarget` 动态翻转，导致场景渲染直接写入了 Canvas Framebuffer，而随后的 `copyFramebufferToTexture()` 试图从内部从未写入过的 `frameBufferTarget` 中提取源像素，采到了全黑图。
  - **WebGPU 一侧（Tint IR 生成失败）**：Post 管线的 WGSL 语法树在经过 Dawn 的 Tint 编译器降低（IR Lowering）时报错：`swizzle view instruction still has usages after lowering`。Three.js WebGPU 运行时捕获该错误后仅打印控制台日志，不抛出 JS 异常，并继续每帧提交非法的 CommandBuffer。因此 WebGPU 画布呈现的仅仅是未经后处理的裸合成。
- **修复方案**：
  - 架构重构：将渲染步骤 3–4 统一合成到独立自建的 `compositeRT` 中，后处理链严格从 `compositeRT.texture` 采样，画布最终输出统一由 `RenderPipeline` 全屏 Quad 负责写入。彻底移除逐帧切换 `outputColorSpace` / `toneMapping` 的脆弱逻辑。
  - 拷贝对齐：`commit()` 改用 `renderer.copyTextureToTexture()`，在构造期锁死源与历史缓冲格式。
  - Tint WGSL 修复：Tint 降级失败的根因是在模块级 `var<private>` 上使用了嵌套 Swizzle 表达式（如 `vec3(v.xyz.y, ...)`）。将其移入着色器函数内部的本地 `let` 变量后编译通过。

---

### 1.4 自有 Render Target 的 UV 上下翻转（Render Target FlipY UV Invert）

- **故障现象**：在 Bug 3 修复后，后处理链首次真正运行，但画面构图严重错位，像是被施加了错误的几何形变。透传态与开启态的像素残差高达 `10.61`。
- **排查路径**：
  - 假说 1：整幅画面旋转了 180°？尝试 `rotate(180)`，残差进一步恶化至 `21.93`；
  - 假说 2：画面被水平翻转？尝试 `FLIP_LEFT_RIGHT`，残差为 `24.69`；
  - 假说 3：垂直轴镜像？通过自研探针扫描“绕不同水平轴翻转”后，在绕画面中心水平轴（`y = 450`）翻转时，残差骤降至 `1.32`。
- **根本原因**：
  - 管线使用标准 `screenUV` 采样自建的 Render Target。
  - Three.js 遵循 OpenGL 纹理自下而上的坐标存储约定，且其 `isFlipY()` 在 WebGPU 与 WebGL 两个 Node Builder 上**均返回 `false`**，不会主动补偿调用方的采样坐标。
- **修复方案**：
  - 在节点图中使用显式翻转空间：`vec2(screenUV.x, oneMinus(screenUV.y))`。
  - 将源纹理、深度纹理、历史累积纹理、核采样偏移以及 Reprojection Clip 坐标全量对齐至该空间。
- **度量判据**：
  - 「透传态 vs 关闭态」的均方根像素残差（Passthrough Residual）：修复前为 `10.61`，修复后收敛至 `0.92`（系统噪声地板为 `0.20`）。残差小于 1 证明后处理链在关闭所有效果时能保证无损透传，在开启效果时能精准对齐像素。

---

## 2. CrystalText SDF 文字引擎故障剖析

UI-Lib 的 `CrystalText` 组件将文字渲染为 3D 空间内的距离场（SDF）网格，使位于前方的 DOM 玻璃面板能够对其产生真实的物理折射与磨砂效果。开发初期该组件连续三轮未能正确渲染，其排查总结如下：

### 2.1 背面剔除导致的静默隐形（Backface Culling）

- **现象**：网格实例已挂载到 Scene，变换矩阵与包围盒计算完全正确，但画面没有任何文字像素，无任何报错。
- **原因**：`createTextGeometry` 构建字符 Quad 时的顶点绕序（左上 → 右上 → 右下）在沿 +Z 观察时呈顺时针方向。在 Three.js 默认的 `FrontSide` 剔除模式下被直接判定为背面剔除。
- **修复**：材质显式声明 `side: DoubleSide`（不直接修改顶点索引，以保证 `sampleTextPoints` 对角线索引契约不变）。

### 2.2 双重 Alpha 覆盖率计算（Double Alpha Over-Multiplication）

- **现象**：文字边缘出现虚化的脏边，整体字形过淡，抗锯齿过渡区呈现非预期的半透明镂空。
- **原因**：着色器逻辑内部先将 Color 与 Alpha 进行了相乘，随后 Three.js 的 `srcAlpha` 混合模式又对输入 Alpha 执行了一次相乘，导致 SDF 软边区域被连续抽干两次。
- **修复**：在 TSL 节点图中将 `colorNode` 与 `opacityNode` 严格分离，禁止在材质内部进行预乘混合。

### 2.3 距离场动态范围饱和度不足（Distance Field Saturation）

- **现象**：CJK 汉字笔画严重发虚，`smoothstep` 计算结果几乎贴近 0，难以显现笔锋。
- **原因**：字体 Atlas 生成时采用了 48px 基准配合 4 纹素 range，4 纹素的距离过渡区已经超过了复杂汉字笔画的半宽。导致字形中心区域的内部符号距离 `sigDist` 最大仅能达到约 `-0.12`，无法达到饱和平原。
- **修复**：重构 Atlas 生成管线为 64px 基准配合 2 纹素 range，汉字笔画中心的最亮纹素由 207 提升至满幅饱和值 255。

### 2.4 MSDF 与 SDF 差异及 `pxRange` 严格推导

- **SDF vs MSDF**：
  - 纯 MSDF（多通道带符号距离场）将不同边缘方向的距离编码入 RGB 三个独立通道，利用中值滤波在放大时保持尖锐锐角。
  - 当前本地离线生成的 Atlas（由 8SSEDT 算法驱动）将单一距离值写入三个通道，数学上等价于单通道 SDF，在中值计算下输出等价，但尖角稍显圆润。因此产物显式命名为 `iris-sdf.{png,json}`。
- **`pxRange` 的数学推导**：
  - 字符材质中的 `pxRange` 是唯一的“错了也不报错、但会直接毁掉字形清晰度”的关键参数。
  - Atlas 中存储的归一化距离为：
    $$s = 0.5 - \frac{d}{2 \cdot \text{distanceRange}}$$
  - 每个纹素的距离变化率为 $\frac{1}{2 \cdot \text{distanceRange}}$。
  - 每屏幕像素的纹素跨度由导数矩阵给出：$\text{fwidth}(uv) \cdot \text{scaleW}$。
  - `evaluateMSDF` 将 $\text{fwidth}(uv)$ 乘以 `pxRange`，两者在抗锯齿过渡带宽上严格重合的唯一条件是：
    $$\text{pxRange} = \frac{\text{scaleW}}{2 \cdot \text{distanceRange}}$$
  - 当前打包 Atlas 的实际参数：$\text{scaleW} = 696$，$\text{distanceRange} = 4$，严格推导结果为 $\text{pxRange} = 87$。若直觉性地传入 4，文字边缘会被软化 4 倍。该推导已作为断言写入 `packages/shaders/test/textMaterial.test.ts`。

---

## 3. 图形自动化度量方法学与经验教训

### 3.1 WebGPU 画布不可使用 `drawImage` 读回

- 在 Chromium 中，直接对 WebGPU `<canvas>` 执行 Canvas2D 的 `ctx.drawImage(webgpuCanvas, ...)` 会由于跨上下文拷贝限制返回透明空图（全 0 像素）。
- **结论**：所有基于像素分析的门禁（如 `check:pixels` 与 `check:post`）必须统一走合成器截图管线（通过 Playwright Page API），才能获得真实光栅化后的 Ground Truth。

### 3.2 正在失败的测试页面无法提供有效测量

- 在调试阶段，曾观察到某探针报告“组件 follow 回调次数 = 0”，初步推测为渲染调度器停止了帧循环。
- 进一步排查发现，真实原因是某个上游导出的重构导致模块加载阶段产生运行时语法错误，整个页面代码根本没有完成执行。
- **法则**：在对任何数值指标做结论前，必须优先确认页面的网络状态、Console 错误与 Stage 就绪事件。

### 3.3 视觉“变淡”不等于“渲染故障”

- 测试中曾有反馈称某卡片中的文字“几乎看不清，怀疑材质未生效”。
- 经隔离实验证明：文字网格位于 3D 世界，上方覆盖着带有物理磨砂与折射属性的 `SoftCard` 玻璃面板，面板真实的散射使得背后的文字自然被模糊。将文字槽位移出玻璃遮挡区后，高对比度的墨迹立刻完整显现。这证明渲染器在精准地遵循光学规律。

### 3.4 像素自动化验证的四大结构性法则

为避免传统截图比对（`toHaveScreenshot`）随显卡驱动、操作系统文字渲染微调而腐烂的问题，UI-Lib 确立了四项抗噪结构不变量：

1. **必须在冻结状态下度量（`prefers-reduced-motion`）**：
   动态渲染每帧产生粒子移动与 TAA 累积抖动。像素门禁必须统一在停机时钟下运行，使被测试的单一交互成为全场唯一变量。
2. **使用“矩形内变化 / 矩形外变化”的能量比值**：
   玻璃面板显隐时会向四周扩散泛光与折射边缘。单纯统计绝对差异像素数量会因泛光外溢而误报。采用内外变化能量的比值能够自动将全局外溢项约分消解。
3. **一次只测试一个面板**：
   若同时隐藏多个对称分布的面板，在居中对称布局下，镜像错误会映射到自身并产生欺骗性的重合度。必须逐个面板单点激活测试。
4. **禁止依赖绝对阈值扫描**：
   环境光和色散造成的像素级扰动与微弱信号在绝对灰度阈值上高度重合，只有使用无量纲的比值指标才能形成稳定的二值判定门禁。
