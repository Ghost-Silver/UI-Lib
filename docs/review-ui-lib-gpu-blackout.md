# UI-Lib GPU 黑屏（Blackout）根因分析与根治修复

> 状态：已修复（未提交时为工作区改动，见 `git status`）
> 复现：真机（WebGPU 严格设备校验）上打开液体玻璃 demo，出现「一帧带文字画面一闪而过，随后整屏黑屏」。
> 结论：这是 **read-after-write 设备校验违规**，不是着色器数值 bug，也不是参数合并 bug。

---

## 症状

- 真机：页面先闪过一帧正常画面，紧接着整屏变黑。
- 本地（无可用 GPU 的虚拟机 / headless）只能复现到「降级 CSS fallback」，无法触发 GPU 通路。

## 根因

玻璃层的折射素材在旧实现里使用了 three/tsl 的 `viewportSharedTexture()`：

```ts
// packages/shaders/src/liquidGlass.ts（旧路径）
if (useViewport) return viewportSharedTexture(uvNode);
```

`viewportSharedTexture()` 会在**正在写入的帧缓冲（backbuffer）**上新建一个纹理采样器。这构成了 WebGPU 禁止的 **read-after-write**：

1. 同一渲染调用既往 backbuffer 写颜色，又从它读取做折射；
2. 严格校验的 WebGPU 设备（真机）直接判定违规 → 触发验证错误 / 设备丢失事件；
3. 管线被杀死 → 画布永久黑屏。桌面宽松驱动可能吞掉错误，所以本地「跑得通」。

另外，backbuffer 若开启 MSAA（`antialias: true`），其采样数 w 与 RGBA8 纹理的采样数 1 不一致，同样会触发
`Invalid texture colorBuffer / sample count mismatch` 一类的校验错误，进一步坐实「实时采样 backbuffer」这条路
在 WebGPU 上根本不可行。

## 根治方案

不要设计依赖「实时采样 backbuffer」的折射路径。渲染管线改为等价、但完全离屏的流程
（见 `packages/renderer/src/glassLayer.ts` 的 `renderFrame`）：

```text
[1] backdrop（背景）＋ [1.5] 世界粒子  ──render──→  backdropRT（独立 WebGLRenderTarget，非 MSAA）
[2] 世界物体（透镜 / inside / front，post 开启时带 Halton jitter）──→  backdropRT
[3] presentQuad（MeshBasicMaterial，map = backdropRT.texture）＋ 玻璃面板（同样采样 backdropRT.texture）
        ──render──→  compositeRT（自建，含深度）
[4] 有 post：RenderPipeline 采样 compositeRT.texture ──→ 画布（tone mapping / 输出色彩变换只发生这一次）
    无 post：presentQuad（map = compositeRT.texture）──→ 画布（由 three 自己的输出 pass 做变换）
```

- 折射素材来源固定为 `backdropRT.texture`，**永远不会**去读正在被写入的 backbuffer；
- 因为 same-pass read-after-write 被消除，也顺带消除了 MSAA 采样数冲突；
- `backdropRT` / `compositeRT` 随分辨率在 `syncViewport` 里 `setSize` 同步，并在 `dispose()` 释放，无资源泄漏。

> **后续变更（2026-10-01）**：最初的流程是「[3] presentQuad 把 backdrop 呈现到**屏幕**，[4] 玻璃面板再画到屏幕」，
> 中间结果直接落在画布上。这条路径后来被证明有问题：它要求 post 链去猜「当前画布是谁」，而那个答案会被
> 逐帧的 `toneMapping` / `outputColorSpace` 切换改掉，导致整条后处理链拿到一张空图（WebGL2 全黑），
> 而 WebGPU 的 post 管线根本编译不过、链路静默空转。现在第 3–4 步合成到自建的 `compositeRT`，
> 画布只由 `RenderPipeline`（或没有 post 时的 present pass）写，那两行逐帧切换整个删掉了。
> 详见 [`benchmarks/2026-10-01-apple-m3-pro.md`](./benchmarks/2026-10-01-apple-m3-pro.md) 的缺陷 3。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `packages/renderer/src/glassLayer.ts` | 新增 `backdropRT`、`presentScene/presentQuad`；`renderFrame` 改为「背景→RT→屏幕→玻璃」四段；`createPanelMaterial` 恒传 `backdrop: this.backdropRT.texture`（`useViewport=false`，走不到 `viewportSharedTexture`）；新增 RT 的 resize 与 dispose。 |

## 遗留说明

`liquidGlass.ts` 里 `backdrop == null` 的「实时采样帧缓冲」模式仍保留（保证材料 API 向后兼容），但**玻璃层已不经过
这条路径**。任何新材料若继续用该默认模式，在 WebGPU 严格校验设备上仍可能黑屏——新代码一律应显式传 `backdrop`。