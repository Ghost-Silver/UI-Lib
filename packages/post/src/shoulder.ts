/**
 * Reinhard roll-off of the part of a channel above 1.
 *
 * Values at or below 1 are unchanged, so a grade can calm clipped sparks
 * without flattening the picture. `amount` 0 is identity. The post graph uses
 * the same expression per channel — keep them in lockstep.
 */
export function compressHighlight(value: number, amount: number): number {
	const gain = Math.min(1, Math.max(0, amount));
	const excess = Math.max(value - 1, 0);
	const rolled = value - excess + excess / (1 + excess);
	return value + (rolled - value) * gain;
}
