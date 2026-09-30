export interface DepthHistoryState {
	/** True only after a frame copied world depth into history. */
	live: boolean;
}

export interface DepthHistoryFrame {
	usesPost: boolean;
	hasWorldObjects: boolean;
}

export interface DepthHistoryStep {
	/** Clear history before post, so this frame does not reject against the wrong depth. */
	resetHistory: boolean;
	/** Copy the world target. A gradient-only frame must not copy a cleared attachment. */
	captureDepth: boolean;
	live: boolean;
}

/**
 * Depth-history flip for one frame.
 *
 * Gradient-only frames leave an already-empty history alone, so DOM-glass TAA
 * is not reset every frame. Crossing either way (empty to world, world to
 * empty) resets once, before the post pass.
 */
export function stepDepthHistory(
	state: DepthHistoryState,
	frame: DepthHistoryFrame,
): DepthHistoryStep {
	const live = frame.usesPost && frame.hasWorldObjects;
	return {
		resetHistory: frame.usesPost && frame.hasWorldObjects !== state.live,
		captureDepth: live,
		live,
	};
}
