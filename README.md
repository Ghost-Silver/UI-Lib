# UI-Lib

**A GPU-first motion and visual-effects runtime for the web.**

UI-Lib brings real-time liquid glass, GPU particles, 3D composition and TSL post-processing to ordinary web interfaces. It is designed for product heroes, scroll narratives and interactive surfaces—not for replacing semantic HTML with a canvas.

> **Status: experimental `0.0.1`.** The rendering spine and the first Liquid Glass / particles / post-processing slices are implemented. Browser-level visual regression, production SSR APIs, DOM/motion packages and the flagship demos are still in progress. This README deliberately separates implemented behavior from roadmap claims.

[Roadmap](docs/ROADMAP.md) · [Interactive playground](apps/docs) · [Packages](#packages)

---

## Why UI-Lib exists

Most web visual effects make one of two compromises:

- CSS is accessible and easy to integrate, but `backdrop-filter` is only an approximation of glass and cannot provide a shared 3D world or GPU simulation.
- A canvas demo can look impressive, but it often introduces another renderer, another animation loop, inaccessible content and no reliable teardown path.

UI-Lib takes a third approach:

- **DOM stays DOM.** Text, links, forms and layout remain semantic HTML.
- **One shared rendering runtime.** A page uses one canvas, one renderer and one scheduler for all UI-Lib effects.
- **Progressive enhancement.** WebGPU is preferred, WebGL2 is the automatic GPU fallback, and CSS/static states remain available when no GPU is usable.
- **TSL only.** Materials and post effects are expressed as Three Shading Language node graphs so the same graph can compile to WGSL or GLSL. UI-Lib does not require raw GLSL/WGSL effect code.
- **Deterministic lifecycle.** Every renderer, particle system, material, geometry and subscription has an explicit disposal path.

UI-Lib is **not** a component library for buttons, cards or layout primitives. It is the visual runtime underneath those interfaces.

## Current status

### Implemented rendering slices

- Liquid Glass attached to real DOM elements
  - rounded-rectangle SDF silhouette and bevel shading
  - screen-space refraction
  - chromatic dispersion
  - frost / roughness blur
  - edge highlight, fresnel and tint controls
- GPU particles
  - WebGPU compute path
  - WebGL2 transform-feedback fallback
  - emitters, gravity, drag, turbulence, vortex, attractor and bounds
  - color-over-life, speed heat, soft sprites and additive blending
- TSL post-processing
  - bloom, atmospheric halo and lens streak
  - chromatic aberration, grain, exposure, contrast and saturation
  - vignette, focus blur and directional motion blur controls
  - Halton-jittered temporal accumulation
  - depth history, disocclusion rejection, variance clipping and reactive rejection
  - compile-time quality budgets (`quality: 1 | 2 | 3`)
- Runtime behavior
  - WebGPU-first renderer selection with WebGL2 fallback
  - adaptive quality tiers and measured-FPS degradation
  - reduced-motion handling
  - hidden-tab scheduler pause
  - static-frame redraw and TAA-history skipping when the scene is stable
  - CSS fallback when the GPU path is unavailable or explicitly disabled
  - shared renderer, canvas and scheduler for the stage

### Not yet production-ready

The following are intentionally **not** presented as finished capabilities:

- real browser screenshot and FPS regression gates
- GPU resource leak tests across repeated mount/unmount cycles
- world-only per-pixel velocity MRT
- reusable multi-pass bloom pyramid and custom post-pass slots
- DOM ↔ GPU bridge and scroll-linked motion package
- MSDF text
- dynamic particle LOD, trails and validated pointer-to-world ray casting
- complete imperative `createEffect()` API
- R3F, Vue and Svelte adapters
- SSR/hydration examples and release automation

The playground is a technical showcase, not evidence of a guaranteed performance number. In particular, UI-Lib does **not** currently claim that one million particles run at 60 FPS on all WebGPU devices.

## Quick start

Requirements:

- Node.js `>=20.19`
- pnpm `12.x`
- a browser with WebGPU or WebGL2 for the accelerated path

```bash
pnpm install
pnpm dev
```

Open the playground at `http://localhost:5173`.

Build and validate the workspace:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

The current repository has Node-side tests and TSL graph smoke tests. Full browser visual/performance validation requires a Playwright-capable environment with the relevant browser and GPU support; it is a planned P0 gate, not something this package currently fakes with a typecheck.

## React usage

`@ui-lib/react` is the first adapter. The content remains normal DOM while the stage owns the shared GPU layer.

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
        <h2>Semantic content stays on the page.</h2>
        <p>The GPU layer changes the surface, not the document.</p>
      </GlassPanel>
    </GlassStage>
  );
}
```

`ParticleField` is simulated and rendered inside the same stage as the glass. The glass therefore refracts the backdrop and the particle layer without creating a second canvas or renderer.

### Imperative escape hatch

The renderer can also be used without React:

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
  // handle.dispose() when the element or route is removed
}

// layer.dispose() when the owner is destroyed
```

The standalone effect factory, richer command surface and external-store integration are planned API work. The current imperative API is useful, but should not yet be treated as the final cross-framework contract.

## Architecture

```text
semantic DOM / React adapter
              │
              ▼
       @ui-lib/renderer
   one canvas · one renderer
              │
       ┌──────┼────────┐
       ▼      ▼        ▼
  backdrop particles  glass DOM surfaces
              │
              ▼
        @ui-lib/post
     TSL post graph + history
              │
       WebGPU or WebGL2
```

The frame order is intentionally shared:

```text
input → GPU compute → DOM/state update → backdrop → particles → glass → post resolve
```

A stable color/texture backdrop with no active world objects, pointer changes or layout changes can skip the complete redraw and history copy. Quality changes rebuild compile-time graph budgets rather than pretending that an already-expanded shader loop can be changed with a uniform.

## Packages

| Package | Three.js | Responsibility | Status |
| --- | --- | --- | --- |
| [`@ui-lib/core`](packages/core) | no | device capabilities, quality tiers, scheduler, pointer, math and lifecycle primitives | implemented |
| [`@ui-lib/shaders`](packages/shaders) | peer | TSL node materials for Liquid Glass and backdrops | implemented slice |
| [`@ui-lib/particles`](packages/particles) | peer | GPU simulation, emitters, forces, bounds and particle rendering | implemented slice |
| [`@ui-lib/post`](packages/post) | peer | TSL post graph, quality budgets, temporal history and color processing | implemented slice |
| [`@ui-lib/renderer`](packages/renderer) | peer | WebGPU/WebGL2 bootstrap, stage orchestration and DOM-attached glass | implemented slice |
| [`@ui-lib/react`](packages/react) | peer | React `GlassStage`, `GlassPanel`, `ParticleField` and fallback styles | first adapter |
| `@ui-lib/motion` | — | timeline, spring orchestration, gestures and scroll-linked motion | planned |
| `@ui-lib/dom` | — | DOM ↔ GPU tracking, snapshots and transitions | planned |
| `@ui-lib/vue` / `@ui-lib/svelte` | — | additional framework adapters | planned |

`three` is a **peer dependency** of the rendering packages. UI-Lib does not bundle a private copy of Three.js into those packages. `@ui-lib/core` remains framework-agnostic and Three-free.

## Rendering and fallback policy

### Backend selection

1. Request a usable WebGPU adapter.
2. Fall back to WebGL2 using the same TSL source graph where the feature is supported.
3. Use the CSS/static fallback when neither GPU backend is available, when reduced motion requires it, or when the application opts out.

The exact backend depends on the browser, OS, driver, device policy and context availability. UI-Lib does not promise a browser version table without running its browser matrix.

### Quality tiers

Post-processing tap counts and expensive graph branches are selected at compile time:

| Quality | Intended use | Post budget |
| --- | --- | --- |
| `1` | constrained devices | minimal graph; may disable post FX through the quality manager |
| `2` | balanced default | medium bloom/TAA budget |
| `3` | high-end / cinematic | full current bloom/TAA budget |

Runtime FPS monitoring can move between quality tiers. Rebuilding a graph is deliberate: loop and tap counts are compile-time decisions in TSL.

### Accessibility

UI-Lib is decorative enhancement around real HTML:

- content should remain available without the GPU canvas;
- `prefers-reduced-motion` must settle effects into a readable, low-motion state;
- canvas layers should be decorative and must not intercept keyboard focus;
- application-owned semantics, focus order and controls remain in the DOM.

Accessibility browser tests and a documented reduced-motion contract are part of the production acceptance work.

## Performance principles

UI-Lib is built around constraints rather than marketing numbers:

- one canvas, one renderer and one scheduler per stage/application;
- no extra renderer to implement particles or post effects;
- no second animation loop for motion or DOM synchronization;
- hidden tabs pause the shared scheduler;
- static scenes avoid unnecessary redraw and TAA history copies;
- lower tiers reduce DPR, particle work and post graph complexity;
- every owned GPU resource has an explicit disposal path.

The docs playground intentionally uses 24,000 particles so the visual demo is usable while the benchmark matrix is unfinished. Device-specific particle LOD and public performance budgets will only be documented after real browser/GPU measurements.

## Roadmap

### P0 — prove the runtime

- Playwright visual regression for WebGPU and WebGL2 smoke paths
- FPS, dropped-frame and interaction benchmarks
- GPU resource/dispose tests
- device-lost and context-lost recovery
- SSR and hydration validation
- five browser-facing acceptance pages with reproducible baselines

### P1 — raise the visual ceiling

- world-only per-pixel velocity MRT
- real multi-pass bloom pyramid
- custom post-pass insertion API
- environment reflection and stronger glass material composition
- dynamic particle LOD and trail buffers
- stable pointer-to-world ray mapping
- camera paths and a complete Glass Product Hero

### P1 — add the motion narrative layer

- `@ui-lib/dom`: element-to-texture and DOM/3D tracking
- `@ui-lib/motion`: timelines, gestures, springs and scroll-linked choreography
- cursor field and magnetic interactions
- MSDF text with character/word/line animation
- Scroll Cinema demo

### P2 — ecosystem and distribution

- R3F adapter and production imperative API
- Vue and Svelte adapters
- Next.js, Nuxt and SvelteKit examples
- Changesets, size budgets, CI browser matrix and npm provenance
- recipes, API reference and copy-ready documentation

### Flagship demos

The target product surface is five real pages, not one parameter playground:

1. **LiquidGlass Pro** — refraction, dispersion, frost and DOM content.
2. **Aurora Flow** — GPU particles, flow fields, cursor forces and adaptive LOD.
3. **Glass Product Hero** — product object, camera path, environment lighting and post graph.
4. **Scroll Cinema** — scroll-linked DOM/3D choreography and MSDF text.
5. **Cursor Field** — pointer field, trails, magnetic UI and motion-aware glass.

Only the first technical slices currently exist in the playground. These demos become complete when they also have browser screenshots, interaction checks, accessibility checks and performance data.

## Non-negotiable design rules

- Core does not import React, Three.js or another framework.
- Three.js remains a peer dependency and is never bundled by the library packages.
- All shader and post work uses TSL; no raw GLSL/WGSL shortcut is used to bypass the cross-backend contract.
- No extra canvas, renderer or scheduler is introduced for a feature.
- Every effect supports an explicit lifecycle and disposal path.
- Reduced motion, no-GPU and WebGL2 states are first-class product states.
- A feature is not “done” because its TSL graph builds: it needs visual, interaction, performance, accessibility and compatibility evidence.

## Development

```bash
pnpm install
pnpm dev          # Vite playground
pnpm typecheck    # TypeScript across the workspace
pnpm test         # Vitest
pnpm lint         # Biome check
pnpm build        # package builds
```

The repository is an experimental monorepo. Public API names may change before the first stable release. Please consult [`docs/ROADMAP.md`](docs/ROADMAP.md) before relying on an item marked planned or experimental.

## License

MIT
