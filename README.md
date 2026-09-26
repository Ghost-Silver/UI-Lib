# UI-Lib

**A GPU-first visual-effects layer for the web.** 3D, particles, refraction, post-processing and
scroll cinema — the stuff Apple's site does with video and CSS, done in real time on the GPU, and
available to any app through a typed, progressively-enhanced API.

> Status: **Milestone 1 (liquid glass) is working.** WebGPU first, automatic WebGL 2 fallback,
> pure-CSS fallback when there is no GPU at all. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

```bash
pnpm install
pnpm dev        # http://localhost:5173 — interactive playground
```

---

## What makes it different

|  | Apple's site / typical UI kit | UI-Lib |
| --- | --- | --- |
| Glass | `backdrop-filter: blur()` — blur only, no refraction, no dispersion | real screen-space refraction, chromatic dispersion, bevel thickness, edge caustics |
| Particles | hundreds to thousands (CPU or CSS) | **millions** — physics in GPU compute shaders |
| Post-processing | none | bloom, chromatic aberration, bokeh DOF, motion blur, TAA |
| Backends | hand-tuned per effect | one TSL graph → WGSL **or** GLSL, chosen automatically |
| Perf strategy | manual | device tiering + measured-fps auto-degrade + offscreen pause |
| Instances | one canvas per effect | **one canvas per page**, N panels inside it |

## Milestone 1: liquid glass

The glass look is built entirely from a rounded-rect SDF, in
[`packages/shaders/src/liquidGlass.ts`](packages/shaders/src/liquidGlass.ts):

1. the SDF gives an antialiased silhouette **and** a bevel parameter `t`
   (0 at the outer rim, 1 on the flat centre);
2. `t` drives a quarter-round surface normal — flat in the middle, curving to near-vertical at the
   rim, which is what makes the edge bend light;
3. that normal offsets screen-space UVs to sample the framebuffer, with a per-channel scale for
   chromatic dispersion;
4. `roughness` cross-fades into a golden-angle disc blur (frosted glass), whose tap count comes from
   the adaptive quality tier.

Refraction reads the live framebuffer through three's `viewportSharedTexture()`, which
de-duplicates the copy **per render call** — so forty panels still cost one blit per frame.

## Usage

```tsx
import { GlassPanel, GlassStage } from "@ui-lib/react";

export default function Page() {
  return (
    <GlassStage backdrop={{ type: "gradient", colors: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"] }}>
      <GlassPanel radius={34} refraction={46} dispersion={0.3} roughness={0.2} className="card">
        <h2>Text sits *on* the glass, not inside a canvas.</h2>
      </GlassPanel>
    </GlassStage>
  );
}
```

Or imperatively, without React:

```ts
import { createGlassLayer } from "@ui-lib/renderer";

const layer = await createGlassLayer({ backdrop: { type: "gradient" } });
const handle = layer.register(document.querySelector(".card")!, { radius: 34, refraction: 46 });
// handle.update({ roughness: 0.6 }) · handle.dispose()
```

No GPU? No WebGPU? `prefers-reduced-motion`? The panel silently becomes a `backdrop-filter` card.
Nothing throws, nothing looks broken.

## Packages

| Package | Depends on three? | What it holds |
| --- | --- | --- |
| [`@ui-lib/core`](packages/core) | no | device probing, adaptive quality, one unified frame loop, math, pointer, lifecycle |
| [`@ui-lib/shaders`](packages/shaders) | yes | TSL node materials: liquid glass, gradient-mesh backdrop |
| [`@ui-lib/renderer`](packages/renderer) | yes | renderer bootstrap (WebGPU→WebGL 2), backdrop passes, the DOM-attached glass layer |
| [`@ui-lib/react`](packages/react) | yes | `<GlassStage>`, `<GlassPanel>`, hooks, CSS fallback |

Layering rule: `core` never imports three; adapter packages sit on top; reverse dependencies are bugs.

## Scripts

```bash
pnpm dev        # playground (apps/docs)
pnpm build      # build every package (tsup: ESM + d.ts)
pnpm typecheck  # tsc --noEmit across the workspace
pnpm test       # vitest
pnpm lint       # biome
```

## Browser support

| Backend | Where |
| --- | --- |
| WebGPU | Chrome/Edge 113+, Safari 26+, Firefox 141+ |
| WebGL 2 | everything else — automatic, same shader graph |
| CSS | no GPU at all — `backdrop-filter` fallback |

## Next

Milestone 2 is the GPU particle engine (compute shaders, curl-noise force fields, 1M+ particles).
Full plan, milestones and open questions: [`docs/ROADMAP.md`](docs/ROADMAP.md).
