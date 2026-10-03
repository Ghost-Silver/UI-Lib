const STYLE_ID = "ui-lib-styles";

const CSS = `
[data-ui-lib-glass="fallback"] {
	background: linear-gradient(140deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04));
	-webkit-backdrop-filter: blur(18px) saturate(180%);
	backdrop-filter: blur(18px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.22);
	box-shadow:
		0 1px 0 0 rgba(255, 255, 255, 0.35) inset,
		0 24px 60px -20px rgba(0, 0, 0, 0.55);
}
[data-ui-lib-glass="off"] {
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.14);
}
.ui-lib-magnetic {
	display: inline-flex;
	max-width: 100%;
	vertical-align: top;
}
.ui-lib-magnetic__mover {
	width: 100%;
	height: 100%;
}
.ui-lib-reveal__word {
	display: inline-block;
	white-space: pre;
}
/* ---------------------------------------------------------------------------
 * IRIS components.
 *
 * Split in two on purpose:
 *
 *  - shape and type are unconditional. The glass is painted by the canvas
 *    underneath the element, so the element still has to carry its own radius,
 *    padding and colour for the box to line up with what the canvas draws.
 *  - the fill is gated on the fallback state, exactly like the generic rule
 *    above. Applying it while the GPU is live would frost an element that is
 *    already being refracted, and the two would fight.
 *
 * Colour values mirror the IRIS palette in @ui-lib/core.
 * ------------------------------------------------------------------------- */

.iris-stage,
.ui-lib-bubble-badge,
.ui-lib-paper-button,
.ui-lib-soft-light-panel,
.ui-lib-watercolor-card,
.ui-lib-bling {
	/* Without this a viewer whose OS prefers dark gets a UA-darkened <button>
	   (measured #6b6b6b) sitting in the middle of a near-white page. */
	color-scheme: light;
}

.ui-lib-bubble-badge,
.ui-lib-paper-button,
.ui-lib-soft-light-panel,
.ui-lib-watercolor-card {
	position: relative;
	isolation: isolate;
}

/* A 28px bead gives refraction almost nothing to work with on a pale sheet,
   so the bead has to carry its own colour. Translucent rather than opaque, or
   it would paint over the very glass it sits on. */
.ui-lib-bubble-badge {
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.85);
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.95) inset,
		0 6px 14px -10px rgba(51, 34, 79, 0.5);
	color: #33224f;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(183, 156, 245, 0.62));
}

.ui-lib-bubble-badge--blossom {
	color: #6d1436;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 194, 220, 0.66));
}

.ui-lib-bubble-badge--mist {
	color: #26375c;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(195, 216, 240, 0.66));
}

.ui-lib-soft-light-panel {
	border-radius: 32px;
	/* A light pane has to say what colour its own text is. Inheriting the
	   host page's colour is only correct by accident: on a page written for a
	   dark ground the inherited value is near-white, and the text inside a
	   near-white panel is invisible. Found by looking at a contact sheet of
	   every component and tone — no pixel gate could see it, because the gates
	   measure the canvas and the text is DOM. */
	color: #33224f;
	/* Faint by design, but not absent: the canvas glass alone leaves nothing to
	   see where the ground behind it is already white.
	   The iris fill was rgba(239, 234, 255, 0.42), which against a wash built
	   from the same rung measured as **completely invisible** — the component
	   baseline scored it 0.0000 ink. A panel has to be distinguishable from a
	   ground of its own tone, so the fill is a step deeper than the wash and
	   carries a hairline edge for the silhouette. */
	border: 1px solid rgba(255, 255, 255, 0.85);
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(214, 202, 250, 0.6));
	box-shadow: 0 10px 26px -20px rgba(51, 34, 79, 0.5);
}

.ui-lib-watercolor-card {
	border-radius: 28px;
	overflow: hidden;
	color: #4a2440;
}

/*
 * A wash, not a stain.
 *
 * The first version put four pools down with hard 0% cores, and the most
 * saturated of them sat in a 40% box low on the card. At card size that read as
 * a smudge — the contact sheet made it obvious and nothing else would have.
 * Pigment spreads: the cores are graded rather than flat, the pools are wider
 * than the card so their edges fall outside it, and the layer is blurred so
 * there is no hard boundary anywhere. saturate keeps the blur from washing
 * the colour out.
 */
.ui-lib-watercolor-card::before {
	content: "";
	position: absolute;
	inset: -12%;
	z-index: -1;
	background:
		radial-gradient(62% 58% at 20% 16%, #efeaff 0%, rgba(239, 234, 255, 0.55) 42%, transparent 74%),
		radial-gradient(54% 50% at 82% 24%, #fff0f7 0%, rgba(255, 240, 247, 0.5) 46%, transparent 76%),
		radial-gradient(72% 64% at 74% 86%, #eef5fd 0%, rgba(238, 245, 253, 0.5) 48%, transparent 78%),
		radial-gradient(58% 54% at 36% 76%, rgba(191, 168, 244, 0.66) 0%, rgba(191, 168, 244, 0.3) 44%, transparent 78%),
		linear-gradient(158deg, #e7e0ff 0%, #fdfbff 62%, #f3ecff 100%);
	filter: blur(11px) saturate(1.1);
	opacity: 0.74;
	pointer-events: none;
}

.ui-lib-watercolor-card[data-ui-lib-pools="still"]::before {
	background:
		radial-gradient(58% 52% at 50% 46%, #b79cf5 0%, transparent 72%),
		radial-gradient(48% 44% at 50% 52%, #ffc2dc 0%, transparent 74%),
		linear-gradient(160deg, #efeaff 0%, #ffffff 100%);
}

/* Per-tone visible appearance.
 *
 * tone used to reach only the glass tint, which on a pale ground is not
 * enough to tell the palettes apart: the component baseline measured 0.00
 * between iris, blossom and mist on the watercolour card, and 0.01 on the
 * glints. These belong here rather than in a page's stylesheet — a page's
 * sheet lands earlier in the head than this injected one, so at equal
 * specificity the base rule here would win and the tone would silently do
 * nothing.
 */

/* --- per-tone visible appearance -------------------------------------------
 *
 * tone reached the glass tint and nothing else, so on a pale ground the three
 * palettes were indistinguishable: the component baseline measured 0.00
 * between iris, blossom and mist on the watercolour card, and 0.01 on the
 * glints. The tint of a translucent pane is not a place to put a brand colour.
 * These are the rules that make the prop mean something.
 */

.ui-lib-watercolor-card--blossom::before {
	background:
		radial-gradient(62% 58% at 20% 16%, #fff0f7 0%, rgba(255, 240, 247, 0.55) 42%, transparent 74%),
		radial-gradient(54% 50% at 82% 24%, #ffe4ef 0%, rgba(255, 228, 239, 0.5) 46%, transparent 76%),
		radial-gradient(72% 64% at 74% 86%, #fff7fb 0%, rgba(255, 247, 251, 0.5) 48%, transparent 78%),
		radial-gradient(58% 54% at 36% 76%, rgba(255, 179, 209, 0.62) 0%, rgba(255, 179, 209, 0.28) 44%, transparent 78%),
		linear-gradient(158deg, #fff0f7 0%, #ffffff 62%, #fff7fb 100%);
}

.ui-lib-watercolor-card--mist::before {
	background:
		radial-gradient(62% 58% at 20% 16%, #eef5fd 0%, rgba(238, 245, 253, 0.55) 42%, transparent 74%),
		radial-gradient(54% 50% at 82% 24%, #e3eefb 0%, rgba(227, 238, 251, 0.5) 46%, transparent 76%),
		radial-gradient(72% 64% at 74% 86%, #f6faff 0%, rgba(246, 250, 255, 0.5) 48%, transparent 78%),
		radial-gradient(58% 54% at 36% 76%, rgba(168, 198, 232, 0.62) 0%, rgba(168, 198, 232, 0.28) 44%, transparent 78%),
		linear-gradient(158deg, #eef5fd 0%, #ffffff 62%, #f6faff 100%);
}

.ui-lib-soft-light-panel--blossom {
	color: #6d1436;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 206, 228, 0.62));
}

.ui-lib-soft-light-panel--mist {
	color: #26375c;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(190, 216, 244, 0.66));
}

.ui-lib-bling--blossom .ui-lib-bling__gem {
	background: radial-gradient(circle at 34% 30%, #ffffff 0%, #ffc2dc 46%, #c02b6e 100%);
	box-shadow: 0 0 10px 1px rgba(255, 127, 178, 0.5);
}

.ui-lib-bling--mist .ui-lib-bling__gem {
	background: radial-gradient(circle at 34% 30%, #ffffff 0%, #c3d8f0 46%, #4a6da8 100%);
	box-shadow: 0 0 10px 1px rgba(143, 176, 221, 0.5);
}

.ui-lib-paper-button {
	border-radius: 18px;
	cursor: pointer;
	font: inherit;
	font-weight: 600;
	padding: 11px 22px;
	color: #33224f;
	border: 1px solid rgba(255, 255, 255, 0.85);
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.95) inset,
		0 10px 22px -16px rgba(51, 34, 79, 0.55);
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 194, 220, 0.6));
	transition:
		transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
		box-shadow 200ms ease;
}

/* Fibre. Two offset repeating gradients at low alpha read as pressed paper at
   any zoom; a bitmap would alias as soon as the page scaled. */
.ui-lib-paper-button::after {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background-image:
		repeating-linear-gradient(52deg, rgba(51, 34, 79, 0.05) 0 1px, transparent 1px 4px),
		repeating-linear-gradient(-38deg, rgba(255, 255, 255, 0.5) 0 1px, transparent 1px 5px);
	opacity: 0.55;
	pointer-events: none;
}

.ui-lib-paper-button[data-ui-lib-block] {
	display: block;
	width: 100%;
}

.ui-lib-paper-button--iris {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(183, 156, 245, 0.58));
}

.ui-lib-paper-button--mist {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(195, 216, 240, 0.6));
}

.ui-lib-paper-button:hover {
	transform: translateY(-1px);
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.95) inset,
		0 14px 28px -16px rgba(51, 34, 79, 0.6);
}

.ui-lib-paper-button:active {
	transform: translateY(1px) scale(0.99);
	transition-duration: 90ms;
}

.ui-lib-paper-button:focus-visible {
	outline: 2px solid #5b3aa6;
	outline-offset: 3px;
}

.ui-lib-paper-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
	transform: none;
}

/* --- fallback fill: only when there is no canvas to refract with ---------- */

[data-ui-lib-glass="fallback"].ui-lib-bubble-badge,
[data-ui-lib-glass="fallback"].ui-lib-paper-button,
[data-ui-lib-glass="fallback"].ui-lib-soft-light-panel,
[data-ui-lib-glass="fallback"].ui-lib-watercolor-card {
	-webkit-backdrop-filter: blur(10px) saturate(1.4);
	backdrop-filter: blur(10px) saturate(1.4);
	border: 1px solid rgba(255, 255, 255, 0.72);
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.9) inset,
		0 12px 30px -18px rgba(51, 34, 79, 0.45);
}

[data-ui-lib-glass="fallback"].ui-lib-bubble-badge {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(239, 234, 255, 0.72));
}

[data-ui-lib-glass="fallback"].ui-lib-paper-button {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 240, 247, 0.8));
}

[data-ui-lib-glass="fallback"].ui-lib-soft-light-panel {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(239, 234, 255, 0.5));
}

.ui-lib-bling {
	position: absolute;
	inset: 0;
	pointer-events: none;
	overflow: hidden;
	border-radius: inherit;
}

.ui-lib-bling__gem {
	position: absolute;
	border-radius: 999px;
	transform: translate(-50%, -50%);
	background: radial-gradient(circle at 34% 30%, #ffffff 0%, #b79cf5 46%, #5b3aa6 100%);
	box-shadow: 0 0 10px 1px rgba(139, 92, 246, 0.5);
	animation: ui-lib-bling-twinkle 4.6s ease-in-out infinite;
}

@keyframes ui-lib-bling-twinkle {
	0%,
	100% {
		opacity: 0.35;
		transform: translate(-50%, -50%) scale(0.8);
	}
	50% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.15);
	}
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-bling__gem {
		animation: none;
		opacity: 0.7;
	}
	.ui-lib-paper-button:hover,
	.ui-lib-paper-button:active {
		transform: none;
	}
}
`;

/**
 * Injects the (tiny) fallback stylesheet once per document.
 *
 * Keeps the package import-free of CSS bundler configuration: `import
 * "@ui-lib/react/styles.css"` is nice for apps, but a library that silently
 * needs a CSS import is a support ticket waiting to happen.
 */
export function ensureStyles(doc: Document = document): void {
	if (doc.getElementById(STYLE_ID)) return;
	const style = doc.createElement("style");
	style.id = STYLE_ID;
	style.textContent = CSS;
	doc.head.appendChild(style);
}
