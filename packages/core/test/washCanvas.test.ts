import { describe, expect, it } from "vitest";
import { washToCanvas } from "../src/washCanvas.js";

/**
 * The canvas wash, and the defect that survived three attempts to fix it.
 *
 * The stylesheet builds the uneven deposit by masking **one element**:
 * `--wash-deposit-mask` is `mask-image` on `.ui-lib-wash__deposit`, an empty
 * span that carries nothing but the ring. The body is a sibling, so the mask
 * cannot reach it.
 *
 * The canvas version applied the same conic with `destination-in` on the main
 * canvas. `destination-in` multiplies everything already drawn by the source's
 * alpha, and the conic's alpha runs from 0.12 to 1.0 — so the body was cut into
 * five radial wedges. Measured radially it read 22.5 centre / 18.0 middle /
 * 45.2 rim: a rim two and a half times the middle, which is a ring rather than
 * a wash. Three rounds of lowering `globalAlpha` changed nothing, because
 * `globalAlpha` was never the term that mattered.
 *
 * These tests cannot render — vitest runs in `node`, with no 2D context. So
 * they run against a recording context. That is not a compromise here: the
 * defect was never about how the pixels looked, it was about **which surface a
 * composite operation was applied to**, and that is exactly what a call log
 * records. The stub records `(canvas id, operation)` pairs and nothing else.
 */

interface Recorded {
	canvas: number;
	kind: "call" | "set";
	name: string;
	value: string;
}

/**
 * A document whose every canvas carries its own recording context.
 *
 * The first version of this stub built the context with `Object.assign` over a
 * metadata object, and the property descriptors fought each other: the log came
 * back empty and two assertions failed against working code. A `Proxy` has one
 * interception point per access and cannot be quietly overwritten that way.
 */
function installDocument(log: Recorded[]): void {
	const contexts: Array<Record<string, unknown>> = [];
	let nextId = 0;

	const makeContext = (id: number): CanvasRenderingContext2D => {
		const target: Record<string, unknown> = {
			canvas: null,
			createRadialGradient: () => ({ addColorStop: () => {} }),
			createConicGradient: () => ({ addColorStop: () => {} }),
			createPattern: () => null,
			measureText: () => ({ width: 0 }),
		};
		return new Proxy(target, {
			get(t, key) {
				const existing = t[key as string];
				if (existing !== undefined) return existing;
				return (..._args: unknown[]) => {
					log.push({ canvas: id, kind: "call", name: String(key), value: "" });
					return undefined;
				};
			},
			set(t, key, value) {
				t[key as string] = value;
				log.push({
					canvas: id,
					kind: "set",
					name: String(key),
					value: String(value).slice(0, 32),
				});
				return true;
			},
		}) as unknown as CanvasRenderingContext2D;
	};

	const makeCanvas = (): unknown => {
		const id = nextId++;
		const element: Record<string, unknown> = {
			width: 0,
			height: 0,
			getContext: (kind: string) => {
				if (kind !== "2d") return null;
				contexts[id] ??= makeContext(id) as unknown as Record<string, unknown>;
				return contexts[id];
			},
		};
		return element;
	};

	class FakeImage {
		onload: (() => void) | undefined;
		onerror: (() => void) | undefined;
		set src(_value: string) {
			// Reject the fibre. `paintGrain` treats a failed image as a missing
			// texture rather than a broken wash — the pigment is already down and
			// is the part that carries the colour — so this completes the promise
			// instead of hanging. Leaving it pending is how the first version of
			// this file timed out at five seconds.
			this.onerror?.();
		}
	}

	/**
	 * `Path2D` is a browser global and vitest runs in `node`.
	 *
	 * The body's ellipse is built as a path rather than by scaling the context,
	 * and that is load-bearing: a canvas gradient's geometry is fixed in user
	 * space at creation and is re-transformed by whatever transform is active
	 * when it is used, so `createRadialGradient(cx, cy, ...)` plus
	 * `translate(cx, cy)` samples the gradient's transparent tail over the whole
	 * mark. `ellipse()` takes radii directly, so no transform is needed. This
	 * stub only has to accept the call.
	 */
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

const values = (log: Recorded[], canvas: number, name: string) =>
	log
		.filter((e) => e.canvas === canvas && e.kind === "set" && e.name === name)
		.map((e) => e.value);

describe("washToCanvas", () => {
	it("never applies destination-in to the surface that carries the body", async () => {
		const log: Recorded[] = [];
		installDocument(log);

		await washToCanvas({
			hue: "#b79cf5",
			weight: 0.9,
			seed: 7,
			state: "dry",
			width: 190,
			height: 190,
		});

		// The body lives on canvas 0. It must never see the composite op.
		expect(values(log, 0, "globalCompositeOperation")).not.toContain("destination-in");
		// Its 0.2/1.0 pair belongs to the deposit's scratch surface, which is
		// allocated after the mark itself.
		const withDestinationIn = log.filter(
			(e) =>
				e.kind === "set" &&
				e.name === "globalCompositeOperation" &&
				e.value === "destination-in",
		);
		expect(withDestinationIn).toHaveLength(1);
		expect(withDestinationIn[0]!.canvas).not.toBe(0);
	});

	it("composites the isolated deposit in once, after the body is down", async () => {
		const log: Recorded[] = [];
		installDocument(log);

		await washToCanvas({
			hue: "#b79cf5",
			weight: 0.9,
			seed: 7,
			width: 190,
			height: 190,
		});

		const bodyAt = log.findIndex(
			(e) => e.canvas === 0 && e.kind === "set" && e.name === "fillStyle",
		);
		const depositAt = log.findIndex(
			(e) => e.canvas === 0 && e.kind === "call" && e.name === "drawImage",
		);
		expect(bodyAt).toBeGreaterThanOrEqual(0);
		expect(depositAt).toBeGreaterThan(bodyAt);
	});

	it("draws the body at the mark's own strength, and the deposit not at all", async () => {
		const log: Recorded[] = [];
		installDocument(log);

		await washToCanvas({
			hue: "#e8a0b4",
			weight: 0.6,
			seed: 3,
			state: "wet",
			width: 240,
			height: 160,
		});

		const fibreAt = log.findIndex(
			(e) =>
				e.canvas === 0 &&
				e.kind === "set" &&
				e.name === "globalCompositeOperation" &&
				e.value === "multiply",
		);
		expect(fibreAt).toBeGreaterThan(0);

		// The body is drawn at `--wash-opacity`, which the generator emits and
		// which this function ignored for its whole life. Without it the mark came
		// out at full strength: radial pigment density read 255 against a CSS mark
		// at 5.7, a 45x difference from two consumers of one generator.
		const bodyBeforeFibre = log
			.slice(0, fibreAt)
			.filter((e) => e.canvas === 0 && e.kind === "set" && e.name === "globalAlpha");
		expect(bodyBeforeFibre.length).toBeGreaterThan(0);
		for (const entry of bodyBeforeFibre) {
			const value = Number(entry.value);
			expect(value).toBeGreaterThan(0);
			expect(value).toBeLessThanOrEqual(1);
		}

		// The deposit's own faint ring must not carry its 0.2 onto the body. That
		// number belongs to the ring layer; when the two shared a surface it
		// scaled the whole disc.
		const faint = log.filter(
			(e) => e.kind === "set" && e.name === "globalAlpha" && e.value === "0.2",
		);
		expect(faint).toHaveLength(0);
	});
});
