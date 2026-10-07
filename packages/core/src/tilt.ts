import { clamp, Spring } from "./math.js";

/**
 * The tilt limit, in degrees, from the specification's wobble equation.
 *
 * `θ = -clamp(vx / vmax × 8°, -8°, +8°)`. The sign is the part that matters
 * visually: a thing moving right leans left, which is what a hanging object does
 * when its point of support runs out ahead of it.
 */
export const TILT_LIMIT_DEGREES = 8;

/**
 * The speed at which the tilt reaches its limit, in px per second.
 *
 * One constant rather than a default written twice — the constructor and
 * `targetFor` both need it, and a default in two places is a default that will
 * disagree with itself.
 */
export const DEFAULT_MAX_SPEED = 900;

export interface TiltOptions {
	/** The speed at which the tilt reaches its limit, in px per second. */
	maxSpeed?: number;
	/** Which spring drives the tilt. `jelly` is the specification's bouncy one. */
	damping?: number;
	frequency?: number;
	/**
	 * How quickly a remembered speed decays, per second.
	 *
	 * This is the difference between a tilt and a twitch. A pointer that stops
	 * moving produces no `pointermove` events at all, so speed read straight from
	 * events stays at its last value forever — the object would keep leaning after
	 * the hand stopped. The speed is decayed every frame instead, so it falls to
	 * zero on its own and the tilt follows it back.
	 */
	decay?: number;
}

/**
 * A tilt that follows horizontal pointer speed, and straightens when it stops.
 *
 * ```ts
 * const tilt = new Tilt();
 * // on pointermove
 * tilt.push(event.clientX, performance.now());
 * // on pointerup
 * tilt.release();
 * // each frame, with the frame delta in seconds
 * element.style.transform = `rotate(${tilt.step(dt)}deg)`;
 * ```
 *
 * ## Why the angle is sprung and the speed is not
 *
 * The speed is consumed directly, and the *angle* is driven by a spring toward
 * it. Applying the spring to the speed instead would make the object lean
 * further the harder you shook it in a way that never settles, and would put the
 * oscillation in the wrong quantity: what lags is the lean, not the motion.
 *
 * That lag is the whole point of the section — "a plush sign hanging from a hook,
 * with a light tail-drag when pulled". A rigid multiplication has no tail.
 *
 * ## The decay is not a detail
 *
 * `pointermove` fires only while the pointer moves. Reading speed from the last
 * two events means a pointer that has stopped keeps its final speed forever, and
 * the object hangs at an angle that nothing is holding it at.
 */
export class Tilt {
	/** Current angle in degrees. */
	angle = 0;

	private readonly spring: Spring;
	private readonly maxSpeed: number;
	private readonly decay: number;
	private lastX: number | null = null;
	private lastT = 0;
	/** Horizontal speed in px/s, decayed toward zero between samples. */
	private speed = 0;

	constructor(options: TiltOptions = {}) {
		this.maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;
		this.decay = options.decay ?? 6;
		this.spring = new Spring(0, {
			// ζ ≈ 0.55, inside the specification's own band and the same feel as the
			// library's `press` preset — a spring that overshoots once and stops.
			stiffness: (options.frequency ?? 13) ** 2,
			damping: (options.damping ?? 0.55) * 2 * (options.frequency ?? 13),
			mass: 1,
		});
	}

	/**
	 * Feed a pointer sample.
	 *
	 * Two events at the same millisecond are skipped rather than divided by zero;
	 * a touch device can emit them, and the resulting infinity propagates into the
	 * spring and destroys it permanently.
	 */
	push(x: number, t: number): void {
		if (this.lastX === null) {
			this.lastX = x;
			this.lastT = t;
			return;
		}
		const dt = (t - this.lastT) / 1000;
		if (dt <= 0) return;
		this.speed = (x - this.lastX) / dt;
		this.lastX = x;
		this.lastT = t;
	}

	/** The pointer left. The speed stops being fed and decays away. */
	release(): void {
		this.lastX = null;
	}

	/**
	 * Advance by `dt` seconds and return the angle in degrees.
	 *
	 * The target *is* the negated clamped speed — the equation, not an
	 * approximation of it — and the spring is what makes it arrive late.
	 */
	step(dt: number): number {
		// The remembered speed decays whenever no sample has arrived recently,
		// which is every frame after the pointer stops.
		this.speed *= Math.exp(-this.decay * dt);
		if (Math.abs(this.speed) < 0.5) this.speed = 0;

		this.spring.target = -clamp(
			(this.speed / this.maxSpeed) * TILT_LIMIT_DEGREES,
			-TILT_LIMIT_DEGREES,
			TILT_LIMIT_DEGREES,
		);
		this.spring.step(dt);
		// The spring can come to rest on negative zero, and `angle` is read by tests
		// and by callers comparing against zero. Normalised for the same reason
		// `targetFor` normalises it: `-0 === 0` is true and `Object.is(-0, 0)` is not,
		// so the value is either always normalised or always surprising.
		this.angle = this.spring.value === 0 ? 0 : this.spring.value;
		return this.angle;
	}

	/** The angle a pointer moving at `speedX` px/s would eventually reach. */
	static targetFor(speedX: number, maxSpeed = DEFAULT_MAX_SPEED): number {
		const degrees = clamp(
			(speedX / maxSpeed) * TILT_LIMIT_DEGREES,
			-TILT_LIMIT_DEGREES,
			TILT_LIMIT_DEGREES,
		);
		// Negating a zero produces negative zero, which renders identically as
		// `rotate(-0deg)` and fails every equality check a test can make — so it is
		// normalised at the one place that produces it rather than in each assertion
		// that would have to know about it.
		return degrees === 0 ? 0 : -degrees;
	}
}
