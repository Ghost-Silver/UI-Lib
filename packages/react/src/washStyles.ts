/**
 * The stylesheet createWash produces variables for.
 *
 * Kept as a string rather than a file so a caller gets both halves from one
 * import: the numbers and the rules that read them. A wash is meaningless as
 * variables alone, and the CSS is meaningless without a seed.
 *
 * Every value here comes from a custom property. Nothing is hard-coded except
 * the properties that describe what watercolour *is* rather than how much of
 * it there is — that the rim sits at the edge, that the body fades before it,
 * and that the whole thing has to be non-periodic.
 */
export const WASH_CSS = `
.ui-lib-wash {
	position: relative;
	display: block;
	width: var(--wash-width, 190px);
	height: var(--wash-height, 190px);
	isolation: isolate;

	/*
	 * The silhouette. Eight radii, four horizontal and four vertical, offset by
	 * a seed-derived amount so no two marks are the same shape. A perfect
	 * circle reads as a circle however good the pigment is; water does not
	 * spread evenly and a real mark has a lumpy perimeter.
	 */
	border-radius:
		calc(48% + var(--wash-lobes, 0) * 1%) calc(52% - var(--wash-lobes, 0) * 1%)
		calc(45% + var(--wash-lobes, 0) * 2%) calc(55% - var(--wash-lobes, 0) * 2%) /
		calc(54% - var(--wash-lobes, 0) * 2%) calc(46% + var(--wash-lobes, 0) * 1%)
		calc(57% - var(--wash-lobes, 0) * 1%) calc(43% + var(--wash-lobes, 0) * 2%);
	transform: rotate(calc(var(--wash-lobes, 0) * -1deg));

	background: var(--wash-body);
	opacity: var(--wash-opacity, 0.17);
	filter: blur(var(--wash-blur, 1.5px)) saturate(1.08);
}

/*
 * The deposit.
 *
 * A child element rather than a background layer, and that is the whole trick.
 * The rim has to vary in strength *around* the circle, which is an angular
 * quantity, so the obvious tool is a conic gradient — but a conic sweeps
 * outward along every ray, so any opaque stop paints a stripe from the centre
 * to the edge. Four attempts failed on that: three concentric rings (a
 * crescent), a conic painted in (a pinwheel), a conic under an opaque radial
 * (rays either side of the hole), a conic masked to a band (a jelly gem).
 *
 * The fix is to make the conic drive *visibility* instead of colour. The ring
 * underneath is a flat pigment; the conic is a mask, so where it is opaque the
 * ring shows and where it is clear it does not. There are no rays to see,
 * because nothing is being painted along them.
 */
.ui-lib-wash__deposit {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: var(--wash-rim);
	-webkit-mask-image:
		radial-gradient(closest-side, transparent 72%, rgb(0 0 0 / 1) 86%, rgb(0 0 0 / 1) 97%, transparent 100%),
		var(--wash-deposit-mask);
	mask-image:
		radial-gradient(closest-side, transparent 72%, rgb(0 0 0 / 1) 86%, rgb(0 0 0 / 1) 97%, transparent 100%),
		var(--wash-deposit-mask);
	/* The two masks intersect, which is what keeps the angular variation in the
	   rim band and the middle flat. */
	mask-composite: intersect;
	-webkit-mask-composite: source-in;
	filter: blur(1.8px);
	pointer-events: none;
}

/*
 * The sheet.
 *
 * feTurbulence twice, because no CSS function produces non-repeating noise
 * and paper is not a repeating function. Coarse for the unevenness pigment
 * settles into, fine for the tooth. The images and their sizes both come from
 * the seed, at lengths that cannot line up — an earlier version used a round
 * 180px twice and the tiles were findable as a grid.
 *
 * multiply is load-bearing: the noise has to darken the paper in its pits
 * rather than paint grey over it.
 */
.ui-lib-paper {
	position: relative;
	background-color: var(--wash-paper, #fdfaf6);
}

.ui-lib-paper::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	opacity: var(--wash-grain-opacity, 0.17);
	background-image: var(--wash-grain);
	background-size: var(--wash-grain-size);
	background-position: var(--wash-grain-offset, 0 0);
	mix-blend-mode: multiply;
}

/* --- motion -------------------------------------------------------------
 *
 * A laid wash is not finished. While the paper is wet the water keeps carrying
 * pigment outward, along the fibre, stopping at the boundary — which is the
 * deposit ring happening in real time rather than being drawn.
 */

@keyframes ui-lib-wash-drift {
	0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
	37% { transform: translate3d(1.4%, -1.1%, 0) scale(1.018) rotate(0.5deg); }
	68% { transform: translate3d(-0.9%, 0.8%, 0) scale(0.994) rotate(-0.4deg); }
	100% { transform: translate3d(0.5%, -0.4%, 0) scale(1.006) rotate(0.2deg); }
}

@keyframes ui-lib-wash-spread {
	from { transform: scale(0.82); opacity: 0.72; filter: blur(9px); }
	62% { transform: scale(1.06); opacity: 1; }
	to { transform: scale(1); opacity: 1; filter: blur(0); }
}

@keyframes ui-lib-wash-settle {
	from { opacity: 0; filter: blur(9px); }
	to { opacity: 1; filter: blur(1.8px); }
}

.ui-lib-wash--living {
	animation: ui-lib-wash-drift 14s cubic-bezier(0.22, 0.61, 0.36, 1) infinite alternate;
}

.ui-lib-wash--laying {
	animation: ui-lib-wash-spread 1600ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.ui-lib-wash--laying .ui-lib-wash__deposit {
	animation: ui-lib-wash-settle 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) 700ms both;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-wash--living,
	.ui-lib-wash--laying,
	.ui-lib-wash--laying .ui-lib-wash__deposit {
		animation: none;
	}
}
`;
