/** Camera-to-target length, used when a pointer field omits an explicit distance. */
export function defaultPointerDistance(
	position: readonly [number, number, number],
	target: readonly [number, number, number],
): number {
	const distance = Math.hypot(
		position[0] - target[0],
		position[1] - target[1],
		position[2] - target[2],
	);
	return distance > 0.5 ? distance : 8;
}

/**
 * Move `current` toward `target` without overshooting. `dt` of 0 holds.
 * A stalled frame is clamped so a hidden tab does not teleport the cloud.
 */
export function approachPoint(
	current: readonly [number, number, number],
	target: readonly [number, number, number],
	dt: number,
	lambda = 3.4,
): [number, number, number] {
	const step = dt > 0 ? Math.min(dt, 1 / 20) : 0;
	const t = lambda > 0 ? 1 - Math.exp(-lambda * step) : 0;
	return [
		current[0] + (target[0] - current[0]) * t,
		current[1] + (target[1] - current[1]) * t,
		current[2] + (target[2] - current[2]) * t,
	];
}

/**
 * Widen a local eddy while the hand is moving. Speed 0 returns the authored
 * stir and radius unchanged, so a still curtain does not get brighter or larger.
 * The lift is a force and a reach, not an intensity.
 */
export function stirBreath(
	speed: number,
	stir: number,
	radius: number,
): { stir: number; radius: number } {
	const raw = speed > 0 ? speed : 0;
	const span = 520 - 30;
	const x = raw <= 30 ? 0 : raw >= 520 ? 1 : (raw - 30) / span;
	const motion = x * x * (3 - 2 * x);
	return {
		stir: stir * (1 + motion * 0.28),
		radius: radius * (1 + motion * 0.35),
	};
}
