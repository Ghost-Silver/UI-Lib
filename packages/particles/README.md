# @ui-lib/particles

**UI-Lib 的 GPU 粒子引擎。** 状态放在 struct-of-arrays 布局的 storage buffer 里，**全部模拟都在 compute shader 中跑**——CPU 不碰粒子数据。

在 WebGPU 上这是真正的 compute pass；在 WebGL 2 回退路径上，three 把同一份 kernel 编译成 transform-feedback pass。也就是说只有一份实现，不是两条会各自漂移的代码路径。

> **状态：实验性 `0.0.1`。** 第一个 stable release 之前，公开 API 可能发生变化。

## 安装

```bash
pnpm add @ui-lib/particles three
```

`three` 是 **peer dependency**（`>=0.180.0`），不会被捆绑进包里。

## 主要导出

| 分类 | 导出 |
| --- | --- |
| 系统 | `createParticleSystem` `PARTICLE_DEFAULTS` |
| 档位与预算 | `resolveParticleLod` `WEBGPU_PARTICLE_CAP` `WEBGL_PARTICLE_CAP` |
| 轨迹 | `resolveTrail` `TRAIL_MAX` |
| 场景预设 | `PLAYGROUND_FIELD` `PLAYGROUND_FIELD_CAMERA` `PLAYGROUND_VIEWPORTS` `WAKE_FIELD` `WAKE_FIELD_CAMERA` |

## 用法

```ts
import { createParticleSystem } from "@ui-lib/particles";

const particles = createParticleSystem({
	count: "auto",          // 按设备档位分配，而不是无脑要 1M
	forces: { turbulence: 2.2, vortex: 1.4 },
	colors: ["#5eead4", "#a78bfa", "#f472b6"],
});

scene.add(particles.object);
particles.reset(renderer);                       // 渲染器就绪后播种一次

// 每帧：先模拟，再渲染
particles.step(renderer, frame.dt);

particles.setActive(12_000);                     // 只模拟并绘制前 N 个，buffer 保留
particles.setAttractor(x, y, z);                 // 世界坐标的吸引点
particles.dispose();
```

`setActive()` 是档位预算的落点：裁掉的是活跃数量，不是缓冲区，所以降档不需要重新分配。`count` 是分配量，固定不变；`active` 永远不会超过它。

`trailLength` 为 `0` 表示没有申请轨迹缓冲——不开轨迹的页面不会为它付任何代价。

## 相关

- 仓库总览与不可妥协的设计规则：[根 README](../../README.md)
- 路线图：[docs/ROADMAP.md](../../docs/ROADMAP.md)

## License

MIT
