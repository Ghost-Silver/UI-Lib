import { describe, expect, it } from "vitest";
import type { IrisTone } from "../src/iris.js";
import { mixIrisTones, mixMultiPigmentsToCss, toneToPigment } from "../src/kubelkaMunk.js";
import { createWash, paperNoise } from "../src/wash.js";
import { washToCanvas } from "../src/washCanvas.js";

// --- Mock canvas environment for washToCanvas testing ---

interface RecordedCall {
	canvas: number;
	kind: "call" | "set";
	name: string;
	args: string;
}

function createMockEnvironment() {
	const log: RecordedCall[] = [];
	const gradients: Array<{ type: string; stops: Array<{ offset: number; color: string }> }> =
		[];

	class MockGradient {
		type: string;
		stops: Array<{ offset: number; color: string }> = [];
		constructor(type: string) {
			this.type = type;
			gradients.push(this);
		}
		addColorStop(offset: number, color: string) {
			this.stops.push({ offset, color });
			log.push({
				canvas: -1,
				kind: "call",
				name: "addColorStop",
				args: `${offset},${color}`,
			});
		}
	}

	class MockPattern {
		matrix: unknown = null;
		setTransform(m: unknown) {
			this.matrix = m;
			log.push({
				canvas: -1,
				kind: "call",
				name: "pattern.setTransform",
				args: JSON.stringify(m),
			});
		}
	}

	let canvasIdCounter = 0;
	const makeCanvas = () => {
		const id = canvasIdCounter++;
		const ctxTarget: Record<string, unknown> = {
			canvas: null,
			createRadialGradient: (...args: unknown[]) => {
				log.push({
					canvas: id,
					kind: "call",
					name: "createRadialGradient",
					args: args.join(","),
				});
				return new MockGradient("radial");
			},
			createConicGradient: (...args: unknown[]) => {
				log.push({
					canvas: id,
					kind: "call",
					name: "createConicGradient",
					args: args.join(","),
				});
				return new MockGradient("conic");
			},
			createPattern: () => new MockPattern(),
			measureText: () => ({ width: 0 }),
			beginPath: () => {
				log.push({ canvas: id, kind: "call", name: "beginPath", args: "" });
			},
			fill: () => {
				log.push({ canvas: id, kind: "call", name: "fill", args: "" });
			},
			arc: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "arc", args: args.join(",") });
			},
			ellipse: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "ellipse", args: args.join(",") });
			},
			fillRect: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "fillRect", args: args.join(",") });
			},
			clearRect: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "clearRect", args: args.join(",") });
			},
			translate: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "translate", args: args.join(",") });
			},
			scale: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "scale", args: args.join(",") });
			},
			save: () => {
				log.push({ canvas: id, kind: "call", name: "save", args: "" });
			},
			restore: () => {
				log.push({ canvas: id, kind: "call", name: "restore", args: "" });
			},
			drawImage: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "drawImage", args: args.length.toString() });
			},
			setTransform: (...args: unknown[]) => {
				log.push({ canvas: id, kind: "call", name: "setTransform", args: args.join(",") });
			},
		};

		const proxyCtx = new Proxy(ctxTarget, {
			get(target, prop) {
				if (prop in target) return target[prop as string];
				return (...args: unknown[]) => {
					log.push({ canvas: id, kind: "call", name: String(prop), args: args.join(",") });
					return undefined;
				};
			},
			set(target, prop, val) {
				target[prop as string] = val;
				log.push({ canvas: id, kind: "set", name: String(prop), args: String(val) });
				return true;
			},
		});

		return {
			width: 300,
			height: 300,
			getContext: (type: string) => (type === "2d" ? proxyCtx : null),
		};
	};

	class FakeImage {
		onload?: () => void;
		onerror?: () => void;
		set src(_s: string) {
			this.onload?.();
		}
	}

	globalThis.document = {
		createElement: (t: string) => (t === "canvas" ? makeCanvas() : {}),
	} as unknown as Document;
	globalThis.Image = FakeImage as unknown as typeof Image;

	return { log, gradients };
}

describe("Milestone 1 Empirical Stress Tests: Parameter Extremes & Invariants", () => {
	describe("1. createWash Parameter Extremes", () => {
		const weightsToTest = [0.0, 0.001, 0.01, 0.1, 0.5, 1.0, 1.5, 2.0, 10.0, -0.5, -1.0, -100.0];

		it.each(weightsToTest)("handles weight extreme: %f without NaN, Infinity or crash", (w) => {
			const wash = createWash({ hue: "#8b5cf6", weight: w, seed: 42 });

			expect(wash).toBeDefined();
			expect(wash.style).toBeDefined();
			expect(wash.resolved).toBeDefined();

			// Resolved weight must be clamped to [0, 1]
			expect(wash.resolved.weight).toBeGreaterThanOrEqual(0);
			expect(wash.resolved.weight).toBeLessThanOrEqual(1);
			expect(Number.isFinite(wash.resolved.weight)).toBe(true);

			// Check all CSS variables in style map
			for (const [key, value] of Object.entries(wash.style)) {
				expect(value, `CSS variable ${key} must not contain NaN`).not.toContain("NaN");
				expect(value, `CSS variable ${key} must not contain Infinity`).not.toContain(
					"Infinity",
				);
				expect(value, `CSS variable ${key} must not contain undefined`).not.toContain(
					"undefined",
				);
			}

			// Verify opacity is in [0, 1]
			const opacity = Number(wash.style["--wash-opacity"]);
			expect(Number.isFinite(opacity)).toBe(true);
			expect(opacity).toBeGreaterThan(0);
			expect(opacity).toBeLessThanOrEqual(1);

			// Verify body radial-gradient contains valid rgb stops
			const body = wash.style["--wash-body"]!;
			expect(body).toMatch(/^radial-gradient\(/);
			const rgbValues = [...body.matchAll(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/g)].map((m) => [
				Number(m[1]),
				Number(m[2]),
				Number(m[3]),
			]);
			expect(rgbValues.length).toBeGreaterThanOrEqual(2);
			for (const [r, g, b] of rgbValues) {
				expect(r).toBeGreaterThanOrEqual(0);
				expect(r).toBeLessThanOrEqual(255);
				expect(g).toBeGreaterThanOrEqual(0);
				expect(g).toBeLessThanOrEqual(255);
				expect(b).toBeGreaterThanOrEqual(0);
				expect(b).toBeLessThanOrEqual(255);
			}

			// Verify arcs
			for (const arc of wash.resolved.arcs) {
				expect(Number.isFinite(arc)).toBe(true);
				expect(arc).toBeGreaterThanOrEqual(0);
				expect(arc).toBeLessThanOrEqual(1);
			}
		});

		const anglesToTest = [0, 45, 90, 180, 360, -45, -90, -180, -360, 720, -720, 33.33, -12.5];

		it.each(anglesToTest)(
			"handles fiber angle extreme: %f with valid grain and angle export",
			(angle) => {
				const wash = createWash({ hue: "#8b5cf6", fibre: true, fibreAngle: angle, seed: 13 });
				expect(wash.style["--wash-grain-angle"]).toBe(String(angle));

				const noise = paperNoise(13, { fibre: true, fibreAngle: angle });
				expect(noise.image).not.toContain("NaN");
				expect(noise.image).not.toContain("Infinity");
				expect(noise.sizes).not.toContain("NaN");
				expect(noise.sizes).not.toContain("Infinity");
			},
		);

		it("handles size extremes: 0, 1, 10000", () => {
			for (const sz of [0, 1, 10000]) {
				const wash = createWash({ hue: "#8b5cf6", size: sz });
				expect(wash.style["--wash-width"]).toBe(`${sz}px`);
				expect(wash.style["--wash-height"]).toBe(`${sz}px`);
			}
		});
	});

	describe("2. washToCanvas Parameter Extremes & Geometry Invariants", () => {
		const testDimensions = [
			{ width: 1000, height: 20, desc: "extreme wide 50:1" },
			{ width: 20, height: 1000, desc: "extreme narrow 1:50" },
			{ width: 2000, height: 40, desc: "ultra wide 50:1" },
			{ width: 40, height: 2000, desc: "ultra narrow 1:50" },
			{ width: 100, height: 100, desc: "square 1:1" },
			{ width: 1, height: 50, desc: "sub-pixel narrow" },
			{ width: 50, height: 1, desc: "sub-pixel wide" },
			{ width: 0, height: 0, desc: "zero dimensions" },
		];

		it.each(testDimensions)(
			"executes washToCanvas with $desc ($width x $height) without NaN/Infinity or crash",
			async ({ width, height }) => {
				const { log } = createMockEnvironment();

				await washToCanvas({
					hue: "#b79cf5",
					weight: 0.8,
					seed: 7,
					width,
					height,
					fibreAngle: 45,
				});

				// Verify that no call or set operation has NaN or Infinity in its arguments
				for (const entry of log) {
					expect(
						entry.args,
						`${entry.name} in canvas ${entry.canvas} must not contain NaN`,
					).not.toContain("NaN");
					expect(
						entry.args,
						`${entry.name} in canvas ${entry.canvas} must not contain Infinity`,
					).not.toContain("Infinity");
				}

				// Verify ellipse arguments on canvas 0
				const ellipseCalls = log.filter((e) => e.canvas === 0 && e.name === "ellipse");
				if (width > 0 && height > 0) {
					expect(ellipseCalls.length).toBeGreaterThanOrEqual(1);
					for (const call of ellipseCalls) {
						const parts = call.args.split(",").map(Number);
						const [x, y, radiusX, radiusY, rotation, startAngle, endAngle] = parts;
						expect(Number.isFinite(x)).toBe(true);
						expect(Number.isFinite(y)).toBe(true);
						expect(radiusX).toBeGreaterThanOrEqual(1);
						expect(radiusY).toBeGreaterThanOrEqual(1);
						expect(rotation).toBe(0);
						expect(startAngle).toBe(0);
						expect(endAngle).toBeCloseTo(Math.PI * 2, 5);
					}
				}

				// Verify scales and translates on canvas 0
				const scaleCalls = log.filter((e) => e.canvas === 0 && e.name === "scale");
				for (const call of scaleCalls) {
					const [sx, sy] = call.args.split(",").map(Number);
					expect(Number.isFinite(sx)).toBe(true);
					expect(Number.isFinite(sy)).toBe(true);
					expect(sx).toBeGreaterThan(0);
					expect(sy).toBeGreaterThan(0);
				}
			},
		);

		it("maintains identical aspect ratio between body gradient and deposit ring under extreme aspect ratios", async () => {
			const { log } = createMockEnvironment();

			const width = 1000;
			const height = 20;

			await washToCanvas({
				hue: "#b79cf5",
				weight: 0.9,
				seed: 11,
				width,
				height,
			});

			// Body scale on canvas 0: scale(1, aspect)
			const bodyScale = log.find(
				(e) => e.canvas === 0 && e.name === "scale" && !e.args.startsWith("1,1"),
			);
			// Deposit ring scale on canvas 1: scale(1, ringAspect)
			const ringScale = log.find(
				(e) => e.canvas === 1 && e.name === "scale" && !e.args.startsWith("1,1"),
			);

			expect(bodyScale).toBeDefined();
			expect(ringScale).toBeDefined();

			const [, bodyAspect] = bodyScale!.args.split(",").map(Number);
			const [, ringAspect] = ringScale!.args.split(",").map(Number);

			// Both aspect scaling factors must match identically to prevent crescent separation
			expect(ringAspect).toBeCloseTo(bodyAspect!, 6);
		});

		it("tests extreme weights in washToCanvas (0.0, 0.01, 1.0, 2.0, 10.0, negative)", async () => {
			for (const w of [0.0, 0.01, 1.0, 2.0, 10.0, -1.0]) {
				const { log } = createMockEnvironment();
				await washToCanvas({
					hue: "#8b5cf6",
					weight: w,
					width: 200,
					height: 150,
				});

				for (const entry of log) {
					expect(entry.args, `weight ${w}: ${entry.name} must not contain NaN`).not.toContain(
						"NaN",
					);
					expect(
						entry.args,
						`weight ${w}: ${entry.name} must not contain Infinity`,
					).not.toContain("Infinity");
				}
			}
		});

		it("tests extreme angles in washToCanvas (0, 45, 90, 180, 360, negative)", async () => {
			for (const ang of [0, 45, 90, 180, 360, -45, -180, -360]) {
				const { log } = createMockEnvironment();
				await washToCanvas({
					hue: "#8b5cf6",
					fibreAngle: ang,
					width: 150,
					height: 150,
				});

				for (const entry of log) {
					expect(entry.args, `angle ${ang}: ${entry.name} must not contain NaN`).not.toContain(
						"NaN",
					);
					expect(
						entry.args,
						`angle ${ang}: ${entry.name} must not contain Infinity`,
					).not.toContain("Infinity");
				}
			}
		});

		it("tests extreme scale / DPR factors (0.001, 0.5, 1, 2, 3, 10)", async () => {
			for (const scale of [0.001, 0.5, 1, 2, 3, 10]) {
				const { log } = createMockEnvironment();
				await washToCanvas({
					hue: "#8b5cf6",
					scale,
					width: 100,
					height: 100,
				});

				for (const entry of log) {
					expect(
						entry.args,
						`scale ${scale}: ${entry.name} must not contain NaN`,
					).not.toContain("NaN");
					expect(
						entry.args,
						`scale ${scale}: ${entry.name} must not contain Infinity`,
					).not.toContain("Infinity");
				}
			}
		});
	});

	describe("3. mixIrisTones Parameter Extremes & Color Bounds", () => {
		const tones: IrisTone[] = ["iris", "blossom", "mist"];
		const ratiosToTest = [
			0.0,
			0.0001,
			0.25,
			0.5,
			0.75,
			0.9999,
			1.0,
			-0.5,
			-1.0,
			-10.0,
			-100.0,
			1.5,
			2.0,
			10.0,
			100.0,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		];

		for (const toneA of tones) {
			for (const toneB of tones) {
				it.each(ratiosToTest)(
					`mixes ${toneA} and ${toneB} at ratio %s cleanly into valid CSS rgb`,
					(ratio) => {
						const result = mixIrisTones(toneA, toneB, ratio);
						expect(result).not.toContain("NaN");
						expect(result).not.toContain("Infinity");

						const match = result.match(/^rgb\((\d+)\s+(\d+)\s+(\d+)\)$/);
						expect(match, `Result "${result}" must match rgb format`).not.toBeNull();

						const [, r, g, b] = match!;
						expect(Number(r)).toBeGreaterThanOrEqual(0);
						expect(Number(r)).toBeLessThanOrEqual(255);
						expect(Number(g)).toBeGreaterThanOrEqual(0);
						expect(Number(g)).toBeLessThanOrEqual(255);
						expect(Number(b)).toBeGreaterThanOrEqual(0);
						expect(Number(b)).toBeLessThanOrEqual(255);
					},
				);
			}
		}

		it("clamps out-of-bounds ratios identically to 0.0 and 1.0 bounds", () => {
			const atZero = mixIrisTones("iris", "blossom", 0.0);
			const atNeg = mixIrisTones("iris", "blossom", -10.0);
			expect(atNeg).toBe(atZero);

			const atOne = mixIrisTones("iris", "blossom", 1.0);
			const atSuper = mixIrisTones("iris", "blossom", 10.0);
			expect(atSuper).toBe(atOne);
		});

		it("demonstrates adversarial vulnerability: unhandled NaN ratio propagates to rgb(NaN NaN NaN)", () => {
			// Empirical observation: Math.min(1, NaN) is NaN, so Math.max(0, Math.min(1, NaN)) evaluates to NaN.
			// When ratio is NaN, interpolatePigments produces NaN coefficients, resulting in 'rgb(NaN NaN NaN)'.
			const nanResult = mixIrisTones("iris", "blossom", Number.NaN);
			expect(nanResult).toBe("rgb(NaN NaN NaN)");
		});

		it("handles extreme thickness options in mixIrisTones (0.0, 0.001, 10.0, 100.0, negative)", () => {
			for (const th of [0.0, 0.001, 1.0, 5.0, 10.0, 100.0, -1.0]) {
				const result = mixIrisTones("iris", "blossom", 0.5, { thickness: th });
				expect(result).not.toContain("NaN");
				expect(result).not.toContain("Infinity");
				expect(result).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
			}
		});

		it("handles extreme backing options in mixIrisTones (0.0, 0.5, 1.0, 2.0, negative)", () => {
			for (const bk of [0.0, 0.5, 1.0, 2.0, -1.0]) {
				const result = mixIrisTones("iris", "blossom", 0.5, { backing: bk });
				expect(result).not.toContain("NaN");
				expect(result).not.toContain("Infinity");
				expect(result).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
			}
		});

		it("handles all shade levels (100, 300, 500, 700, 900)", () => {
			const shades = [100, 300, 500, 700, 900] as const;
			for (const shade of shades) {
				const result = mixIrisTones("iris", "mist", 0.5, { shade });
				expect(result).not.toContain("NaN");
				expect(result).not.toContain("Infinity");
				expect(result).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
			}
		});

		it("handles multi-pigment mixing with extreme weights", () => {
			const p1 = toneToPigment("iris");
			const p2 = toneToPigment("blossom");
			const p3 = toneToPigment("mist");

			const extremeWeights = [
				[0, 0, 0],
				[10, 0, 0],
				[0.001, 0.001, 0.001],
				[100, 50, 25],
				[-1, 1, 0],
			];

			for (const [w1, w2, w3] of extremeWeights) {
				const css = mixMultiPigmentsToCss([
					{ pigment: p1, weight: w1 },
					{ pigment: p2, weight: w2 },
					{ pigment: p3, weight: w3 },
				]);
				expect(css).not.toContain("NaN");
				expect(css).not.toContain("Infinity");
				expect(css).toMatch(/^rgb\(\d+\s+\d+\s+\d+\)$/);
			}
		});
	});
});
