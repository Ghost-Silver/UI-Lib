# 真机基准

这个目录存放**按 GPU 分桶**的真机测量记录。CI 跑不了这些数字：CI 是 headless 的，而 macOS 上 headless Chromium 会回退到 SwiftShader 软件光栅化——那描述的是软件渲染器，不是用户的机器。

## 记录

| 日期 | 机器 / 后端 | 记录 |
|---|---|---|
| 2026-10-01 | Apple M3 Pro / Metal (`apple / metal-3`) | [`2026-10-01-apple-m3-pro.md`](./2026-10-01-apple-m3-pro.md) |

## 复现

需要一台有真实 GPU 的机器。测量脚本**不会**替你启停服务器。

```bash
pnpm install
pnpm build
pnpm --filter @ui-lib/docs preview --host 127.0.0.1 --port 5173 --strictPort
```

另开一个终端：

```bash
node scripts/measure-device.mjs --dpr 1
node scripts/measure-device.mjs --dpr 2
node scripts/measure-device.mjs --dpr 2 --backend webgl
```

输出写到 `reports/device/<gpu-bucket>-dpr<N>[-webgl2]/`，每个 bucket 一份 `measurement.json`、一份 `measurement.md` 和六张 PNG。`reports/` 已在 `.gitignore` 里——这些数字描述的是某一台机器，不是这个项目。

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

DPR 1 下渲染目标只有 Retina 面板的四分之一大小。六页全部锁 120 fps 在这种分辨率下说明不了什么——真正有信息量的是 DPR 2。

## 怎么读数字

**帧间隔由脚本自己的 `requestAnimationFrame` 循环在页面内采样**，不读运行时自己的计数器。运行时的计数单独记录：

- `droppedFrames` 是 `expectedFrames = max(1, round(raw × 60))`，即按**固定 60 Hz 预算累计**。它是累计值，不是掉帧率。只应记录窗口内的增量。
- `longFrames` 是超过 50 ms 的帧数。

**可以当基线用的**：`p50`、以及是否出现 16.7 ms 台阶（120 Hz 与 60 Hz 节奏混用）。

**不要当门禁用的**：`max` 与 `>16.7ms` 计数。实测中这两个指标在两次运行之间可以差一倍以上（同一页 `max` 150.1 ms → 58.4 ms），对 GC 与后台进程过于敏感。

## 截图

`screenshots/` 下是等比缩放到 720px 宽的参考帧，原图留在 `reports/device/`。

它们是**参考帧，不是像素门禁**。仓库里没有 `toHaveScreenshot`，测试文件里也不会有：粒子与玻璃持续运动，静态基线换一台机器必然失败，却保护不了任何东西。要真正做视觉门禁，需要按 `(OS, GPU 后端, 浏览器)` 分桶存基线、允许像素阈值、只比对关键帧，并提供 `--update-baseline`。
