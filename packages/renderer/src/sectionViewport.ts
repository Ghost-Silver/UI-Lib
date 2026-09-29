/** Cached section size. Collapse stores zeros so a later restore cannot match it. */
export interface ViewportCache {
	width: number;
	height: number;
	dpr: number;
}

export interface ViewportMeasure {
	width: number;
	height: number;
	dpr: number;
	/** GPU tier. `0` keeps the canvas hidden even when the box has area. */
	tier: number;
	force?: boolean;
}

export interface ViewportStep {
	width: number;
	height: number;
	/** The measured box cannot host a canvas. */
	collapsed: boolean;
	/** What the canvas visibility should be after this measure. */
	visible: boolean;
	/**
	 * True when the caller must run resize side effects. A same-size restore
	 * after a collapse is not a cache hit, because the collapse stored 0.
	 */
	resize: boolean;
}

/**
 * Section viewport state machine.
 *
 * A zero box hides the canvas and forgets the last good size. A usable box
 * restores visibility before the size guard, unless the device is tier 0.
 */
export function stepSectionViewport(
	cache: ViewportCache,
	measure: ViewportMeasure,
): ViewportStep {
	if (measure.width < 1 || measure.height < 1) {
		return { width: 0, height: 0, collapsed: true, visible: false, resize: false };
	}
	const same =
		measure.force !== true &&
		measure.width === cache.width &&
		measure.height === cache.height &&
		measure.dpr === cache.dpr;
	return {
		width: measure.width,
		height: measure.height,
		collapsed: false,
		visible: measure.tier !== 0,
		resize: !same,
	};
}
