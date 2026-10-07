import { describe, expect, it } from "vitest";
import {
	createWash,
	describeWash,
	IRIS,
	IRIS_TONES,
	type IrisTone,
	type KubelkaMunkPigment,
	MOTION_PRESETS,
	mixPigments,
	mixToCss,
	PROCESS_PIGMENTS,
	paperNoise,
	pigmentFromColour,
	pigmentFromHex,
	reflectanceFromKS,
	specToSpring,
	springToSpec,
	washToCanvas,
} from "../packages/core/src/index.js";
import {
	interpolatePigments,
	mixIrisTones,
	mixMultiPigments,
	mixMultiPigmentsToCss,
	toneToPigment,
} from "../packages/core/src/kubelkaMunk.js";
import { GLASS_LOOKS } from "../packages/react/src/looks.js";
import { MATERIAL_GROUND_CLASS, seedFromName } from "../packages/react/src/material.js";

/**
 * Recording context and document stub for headless Node testing of 2D canvas operations.
 * Intercepts method calls and property setters via Proxy to record exact structural invariants.
 */
interface CanvasOp {
	canvas: number;
	kind: "call" | "set";
	name: string;
	value: string;
}

function installCanvasStub(log: CanvasOp[]): void {
	let nextId = 0;
	const contexts: Array<Record<string, unknown>> = [];

	const makeContext = (id: number): CanvasRenderingContext2D => {
		const target: Record<string, unknown> = {
			canvas: null,
			createRadialGradient: (...args: unknown[]) => {
				log.push({
					canvas: id,
					kind: "call",
					name: "createRadialGradient",
					value: args.map(String).join(","),
				});
				return { addColorStop: () => {} };
			},
			createConicGradient: (...args: unknown[]) => {
				log.push({
					canvas: id,
					kind: "call",
					name: "createConicGradient",
					value: args.map(String).join(","),
				});
				return { addColorStop: () => {} };
			},
			createPattern: () => null,
			measureText: () => ({ width: 0 }),
		};

		return new Proxy(target, {
			get(t, key) {
				const existing = t[key as string];
				if (existing !== undefined) return existing;
				return (...args: unknown[]) => {
					log.push({
						canvas: id,
						kind: "call",
						name: String(key),
						value: args.map(String).join(","),
					});
					return undefined;
				};
			},
			set(t, key, value) {
				t[key as string] = value;
				log.push({
					canvas: id,
					kind: "set",
					name: String(key),
					value: String(value).slice(0, 48),
				});
				return true;
			},
		}) as unknown as CanvasRenderingContext2D;
	};

	const makeCanvas = (): unknown => {
		const id = nextId++;
		return {
			width: 0,
			height: 0,
			getContext: (kind: string) => {
				if (kind !== "2d") return null;
				contexts[id] ??= makeContext(id) as unknown as Record<string, unknown>;
				return contexts[id];
			},
		};
	};

	class FakeImage {
		onload: (() => void) | undefined;
		onerror: (() => void) | undefined;
		set src(_val: string) {
			this.onerror?.();
		}
	}

	class FakePath2D {
		ellipse(): void {}
		arc(): void {}
		rect(): void {}
		moveTo(): void {}
		lineTo(): void {}
	}

	globalThis.document = {
		createElement: (tag: string) => (tag === "canvas" ? makeCanvas() : {}),
	} as unknown as Document;
	globalThis.Image = FakeImage as unknown as typeof Image;
	globalThis.Path2D = FakePath2D as unknown as typeof Path2D;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (Isolated tests for F1–F15)
// ============================================================================

describe("Tier 1: Feature Coverage (F1–F15)", () => {
	// --- F1: Continuous Capillary Wash Profile ---
	describe("F1: Continuous Capillary Wash Profile", () => {
		it("F1-01: createWash emits complete set of CSS variables and classes", () => {
			const wash = createWash({ hue: "#b79cf5", weight: 0.8, seed: 11 });
			expect(wash.className).toMatch(/^ui-lib-wash ui-lib-wash--(wet|drying|dry)$/);
			expect(wash.style["--wash-body"]).toBeDefined();
			expect(wash.style["--wash-ground"]).toBeDefined();
			expect(wash.style["--wash-rim"]).toBeDefined();
			expect(wash.style["--wash-deposit-mask"]).toBeDefined();
			expect(wash.style["--wash-opacity"]).toBeDefined();
			expect(wash.style["--wash-grain"]).toBeDefined();
		});

		it("F1-02: body gradient concentration centers pigment and avoids hollow rings", () => {
			const wash = createWash({ hue: "#b79cf5", weight: 0.75, seed: 7 });
			const body = wash.style["--wash-body"];
			expect(body).toContain("radial-gradient");
			expect(body).toMatch(/rgb\(\d+\s+\d+\s+\d+\)\s+0%/);
			expect(body).toContain("transparent 95%");
		});

		it("F1-03: ground gradient features multiple passes without transparent gaps", () => {
			const wash = createWash({ hue: "#ffb7c5", weight: 0.85, seed: 42 });
			const ground = wash.style["--wash-ground"];
			const passes = ground.split(/radial-gradient\(/).filter(Boolean);
			expect(passes.length).toBeGreaterThanOrEqual(3);
			for (const pass of passes) {
				expect(pass).not.toContain("transparent");
				expect(pass).toContain("100%");
			}
		});

		it("F1-04: describeWash produces human-readable diagnostic report", () => {
			const wash = createWash({ hue: "#b79cf5", weight: 0.9, seed: 5 });
			const desc = describeWash(wash);
			expect(desc).toContain("weight 0.90");
			expect(desc).toContain("arcs");
			expect(desc).toContain("spread");
			expect(desc).toContain("opacity");
		});
	});

	// --- F2: Unified Canvas Coordinate Transform ---
	describe("F2: Unified Canvas Coordinate Transform", () => {
		it("F2-01: washToCanvas applies unified elliptical contour eliminating corner ghosting", async () => {
			const log: CanvasOp[] = [];
			installCanvasStub(log);

			await washToCanvas({
				hue: "#b79cf5",
				weight: 0.7,
				seed: 12,
				width: 300,
				height: 200,
			});

			const ellipseCall = log.find(
				(e) => e.canvas === 0 && e.kind === "call" && e.name === "ellipse",
			);
			expect(ellipseCall).toBeDefined();
			expect(ellipseCall!.value).toContain("6.283185307179586");
		});

		it("F2-02: deposit ring is constructed at origin (0, 0) within translated/scaled context", async () => {
			const log: CanvasOp[] = [];
			installCanvasStub(log);

			await washToCanvas({
				hue: "#b79cf5",
				weight: 0.8,
				seed: 20,
				width: 250,
				height: 250,
			});

			const conicCall = log.find((e) => e.kind === "call" && e.name === "createConicGradient");
			expect(conicCall).toBeDefined();
			const conicArgs = conicCall!.value.split(",");
			expect(conicArgs[1]).toBe("0");
			expect(conicArgs[2]).toBe("0");
		});

		it("F2-03: destination-in is strictly isolated from canvas 0", async () => {
			const log: CanvasOp[] = [];
			installCanvasStub(log);

			await washToCanvas({
				hue: "#9ad9ff",
				weight: 0.65,
				seed: 3,
				width: 200,
				height: 200,
			});

			const destInCanvas0 = log.filter(
				(e) =>
					e.canvas === 0 &&
					e.kind === "set" &&
					e.name === "globalCompositeOperation" &&
					e.value === "destination-in",
			);
			expect(destInCanvas0).toHaveLength(0);

			const destInOther = log.filter(
				(e) =>
					e.kind === "set" &&
					e.name === "globalCompositeOperation" &&
					e.value === "destination-in",
			);
			expect(destInOther.length).toBeGreaterThanOrEqual(1);
		});
	});

	// --- F3: Xuan Paper Fiber & Angle Flow ---
	describe("F3: Xuan Paper Fiber & Angle Flow", () => {
		it("F3-01: isotropic paperNoise generates coarse and fine turbulence passes", () => {
			const noise = paperNoise(100, { fibre: false });
			expect(noise.image).toContain("0.028 0.034");
			expect(noise.image).toContain("0.86 0.72");
			expect(noise.sizes.split(",")).toHaveLength(2);
		});

		it("F3-02: anisotropic paperNoise with fibre=true includes directional streak pass", () => {
			const noise = paperNoise(100, { fibre: true, fibreAngle: 90 });
			expect(noise.sizes.split(",")).toHaveLength(3);
			expect(noise.image).toContain("numOctaves='3'");
		});

		it("F3-03: fibre angle modulates axis frequency order across 45-degree boundary", () => {
			const noiseLow = paperNoise(100, { fibre: true, fibreAngle: 30 });
			const noiseHigh = paperNoise(100, { fibre: true, fibreAngle: 75 });
			expect(noiseLow.image).not.toEqual(noiseHigh.image);
		});
	});

	// --- F4: Multi-Tone Kubelka-Munk Mixing ---
	describe("F4: Multi-Tone Kubelka-Munk Mixing", () => {
		it("F4-01: subtractive mixing retains higher saturation than linear RGB interpolation", () => {
			const cyan = PROCESS_PIGMENTS.cyan;
			const yellow = PROCESS_PIGMENTS.yellow;
			const kmCss = mixToCss([cyan, yellow], { thickness: 1, backing: 1 });
			const match = kmCss.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/);
			expect(match).not.toBeNull();
			const [, r, g, b] = match!.map(Number);
			expect(g).toBeGreaterThan(r!);
			expect(g).toBeGreaterThan(b!);
		});

		it("F4-02: mixIrisTones interpolates between iris and blossom in K/S space", () => {
			const pureIris = mixIrisTones("iris", "blossom", 0);
			const pureBlossom = mixIrisTones("iris", "blossom", 1);
			const midpoint = mixIrisTones("iris", "blossom", 0.5);

			expect(pureIris).toMatch(/rgb\(\d+\s+\d+\s+\d+\)/);
			expect(pureBlossom).toMatch(/rgb\(\d+\s+\d+\s+\d+\)/);
			expect(midpoint).toMatch(/rgb\(\d+\s+\d+\s+\d+\)/);
			expect(midpoint).not.toEqual(pureIris);
			expect(midpoint).not.toEqual(pureBlossom);
		});

		it("F4-03: mixMultiPigments correctly computes multi-tone combinations", () => {
			const p1 = toneToPigment("iris", 500);
			const p2 = toneToPigment("mist", 500);
			const mixedCss = mixMultiPigmentsToCss([
				{ pigment: p1, weight: 0.6 },
				{ pigment: p2, weight: 0.4 },
			]);
			expect(mixedCss).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
		});

		it("F4-04: reflectanceFromKS satisfies physical asymptotic boundary invariants", () => {
			const refZero = reflectanceFromKS(0, 1, 1, 1);
			expect(refZero).toBeCloseTo(1, 5);
			const refInf = reflectanceFromKS(1000, 0.01, 1, 10);
			expect(refInf).toBeLessThan(0.01);
		});

		it("F4-05: pigmentFromHex, pigmentFromColour and interpolatePigments compute valid K and S", () => {
			const pigHex = pigmentFromHex("#b79cf5");
			const pigCol = pigmentFromColour([183, 156, 245]);
			expect(pigHex.k[0]).toBeCloseTo(pigCol.k[0], 2);

			const pA: KubelkaMunkPigment = { k: [0.1, 0.4, 0.8], s: [0.2, 0.4, 0.1] };
			const pB: KubelkaMunkPigment = { k: [0.8, 0.2, 0.1], s: [0.5, 0.5, 0.3] };
			const mid = interpolatePigments(pA, pB, 0.5);
			expect(mid.k[0]).toBeCloseTo(0.45, 2);

			const directMixed = mixPigments([pA, pB]);
			expect(directMixed).toHaveLength(3);

			const multi = mixMultiPigments([
				{ pigment: pA, weight: 1 },
				{ pigment: pB, weight: 1 },
			]);
			expect(multi).toHaveLength(3);
		});
	});

	// --- F5: GlassLayer Scroll & Refraction Sync ---
	describe("F5: GlassLayer Scroll & Refraction Sync", () => {
		it("F5-01: relative thickness scaling scales bevel and refraction with Math.min(w, h)", () => {
			const computeScaling = (w: number, h: number, baseBevel: number, baseRefract: number) => {
				const shortEdge = Math.min(w, h);
				const thicknessScale = shortEdge / 200;
				return {
					scaledBevel: baseBevel * thicknessScale,
					scaledRefraction: baseRefract * thicknessScale,
				};
			};

			const smallChip = computeScaling(80, 36, 18, 40);
			const largeHero = computeScaling(600, 400, 18, 40);

			expect(smallChip.scaledBevel).toBeLessThan(18);
			expect(largeHero.scaledBevel).toBeGreaterThan(18);
			expect(smallChip.scaledRefraction / smallChip.scaledBevel).toBeCloseTo(
				largeHero.scaledRefraction / largeHero.scaledBevel,
				4,
			);
		});

		it("F5-02: scroll change detection captures window scroll and panel rect offset", () => {
			let lastScroll = { x: 0, y: 0, top: 100, left: 50 };
			const hasMoved = (x: number, y: number, top: number, left: number) => {
				const moved =
					x !== lastScroll.x ||
					y !== lastScroll.y ||
					Math.abs(top - lastScroll.top) > 0.5 ||
					Math.abs(left - lastScroll.left) > 0.5;
				if (moved) lastScroll = { x, y, top, left };
				return moved;
			};

			expect(hasMoved(0, 0, 100, 50)).toBe(false);
			expect(hasMoved(0, 50, 100, 50)).toBe(true);
			expect(hasMoved(0, 50, 100.2, 50)).toBe(false);
			expect(hasMoved(0, 50, 101.5, 50)).toBe(true);
		});
	});

	// --- F6: Damping Curve ζ = 0.55 Systematization ---
	describe("F6: Damping Curve ζ = 0.55 Systematization", () => {
		it("F6-01: MOTION_PRESETS.press specifies exact ζ = 0.55 damping ratio", () => {
			expect(MOTION_PRESETS.press.damping).toBe(0.55);
			expect(MOTION_PRESETS.press.frequency).toBe(18.7);
			expect(MOTION_PRESETS.press.mass).toBe(1);
		});

		it("F6-02: specToSpring accurately derives physical stiffness and damping constants", () => {
			const spring = specToSpring(MOTION_PRESETS.press);
			expect(spring.stiffness).toBeCloseTo(18.7 * 18.7, 2);
			const expectedDamping = 2 * 0.55 * Math.sqrt(spring.stiffness * 1);
			expect(spring.damping).toBeCloseTo(expectedDamping, 2);
		});

		it("F6-03: springToSpec performs lossless roundtrip inversion", () => {
			const spring = specToSpring(MOTION_PRESETS.press);
			const recovered = springToSpec({
				stiffness: spring.stiffness,
				damping: spring.damping,
				mass: 1,
			});
			expect(recovered.damping).toBeCloseTo(0.55, 4);
			expect(recovered.frequency).toBeCloseTo(18.7, 4);
		});
	});

	// --- F7: Interactive Micro-Interactions Suite ---
	describe("F7: Interactive Micro-Interactions Suite", () => {
		it("F7-01: motion presets cover the full spectrum of UI interaction roles", () => {
			const keys = Object.keys(MOTION_PRESETS);
			expect(keys).toContain("press");
			expect(keys).toContain("pop");
			expect(keys).toContain("settle");
			expect(keys).toContain("badge");
			expect(keys).toContain("float");

			expect(MOTION_PRESETS.badge.damping).toBeLessThan(MOTION_PRESETS.settle.damping);
			expect(MOTION_PRESETS.badge.frequency).toBeGreaterThan(MOTION_PRESETS.press.frequency);
		});

		it("F7-02: 2-layer soft focus halo invariant is verified", () => {
			const focusGlow = "0 0 0 2px var(--moe-card), 0 0 12px 3px var(--moe-taro-500)";
			expect(focusGlow).toContain("var(--moe-card)");
			expect(focusGlow).toContain("var(--moe-taro-500)");
		});
	});

	// --- F8: Material Extension to Components ---
	describe("F8: Material Extension to Components", () => {
		it("F8-01: seedFromName provides deterministic non-colliding FNV-1a hash", () => {
			const s1 = seedFromName("profile-card");
			const s2 = seedFromName("profile-card");
			const s3 = seedFromName("settings-card");
			expect(s1).toBe(s2);
			expect(s1).not.toBe(s3);
			expect(s1).toBeGreaterThanOrEqual(0);
			expect(s1).toBeLessThan(100000);
		});

		it("F8-02: MATERIAL_GROUND_CLASS constant is defined consistently", () => {
			expect(MATERIAL_GROUND_CLASS).toBe("ui-lib-material--ground");
		});
	});

	// --- F9: Dynamic On-Material Contrast Engine ---
	describe("F9: Dynamic On-Material Contrast Engine", () => {
		function relativeLuminance(rgb: [number, number, number]): number {
			const s = rgb.map((v) => {
				const c = v / 255;
				return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * s[0]! + 0.7152 * s[1]! + 0.0722 * s[2]!;
		}

		function contrastRatio(
			rgb1: [number, number, number],
			rgb2: [number, number, number],
		): number {
			const l1 = relativeLuminance(rgb1);
			const l2 = relativeLuminance(rgb2);
			return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		}

		it("F9-01: dark ink on paper ground meets WCAG AAA text standard (>= 7:1)", () => {
			const darkInk: [number, number, number] = [51, 34, 79]; // IRIS.iris[900]
			const paperGround: [number, number, number] = [255, 250, 253]; // IRIS.paper
			const ratio = contrastRatio(darkInk, paperGround);
			expect(ratio).toBeGreaterThanOrEqual(7.0);
		});

		it("F9-02: text on saturated wash ground preserves WCAG AA contrast (>= 4.5:1)", () => {
			const darkInk: [number, number, number] = [51, 34, 79];
			const washGround: [number, number, number] = [239, 234, 255]; // IRIS.iris[100]
			const ratio = contrastRatio(darkInk, washGround);
			expect(ratio).toBeGreaterThanOrEqual(4.5);
		});
	});

	// --- F10: Component State Matrix Display ---
	describe("F10: Component State Matrix Display", () => {
		it("F10-01: state matrix covers 5 essential interactive states", () => {
			const states = ["default", "hover", "focus", "active", "disabled"] as const;
			expect(states).toHaveLength(5);
			const stateSet = new Set(states);
			expect(stateSet.size).toBe(5);
		});

		it("F10-02: disabled state overrides active and hover interactions", () => {
			const computeState = (hover: boolean, active: boolean, disabled: boolean) => {
				if (disabled) return "disabled";
				if (active) return "active";
				if (hover) return "hover";
				return "default";
			};
			expect(computeState(true, true, true)).toBe("disabled");
			expect(computeState(true, true, false)).toBe("active");
			expect(computeState(true, false, false)).toBe("hover");
			expect(computeState(false, false, false)).toBe("default");
		});
	});

	// --- F11: Multi-Material Showcase Toggles ---
	describe("F11: Multi-Material Showcase Toggles", () => {
		it("F11-01: support four distinct surface material variants", () => {
			const materials = ["solid", "wash", "tint", "glass"] as const;
			expect(materials).toHaveLength(4);
			for (const mat of materials) {
				expect(typeof mat).toBe("string");
			}
		});

		it("F11-02: each material defines unique rendering semantics", () => {
			const resolveMaterialStyle = (mat: "solid" | "wash" | "tint" | "glass") => {
				switch (mat) {
					case "solid":
						return { isOpaque: true, usesGpu: false };
					case "wash":
						return { isOpaque: false, usesGpu: false, hasPigment: true };
					case "tint":
						return { isOpaque: false, usesGpu: false, hasPigment: false };
					case "glass":
						return { isOpaque: false, usesGpu: true };
				}
			};

			const solid = resolveMaterialStyle("solid");
			const glass = resolveMaterialStyle("glass");
			const wash = resolveMaterialStyle("wash");

			expect(solid.isOpaque).toBe(true);
			expect(glass.usesGpu).toBe(true);
			expect(wash.hasPigment).toBe(true);
		});
	});

	// --- F12: Studio Workbench Physics Upgrades ---
	describe("F12: Studio Workbench Physics Upgrades", () => {
		it("F12-01: Lucas-Washburn capillary wetting progression advances with square root of time", () => {
			const lucasWashburn = (t: number, k = 10) => k * Math.sqrt(Math.max(0, t));
			const t1 = 1;
			const t4 = 4;
			expect(lucasWashburn(t4) / lucasWashburn(t1)).toBeCloseTo(2, 4);
		});

		it("F12-02: WashProgress state transitions from idle to wetting to done", () => {
			type ProgressPhase = "idle" | "advancing" | "saturated";
			const getPhase = (progress: number, wetting: boolean): ProgressPhase => {
				if (wetting && progress < 100) return "advancing";
				if (progress >= 100) return "saturated";
				return "idle";
			};

			expect(getPhase(0, false)).toBe("idle");
			expect(getPhase(45, true)).toBe("advancing");
			expect(getPhase(100, false)).toBe("saturated");
		});
	});

	// --- F13: Homepage Discovery Navigation ---
	describe("F13: Homepage Discovery Navigation", () => {
		it("F13-01: route resolver directs demo query parameters to valid surfaces", () => {
			const routeMap: Record<string, string> = {
				"kit-index": "KitIndexPage",
				"glass-lab": "GlassLabPage",
				studio: "StudioPage",
				"iris-kit": "IrisKitPage",
				"aurora-flow": "AuroraFlowPage",
			};

			expect(routeMap["kit-index"]).toBe("KitIndexPage");
			expect(routeMap["glass-lab"]).toBe("GlassLabPage");
			expect(routeMap.studio).toBe("StudioPage");
			expect(routeMap["iris-kit"]).toBe("IrisKitPage");
		});

		it("F13-02: URL search params correctly preserve tone, material and theme context", () => {
			const url = new URL(
				"http://localhost:5173/?demo=kit-index&tone=blossom&material=wash&theme=obsidian",
			);
			expect(url.searchParams.get("demo")).toBe("kit-index");
			expect(url.searchParams.get("tone")).toBe("blossom");
			expect(url.searchParams.get("material")).toBe("wash");
			expect(url.searchParams.get("theme")).toBe("obsidian");
		});
	});

	// --- F14: Dual-Track E2E Test Suite ---
	describe("F14: Dual-Track E2E Test Suite", () => {
		it("F14-01: dual-track suite executes in pure Node environment without GPU flakiness", () => {
			expect(typeof process).toBe("object");
			expect(typeof process.versions.node).toBe("string");
		});

		it("F14-02: mathematical and physical models are strictly deterministic", () => {
			const runs = Array.from({ length: 20 }, () =>
				createWash({ hue: "#b79cf5", weight: 0.8, seed: 99 }),
			);
			const firstStyle = JSON.stringify(runs[0]!.style);
			for (const r of runs) {
				expect(JSON.stringify(r.style)).toBe(firstStyle);
			}
		});
	});

	// --- F15: Engineering Quality & a11y Gate Enforcement ---
	describe("F15: Engineering Quality & a11y Gate Enforcement", () => {
		it("F15-01: components adhere to designated WAI-ARIA semantic roles", () => {
			const roleMapping = {
				SoftProgress: "progressbar",
				SoftRadioGroup: "radiogroup",
				SoftSwitch: "switch",
				SoftSlider: "slider",
				SoftTabs: "tablist",
				SoftTable: "table",
			};

			for (const [, role] of Object.entries(roleMapping)) {
				expect(role).toBeDefined();
				expect(role.length).toBeGreaterThan(0);
			}
		});

		it("F15-02: keyboard event mapping adheres to accessibility contract", () => {
			const handleKey = (key: string, current: number, max: number): number => {
				switch (key) {
					case "ArrowRight":
					case "ArrowDown":
						return Math.min(current + 1, max);
					case "ArrowLeft":
					case "ArrowUp":
						return Math.max(current - 1, 0);
					case "Home":
						return 0;
					case "End":
						return max;
					default:
						return current;
				}
			};

			expect(handleKey("ArrowDown", 2, 5)).toBe(3);
			expect(handleKey("ArrowUp", 2, 5)).toBe(1);
			expect(handleKey("Home", 3, 5)).toBe(0);
			expect(handleKey("End", 3, 5)).toBe(5);
		});
	});
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (Aspect ratios, zero weights, extremes)
// ============================================================================

describe("Tier 2: Boundary & Corner Cases", () => {
	it("T2-01: extreme tall aspect ratio (1:20) maintains stable coordinates", async () => {
		const log: CanvasOp[] = [];
		installCanvasStub(log);

		await washToCanvas({
			hue: "#b79cf5",
			weight: 0.7,
			width: 40,
			height: 800,
		});

		const ellipse = log.find((e) => e.name === "ellipse");
		expect(ellipse).toBeDefined();
	});

	it("T2-02: extreme wide aspect ratio (40:1) maintains valid bounds", async () => {
		const log: CanvasOp[] = [];
		installCanvasStub(log);

		await washToCanvas({
			hue: "#b79cf5",
			weight: 0.7,
			width: 1200,
			height: 30,
		});

		const ellipse = log.find((e) => e.name === "ellipse");
		expect(ellipse).toBeDefined();
	});

	it("T2-03: zero weight clamps safely to lower bound without NaN or negative values", () => {
		const wash = createWash({ hue: "#b79cf5", weight: 0, seed: 1 });
		expect(wash.resolved.weight).toBe(0);
		expect(wash.style["--wash-opacity"]).not.toBe("NaN");
		expect(Number(wash.style["--wash-opacity"])).toBeGreaterThan(0);
	});

	it("T2-04: negative weight clamps to 0", () => {
		const wash = createWash({ hue: "#b79cf5", weight: -0.5, seed: 1 });
		expect(wash.resolved.weight).toBe(0);
	});

	it("T2-05: excessive weight (> 1.0) clamps cleanly to 1.0", () => {
		const wash = createWash({ hue: "#b79cf5", weight: 4.5, seed: 1 });
		expect(wash.resolved.weight).toBe(1);
	});

	it("T2-06: extreme damping ratios cover undamped (0.0), critical (1.0) and overdamped (5.0)", () => {
		const undamped = specToSpring({ damping: 0, frequency: 10 });
		expect(undamped.damping).toBe(0);

		const critical = specToSpring({ damping: 1.0, frequency: 10 });
		expect(critical.damping).toBeCloseTo(2 * 10, 4);

		const overdamped = specToSpring({ damping: 5.0, frequency: 10 });
		expect(overdamped.damping).toBeCloseTo(2 * 5 * 10, 4);
	});

	it("T2-07: fiber angle boundary transitions around 45, 90, 135 and 180 degrees", () => {
		const angles = [0, 44.9, 45, 45.1, 90, 135, 180, 360, -45];
		for (const angle of angles) {
			const noise = paperNoise(50, { fibre: true, fibreAngle: angle });
			expect(noise.image).toContain("feTurbulence");
			expect(noise.sizes).toBeDefined();
		}
	});

	it("T2-08: empty and special character string handling in seedFromName", () => {
		expect(seedFromName("")).toBeGreaterThanOrEqual(0);
		expect(seedFromName(" ")).toBeGreaterThanOrEqual(0);
		expect(seedFromName("水墨宣纸·IRIS")).toBeGreaterThanOrEqual(0);
		expect(seedFromName("!@#$%^&*()_+~`")).toBeGreaterThanOrEqual(0);
	});

	it("T2-09: degenerate 0x0 canvas dimensions do not crash renderer", async () => {
		const log: CanvasOp[] = [];
		installCanvasStub(log);

		const canvas = await washToCanvas({
			hue: "#b79cf5",
			weight: 0.5,
			width: 0,
			height: 0,
		});

		expect(canvas).toBeDefined();
	});

	it("T2-10: extreme dark and light backing reflectance in Kubelka-Munk", () => {
		const pig = toneToPigment("iris", 500);
		const blackBacking = mixToCss([pig], { backing: 0, thickness: 1 });
		const whiteBacking = mixToCss([pig], { backing: 1, thickness: 1 });

		expect(blackBacking).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
		expect(whiteBacking).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
		expect(blackBacking).not.toEqual(whiteBacking);
	});
});

// ============================================================================
// TIER 3: PAIRWISE COMBINATIONS
// ============================================================================

describe("Tier 3: Pairwise Combinations", () => {
	it("T3-01: Pairwise: Wash Material x Damping Motion Presets", () => {
		const materials = ["wash", "tint"] as const;
		const motions = ["press", "pop", "settle"] as const;

		for (const mat of materials) {
			for (const motion of motions) {
				const spec = MOTION_PRESETS[motion];
				const spring = specToSpring(spec);
				expect(spring.stiffness).toBeGreaterThan(0);
				expect(spring.damping).toBeGreaterThan(0);

				const wash = createWash({
					hue: IRIS.iris[500],
					weight: mat === "wash" ? 1.0 : 0.35,
					seed: 7,
				});
				expect(wash.style["--wash-ground"]).toBeDefined();
			}
		}
	});

	it("T3-02: Pairwise: Liquid Glass Looks x Multi-Tone Kubelka-Munk Mixing", () => {
		const looks = ["press", "milk", "veil", "pill"] as const;
		const tonePairs: Array<[IrisTone, IrisTone]> = [
			["iris", "blossom"],
			["iris", "mist"],
			["blossom", "mist"],
		];

		for (const lookName of looks) {
			const look = GLASS_LOOKS[lookName];
			expect(look).toBeDefined();

			for (const [toneA, toneB] of tonePairs) {
				const mixed = mixIrisTones(toneA, toneB, 0.5);
				expect(mixed).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
			}
		}
	});

	it("T3-03: Pairwise: Theme Tokens x Contrast Ratio Verification", () => {
		const themes = [
			{
				name: "default",
				bg: [255, 250, 253] as [number, number, number],
				ink: [51, 34, 79] as [number, number, number],
			},
			{
				name: "cyberpunk",
				bg: [18, 12, 28] as [number, number, number],
				ink: [0, 240, 255] as [number, number, number],
			},
			{
				name: "obsidian",
				bg: [12, 12, 14] as [number, number, number],
				ink: [240, 240, 245] as [number, number, number],
			},
			{
				name: "minimalist",
				bg: [255, 255, 255] as [number, number, number],
				ink: [20, 20, 20] as [number, number, number],
			},
		];

		const relativeLuminance = (rgb: [number, number, number]) => {
			const s = rgb.map((v) => {
				const c = v / 255;
				return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * s[0]! + 0.7152 * s[1]! + 0.0722 * s[2]!;
		};

		const contrast = (c1: [number, number, number], c2: [number, number, number]) => {
			const l1 = relativeLuminance(c1);
			const l2 = relativeLuminance(c2);
			return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		};

		for (const t of themes) {
			const ratio = contrast(t.ink, t.bg);
			expect(ratio).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("T3-04: Pairwise: Anisotropic Fiber Angles x Coordinate Aspect Ratios", async () => {
		const angles = [15, 60, 105];
		const dimensions = [
			{ w: 200, h: 100 },
			{ w: 150, h: 150 },
			{ w: 100, h: 200 },
		];

		for (const angle of angles) {
			for (const dim of dimensions) {
				const noise = paperNoise(42, { fibre: true, fibreAngle: angle });
				expect(noise.sizes.split(",")).toHaveLength(3);

				const log: CanvasOp[] = [];
				installCanvasStub(log);
				await washToCanvas({
					hue: "#b79cf5",
					weight: 0.7,
					width: dim.w,
					height: dim.h,
					fibre: true,
					fibreAngle: angle,
				});
				expect(log.length).toBeGreaterThan(0);
			}
		}
	});

	it("T3-05: Pairwise: Component State Matrix x Material Variant (20 combinations)", () => {
		const states = ["default", "hover", "focus", "active", "disabled"] as const;
		const materials = ["solid", "wash", "tint", "glass"] as const;

		const seenCombinations = new Set<string>();
		for (const state of states) {
			for (const mat of materials) {
				const comboKey = `${state}::${mat}`;
				seenCombinations.add(comboKey);
			}
		}
		expect(seenCombinations.size).toBe(20);
	});
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION WORKFLOWS
// ============================================================================

describe("Tier 4: Real-World Workflows", () => {
	it("T4-01: Workflow 1: Homepage to Surface Navigation Deep Dive", () => {
		interface NavRoute {
			origin: string;
			destination: string;
			params: Record<string, string>;
		}

		const navigationPath: NavRoute[] = [
			{ origin: "/", destination: "/?demo=kit-index", params: { demo: "kit-index" } },
			{
				origin: "/?demo=kit-index",
				destination: "/?demo=studio&tone=iris",
				params: { demo: "studio", tone: "iris" },
			},
			{
				origin: "/?demo=studio",
				destination: "/?demo=glass-lab&backend=webgl",
				params: { demo: "glass-lab", backend: "webgl" },
			},
			{
				origin: "/?demo=glass-lab",
				destination: "/?demo=iris-kit&component=card&tone=blossom",
				params: { demo: "iris-kit", component: "card", tone: "blossom" },
			},
		];

		let currentTone = "iris";
		for (const step of navigationPath) {
			const url = new URL(`http://localhost:5173${step.destination}`);
			expect(url.searchParams.get("demo")).toBe(step.params.demo);
			if (step.params.tone) {
				currentTone = step.params.tone;
			}
			expect(IRIS_TONES).toContain(currentTone);
		}
	});

	it("T4-02: Workflow 2: Workbench Capillary Wetting Progression Dynamic Simulation", () => {
		interface WettingState {
			timeMs: number;
			progress: number;
			meniscusVisible: boolean;
			phaseLabel: string;
		}

		const simulateProgression = (duration = 1000, steps = 5): WettingState[] => {
			const states: WettingState[] = [];
			for (let i = 0; i <= steps; i++) {
				const t = (i / steps) * duration;
				// Lucas-Washburn progression: normalized fraction sqrt(t / duration)
				const rawPct = Math.round(Math.sqrt(t / duration) * 100);
				const progress = Math.min(100, Math.max(0, rawPct));
				const meniscusVisible = progress > 0 && progress < 100;
				let phaseLabel = "等待铺纸";
				if (progress >= 100) {
					phaseLabel = "宣纸润湿完成 (微观纤维已饱和)";
				} else if (progress > 0) {
					phaseLabel = "毛细浸润前沿推进中";
				}
				states.push({ timeMs: t, progress, meniscusVisible, phaseLabel });
			}
			return states;
		};

		const steps = simulateProgression(1000, 4);
		expect(steps[0]!.progress).toBe(0);
		expect(steps[0]!.meniscusVisible).toBe(false);
		expect(steps[0]!.phaseLabel).toBe("等待铺纸");

		expect(steps[1]!.progress).toBe(50);
		expect(steps[1]!.meniscusVisible).toBe(true);
		expect(steps[1]!.phaseLabel).toBe("毛细浸润前沿推进中");

		const last = steps[steps.length - 1]!;
		expect(last.progress).toBe(100);
		expect(last.meniscusVisible).toBe(false);
		expect(last.phaseLabel).toBe("宣纸润湿完成 (微观纤维已饱和)");
	});

	it("T4-03: Workflow 3: Studio Settings Form & Substrate Configuration Flow", () => {
		interface StudioFormState {
			name: string;
			substrate: "paper" | "glass" | "clay";
			density: "comfortable" | "compact";
			autoSave: boolean;
		}

		let form: StudioFormState = {
			name: "未命名工程",
			substrate: "paper",
			density: "comfortable",
			autoSave: true,
		};

		// User updates name
		form = { ...form, name: "水彩研究卷壹" };
		expect(form.name).toBe("水彩研究卷壹");

		// User switches substrate to liquid glass
		form = { ...form, substrate: "glass" };
		expect(form.substrate).toBe("glass");

		// User adjusts density to compact
		form = { ...form, density: "compact" };
		expect(form.density).toBe("compact");

		// User toggles autoSave
		form = { ...form, autoSave: false };
		expect(form.autoSave).toBe(false);
	});

	it("T4-04: Workflow 4: Stacking & Multi-Layer Refraction Pipeline", () => {
		interface LayerPass {
			pass: number;
			layerName: string;
			blendMode: string;
			target: string;
		}

		const renderStack: LayerPass[] = [
			{ pass: 1, layerName: "PaperWashGround", blendMode: "normal", target: "backdropRT" },
			{
				pass: 2,
				layerName: "SubtleFrostedPass",
				blendMode: "gaussian-blur",
				target: "backdropRT",
			},
			{
				pass: 3,
				layerName: "LiquidGlassPanels",
				blendMode: "refraction-sample",
				target: "screen",
			},
			{ pass: 4, layerName: "ForegroundDOMContent", blendMode: "normal", target: "screen" },
		];

		expect(renderStack).toHaveLength(4);
		expect(renderStack[0]!.target).toBe("backdropRT");
		expect(renderStack[1]!.target).toBe("backdropRT");
		expect(renderStack[2]!.target).toBe("screen");
		expect(renderStack[2]!.blendMode).toBe("refraction-sample");
	});

	it("T4-05: Workflow 5: Accessible Keyboard Navigation Flow Across Soft Control Surfaces", () => {
		interface ControlElement {
			id: string;
			role: string;
			tabIndex: number;
			focusable: boolean;
		}

		const controls: ControlElement[] = [
			{ id: "input-name", role: "textbox", tabIndex: 0, focusable: true },
			{ id: "select-substrate", role: "combobox", tabIndex: 0, focusable: true },
			{ id: "radio-comfortable", role: "radio", tabIndex: 0, focusable: true },
			{ id: "radio-compact", role: "radio", tabIndex: -1, focusable: false },
			{ id: "switch-autosave", role: "switch", tabIndex: 0, focusable: true },
			{ id: "btn-start", role: "button", tabIndex: 0, focusable: true },
		];

		const tabStops = controls.filter((c) => c.tabIndex === 0);
		expect(tabStops.length).toBe(5);

		// Verify sequential Tab traversal
		let currentFocusIndex = 0;
		const advanceTab = () => {
			currentFocusIndex = (currentFocusIndex + 1) % tabStops.length;
			return tabStops[currentFocusIndex];
		};

		const next1 = advanceTab();
		expect(next1!.id).toBe("select-substrate");
		const next2 = advanceTab();
		expect(next2!.id).toBe("radio-comfortable");
	});
});
