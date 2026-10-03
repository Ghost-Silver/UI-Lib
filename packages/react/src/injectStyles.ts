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
	/* Outer radius 2rem with 1.25rem of padding, so any child that wants to be
	   concentric asks for calc(2rem - 1.25rem). Two radii that merely look
	   round are not concentric: with equal values the gap pinches at the corner
	   and swells along the edge, which reads as a lump. */
	--moe-panel-radius: 2rem;
	--moe-panel-pad: 1.25rem;
	border-radius: var(--moe-panel-radius);
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
	--moe-panel-radius: 1.5rem;
	--moe-panel-pad: 1.25rem;
	border-radius: var(--moe-panel-radius);
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

/*
 * The base rule, the per-tone fills, hover and active that used to live here
 * are gone: the MoeKit block below owns all of them now, and two rule sets
 * fighting over the same properties is how a button ends up with a hover
 * transform that cancels its own press animation. What is kept is the fibre.
 */

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

/* ==========================================================================
 * MoeKit tokens
 *
 * The physical model is a soft, elastic solid: silicone, mochi, gummy. Two
 * things follow and they are most of the style — light does not arrive as
 * hard parallel rays but as warm diffuse bounce plus two inner shadows, and
 * every interaction obeys volume conservation, so a squash on one axis is a
 * stretch on the other.
 *
 * Colours are OKLCH. sRGB and HSL are perceptually uneven — equal lightness
 * steps read as a jump in yellow and a crawl in blue — so a palette built in
 * them drifts unevenly as it scales. OKLCH fixes the perceived energy of a
 * step, which is what lets five families sit beside each other at one
 * lightness and stay in tune.
 *
 * Each family keeps its hex twin in the comment. Every browser that runs the
 * shaders in this repository supports oklch(), and the hex is for reading.
 * ======================================================================== */

:root {
	/* --- corner radii ------------------------------------------------------
	 * A 4px grid, shifted coarse. Nothing in a soft system wants a 4px corner:
	 * the smallest that still reads as rounded is 6px, and cards start at 24. */
	--moe-radius-xs: 0.375rem; /*  6px */
	--moe-radius-sm: 0.625rem; /* 10px */
	--moe-radius-md: 1rem; /*      16px */
	--moe-radius-lg: 1.5rem; /*    24px */
	--moe-radius-xl: 2rem; /*      32px */
	--moe-radius-2xl: 2.5rem; /*   40px */
	--moe-radius-full: 9999px;

	/* --- palette ------------------------------------------------------------ */
	--moe-canvas: oklch(0.98 0.008 85); /* #FAF8F5  milk white */
	--moe-card: oklch(0.995 0.004 35); /* near-white, warmed toward cocoa */
	--moe-sakura-100: oklch(0.96 0.04 15);
	--moe-sakura-300: oklch(0.9 0.08 15);
	--moe-sakura-500: oklch(0.85 0.12 15); /* #FFAEC0  petal pink */
	--moe-sakura-700: oklch(0.68 0.16 15);
	--moe-lemon-500: oklch(0.9 0.11 95); /*  #FDE08B  cream lemon */
	--moe-lemon-700: oklch(0.72 0.14 95);
	--moe-mint-500: oklch(0.88 0.11 160); /* #A2EDCE  soda mint */
	--moe-mint-700: oklch(0.65 0.15 160);
	--moe-soda-500: oklch(0.84 0.11 235); /* #9AD9FF  soda blue */
	--moe-soda-700: oklch(0.62 0.15 235);
	--moe-taro-500: oklch(0.82 0.12 305); /* #DAB6FC  taro violet */
	--moe-taro-700: oklch(0.62 0.15 305);

	/* Cocoa, never black. A cool black on a warm ground is the single most
	   reliable tell that a soft interface was not designed in one. */
	--moe-cocoa: oklch(0.32 0.035 35); /*   #4D3C38 */
	--moe-cocoa-soft: oklch(0.55 0.03 35); /* #7A6459 */
	--moe-stroke: rgb(77 60 56 / 0.12);

	/* --- claymorphism -------------------------------------------------------
	 * Three layers, and all three are load-bearing. The ambient drop shadow
	 * says the object is lifted; the inset highlight on the top rim says light
	 * came from above and bounced; the inset shadow at the bottom says the
	 * underside curves away. Two of the three reads as a flat sticker. */
	--moe-clay:
		0 10px 20px -3px rgb(77 60 56 / 0.08), inset 0 4px 6px 0 rgb(255 255 255 / 0.85),
		inset 0 -4px 6px 0 rgb(77 60 56 / 0.07);
	--moe-clay-pink:
		0 8px 18px -2px rgb(255 174 192 / 0.45), inset 0 3px 5px 0 rgb(255 255 255 / 0.8),
		inset 0 -4px 6px 0 rgb(194 82 108 / 0.35);
	--moe-clay-lemon:
		0 8px 18px -2px rgb(253 224 139 / 0.45), inset 0 3px 5px 0 rgb(255 255 255 / 0.8),
		inset 0 -4px 6px 0 rgb(189 148 30 / 0.3);
	--moe-clay-mint:
		0 8px 18px -2px rgb(162 237 206 / 0.45), inset 0 3px 5px 0 rgb(255 255 255 / 0.8),
		inset 0 -4px 6px 0 rgb(60 156 116 / 0.3);
	--moe-clay-soda:
		0 8px 18px -2px rgb(154 217 255 / 0.45), inset 0 3px 5px 0 rgb(255 255 255 / 0.8),
		inset 0 -4px 6px 0 rgb(58 130 178 / 0.3);
	--moe-clay-taro:
		0 8px 18px -2px rgb(218 182 252 / 0.45), inset 0 3px 5px 0 rgb(255 255 255 / 0.8),
		inset 0 -4px 6px 0 rgb(132 84 176 / 0.3);
	--moe-floating:
		0 14px 28px -5px rgb(77 60 56 / 0.12), 0 4px 10px -2px rgb(77 60 56 / 0.05);

	/* --- motion -------------------------------------------------------------
	 * A spring is a second-order system, and its character is the damping
	 * ratio zeta = c / (2*sqrt(km)). Below ~0.4 it rings long enough to look
	 * broken; above ~0.7 it stops reading as elastic at all. The presets sit
	 * inside [0.42, 0.65], which is the band where a bounce is felt rather
	 * than watched.
	 *
	 * CSS has no spring solver, so each is a cubic-bezier with an overshoot
	 * control point. Jelly's two humps are a keyframe animation, not a curve —
	 * a bezier can cross its target once and never twice.
	 *   Jelly  k280 c14 m1   zeta 0.42
	 *   Snappy k450 c25 m1   zeta 0.59
	 *   Gentle k140 c19 m1   zeta 0.80
	 */
	--moe-ease-jelly: cubic-bezier(0.34, 1.56, 0.64, 1);
	--moe-ease-snappy: cubic-bezier(0.2, 1.25, 0.4, 1);
	--moe-ease-gentle: cubic-bezier(0.22, 0.61, 0.36, 1);
	--moe-dur-quick: 140ms;
	--moe-dur-base: 260ms;
	--moe-dur-slow: 420ms;

	/* --- typography --------------------------------------------------------- */
	--moe-font-rounded: "Maple Mono Local", "Fredoka", "Nunito", "Quicksand",
		"PingFang SC", "Hiragino Sans GB", ui-rounded, system-ui, sans-serif;
	--moe-text: var(--moe-cocoa);
	--moe-text-soft: var(--moe-cocoa-soft);
}

/* A press is a squash, and a squash is a stretch on the other axis: a soft
   body keeps its volume. Scale only one axis and it reads as a flat sticker
   sliding, not as something being pushed. */
@keyframes ui-lib-moe-squash {
	0% {
		transform: scale(1, 1) translateY(0);
	}
	38% {
		transform: scale(1.06, 0.9) translateY(3px);
	}
	70% {
		transform: scale(0.94, 1.08) translateY(-2px);
	}
	100% {
		transform: scale(1, 1) translateY(0);
	}
}

@keyframes ui-lib-moe-spark {
	0% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
	}
	55% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.15)
			rotate(var(--spin, 0deg));
	}
}


/* --- clay button ---------------------------------------------------------
 *
 * Sizes are 36 / 48 / 58. md clears the 44px touch minimum; sm does not,
 * and is documented as the dense-layout size rather than the default.
 *
 * The press squash is the one interaction that has to be the same shape in
 * every variant, so it lives here rather than being repeated per variant.
 */

.ui-lib-paper-button {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	font-family: var(--moe-font-rounded);
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa);
	cursor: pointer;
	user-select: none;
	border: 1.5px solid rgb(255 255 255 / 0.5);
	transition:
		transform var(--moe-dur-base) var(--moe-ease-jelly),
		box-shadow var(--moe-dur-base) var(--moe-ease-jelly);
}

.ui-lib-paper-button__label {
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

/* Sizes. Capsule closure, as the spec requires of a CTA. */
.ui-lib-paper-button[data-ui-lib-size="sm"] {
	height: 36px;
	padding: 0 16px;
	border-radius: var(--moe-radius-full);
	font-size: 13px;
}

.ui-lib-paper-button[data-ui-lib-size="md"] {
	height: 48px;
	padding: 0 22px;
	border-radius: var(--moe-radius-full);
	font-size: 15px;
}

.ui-lib-paper-button[data-ui-lib-size="lg"] {
	height: 58px;
	padding: 0 30px;
	border-radius: var(--moe-radius-full);
	font-size: 17px;
}

.ui-lib-paper-button[data-ui-lib-block] {
	display: flex;
	width: 100%;
}

/* Clay: a solid with three shadow layers. */
.ui-lib-paper-button[data-ui-lib-variant="clay"] {
	background: var(--moe-sakura-500);
	box-shadow: var(--moe-clay-pink);
}

.ui-lib-paper-button--iris[data-ui-lib-variant="clay"] {
	background: var(--moe-taro-500);
	box-shadow: var(--moe-clay-taro);
}

.ui-lib-paper-button--mist[data-ui-lib-variant="clay"] {
	background: var(--moe-soda-500);
	box-shadow: var(--moe-clay-soda);
}

/* Gummy: translucent, with a juice gradient rather than a flat fill. */
.ui-lib-paper-button[data-ui-lib-variant="gummy"] {
	background: linear-gradient(
		180deg,
		rgb(255 255 255 / 0.55) 0%,
		rgb(255 255 255 / 0.12) 46%,
		rgb(255 255 255 / 0) 100%
	), var(--moe-sakura-500);
	backdrop-filter: blur(10px) saturate(150%);
	-webkit-backdrop-filter: blur(10px) saturate(150%);
	box-shadow:
		0 10px 22px -4px rgb(255 174 192 / 0.5),
		inset 0 1px 1px 0 rgb(255 255 255 / 0.95),
		inset 0 -6px 10px -4px rgb(194 82 108 / 0.3);
}

/* Flat: for dense layouts, where three shadow layers per row is noise. */
.ui-lib-paper-button[data-ui-lib-variant="flat"] {
	background: var(--moe-sakura-300);
	box-shadow: none;
	border-width: 2px;
	border-color: rgb(255 255 255 / 0.7);
}


/* Gummy and flat need the tone too. Only the clay variant carried it at first,
   which meant a page set to iris rendered one violet button and two pink ones —
   the palette looked wired until you compared the row. */
.ui-lib-paper-button--iris[data-ui-lib-variant="gummy"] {
	background: linear-gradient(
		180deg,
		rgb(255 255 255 / 0.55) 0%,
		rgb(255 255 255 / 0.12) 46%,
		rgb(255 255 255 / 0) 100%
	), var(--moe-taro-500);
	box-shadow:
		0 10px 22px -4px rgb(218 182 252 / 0.5),
		inset 0 1px 1px 0 rgb(255 255 255 / 0.95),
		inset 0 -6px 10px -4px rgb(132 84 176 / 0.3);
}

.ui-lib-paper-button--mist[data-ui-lib-variant="gummy"] {
	background: linear-gradient(
		180deg,
		rgb(255 255 255 / 0.55) 0%,
		rgb(255 255 255 / 0.12) 46%,
		rgb(255 255 255 / 0) 100%
	), var(--moe-soda-500);
	box-shadow:
		0 10px 22px -4px rgb(154 217 255 / 0.5),
		inset 0 1px 1px 0 rgb(255 255 255 / 0.95),
		inset 0 -6px 10px -4px rgb(58 130 178 / 0.3);
}

.ui-lib-paper-button--iris[data-ui-lib-variant="flat"] {
	background: var(--moe-taro-500);
}

.ui-lib-paper-button--mist[data-ui-lib-variant="flat"] {
	background: var(--moe-soda-500);
}

/* Hover lifts; press squashes. Both are transform-only so neither triggers
   layout — a button that reflows under the pointer is worse than one that
   does nothing. */
.ui-lib-paper-button:hover:not(:disabled) {
	transform: translateY(-2px);
	filter: brightness(1.04);
}

.ui-lib-paper-button:active:not(:disabled) {
	animation: ui-lib-moe-squash 420ms var(--moe-ease-jelly);
}

.ui-lib-paper-button:disabled {
	cursor: not-allowed;
	filter: saturate(0.35) brightness(1.08);
	opacity: 0.7;
	box-shadow: none;
}

.ui-lib-paper-button:focus-visible {
	outline: 3px solid var(--moe-taro-500);
	outline-offset: 3px;
}

/* --- sparks -------------------------------------------------------------- */

.ui-lib-paper-button__burst {
	position: absolute;
	z-index: 2;
	width: 0;
	height: 0;
	pointer-events: none;
}

.ui-lib-paper-button__spark {
	position: absolute;
	left: 0;
	top: 0;
	font-size: 11px;
	line-height: 1;
	color: var(--moe-lemon-500);
	text-shadow: 0 0 6px rgb(253 224 139 / 0.9);
	animation: ui-lib-moe-spark 450ms var(--moe-ease-jelly) forwards;
}

/* --- concentric corners ---------------------------------------------------
 *
 * The law is inner = outer - padding, clamped at 4px. Two radii that merely
 * look round are not the same as two radii that are concentric: with equal
 * values, the gap between the outer curve and the inner one pinches at the
 * corner and swells along the edges, which reads as a lump. Only the panels
 * that actually inset their children carry this.
 */

.ui-lib-soft-light-panel > *,
.ui-lib-watercolor-card > * {
	border-radius: calc(var(--moe-panel-radius, 1.5rem) - var(--moe-panel-pad, 1.25rem));
}


/* --- soft card -----------------------------------------------------------
 *
 * The hover is a lift plus a tilt, and both matter. A lift alone reads as a
 * menu item; the 1.5 degrees is what makes it read as a thing that is light
 * enough to be disturbed by the pointer. The press closes it back down and
 * squeezes it 1.5 per cent, which is the same volume story the button tells.
 *
 * Transform and box-shadow only — a card that reflows on hover moves the text
 * under the reader's eye.
 */

.ui-lib-soft-card {
	border-radius: var(--moe-radius-lg);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	color: var(--moe-text);
	font-family: var(--moe-font-rounded);
	box-shadow: var(--moe-clay);
	transition:
		transform var(--moe-dur-base) var(--moe-ease-jelly),
		box-shadow var(--moe-dur-base) var(--moe-ease-jelly);
}

.ui-lib-soft-card[data-ui-lib-interactive]:hover {
	transform: translateY(-4px) rotate(-1.5deg) scale(1.01);
	box-shadow:
		0 16px 32px -4px rgb(77 60 56 / 0.12),
		inset 0 4px 6px 0 rgb(255 255 255 / 0.9);
}

.ui-lib-soft-card[data-ui-lib-interactive]:active {
	transform: translateY(1px) scale(0.985);
	transition-duration: var(--moe-dur-quick);
}

/* Typography: the spec's two rules that change how a page feels most are the
   line-height and the weight. Body text at 1.57 rather than 1.33, and at 600
   rather than 400, is the difference between a dense tool and something that
   breathes. */
.ui-lib-soft-card p,
.ui-lib-soft-card li {
	font-size: 15px;
	line-height: 1.57;
	font-weight: 600;
	margin: 0;
}

.ui-lib-soft-card h3,
.ui-lib-soft-card h4 {
	font-weight: 800;
	line-height: 1.33;
	letter-spacing: -0.01em;
	margin: 0 0 6px;
}

/* Conic rims read as a glass edge where a flat border reads as a line. */
.ui-lib-soft-card[data-ui-lib-glossy]::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: linear-gradient(150deg, rgb(255 255 255 / 0.7) 0%, rgb(255 255 255 / 0) 40%);
	pointer-events: none;
}


/* --- soft switch ---------------------------------------------------------
 *
 * Track 56 x 32, knob 26. The track is a sunken groove — an inset shadow, not
 * a drop shadow — because the knob sits *in* it, and a raised groove with a
 * bead on top reads as two unrelated objects.
 *
 * The knob is the only element with a clay treatment: raised, with its own top
 * highlight, so it looks like something you can push with a thumb.
 */

.ui-lib-soft-switch {
	position: relative;
	display: inline-flex;
	align-items: center;
	width: 56px;
	height: 32px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: oklch(0.91 0.006 60);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.16),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.7);
	cursor: pointer;
	touch-action: none;
	transition: background var(--moe-dur-base) var(--moe-ease-gentle);
	-webkit-tap-highlight-color: transparent;
}

.ui-lib-soft-switch[data-ui-lib-on] {
	background: var(--moe-mint-500);
	box-shadow:
		inset 0 2px 4px 0 rgb(60 156 116 / 0.28),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.7);
}

.ui-lib-soft-switch:focus-visible {
	outline: 3px solid var(--moe-taro-500);
	outline-offset: 3px;
}

.ui-lib-soft-switch[data-ui-lib-soft-disabled],
.ui-lib-soft-switch:disabled {
	cursor: not-allowed;
	filter: saturate(0.3);
	opacity: 0.6;
}

.ui-lib-soft-switch__knob {
	position: absolute;
	left: 3px;
	top: 3px;
	display: grid;
	place-items: center;
	height: 24px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-card);
	box-shadow:
		0 2px 5px -1px rgb(77 60 56 / 0.22),
		inset 0 2px 3px 0 rgb(255 255 255 / 0.95),
		inset 0 -2px 3px 0 rgb(77 60 56 / 0.08);
	will-change: transform;
}

.ui-lib-soft-switch__face {
	font-family: var(--moe-font-rounded);
	font-size: 9px;
	font-weight: 800;
	line-height: 1;
	letter-spacing: 0.04em;
	color: var(--moe-cocoa-soft);
	user-select: none;
}

/* The open face was mint-700, which on a white knob measured about 2:1 — the
   eyes were there and could not be read. A face is a glyph, so it needs glyph
   contrast, not decorative contrast. */
.ui-lib-soft-switch[data-ui-lib-on] .ui-lib-soft-switch__face {
	color: oklch(0.44 0.11 165);
}

/* The stretch is the whole point, so it is the one thing reduced motion keeps
   down to a no-op rather than merely shortening. */
@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-switch__knob {
		transition: none;
	}
}


/* --- soft tabs -----------------------------------------------------------
 *
 * A sunken groove with a raised pill in it. Same physics as the switch: the
 * groove is an inset shadow because the pill sits in it, and the pill is clay
 * because it is the thing being pushed around.
 *
 * The travelling state narrows the pill and draws a neck behind it. Two shapes
 * that overlap while one shrinks is not a real metaball, but at this size the
 * eye reads the result as surface tension — which is what the design is after
 * — and it costs two spans instead of a shader.
 */

.ui-lib-soft-tabs {
	display: inline-block;
	font-family: var(--moe-font-rounded);
}

.ui-lib-soft-tabs__list {
	position: relative;
	display: inline-flex;
	gap: 2px;
	padding: 4px;
	border-radius: var(--moe-radius-full);
	background: oklch(0.94 0.005 60);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.1),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.8);
	isolation: isolate;
}

.ui-lib-soft-tabs__tab {
	position: relative;
	z-index: 1;
	appearance: none;
	border: none;
	background: none;
	/* A two-character CJK label has no break opportunity, so it will fold in
	   half the moment the track is a few pixels narrow — 柔 / 光. The labels
	   are single words and never want to wrap. */
	white-space: nowrap;
	padding: 0 20px;
	height: 34px;
	border-radius: var(--moe-radius-full);
	font-family: inherit;
	font-size: 14px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	cursor: pointer;
	transition: color var(--moe-dur-base) var(--moe-ease-gentle);
	-webkit-tap-highlight-color: transparent;
}

.ui-lib-soft-tabs[data-ui-lib-size="md"] .ui-lib-soft-tabs__tab {
	height: 42px;
	padding: 0 24px;
	font-size: 15px;
}

.ui-lib-soft-tabs__tab[aria-selected="true"] {
	color: var(--moe-cocoa);
}

.ui-lib-soft-tabs__tab:focus-visible {
	outline: 3px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* The pill and the neck. Both sit behind the labels, which is why the tabs
   carry z-index 1 and the groove is isolation: isolate. */
.ui-lib-soft-tabs__pill,
.ui-lib-soft-tabs__neck {
	position: absolute;
	top: 4px;
	height: calc(100% - 8px);
	border-radius: var(--moe-radius-full);
	background: var(--moe-sakura-500);
	box-shadow: var(--moe-clay-pink);
	pointer-events: none;
}

.ui-lib-soft-tabs__pill {
	transition:
		left var(--moe-dur-slow) var(--moe-ease-jelly),
		width var(--moe-dur-slow) var(--moe-ease-jelly),
		transform 220ms var(--moe-ease-jelly);
	transform-origin: center;
}

/* While moving, the pill narrows. A droplet that is being pulled thins in the
   middle before it separates. */
.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__pill {
	transform: scaleX(0.62);
	transition:
		left var(--moe-dur-slow) var(--moe-ease-jelly),
		width var(--moe-dur-slow) var(--moe-ease-jelly),
		transform 180ms ease-out;
}

.ui-lib-soft-tabs__neck {
	opacity: 0;
	transition: opacity 180ms ease-out;
}

.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__neck {
	opacity: 0.85;
	transition: opacity 120ms ease-in;
}

.ui-lib-soft-tabs[data-ui-lib-size="sm"] .ui-lib-soft-tabs__pill,
.ui-lib-soft-tabs[data-ui-lib-size="sm"] .ui-lib-soft-tabs__neck {
	top: 4px;
	height: calc(100% - 8px);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-tabs__pill,
	.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__pill {
		transition: none;
		transform: none;
	}

	.ui-lib-soft-tabs__neck,
	.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__neck {
		display: none;
	}
}

/* --- reduced motion -------------------------------------------------------
 *
 * Not a smaller animation — none. A user who has asked for less motion is
 * asking not to be moved, and a squashed button plus a radial spark burst is
 * exactly what they asked to be spared.
 */

@media (prefers-reduced-motion: reduce) {
	.ui-lib-paper-button,
	.ui-lib-paper-button:hover:not(:disabled),
	.ui-lib-paper-button:active:not(:disabled) {
		transition: none;
		transform: none;
		animation: none;
	}

	.ui-lib-paper-button__spark {
		display: none;
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
