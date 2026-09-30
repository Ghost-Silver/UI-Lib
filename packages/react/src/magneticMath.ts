export interface MagneticPoint {
	x: number;
	y: number;
}

/**
 * Translation that closes part of the gap to the pointer, dying at `radius`.
 *
 * The falloff is a smoothstep, so the control does not pop when the pointer
 * crosses the edge. On the centre the offset is zero — there is nothing to chase.
 */
export function magneticOffset(
	pointer: MagneticPoint,
	center: MagneticPoint,
	radius: number,
	strength: number,
): MagneticPoint {
	if (!(radius > 0) || !(strength > 0)) return { x: 0, y: 0 };
	const dx = pointer.x - center.x;
	const dy = pointer.y - center.y;
	const dist = Math.hypot(dx, dy);
	if (dist === 0 || dist >= radius) return { x: 0, y: 0 };
	const t = 1 - dist / radius;
	const falloff = t * t * (3 - 2 * t);
	return { x: dx * falloff * strength, y: dy * falloff * strength };
}
