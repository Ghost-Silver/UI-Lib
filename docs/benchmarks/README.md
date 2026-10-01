# 真机基准

这个目录存放**按 GPU 分桶**的真机测量记录。CI 跑不了这些数字：CI 是 headless 的，而 macOS 上 headless Chromium 会回退到 SwiftShader 软件光栅化——那描述的是软件渲染器，不是用户的机器。

## 记录

| 日期 | 机器 / 后端 | 记录 |
|---|---|---|
| 2026-10-01 | Apple M3 Pro / Metal (`apple / metal-3`)，WebGPU + WebGL2 | [`2026-10-01-apple-m3-pro.md`](./2026-10-01-apple-m3-pro.md) |

第一份记录的价值不在数字本身，而在它抓到了四个既有测试看不见的缺陷：WebGL2 每帧抛异常、WebGPU 时间性链路失效、**post 链在两条后端上都没在干活**、以及自有 render target 的 UV 上下翻转（修前一个的过程中才显形）。四个**现已全部修复**，本目录里的帧节奏数字是链真正工作之后复测的。

## 复现

需要一台有真实 GPU 的机器。测量脚本**不会**替你启停服务器。

```bash
pnpm install
pnpm build
pnpm --filter @ui-lib/docs preview --host 127.0.0.1 --port 4173 --strictPort
```

另开一个终端：

```bash
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --dpr 1
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --dpr 2
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --backend webgl --dpr 1
node scripts/measure-device.mjs --url http://127.0.0.1:4173 --backend webgl --dpr 2
```

输出写到 `reports/device/<gpu-bucket>-dpr<N>[-webgl2]/`，每个 bucket 一份 `measurement.json`、一份 `measurement.md` 和六张 PNG。`reports/` 已在 `.gitignore` 里——这些数字描述的是某一台机器，不是这个项目。

**测之前先跑着色器门禁**（同样需要真实 GPU）：

```bash
pnpm --filter @ui-lib/docs build
pnpm check:shaders
```

它会告诉你六页在两条后端上各编译出多少个着色器模块与渲染管线。第一份记录里 WebGPU 的 post 管线是**编译失败**的——画面看起来正常，实际上管线什么都没写，而当时没有任何测试能发现这一点。

### 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--url` | `http://127.0.0.1:5173` | 被测地址 |
| `--window` | `8000` | 采样窗口（ms） |
| `--warmup` | `3000` | 采样前预热（ms）。冷启动要编译 shader，那部分成本属于预热，不属于测量 |
| `--dpr` | 不设，用浏览器默认（1） | `deviceScaleFactor` |
| `--backend` | 不设，走自动（WebGPU 优先） | `webgl` 时通过 playground 自己的 `?backend=` 开关强制 WebGL2 |
| `--out` | `reports/device` | 输出根目录 |
| `--headless` | 关 | 打开后基本一定拿到 SwiftShader，只用来验证脚本本身能跑通 |

### 为什么 `--dpr` 是必测项

DPR 1 下渲染目标只有 Retina 面板的四分之一大小。六页全部锁 120 fps 在这种分辨率下说明不了什么——真正有信息量的是 DPR 2。实测印证了这一点：WebGPU 在 DPR 2 上仍守住 120 fps，而 WebGL2 在 DPR 2 上六页里五页出现 120/60 Hz 双峰台阶。

### 不要拿 dev server 当被测产物

`pnpm dev` 起的是带 HMR 的 dev server，它服务的不是构建产物，还多一层模块转换开销。要测就测 `vite preview` 后面的静态产物。如果 5173 上已经有一个 dev server 在跑，换一个端口，别把两者混起来比。

## 怎么读数字

**帧间隔由脚本自己的 `requestAnimationFrame` 循环在页面内采样**，不读运行时自己的计数器。运行时的计数单独记录：

- `droppedFrames` 是 `expectedFrames = max(1, round(raw × 60))`，即按**固定 60 Hz 预算累计**。它是累计值，不是掉帧率。只应记录窗口内的增量。
- `longFrames` 是超过 50 ms 的帧数。

**可以当基线用的**：`p50`、以及是否出现 16.7 ms 台阶（120 Hz 与 60 Hz 节奏混用）。

**不要当门禁用的**：`max` 与 `>16.7ms` 计数。实测中这两个指标在两次运行之间可以差一倍以上（同一页 `max` 150.1 ms → 58.4 ms），对 GC 与后台进程过于敏感。

### 别把"链路开着"当成"链路在跑"

这是第一份记录最大的教训。要确认后处理真的生效，用两个独立检查，不要靠看截图：

1. **`pnpm check:shaders`** —— 给出确切的着色器模块数与管线数，编译失败直接标红。
2. **「透传态 vs 关闭态」的像素残差** —— `enabled: false` 的链路应当与完全不跑链路等价。健康值在 1 以下（噪声地板 0.2 左右）；如果它到了两位数，说明链路的输入是错的。作为对照，「开启 vs 关闭」的真实观感差异应当在 10 左右。

## 截图

`screenshots/` 下是等比缩放到 720px 宽的参考帧，原图留在 `reports/device/`。

它们是**参考帧，不是像素门禁**。仓库里没有 `toHaveScreenshot`，测试文件里也不会有：粒子与玻璃持续运动，静态基线换一台机器必然失败，却保护不了任何东西。要真正做视觉门禁，需要按 `(OS, GPU 后端, 浏览器)` 分桶存基线、允许像素阈值、只比对关键帧，并提供 `--update-baseline`。

不过截图可以**做跨后端的一致性检查**，这不依赖基线：同一页在 WebGPU 与 WebGL2 下的直接残差应当远低于任何翻转或镜像后的残差。第一份记录用它确认了 UV 翻转已修好（六页直接残差 0.000–6.020，翻转后 10.6–35.2）。
