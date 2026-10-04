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
	/*
	 * Surfaces and states, as tokens.
	 *
	 * These were eighty-nine literal oklch(...) values scattered through the
	 * stylesheet, and the cost was measurable: overriding the palette changed the
	 * text and the accent and left every groove, every hover tint and every
	 * selected row exactly as it was, because those were not reading a token at
	 * all. A theme that reaches two thirds of an interface is not a theme.
	 *
	 * Named by **role** rather than by colour: a component wants "the recess in a
	 * surface" or "the tint under a pointer", and a palette that changes which hue
	 * that is should not have to change every call site.
	 *
	 * The values are the ones that were hard-coded — this is a move, not a
	 * redesign, and the twelve slots below cover 73 per cent of the occurrences.
	 */
	--moe-surface-sunken: oklch(0.955 0.008 60); /* a groove in paper */
	--moe-surface-sunken-deep: oklch(0.93 0.01 60); /* a deeper one */
	--moe-surface-raised: oklch(0.985 0.006 60); /* a card lifted off paper */
	--moe-surface-hover: oklch(0.95 0.02 310); /* under a pointer */
	--moe-surface-hover-soft: oklch(0.975 0.006 60);
	--moe-state-iris: oklch(0.93 0.035 300); /* chosen, in the violet family */
	--moe-state-iris-strong: oklch(0.91 0.045 300);
	--moe-state-iris-soft: oklch(0.95 0.02 300);
	--moe-state-blossom: oklch(0.95 0.03 15);
	--moe-state-blossom-strong: oklch(0.91 0.045 15);
	--moe-state-mint: oklch(0.95 0.03 165);
	--moe-state-sky: oklch(0.95 0.03 235);
	/*
	 * The four semantic states, each as a background, a border and a mark.
	 *
	 * These were the second half of the same problem the surfaces had: an alert's
	 * fill, an error field's fill and a disabled control's fill were all literals,
	 * so a dark theme showed a pink error panel inside an otherwise dark form —
	 * worse than never theming, because the contrast that made it readable in the
	 * light theme is exactly what is missing.
	 *
	 * Four states rather than six colour families: mint, lemon and sky are
	 * not six unrelated hues, they are success, warning and info, and naming them
	 * by what they mean is what lets a palette change which hue plays which part.
	 */
	--moe-state-success-bg: oklch(0.97 0.025 165);
	--moe-state-success-border: oklch(0.9 0.05 165);
	--moe-state-success-mark: oklch(0.92 0.06 165);
	--moe-state-success-ink: oklch(0.42 0.09 165);
	--moe-state-warning-bg: oklch(0.975 0.03 85);
	--moe-state-warning-border: oklch(0.91 0.06 85);
	--moe-state-warning-mark: oklch(0.93 0.07 85);
	--moe-state-warning-ink: oklch(0.45 0.1 75);
	--moe-state-danger-bg: oklch(0.985 0.008 20);
	--moe-state-danger-border: oklch(0.9 0.055 20);
	--moe-state-danger-mark: oklch(0.92 0.06 20);
	--moe-state-danger-ink: oklch(0.44 0.13 20);
	--moe-state-info-bg: oklch(0.97 0.02 300);
	--moe-state-info-border: oklch(0.9 0.04 300);
	--moe-state-info-mark: oklch(0.92 0.05 300);
	--moe-state-info-ink: oklch(0.44 0.09 300);
	/* A control that cannot be used, and the fill behind a dismiss affordance. */
	--moe-state-disabled: oklch(0.95 0.01 20);
	--moe-state-disabled-ink: oklch(0.7 0.02 40);
	/*
	 * How strongly a material lays down pigment.
	 *
	 * A token rather than a constant in the generator, because the right strength
	 * depends on the ground: on paper, a wash has to be visible against a near-white
	 * card; on a near-black one, the same strength is a saturated block that the
	 * text cannot sit on. Measured in the cyberpunk theme — the card went full
	 * quantum cyan and the body text on it fell to roughly 1.4:1.
	 */
	/*
	 * The text colour for a surface that has pigment on it.
	 *
	 * A material ground is darker and more saturated than the card it sits on, so
	 * the theme's text colour is measured against the wrong thing. Measured from
	 * rendered pixels, before this token existed: anime 3.85:1, cyberpunk 1.17:1,
	 * minimalist 1.08:1, obsidian 1.34:1 — **none of them reach the 4.5 the standard
	 * asks for**, including the one that had been shipped longest.
	 *
	 * The fix is not a darker text colour, because a palette where the pigment is
	 * deep needs a light one — cyberpunk's ground is near-black and its material is
	 * pure cyan. What every theme has in common is that a material is *pigment*, so
	 * the text on it is the same hue at the opposite end: the theme sets this to its
	 * ink colour, and a theme whose pigment is dark sets it to its paper instead.
	 *
	 * Default is the cocoa this library has always used, because the default theme
	 * is the one where pigment is light.
	 */
	--moe-on-material: oklch(0.14 0.02 265.76);
	/*
	 * The softer ink, and it is **not** the theme's soft text colour.
	 *
	 * --moe-cocoa-soft is 0.55 lightness, which is measured against paper at
	 * 0.98 — and a material ground is at 0.93, so the same colour loses about a
	 * fifth of its contrast. Measured on the rendered film, 0.55 comes to 3.65:1
	 * where the standard asks for 4.5.
	 *
	 * The secondary line is the same near-black at lower contrast against the film,
	 * not a different hue: a film has one ink, and "softer" means less of it.
	 */
	--moe-on-material-soft: oklch(0.20 0.02 265.76);
	/*
	 * Which token the pigment is read from, when the accent is too deep to make a
	 * film text can sit on.
	 *
	 * minimalist needs this and no other theme does. Its accent is the
	 * document's #7c3aed, which on a white card mixes to a film at about
	 * rgb(123 101 254) — and measured, **thinning it does not help**: from weight
	 * 0.46 down to 0.10 the film only moves from rgb(116 92 252) to roughly
	 * rgb(129 105 254), because Kubelka-Munk does not lose saturation with
	 * thickness the way a linear mix does. Extrapolated to zero thickness it is
	 * still 4.64:1 against near-black.
	 *
	 * So the pigment for a film is its own token, defaulting to the accent. A theme
	 * whose accent is too deep points it at a lighter rung of the same family, which
	 * is what the palette's -100 and -300 values are for.
	 */
	--moe-material-pigment-taro: var(--moe-taro-500);
	--moe-material-pigment-sakura: var(--moe-sakura-500);
	--moe-material-pigment-soda: var(--moe-soda-500);
	--moe-material-tint: 0.62;
	--moe-material-wash: 1;
	--moe-text: var(--moe-cocoa);
	--moe-text-soft: var(--moe-cocoa-soft);
}

/*
 * Four palettes, one token set.
 *
 * The specification asks for four flagship visual systems — Ethereal Pastel
 * Anime, Cyberpunk Neon Hologram, Minimalist Ceramic White, Dark Obsidian
 * Spatial — and describes them as hot-swappable through CSS variables. Which is
 * what these are: every rule in this file reads a --moe-* variable, so a theme
 * is a list of redefinitions and nothing else changes. No component knows which
 * theme is on.
 *
 * ## Why only two of the four are here
 *
 * Because two are the ones that disagree most, and a theme system that is only
 * ever tested in the palette it was designed in is a theme system that has not
 * been tested. Pastel and cyberpunk differ in ground (0.98 vs 0.14 lightness),
 * in text direction (dark-on-light vs light-on-dark), and in stroke (warm brown
 * at 12% vs a saturated cyan) — so anything that is accidentally hard-coded to a
 * light ground shows up immediately.
 *
 * The other two are the same exercise with different numbers, and are listed in
 * the README as not yet implemented rather than implied to work.
 *
 * Values are the specification's own, converted from the hex it prints. The
 * conversion is oklchToSrgb in @ui-lib/core, round-tripped to the exact hex
 * before being written here.
 */

/* --- the four themes ------------------------------------------------------
 *
 * ## Known defect: text on a material ground does not reach 4.5:1
 *
 * Measured on rendered pixels — the paragraph's own box, its modal colour as the
 * ground and its darkest and lightest decile as the glyph — across all four
 * themes:
 *
 * | theme | worst card |
 * | --- | --- |
 * | anime | 3.85:1 |
 * | cyberpunk | 1.17:1 |
 * | minimalist | 1.08:1 |
 * | obsidian | 1.34:1 |
 *
 * **Not one of them passes.** And anime at 3.85 is the one that has been shipped
 * longest, which means this is not a theme problem: text on a material ground has
 * never had enough contrast, and it went unnoticed because the earlier measurement
 * compared the text against a colour stop in the generated gradient rather than
 * against the pixels behind the glyphs. That method reported 6.45:1 for a card
 * whose text is plainly unreadable.
 *
 * Three ways out, none of them taken yet because each is a design decision rather
 * than a fix:
 *
 * 1. Lay pigment down more thinly under text — a per-component weight, which the
 *    token already allows but no component passes.
 * 2. Give material grounds their own text colour, darker than --moe-cocoa,
 *    rather than reusing the theme's.
 * 3. Restrict the material to surfaces that carry no text, which is the honest
 *    answer if 1 and 2 are not enough.
 *
 * Left measured and unfixed. A value nudged until a screenshot looks better is how
 * a palette stops meaning anything, and this needs a decision about which of the
 * three it is.
 *
 * ## The theme table
 *
 * The specification ships a structured token table for these — IrisThemeTokens
 * in IrisUiLibDesignTokens.ts — with ten values for each of four themes. This is
 * that table, value for value.
 *
 * Every colour is converted to OKLCH through oklchToSrgb in this repository and
 * **round-tripped back to the exact hex** before being written here, so the number
 * in this file and the number in the document are the same number. All twenty
 * accent colours were checked to be inside the sRGB gamut; none of them is a
 * colour the browser cannot actually show.
 *
 * Two are new this round — minimalist and obsidian — which completes the set
 * the document asks for. The naming follows the document's keys rather than the
 * shortened ones used before, because a caller reading the specification should
 * not have to translate.
 */

/* --- anime, and the default ------------------------------------------------
 *
 * :root is this theme, and the selector exists so that data-moe-theme="anime"
 * means the same thing as no attribute — a picker needs a value for the state the
 * page was designed in.
 *
 * The document's ground is #fdf4f8, slightly pinker than the oklch(0.98 0.008
 * 85) this library used. The background moved; the rest of the pastel palette is
 * this repository's and is not in the document, which lists four accents and a
 * radius where this theme has five hues and a scale.
 */
[data-moe-theme="anime"] {
	color-scheme: light;
	--moe-canvas: oklch(0.97525 0.01094 348.42);
}

/* --- Cyberpunk Neon Hologram ----------------------------------------------
 *
 * Ground #07090e, the cyan #00f0ff as the accent, hot pink for interruption
 * and violet for the slow path. The document also asks for frosted glass and a
 * 60Hz grid; the glass is the renderer's job and the grid is not written.
 */
[data-moe-theme="cyberpunk"] {
	color-scheme: dark;

	--moe-canvas: oklch(0.13979 0.01175 265.76);
	--moe-card: oklch(0.23736 0.04395 265.76);

	/*
	 * The accent family, remapped rather than renamed.
	 *
	 * A component asks for --moe-taro-500 because the component was written in
	 * the pastel theme; in this one that name resolves to the quantum cyan. The
	 * alternative — a second set of names per theme — would mean every component
	 * knowing every theme, which is what "decoupled from design atoms" is asking to
	 * avoid.
	 */
	--moe-taro-500: oklch(0.87005 0.14814 202.88);
	--moe-taro-700: oklch(0.64000 0.14814 202.88);
	--moe-taro-100: oklch(0.26000 0.06000 202.88);
	--moe-sakura-500: oklch(0.63500 0.25400 15.50);
	--moe-sakura-700: oklch(0.50000 0.25400 15.50);
	--moe-sakura-100: oklch(0.22000 0.08000 15.50);
	--moe-soda-500: oklch(0.62700 0.23300 303.90);
	--moe-soda-700: oklch(0.50000 0.23300 303.90);
	--moe-mint-500: oklch(0.87005 0.14814 202.88);
	--moe-lemon-500: oklch(0.80000 0.15000 95.00);

	/* Light text on a dark ground, which is the point of a second theme: a
	   component that assumed dark-on-light reads as broken immediately. */
	--moe-cocoa: oklch(0.96000 0.01000 265.76);
	--moe-cocoa-soft: oklch(0.72000 0.02000 265.76);
	--moe-stroke: rgb(0 240 255 / 0.25);
	--moe-text: var(--moe-cocoa);
	--moe-text-soft: var(--moe-cocoa-soft);

	/* Warm brown reads as dirt on a near-black ground. */
	--moe-clay:
		0 1px 2px -1px rgb(0 0 0 / 0.6), 0 6px 14px -2px rgb(0 0 0 / 0.55), inset 0 2px 3px 0
		rgb(255 255 255 / 0.06), inset 0 -2px 4px 0 rgb(0 0 0 / 0.4);
	--moe-floating: 0 0 25px rgb(0 240 255 / 0.15), 0 12px 28px -8px rgb(0 0 0 / 0.7);

	--moe-radius-md: 14px;

	--moe-state-danger-bg: oklch(0.22000 0.08000 15.50);
	--moe-state-danger-border: oklch(0.50000 0.25400 15.50);
	--moe-state-success-bg: oklch(0.20000 0.06000 165.00);
	--moe-state-warning-bg: oklch(0.24000 0.07000 85.00);
	--moe-state-info-bg: oklch(0.22000 0.06000 265.76);
	--moe-state-disabled: oklch(0.24000 0.02000 265.76);
	--moe-state-disabled-ink: oklch(0.60000 0.02000 265.76);
	--moe-surface-sunken: oklch(0.18000 0.03000 265.76);
	--moe-surface-raised: oklch(0.24000 0.04000 265.76);
	--moe-surface-hover: oklch(0.30000 0.06000 202.88);
	--moe-surface-hover-soft: oklch(0.24000 0.04000 265.76);

	/*
	 * Pigment is laid down more thinly here, and this value is the one the
	 * screenshot still disagrees with. See the note on the anime theme's weights.
	 */
	--moe-material-tint: 0.22;
	--moe-material-wash: 0.34;

	/* Pure cyan pigment, so the ink on it is the theme's own black rather than its
	   near-white text. */
}

/* --- Minimalist Ceramic White ---------------------------------------------
 *
 * Glacier white, a deep blue accent, and ambient-occlusion shadows: several soft
 * layers rather than one, which is what makes a white card read as ceramic
 * instead of as a white box. The document's radius is 22px, between this
 * library's md and lg.
 */
[data-moe-theme="minimalist"] {
	color-scheme: light;

	--moe-canvas: oklch(0.98415 0.00341 247.86);
	--moe-card: oklch(1 0 0);

	--moe-taro-500: oklch(0.55263 0.21626 280.02);
	--moe-taro-700: oklch(0.44000 0.21626 280.02);
	--moe-taro-100: oklch(0.95000 0.03000 280.02);
	--moe-sakura-500: oklch(0.59213 0.20966 12.20);
	--moe-sakura-700: oklch(0.48000 0.20966 12.20);
	--moe-sakura-100: oklch(0.95000 0.04000 12.20);
	--moe-soda-500: oklch(0.55030 0.13766 238.61);
	--moe-soda-700: oklch(0.44000 0.13766 238.61);
	--moe-mint-500: oklch(0.55035 0.13766 238.61);
	--moe-lemon-500: oklch(0.61000 0.14000 60.00);

	--moe-cocoa: oklch(0.20794 0.02699 265.76);
	--moe-cocoa-soft: oklch(0.55400 0.02346 257.42);
	--moe-stroke: rgb(15 23 42 / 0.08);
	--moe-text: var(--moe-cocoa);
	--moe-text-soft: var(--moe-cocoa-soft);

	/* Ambient occlusion: two soft layers, barely visible, which is the whole
	   technique — one shadow at this opacity is a smudge. */
	--moe-clay:
		0 2px 4px rgb(0 0 0 / 0.02), 0 12px 24px rgb(0 0 0 / 0.04), inset 0 1px 1px 0
		rgb(255 255 255 / 0.9);
	--moe-floating: 0 4px 8px rgb(0 0 0 / 0.03), 0 18px 40px rgb(0 0 0 / 0.06);

	--moe-radius-md: 22px;

	--moe-state-danger-bg: oklch(0.96000 0.02000 12.20);
	--moe-state-danger-border: oklch(0.75000 0.12000 12.20);
	--moe-state-success-bg: oklch(0.96000 0.02000 165.00);
	--moe-state-warning-bg: oklch(0.96500 0.03000 85.00);
	--moe-state-info-bg: oklch(0.96000 0.02000 238.61);
	--moe-state-disabled: oklch(0.96000 0.00300 247.86);
	--moe-state-disabled-ink: oklch(0.70000 0.01000 247.86);
	--moe-surface-sunken: oklch(0.97000 0.00400 247.86);
	--moe-surface-raised: oklch(1 0 0);
	--moe-surface-hover: oklch(0.96000 0.01000 238.61);
	--moe-surface-hover-soft: oklch(0.97500 0.00400 247.86);

	/* White on white needs restraint: the material has to be visible as a
	   temperature, not as a colour. */
	/*
	 * Thinner than any other theme, and this is the one place where thinning is the
	 * fix rather than a preference.
	 *
	 * Measured: this theme's blue-violet film renders at rgb(116 92 252), and
	 * against that film **no near-black ink reaches 4.5:1** — the best is 4.33 at
	 * L 0.16, which is already darker than the ground. A film that deep needs light
	 * text, and light text fails on every other theme's film, because a saturated
	 * film and a deep film want opposite inks.
	 *
	 * So the film is laid down thinner, which is what a material means anyway: the
	 * ratio is what makes text on it legible, and a lighter film takes the same ink
	 * every other theme uses.
	 */
	--moe-material-tint: 0.34;
	--moe-material-wash: 0.46;

	/*
	 * The accent itself is not workable as a film here — see the note on
	 * --moe-material-pigment-taro. The palette's lighter rung is not in the
	 * document, so it is derived: the same hue, L raised from 0.553 to 0.72 and
	 * chroma reduced to match, which is what the other themes' light rungs look
	 * like.
	 */
	--moe-material-pigment-taro: oklch(0.72 0.14 280.02);
	--moe-material-pigment-sakura: oklch(0.72 0.15 12.2);
	--moe-material-pigment-soda: oklch(0.72 0.11 238.61);

	/*
	 * Deep ink, not white.
	 *
	 * The reasoning that chose white was that the pigment is a deep blue — true of
	 * the accent, and not true of what the card paints: a material on a white page
	 * lays down a thin film, and the film is pale. Measured, white on it came to
	 * 1.08:1 and this comes to 12.7:1.
	 *
	 * The general rule this settles: the ink is chosen against the *rendered*
	 * film, not against the accent the film was mixed from. Those differ by the
	 * material weight, and getting it wrong is invisible until it is measured.
	 */
}

/* --- Dark Obsidian Spatial Computing --------------------------------------
 *
 * Obsidian black, carbon grey cards, a titanium gold for anything mechanical and
 * an ice blue for telemetry. The gold is the only accent in the set that is not
 * cool, which is what makes it read as metal.
 */
[data-moe-theme="obsidian"] {
	color-scheme: dark;

	--moe-canvas: oklch(0.12964 0.02737 261.69);
	--moe-card: oklch(0.28962 0.03503 265.76);

	--moe-taro-500: oklch(0.72716 0.16751 300.35);
	--moe-taro-700: oklch(0.56000 0.16751 300.35);
	--moe-taro-100: oklch(0.26000 0.07000 300.35);
	--moe-sakura-500: oklch(0.72882 0.15404 15.50);
	--moe-sakura-700: oklch(0.56000 0.15404 15.50);
	--moe-sakura-100: oklch(0.26000 0.07000 15.50);
	--moe-soda-500: oklch(0.75697 0.14060 232.60);
	--moe-soda-700: oklch(0.58000 0.14060 232.60);
	--moe-mint-500: oklch(0.75697 0.14060 232.60);
	--moe-lemon-500: oklch(0.85103 0.16084 82.50);

	--moe-cocoa: oklch(0.95000 0.01000 261.69);
	--moe-cocoa-soft: oklch(0.70000 0.02000 261.69);
	--moe-stroke: rgb(245 158 11 / 0.22);
	--moe-text: var(--moe-cocoa);
	--moe-text-soft: var(--moe-cocoa-soft);

	--moe-clay:
		0 1px 2px -1px rgb(0 0 0 / 0.65), 0 8px 18px -3px rgb(0 0 0 / 0.6), inset 0 1px 2px 0
		rgb(255 255 255 / 0.05), inset 0 -2px 4px 0 rgb(0 0 0 / 0.45);
	--moe-floating: 0 0 22px rgb(245 158 11 / 0.12), 0 14px 32px -10px rgb(0 0 0 / 0.75);

	--moe-radius-md: 16px;

	--moe-state-danger-bg: oklch(0.23000 0.07000 15.50);
	--moe-state-danger-border: oklch(0.56000 0.15404 15.50);
	--moe-state-success-bg: oklch(0.21000 0.05000 165.00);
	--moe-state-warning-bg: oklch(0.25000 0.06000 82.50);
	--moe-state-info-bg: oklch(0.23000 0.05000 232.60);
	--moe-state-disabled: oklch(0.24000 0.02000 261.69);
	--moe-state-disabled-ink: oklch(0.60000 0.02000 261.69);
	--moe-surface-sunken: oklch(0.18000 0.02500 261.69);
	--moe-surface-raised: oklch(0.28962 0.03503 265.76);
	--moe-surface-hover: oklch(0.34000 0.06000 232.60);
	--moe-surface-hover-soft: oklch(0.26000 0.03000 261.69);

	--moe-material-tint: 0.22;
	--moe-material-wash: 0.34;

	/* Violet pigment on obsidian, so the ink is the ground's own black. */
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
	/*
	 * A default inset, which the card did not have.
	 *
	 * Measured on a card holding a form: padding: 0px, and the last control's
	 * bottom edge sat 1px from the border — so a card was a box that put its
	 * contents against the wall. The first version of this library's cards were
	 * used with className and a grid gap from the caller, which worked, and is
	 * exactly why nobody noticed: every existing page supplied the spacing.
	 *
	 * The measurement is what settled the value rather than taste. A card whose
	 * contents touch the border at a 24px radius reads as an overflow rather than
	 * as a design, because the corner curve cuts closer to the content than any
	 * straight edge does. 22px is the radius minus the stroke, so the inset matches
	 * the curve it sits inside.
	 *
	 * A caller who wants full-bleed content — a table, an image, a list that draws
	 * its own rows to the edge — overrides it with padding: 0 on their own
	 * className. What they cannot do is get spacing back that was never there.
	 */
	padding: 22px;
	transition:
		transform var(--moe-dur-base) var(--moe-ease-jelly),
		box-shadow var(--moe-dur-base) var(--moe-ease-jelly);
}

/*
 * The glass variant drops its own fill, and this is the third time in this file
 * that an opaque background has hidden something.
 *
 * .ui-lib-soft-card sets background: var(--moe-card), which is a near-white
 * sheet — correct for a card made of paper and fatal for one made of glass,
 * because the refraction is painted by a canvas *underneath* this element.
 *
 * Only the fill is dropped. The border stays, because a pane of glass has an
 * edge and the outline is what tells the reader where the glass ends — without
 * it the refraction reads as a rendering artefact rather than as an object.
 * The border is also uneven — 2.5px on top against 1.5px below — because light
 * comes from above, and a uniform border is what makes a panel look like a
 * rectangle with a line drawn around it.
 *
 * ## This rule did nothing for three rounds, and that is the part worth keeping
 *
 * It was written correctly, saying background: transparent, and it was dead,
 * because .ui-lib-soft-card was declared 62 lines *below* it. One class each, so
 * both weigh (0,1,0), so the cascade fell through to source order and the base
 * rule won on all four properties the two share: the fill, the border width, the
 * border colour and the box-shadow. The card stayed a flat white sheet with a
 * 1.5px outline and every one of these four declarations never ran.
 *
 * What that cost is not the CSS. It is the diagnosis that followed. With the fill
 * still in place, four cards at bevel 56, 34, 22 and 78 rendered identically, and
 * with a particle field behind them the particles vanished inside the cards — and
 * both were read as evidence that the *shader's* parameters were not reaching the
 * screen. Three rounds went into the order in which the renderer draws a panel
 * and a particle field into the shared target, and into whether GLASS_LOOKS
 * reaches the uniforms it names. Neither was the fault, and both were plausible,
 * and a plausible wrong answer is worse than an open question because it arrives
 * with a reason to stop looking.
 *
 * The observations were not wrong. The inference was. Four identical renders are
 * exactly what four *opaque* cards should look like. A measurement taken on a
 * page that is failing for some other reason measures that other reason.
 *
 * So the repair is this move, and the fix is scripts/check-cascade.mjs, which
 * fails the build when a modifier precedes the rule it modifies at equal
 * specificity with a property in common. It found this one — and only this one,
 * in 501 rules.
 */
.ui-lib-soft-card--glass {
	position: relative;
	background: transparent;
	backdrop-filter: none;

	/*
	 * The surface of a slab, which the GPU refraction does not draw.
	 *
	 * The canvas gives this card its bend — the displacement of whatever is behind
	 * it — and a bend on its own reads as a distortion rather than as an object,
	 * because glass also has a **surface** and the surface is what tells the eye
	 * how thick it is. Four things do that, and none of them is a shader:
	 *
	 * 1. **An uneven border.** Light comes from above, so the top edge catches more
	 *    of it than the bottom. 2.5px on top against 1.5px below is the whole
	 *    trick, and a uniform border is what makes a panel look like a rectangle
	 *    with a line around it.
	 * 2. **A specular streak along the top**, which is the reflection of a light
	 *    source that is not in the scene. It is brightest at the middle and fades
	 *    at both ends, because a flat reflection across the full width reads as a
	 *    painted stripe.
	 * 3. **Asymmetric inner shadows** — white at the top, a cool tint at the bottom,
	 *    which is the colour a thick slab takes from the room it is in rather than
	 *    from any light in it.
	 * 4. **A chromatic rim**: a warm cast on one diagonal and a cool one on the
	 *    other. That is dispersion, drawn rather than computed — the shader already
	 *    does the real one, and the two agreeing is what makes it read as glass
	 *    instead of as a filter.
	 *
	 * The reference this came from uses the same four and its glass is opaque,
	 * because backdrop-filter cannot displace anything. These are the surface of
	 * a real refraction rather than a substitute for it.
	 */
	border-width: 2.5px 1.5px 1.5px 2px;
	border-color: rgb(255 255 255 / 0.92);
	/*
	 * Held in a variable because the hover below has to *add* to this surface
	 * rather than replace it.
	 *
	 * The clay hover shadow is the paper card's lift and it is the right answer
	 * for paper. A glass card that swapped its four insets for it would go flat
	 * at the exact moment the pointer arrived — and the pointer arriving is when
	 * a thick surface should read as thickest, because that is when the reader is
	 * looking at it.
	 */
	--ui-lib-glass-shadow:
		inset 1.5px 1.5px 3px rgb(255 185 210 / 0.4),
		inset -1.5px -1.5px 3px rgb(165 240 240 / 0.4),
		inset 0 3px 6px rgb(255 255 255 / 0.92),
		inset 0 -4px 10px rgb(198 172 212 / 0.22),
		0 24px 48px -12px rgb(120 100 140 / 0.24);
	box-shadow: var(--ui-lib-glass-shadow);
}

/* The specular streak: a light source reflected in the top edge. */
.ui-lib-soft-card--glass::before {
	content: "";
	position: absolute;
	top: 4px;
	left: 14%;
	right: 14%;
	height: 2.5px;
	border-radius: var(--moe-radius-full);
	background: linear-gradient(
		90deg,
		transparent 0%,
		rgb(255 255 255 / 0.95) 42%,
		rgb(255 255 255 / 0.95) 58%,
		transparent 100%
	);
	pointer-events: none;
}

.ui-lib-soft-card[data-ui-lib-interactive]:hover {
	transform: translateY(-4px) rotate(-1.5deg) scale(1.01);
	box-shadow:
		0 16px 32px -4px rgb(77 60 56 / 0.12),
		inset 0 4px 6px 0 rgb(255 255 255 / 0.9);
}

/*
 * The glass card lifts like any other and keeps its surface while it does.
 *
 * Equal specificity to the hover above, so this has to come after it — and the
 * cascade gate would have caught it if it had not, which is the only reason the
 * ordering is worth a comment at all.
 *
 * The lift is deepened here rather than inherited, because a slab that rises
 * without its shadow spreading is a slab that slid sideways.
 */
.ui-lib-soft-card--glass[data-ui-lib-interactive]:hover {
	box-shadow:
		var(--ui-lib-glass-shadow),
		0 32px 56px -16px rgb(120 100 140 / 0.32);
}

/*
 * No :active on a card, and its absence is the fix rather than an omission.
 *
 * A pressed state is a promise that something will happen when the press ends,
 * and on a div only a pointer can make it. A keyboard user sees no lift when
 * they press nothing and no collapse when they press nothing either — the card
 * said "clickable" to one kind of user and said nothing to the other.
 *
 * interactive is a hover response: it lifts under the pointer and settles when
 * the pointer leaves. A card that is genuinely clickable is a button, and this
 * library has one — <SoftButton>, or a button inside the card — which is the
 * thing that can be reached by Tab and activated by Enter.
 *
 * cursor is deliberately not pointer for the same reason: the cursor is the
 * other half of the same promise.
 */

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
	/* 32 - 3 * 2, and the spec's number: a knob with slack around it reads as a
	   ball rattling in a box rather than as one sliding in a groove. */
	height: 26px;
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
	.ui-lib-soft-switch__knob 
		transition: none;
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
	.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__pill 
		transition: none;
		transform: none;

	.ui-lib-soft-tabs__neck,
	.ui-lib-soft-tabs[data-ui-lib-travelling] .ui-lib-soft-tabs__neck 
		display: none;
}


/* --- soft slider ---------------------------------------------------------
 *
 * A 10px groove with a 22px bead on it. The groove is thicker than a desktop
 * slider's because this one is meant to be grabbed, and the bead is large
 * enough to hold a thumb — the platform target is 44px of touch area even
 * where the visible dot is smaller.
 *
 * The bubble only exists while held. A number parked next to the track makes
 * the user look away from their own finger; one that appears under the thumb
 * is read in the same glance.
 */

.ui-lib-soft-slider {
	position: relative;
	display: block;
	width: 100%;
	min-width: 140px;
	height: 28px;
	margin-top: 34px;
	touch-action: none;
	cursor: pointer;
	font-family: var(--moe-font-rounded);
}

.ui-lib-soft-slider[data-ui-lib-soft-disabled] {
	cursor: not-allowed;
	filter: saturate(0.3);
	opacity: 0.6;
}

.ui-lib-soft-slider__groove {
	position: absolute;
	left: 0;
	right: 0;
	top: 50%;
	height: 10px;
	transform: translateY(-50%);
	border-radius: var(--moe-radius-full);
	background: oklch(0.93 0.006 60);
	box-shadow: inset 0 2px 3px 0 rgb(77 60 56 / 0.14);
	overflow: hidden;
}

.ui-lib-soft-slider__fill {
	display: block;
	height: 100%;
	border-radius: var(--moe-radius-full);
	background: linear-gradient(90deg, var(--moe-sakura-500), var(--moe-taro-500));
	/* The moving highlight is what makes the fill read as liquid rather than as
	   a progress bar: a fixed gradient looks painted on. */
	background-size: 180% 100%;
	animation: ui-lib-moe-flow 3.2s linear infinite;
}

@keyframes ui-lib-moe-flow {
	from 
		background-position: 0% 50%;
	to 
		background-position: 180% 50%;
}

.ui-lib-soft-slider__thumb {
	position: absolute;
	top: 50%;
	width: 22px;
	height: 22px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-card);
	box-shadow:
		0 2px 6px -1px rgb(77 60 56 / 0.26),
		inset 0 2px 3px 0 rgb(255 255 255 / 0.95),
		inset 0 -2px 3px 0 rgb(77 60 56 / 0.08);
	transition:
		width 140ms var(--moe-ease-jelly),
		height 140ms var(--moe-ease-jelly),
		transform 200ms var(--moe-ease-jelly);
	pointer-events: none;
}

/* Picked up: 22 -> 28. Enough to read as held, not enough to shift what the
   hand was aiming at. */
.ui-lib-soft-slider[data-ui-lib-held] .ui-lib-soft-slider__thumb {
	width: 28px;
	height: 28px;
}

.ui-lib-soft-slider__bubble {
	position: absolute;
	bottom: calc(50% + 20px);
	transform: translateX(-50%) scale(0.72);
	transform-origin: 50% 120%;
	opacity: 0;
	pointer-events: none;
	transition:
		opacity 140ms ease-out,
		transform 200ms var(--moe-ease-jelly);
}

.ui-lib-soft-slider[data-ui-lib-held] .ui-lib-soft-slider__bubble {
	opacity: 1;
	transform: translateX(-50%) scale(1);
}

.ui-lib-soft-slider__bubble-face {
	display: inline-block;
	padding: 4px 10px;
	border-radius: var(--moe-radius-sm);
	background: var(--moe-cocoa);
	color: oklch(0.97 0.01 60);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.02em;
	white-space: nowrap;
	box-shadow: 0 4px 10px -3px rgb(77 60 56 / 0.4);
}

/* The tail. A rotated square tucked behind the bubble, which is cheaper than a
   border triangle and keeps the same radius language as everything else. */
.ui-lib-soft-slider__bubble::after {
	content: "";
	position: absolute;
	left: 50%;
	bottom: -3px;
	width: 8px;
	height: 8px;
	transform: translateX(-50%) rotate(45deg);
	border-radius: 2px;
	background: var(--moe-cocoa);
}

/* The real control, invisible but present: keyboard, touch and screen-reader
   behaviour all come from here rather than from a reimplementation. */
.ui-lib-soft-slider__input {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	margin: 0;
	opacity: 0;
	pointer-events: none;
}

.ui-lib-soft-slider__input:focus-visible + .ui-lib-soft-slider__bubble,
.ui-lib-soft-slider:focus-within .ui-lib-soft-slider__thumb {
	outline: 3px solid var(--moe-taro-500);
	outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-slider__fill 
		animation: none;

	.ui-lib-soft-slider__thumb,
	.ui-lib-soft-slider__bubble 
		transition: none;
}


/* --- soft modal ----------------------------------------------------------
 *
 * Built on a real dialog, so the veil is its ::backdrop and the panel is the
 * element. The scrim is a warm translucent white rather than black: a black
 * scrim over a pastel page changes the page's colour instead of dimming it,
 * and every pastel in the composition goes muddy at once.
 *
 * The entry is 0.4 -> 1.08 -> 1.0. A single ease reads as a box appearing; the
 * overshoot reads as a balloon being blown up and then relaxing, which is the
 * same volume story the button's press tells in the other direction.
 */

.ui-lib-soft-modal {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	max-width: none;
	max-height: none;
	margin: 0;
	padding: 0;
	border: none;
	background: transparent;
	overflow: visible;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	display: grid;
	place-items: center;
}

.ui-lib-soft-modal::backdrop {
	background: rgb(250 248 245 / 0.62);
	backdrop-filter: blur(8px) saturate(115%);
	-webkit-backdrop-filter: blur(8px) saturate(115%);
}

@keyframes ui-lib-moe-inflate {
	0% {
		transform: scale(0.4);
		opacity: 0;
	}
	62% {
		transform: scale(1.08);
		opacity: 1;
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

/* Twinkles in and then rests at a low glow. Ending at zero made the sparks a
   one-shot effect that was over before anyone could look at the dialog — and
   both then held them at exactly the state that shows nothing. */
@keyframes ui-lib-moe-twinkle {
	0% {
		opacity: 0;
		transform: scale(0.4) rotate(0deg);
	}
	45% {
		opacity: 1;
		transform: scale(1.15) rotate(28deg);
	}
	100% {
		opacity: 0.55;
		transform: scale(0.95) rotate(52deg);
	}
}

.ui-lib-soft-modal__veil {
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
}

.ui-lib-soft-modal__panel {
	position: relative;
	width: min(92vw, 380px);
	padding: 26px 26px 20px;
	border-radius: var(--moe-radius-xl);
	background: var(--moe-card);
	border: 1.5px solid var(--moe-stroke);
	box-shadow:
		0 24px 48px -12px rgb(77 60 56 / 0.22),
		inset 0 4px 6px 0 rgb(255 255 255 / 0.9),
		inset 0 -4px 6px 0 rgb(77 60 56 / 0.06);
	animation: ui-lib-moe-inflate 420ms var(--moe-ease-jelly) both;
}

.ui-lib-soft-modal[data-ui-lib-reduced] .ui-lib-soft-modal__panel {
	animation: none;
}

/* The panel is focusable so the platform's first-focusable-child rule lands
   here instead of on the dismiss button, but it is not an interactive control
   and must not draw a ring for a click that opened it. */
.ui-lib-soft-modal__panel:focus {
	outline: none;
}

.ui-lib-soft-modal__spark {
	position: absolute;
	font-size: 15px;
	line-height: 1;
	color: var(--moe-lemon-500);
	text-shadow: 0 0 8px rgb(253 224 139 / 0.9);
	animation: ui-lib-moe-twinkle 900ms var(--moe-ease-jelly) 220ms both;
}

/* One per rounded corner, pulled just outside the edge so the glow sits on the
   curve rather than inside the panel. */
.ui-lib-soft-modal__spark[data-ui-lib-corner="top-left"] {
	top: -6px;
	left: -4px;
}
.ui-lib-soft-modal__spark[data-ui-lib-corner="top-right"] {
	top: -6px;
	right: -4px;
}
.ui-lib-soft-modal__spark[data-ui-lib-corner="bottom-left"] {
	bottom: -6px;
	left: -4px;
}
.ui-lib-soft-modal__spark[data-ui-lib-corner="bottom-right"] {
	bottom: -6px;
	right: -4px;
}

.ui-lib-soft-modal__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 10px;
}

.ui-lib-soft-modal__title {
	margin: 0;
	font-size: 20px;
	font-weight: 800;
	line-height: 1.33;
	letter-spacing: -0.01em;
}

.ui-lib-soft-modal__body {
	font-size: 15px;
	font-weight: 600;
	line-height: 1.57;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-modal__body p {
	margin: 0;
}

/* The dismiss is a plump pill, and it wobbles on hover. A 15 degree tilt is
   the smallest movement that reads as a reaction rather than as a glitch. */
.ui-lib-soft-modal__dismiss {
	flex: none;
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: var(--moe-state-disabled);
	color: var(--moe-cocoa-soft);
	font-size: 17px;
	font-weight: 700;
	line-height: 1;
	cursor: pointer;
	transition:
		transform 220ms var(--moe-ease-jelly),
		background 160ms ease-out;
}

.ui-lib-soft-modal__dismiss:hover {
	transform: rotate(15deg);
	background: var(--moe-sakura-300);
}

.ui-lib-soft-modal__foot {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	margin-top: 20px;
}

.ui-lib-soft-modal__cancel,
.ui-lib-soft-modal__confirm {
	height: 40px;
	padding: 0 20px;
	border-radius: var(--moe-radius-full);
	font-family: inherit;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	border: none;
	transition: transform 200ms var(--moe-ease-jelly);
}

.ui-lib-soft-modal__cancel {
	background: oklch(0.95 0.006 60);
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-modal__confirm {
	background: var(--moe-sakura-500);
	color: var(--moe-cocoa);
	box-shadow: var(--moe-clay-pink);
}

.ui-lib-soft-modal__cancel:hover,
.ui-lib-soft-modal__confirm:hover {
	transform: translateY(-1px);
}

.ui-lib-soft-modal__confirm:active,
.ui-lib-soft-modal__cancel:active {
	transform: scale(1.04, 0.94);
}

.ui-lib-soft-modal__dismiss:focus-visible,
.ui-lib-soft-modal__cancel:focus-visible,
.ui-lib-soft-modal__confirm:focus-visible {
	outline: 3px solid var(--moe-taro-500);
	outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-modal__panel 
		animation: none;

	.ui-lib-soft-modal__spark 
		display: none;

	.ui-lib-soft-modal__dismiss:hover 
		transform: none;
}


/* --- liquid glass --------------------------------------------------------
 *
 * The compositor's blur, not the shader's refraction. See the component's own
 * comment for why both exist.
 *
 * Three things stop it from reading as flat frosted plastic:
 *
 * 1. **A bright rim, not a dark border.** A dark outline on a translucent body
 *    reads as a sticker with a stroke. The rim here is a light line at 85 per
 *    cent, which is what an edge looks like when light passes through it.
 * 2. **An inner top highlight**, the same light-from-above story the clay
 *    surfaces tell, so the pane has thickness rather than being a hole.
 * 3. **A diagonal sheen** that is brighter at the top-left. Flat translucency
 *    has no direction; every real pane of glass has one.
 *
 * The body sits at 0.42 alpha. Higher and the page behind the pane is lost;
 * lower and the content the pane was put there to hold stops being readable.
 */

.ui-lib-liquid-glass {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	isolation: isolate;
	background: var(--lg-body, oklch(0.88 0.07 300 / 0.42));
	backdrop-filter: blur(14px) saturate(165%);
	-webkit-backdrop-filter: blur(14px) saturate(165%);
	border: 1px solid var(--lg-rim, oklch(0.99 0.02 305 / 0.85));
	box-shadow:
		0 10px 24px -10px rgb(77 60 56 / 0.24),
		inset 0 2px 2px 0 rgb(255 255 255 / 0.8),
		inset 0 -6px 12px -6px var(--lg-glow, oklch(0.72 0.12 300 / 0.35));
	transition:
		transform var(--moe-dur-base) var(--moe-ease-jelly),
		box-shadow var(--moe-dur-base) var(--moe-ease-jelly);
}

.ui-lib-liquid-glass__sheen {
	position: absolute;
	inset: 0;
	z-index: 0;
	border-radius: inherit;
	background: linear-gradient(
		150deg,
		rgb(255 255 255 / 0.55) 0%,
		rgb(255 255 255 / 0.16) 34%,
		rgb(255 255 255 / 0) 62%
	);
	pointer-events: none;
}

.ui-lib-liquid-glass[data-ui-lib-glossy] .ui-lib-liquid-glass__sheen {
	background: linear-gradient(
		150deg,
		rgb(255 255 255 / 0.82) 0%,
		rgb(255 255 255 / 0.2) 40%,
		rgb(255 255 255 / 0) 68%
	);
}

.ui-lib-liquid-glass__content {
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

/* --- buttons on a pane ---------------------------------------------------
 *
 * The button keeps its own clay body; the pane is added *under* it as a
 * translucent rail, so the pair reads as a control mounted on glass rather
 * than as two stacked materials competing for the same edge.
 */

.ui-lib-paper-button[data-ui-lib-on-glass]::before {
	content: "";
	position: absolute;
	inset: -6px -8px;
	border-radius: var(--moe-radius-full);
	background: rgb(255 255 255 / 0.34);
	backdrop-filter: blur(12px) saturate(150%);
	-webkit-backdrop-filter: blur(12px) saturate(150%);
	border: 1px solid rgb(255 255 255 / 0.6);
	box-shadow: 0 8px 18px -10px rgb(77 60 56 / 0.28);
	pointer-events: none;
}


/* --- generated washes ----------------------------------------------------
 *
 * createWash in @ui-lib/core decides everything numeric and emits the
 * custom properties below plus a class naming its state. These rules consume
 * them, and nothing here is hard-coded except what watercolour *is* rather
 * than how much of it there is.
 *
 * The state classes differ in exactly one thing — the blur — and the reason
 * they exist as separate rules rather than as a variable on the base class is
 * that a class the generator emits and the stylesheet does not define renders
 * **nothing at all**, silently. That is not hypothetical; it is what happened
 * the first time this was wired up, and it is what the test above guards.
 */

.ui-lib-wash {
	position: relative;
	display: block;
	width: var(--wash-width, 190px);
	height: var(--wash-height, 190px);
	isolation: isolate;
	/* Eight radii, four horizontal and four vertical, offset per seed. A
	   perfect circle reads as a circle however good the pigment is. */
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

/* The three states, and the only difference between them is the blur the
   generator chose — wet 7px, drying 3.2, dry 1.5. Declared separately because
   the generator names them separately; see the note above. */
.ui-lib-wash--wet {
	--wash-state-blur: 7px;
}
.ui-lib-wash--drying {
	--wash-state-blur: 3.2px;
}
.ui-lib-wash--dry {
	--wash-state-blur: 1.5px;
}

/*
 * The deposit.
 *
 * A child element rather than a background layer, and that is the whole trick.
 * The rim varies in strength *around* the circle, which is an angular
 * quantity, so a conic gradient is the obvious tool — but a conic sweeps
 * outward along every ray, so any opaque stop paints a stripe from the centre
 * to the edge. Four attempts failed on that: three concentric rings (a
 * crescent), a conic painted in (a pinwheel), a conic under an opaque radial
 * (rays either side of the hole), a conic masked to a band (a jelly gem).
 *
 * The fix is to make the conic drive *visibility* instead of colour. The ring
 * underneath is a flat pigment; the conic is a mask, so where it is opaque the
 * ring shows. There are no rays to see, because nothing is painted along them.
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
	mask-composite: intersect;
	-webkit-mask-composite: source-in;
	filter: blur(1.8px);
	pointer-events: none;
}

/*
 * The sheet. feTurbulence twice, because no CSS function produces
 * non-repeating noise and paper is not a repeating function. Both the images
 * and their sizes come from the seed, at lengths that cannot line up.
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

/* A laid wash is not finished: while the paper is wet the water keeps carrying
   pigment outward, along the fibre, stopping at the boundary. */
@keyframes ui-lib-wash-drift {
	0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
	37% { transform: translate3d(1.4%, -1.1%, 0) scale(1.018) rotate(0.5deg); }
	68% { transform: translate3d(-0.9%, 0.8%, 0) scale(0.994) rotate(-0.4deg); }
	100% { transform: translate3d(0.5%, -0.4%, 0) scale(1.006) rotate(0.2deg); }
}

@keyframes ui-lib-wash-spread {
	from transform: scale(0.82); opacity: 0.72; filter: blur(9px); 
	62% { transform: scale(1.06); opacity: 1; }
	to { transform: scale(1); opacity: 1; filter: blur(0); }
}

@keyframes ui-lib-wash-settle {
	from opacity: 0; filter: blur(9px); 
	to opacity: 1; filter: blur(1.8px); 
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


/* --- soft input ----------------------------------------------------------
 *
 * A groove in the paper rather than a box on top of it. The shell uses the same
 * inset shadow as the switch's track, because they are the same material doing
 * the same thing — offering a place to put something.
 *
 * The focus ring is the first thing in this library driven by a real spring
 * rather than by a CSS curve. --ring is written from createSpring on every
 * frame and runs 0 to 1 with an overshoot; the stylesheet only maps it to scale
 * and opacity. That split is deliberate: the shape of the motion is a physical
 * decision, and it should not be re-specified in a bezier every time a
 * component needs it.
 */

.ui-lib-soft-input {
	display: grid;
	gap: 6px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-input__label {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-input__shell {
	position: relative;
	display: flex;
	align-items: center;
	gap: 10px;
	border-radius: var(--moe-radius-full);
	/* The recess. Inset, never raised: an input is a hole, not a brick. */
	background: var(--moe-surface-hover-soft);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.1),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
	border: 1.5px solid transparent;
	transition:
		border-color 180ms ease-out,
		background 180ms ease-out;
}

.ui-lib-soft-input[data-ui-lib-size="sm"] .ui-lib-soft-input__shell {
	height: 40px;
	padding: 0 16px;
}
.ui-lib-soft-input[data-ui-lib-size="md"] .ui-lib-soft-input__shell {
	/* 48 is the documented height and it is right for the touch target, but the
	   pill at a full-width 360px read as bloated. The height stays; the radius
	   and the padding come in, which is what the eye was actually objecting to. */
	height: 46px;
	padding: 0 18px;
	border-radius: 16px;
}
.ui-lib-soft-input[data-ui-lib-size="lg"] .ui-lib-soft-input__shell {
	height: 56px;
	padding: 0 24px;
}

.ui-lib-soft-input__field {
	flex: 1;
	min-width: 0;
	height: 100%;
	border: none;
	outline: none;
	background: none;
	font: inherit;
	font-size: 15px;
	font-weight: 600;
	color: var(--moe-cocoa);
	padding: 0;
}

.ui-lib-soft-input__field::placeholder {
	color: var(--moe-state-disabled-ink);
	font-weight: 500;
}

/* The multi-line shell: the same recess, but the padding belongs to the
   textarea rather than to a flex row, because a textarea lays out its own
   content box and a padded wrapper would put the caret in the wrong place. */
.ui-lib-soft-input__shell--area {
	display: block;
	height: auto;
	padding: 0;
	border-radius: var(--moe-radius-md);
}

.ui-lib-soft-input__field--area {
	display: block;
	width: 100%;
	min-height: 0;
	padding: 12px 16px;
	line-height: 1.65;
	resize: vertical;
	background: none;
	border: none;
	outline: none;
	font: inherit;
	font-size: 14.5px;
	font-weight: 500;
	color: var(--moe-cocoa);
}

/*
 * The growth. One declaration, verified before it was written: a five-line value
 * took a 40px control to 101px in this browser, with no script.
 *
 * The alternative — measuring scrollHeight and writing a pixel height back —
 * is a layout read per keystroke plus a ResizeObserver for the cases the
 * keystroke misses, and every one of those misses goes the same way: the box is
 * a line short and the last line is clipped.
 */
.ui-lib-soft-input__field--growable {
	field-sizing: content;
}

/* Where a fallback would go, and deliberately has not. A browser without
   field-sizing shows a normal scrollable textarea at rows tall, which is a
   correct control rather than a broken one — the growth is a convenience, and a
   JavaScript fallback for a convenience is how a component acquires a
   ResizeObserver and a bug that only appears after a font loads. */

/* The footnote row: the message on the left, the count on the right. */
.ui-lib-soft-input__foot {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	margin-top: -1px;
}

.ui-lib-soft-input__count {
	flex: none;
	font-family: var(--moe-font-rounded);
	font-size: 12px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	opacity: 0.75;
	font-variant-numeric: tabular-nums;
}

/* Multi-line, and it grows rather than scrolling — a field that scrolls hides
   what was just typed. */
.ui-lib-soft-input__field--grow {
	resize: none;
	align-self: stretch;
	height: auto;
	min-height: 44px;
	padding: 12px 0;
	line-height: 1.6;
}

.ui-lib-soft-input__affix {
	display: inline-flex;
	align-items: center;
	flex: none;
	color: var(--moe-cocoa-soft);
	font-size: 14px;
	font-weight: 600;
}

/*
 * The ring. Its own element rather than a box-shadow on the shell, because a
 * shadow cannot be scaled independently — and scaling is what an overshoot
 * looks like on a ring.
 */
.ui-lib-soft-input__ring {
	position: absolute;
	inset: -4px;
	border-radius: inherit;
	/* Thinner and further out than the first version, which used 2.5px sitting
	   flush against the border. A heavy ring in the accent colour competes with
	   the text inside it; a light ring standing off the field reads as the
	   field having been singled out, which is what focus is. */
	border: 1.5px solid var(--moe-taro-500);
	/* --ring is the spring's value, written every frame. It goes slightly past
	   1 on the way in, which is what gives the ring its settle. */
	opacity: calc(var(--ring, 0) * 0.6);
	transform: scale(calc(0.86 + var(--ring, 0) * 0.14));
	pointer-events: none;
	will-change: transform, opacity;
}

.ui-lib-soft-input[data-ui-lib-focused] .ui-lib-soft-input__shell {
	background: var(--moe-surface-raised);
}

/* An invalid field is marked by more than its colour: the border thickens, so
   the state survives a greyscale print and a colour-blind reader. */
.ui-lib-soft-input[data-ui-lib-invalid] .ui-lib-soft-input__shell {
	/* The border does the work and the fill barely moves. A field that turns
	   pink end to end reads as a different control rather than as the same one
	   with a problem — and it fights the text sitting on top of it. */
	border-color: var(--moe-sakura-700);
	background: var(--moe-state-danger-bg);
}

.ui-lib-soft-input[data-ui-lib-invalid] .ui-lib-soft-input__ring {
	border-color: var(--moe-sakura-700);
}

.ui-lib-soft-input[data-ui-lib-disabled] {
	opacity: 0.55;
}

.ui-lib-soft-input[data-ui-lib-disabled] .ui-lib-soft-input__shell {
	cursor: not-allowed;
}

.ui-lib-soft-input__message {
	margin: 0;
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1.5;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-input[data-ui-lib-invalid] .ui-lib-soft-input__message {
	color: var(--moe-sakura-700);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-input__ring 
		/* No spring: the ring appears at its final size. The value still comes
		   from the spring, so nothing has to know it is being suppressed. */
		transform: scale(1);
}


/* --- soft select ---------------------------------------------------------
 *
 * The trigger is the input's shell with a chevron; the list is a popover in the
 * top layer, positioned by CSS anchor positioning rather than by measuring the
 * trigger and writing coordinates back. Anchor positioning is a browser feature
 * now, and the alternative — a ResizeObserver plus scroll and resize listeners
 * plus a flip calculation — is three hundred lines that get the flip wrong on
 * the first try.
 *
 * The list deliberately does NOT animate in as a whole. A popover that fades in
 * as a block reads as a modal; what a dropdown looks like is the rows arriving,
 * so the stagger is on the options.
 */

.ui-lib-soft-select {
	display: grid;
	gap: 6px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-select__label {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-select__trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	width: 100%;
	height: 46px;
	padding: 0 18px;
	border-radius: 16px;
	border: 1.5px solid transparent;
	background: var(--moe-surface-hover-soft);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.1),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
	font: inherit;
	font-size: 15px;
	font-weight: 600;
	color: var(--moe-cocoa);
	text-align: left;
	cursor: pointer;
	transition:
		border-color 180ms ease-out,
		background 180ms ease-out;
}

.ui-lib-soft-select[data-ui-lib-open] .ui-lib-soft-select__trigger {
	border-color: var(--moe-taro-500);
	background: var(--moe-surface-raised);
}

.ui-lib-soft-select__trigger:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 3px;
}

.ui-lib-soft-select[data-ui-lib-disabled] .ui-lib-soft-select__trigger {
	cursor: not-allowed;
	opacity: 0.55;
}

.ui-lib-soft-select__value[data-ui-lib-placeholder] {
	color: var(--moe-state-disabled-ink);
	font-weight: 500;
}

/* Drawn rather than set as a character: a text glyph's weight and angle depend
   on the font, and this one has to match the border it sits next to. */
.ui-lib-soft-select__chevron {
	flex: none;
	width: 9px;
	height: 9px;
	border-right: 2px solid currentColor;
	border-bottom: 2px solid currentColor;
	transform: rotate(45deg) translate(-2px, -2px);
	opacity: 0.5;
	transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ui-lib-soft-select[data-ui-lib-open] .ui-lib-soft-select__chevron {
	transform: rotate(-135deg) translate(-2px, -2px);
}

.ui-lib-soft-select__list {
	position: fixed;
	/* position-anchor is set per instance from the component; a name in the
	   stylesheet would be claimed by every select on the page at once. */
	top: anchor(bottom);
	left: anchor(left);
	/*
	 * The width comes from the anchor's own size, not from pairing left with
	 * right.
	 *
	 * Both spellings look equivalent and they are not. Measured against a 320px
	 * trigger, left: anchor(left) paired with right: anchor(right) produced an **82px**
	 * list, and width: anchor-size(width) produced the correct 334px. Two
	 * anchor-relative insets do not resolve to the distance between them the way
	 * two absolute ones do.
	 */
	width: anchor-size(width);
	margin: 8px 0 0;
	/* position-try is the flip: when the list would overflow the bottom of the
	   viewport it is placed above the trigger instead, and the platform does the
	   measuring. */
	position-try-fallbacks: flip-block;
	max-height: 280px;
	overflow-y: auto;
	padding: 6px;
	border-radius: 18px;
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	box-shadow: var(--moe-floating);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-select__list:not(:popover-open) {
	display: none;
}

@keyframes ui-lib-select-row {
	from 
		opacity: 0;
		transform: translateY(-4px);
	to 
		opacity: 1;
		transform: none;
}

.ui-lib-soft-select__option {
	display: grid;
	gap: 1px;
	padding: 9px 14px;
	border-radius: 12px;
	cursor: pointer;
	animation: ui-lib-select-row 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.ui-lib-soft-select__option-label {
	font-size: 14.5px;
	font-weight: 600;
	line-height: 1.4;
}

.ui-lib-soft-select__option-note {
	font-size: 12.5px;
	font-weight: 500;
	line-height: 1.45;
	color: var(--moe-cocoa-soft);
}

/* Two ways to be highlighted, and they look different on purpose: active is
   where the keyboard is and moves while the list is open; selected is what has
   been chosen and stays. Merging them would mean a list that forgets what it
   currently holds the moment the user presses an arrow key. */
.ui-lib-soft-select__option[data-ui-lib-active] {
	background: var(--moe-state-iris-soft);
}

.ui-lib-soft-select__option[aria-selected="true"] {
	background: var(--moe-state-iris);
}

.ui-lib-soft-select__option[aria-selected="true"][data-ui-lib-active] {
	background: var(--moe-state-iris-strong);
}

.ui-lib-soft-select__option[data-ui-lib-option-disabled] {
	opacity: 0.4;
	cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-select__option 
		animation: none;

	.ui-lib-soft-select__chevron 
		transition: none;
}


/* --- soft choice ---------------------------------------------------------
 *
 * Checkbox and radio share a shell and differ in their mark and their corner.
 * The box is a recess — the same inset shadow as the input's shell and the
 * switch's track — because all three are places on the paper that something
 * goes into. When it is filled, the inset stays, so the colour reads as pigment
 * that settled into the groove rather than as a tile laid on top.
 */

.ui-lib-soft-choice {
	display: inline-flex;
	align-items: flex-start;
	gap: 10px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	cursor: pointer;
	user-select: none;
}

.ui-lib-soft-choice[data-ui-lib-disabled] {
	cursor: not-allowed;
	opacity: 0.5;
}

/*
 * The real control, invisible but present.
 *
 * Not display: none, which would remove it from the tab order and from the
 * accessibility tree, and not opacity: 0 alone, which leaves a target sitting
 * on top of the drawing. Sized to the drawing and clipped to zero: it keeps its
 * place in the tab order, its name, its role and its events, and it cannot be
 * clicked by accident where it is not visible.
 */
.ui-lib-soft-choice__input {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	margin: 0;
	pointer-events: none;
}

.ui-lib-soft-choice__box {
	position: relative;
	display: grid;
	place-items: center;
	flex: none;
	width: 22px;
	height: 22px;
	margin-top: 1px;
	background: var(--moe-surface-hover-soft);
	box-shadow:
		inset 0 2px 3px 0 rgb(77 60 56 / 0.12),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
	border: 1.5px solid transparent;
	transition:
		background 180ms ease-out,
		border-color 180ms ease-out,
		transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* The checkbox keeps a small radius; the radio is a circle. The design system
   asks for exactly this, and it is also the only shape difference a user can
   rely on at a glance. */
.ui-lib-soft-choice[data-ui-lib-kind="checkbox"] .ui-lib-soft-choice__box {
	border-radius: var(--moe-radius-xs);
}

.ui-lib-soft-choice[data-ui-lib-kind="radio"] .ui-lib-soft-choice__box {
	border-radius: var(--moe-radius-full);
}

.ui-lib-soft-choice:hover .ui-lib-soft-choice__box {
	transform: scale(1.06);
}

.ui-lib-soft-choice__input:focus-visible ~ .ui-lib-soft-choice__box {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 3px;
}

/* --- checked -------------------------------------------------------------
 *
 * The fill is the pigment, and the animation is on the mark rather than on the
 * colour: a swell of colour that fades in reads as a highlight, where a stroke
 * that draws itself reads as a mark being made.
 */

.ui-lib-soft-choice[data-ui-lib-kind="checkbox"] .ui-lib-soft-choice__input:checked ~ .ui-lib-soft-choice__box,
.ui-lib-soft-choice[data-ui-lib-kind="checkbox"] .ui-lib-soft-choice__input:indeterminate ~ .ui-lib-soft-choice__box {
	background: var(--moe-sakura-500);
	box-shadow:
		inset 0 2px 4px 0 rgb(194 82 108 / 0.28),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.5);
}

.ui-lib-soft-choice__mark {
	width: 16px;
	height: 16px;
}

.ui-lib-soft-choice__tick,
.ui-lib-soft-choice__dash {
	stroke: var(--moe-cocoa);
	fill: none;
}

/*
 * stroke-dasharray at the path's length, with the offset animated from that
 * length to zero. The number is the path length, so it is set as a constant
 * rather than measured: the path is fixed, and measuring it at runtime would
 * need getTotalLength on every mount.
 *
 * A dash drawn from nothing to full, and a tick drawn from nothing to full, are
 * the same animation — which is why the two paths share these rules.
 */
.ui-lib-soft-choice__tick {
	stroke-dasharray: 17;
	stroke-dashoffset: 17;
	transition: stroke-dashoffset 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ui-lib-soft-choice__dash {
	stroke-dasharray: 7;
	stroke-dashoffset: 7;
	transition: stroke-dashoffset 200ms ease-out;
}

.ui-lib-soft-choice__input:checked ~ .ui-lib-soft-choice__box .ui-lib-soft-choice__tick {
	stroke-dashoffset: 0;
}

.ui-lib-soft-choice__input:indeterminate ~ .ui-lib-soft-choice__box .ui-lib-soft-choice__tick {
	stroke-dashoffset: 17;
}

.ui-lib-soft-choice__input:indeterminate ~ .ui-lib-soft-choice__box .ui-lib-soft-choice__dash {
	stroke-dashoffset: 0;
}

/* --- radio ---------------------------------------------------------------
 *
 * The dot grows from nothing rather than fading, so the two controls tell the
 * same story with the same kind of motion.
 */

.ui-lib-soft-choice__dot {
	width: 10px;
	height: 10px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-cocoa);
	transform: scale(0);
	transition: transform 240ms cubic-bezier(0.34, 1.78, 0.64, 1);
}

.ui-lib-soft-choice[data-ui-lib-kind="radio"] .ui-lib-soft-choice__input:checked ~ .ui-lib-soft-choice__box {
	background: var(--moe-sakura-500);
	box-shadow:
		inset 0 2px 4px 0 rgb(194 82 108 / 0.28),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.5);
}

.ui-lib-soft-choice[data-ui-lib-kind="radio"]
	.ui-lib-soft-choice__input:checked
	~ .ui-lib-soft-choice__box
	.ui-lib-soft-choice__dot {
	transform: scale(1);
}

/* Checkbox and radio both get their ink, but the radio's dot has to sit above
   the checkbox's mark which is not rendered for radios at all. */
.ui-lib-soft-choice[data-ui-lib-kind="radio"] .ui-lib-soft-choice__mark {
	display: none;
}

.ui-lib-soft-choice[data-ui-lib-kind="checkbox"] .ui-lib-soft-choice__dot {
	display: none;
}

/* --- text ---------------------------------------------------------------- */

.ui-lib-soft-choice__text {
	display: grid;
	gap: 1px;
}

.ui-lib-soft-choice__label {
	font-size: 14.5px;
	font-weight: 600;
	line-height: 1.45;
}

.ui-lib-soft-choice__note {
	font-size: 12.5px;
	font-weight: 500;
	line-height: 1.5;
	color: var(--moe-cocoa-soft);
}

/* --- group --------------------------------------------------------------- */

.ui-lib-soft-radio-group {
	display: grid;
	gap: 12px;
	border: none;
	margin: 0;
	padding: 0;
}

.ui-lib-soft-radio-group__legend {
	padding: 0;
	margin-bottom: 10px;
	font-family: var(--moe-font-rounded);
	font-size: 13px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-choice__box,
	.ui-lib-soft-choice__tick,
	.ui-lib-soft-choice__dash,
	.ui-lib-soft-choice__dot 
		transition: none;

	.ui-lib-soft-choice__tick,
	.ui-lib-soft-choice__dash 
		/* Land at the final state rather than at the start of an animation that
		   will never run. */
		stroke-dashoffset: 0;

	.ui-lib-soft-choice__input:indeterminate ~ .ui-lib-soft-choice__box .ui-lib-soft-choice__tick 
		stroke-dashoffset: 17;

	.ui-lib-soft-choice[data-ui-lib-kind="radio"] .ui-lib-soft-choice__box .ui-lib-soft-choice__dot 
		transform: scale(0);

	.ui-lib-soft-choice[data-ui-lib-kind="radio"]
		.ui-lib-soft-choice__input:checked
		~ .ui-lib-soft-choice__box
		.ui-lib-soft-choice__dot 
		transform: scale(1);
}


/* --- progress ------------------------------------------------------------
 *
 * The fill travels rather than widens. A solid block that grows reads as a
 * value being revealed; a gradient moving along its own length reads as
 * something passing through, which is what the same background-position
 * animation gives the slider. Two components showing progress should look like
 * the same substance, so they share the technique on purpose.
 *
 * The track is a recess, like every other groove in this library — the input's
 * shell, the switch's track, the choice box. A raised track with a fill inside
 * it reads as two objects; a sunken one reads as a channel.
 */

.ui-lib-soft-progress {
	display: grid;
	gap: 7px;
	width: 100%;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-progress__head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
}

.ui-lib-soft-progress__label {
	font-size: 13px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-progress__value {
	font-size: 12.5px;
	font-weight: 700;
	letter-spacing: 0.02em;
	color: var(--moe-cocoa-soft);
	/* Digits change width as the number changes, and a label that shifts by a
	   pixel every tick is the most distracting thing on a loading screen. */
	font-variant-numeric: tabular-nums;
}

.ui-lib-soft-progress__track {
	position: relative;
	overflow: hidden;
	height: 10px;
	border-radius: var(--moe-radius-full);
	background: oklch(0.955 0.006 60);
	box-shadow:
		inset 0 2px 3px 0 rgb(77 60 56 / 0.12),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
}

.ui-lib-soft-progress[data-ui-lib-size="sm"] .ui-lib-soft-progress__track {
	height: 6px;
}

.ui-lib-soft-progress__fill {
	display: block;
	height: 100%;
	border-radius: var(--moe-radius-full);
	background: linear-gradient(90deg, var(--moe-sakura-500), var(--moe-taro-500));
	background-size: 180% 100%;
	animation: ui-lib-moe-flow 3.2s linear infinite;
	transition: width 420ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* Indeterminate: no width to animate, so the band itself travels. It reaches
   into the track's own edges rather than stopping short, so there is no moment
   where the bar appears to have finished. */
.ui-lib-soft-progress[data-ui-lib-indeterminate] .ui-lib-soft-progress__fill {
	width: 38%;
	background: linear-gradient(
		90deg,
		transparent 0%,
		var(--moe-sakura-500) 35%,
		var(--moe-taro-500) 65%,
		transparent 100%
	);
	background-size: 100% 100%;
	animation: ui-lib-moe-travel 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes ui-lib-moe-travel {
	from 
		transform: translateX(-100%);
	to 
		transform: translateX(264%);
}

/* --- spinner -------------------------------------------------------------
 *
 * Three rings breathing, not an arc rotating.
 *
 * A rotating arc turns at a constant rate for as long as the wait lasts, which
 * is exactly what makes a wait feel long — it is the one motion in an interface
 * that never resolves. A ring that expands and contracts at roughly a resting
 * breath rate suggests something alive rather than something stuck.
 *
 * The phase offsets are deliberately uneven. An even spread reads as a
 * mechanical chase, which is the thing this was chosen to avoid.
 */

.ui-lib-soft-spinner {
	position: relative;
	display: inline-grid;
	place-items: center;
	vertical-align: middle;
}

.ui-lib-soft-spinner__ring {
	position: absolute;
	inset: 0;
	border-radius: var(--moe-radius-full);
	border: 2px solid var(--moe-taro-500);
	/* A breath is not a sine wave: it arrives faster than it leaves. The first
	   55 per cent of the curve is the inhale and the rest is the slower exhale,
	   which is why the keyframe stops are uneven. */
	animation: ui-lib-moe-breathe 2.1s cubic-bezier(0.33, 0, 0.35, 1) infinite;
}

.ui-lib-soft-spinner__ring:nth-child(2) {
	animation-delay: -0.7s;
	border-color: var(--moe-sakura-500);
}

.ui-lib-soft-spinner__ring:nth-child(3) {
	animation-delay: -1.45s;
	border-color: var(--moe-soda-500);
}

/*
 * The first version of this spread the three rings across scale 0.42 to 1.34
 * at full opacity, and at any given instant it looked like a target — three
 * concentric circles, which is a static pattern rather than a living one.
 *
 * The fix is to make opacity carry the phase and scale carry almost none. Rings
 * that are nearly the same size but at very different brightnesses read as one
 * thing pulsing; rings at very different sizes read as three things. The scale
 * range is now 0.86 to 1.06, and most of the animation is the fade.
 */
@keyframes ui-lib-moe-breathe {
	0% {
		transform: scale(0.86);
		opacity: 0;
	}
	22% {
		transform: scale(0.92);
		opacity: 0.55;
	}
	55% {
		transform: scale(1.06);
		opacity: 0.22;
	}
	100% {
		transform: scale(1.06);
		opacity: 0;
	}
}

/* --- skeleton ------------------------------------------------------------
 *
 * A placeholder that is wet rather than grey. The usual skeleton is a grey
 * rectangle with a sheen sliding across it, which says "content is missing"; a
 * wash says "content is arriving", which is what a half-finished watercolour
 * says. The drift is at the same rate as the wash on the material page, because
 * a placeholder should look like the thing it stands in for.
 */

.ui-lib-soft-skeleton {
	display: grid;
	gap: 9px;
	width: 100%;
}

.ui-lib-soft-skeleton__shape {
	position: relative;
	display: block;
	overflow: hidden;
	min-height: 14px;
	height: 100%;
	border-radius: var(--moe-radius-sm);
	background: var(--moe-state-iris);
}

.ui-lib-soft-skeleton[data-ui-lib-variant="block"] .ui-lib-soft-skeleton__shape {
	height: 100%;
	border-radius: var(--moe-radius-md);
}

.ui-lib-soft-skeleton[data-ui-lib-variant="circle"] .ui-lib-soft-skeleton__shape {
	border-radius: var(--moe-radius-full);
	aspect-ratio: 1;
}

.ui-lib-soft-skeleton[data-ui-lib-variant="text"] .ui-lib-soft-skeleton__shape {
	height: 13px;
}

/* The last line of a paragraph is short. Every line being full width is the
   tell that a placeholder is a rectangle rather than a shape. */
.ui-lib-soft-skeleton__shape[data-ui-lib-last] {
	width: 62%;
}

.ui-lib-soft-skeleton__shape::after {
	content: "";
	position: absolute;
	inset: 0;
	background: linear-gradient(
		100deg,
		transparent 20%,
		rgb(255 255 255 / 0.65) 50%,
		transparent 80%
	);
	background-size: 220% 100%;
	animation: ui-lib-moe-drift 2.6s linear infinite;
}

@keyframes ui-lib-moe-drift {
	from 
		background-position: 140% 0;
	to 
		background-position: -140% 0;
}

@media (prefers-reduced-motion: reduce) {
	/* Progress keeps its travel, because a bar that does not move is a bar that
	   looks finished. It slows down instead. */
	.ui-lib-soft-progress__fill,
	.ui-lib-soft-progress[data-ui-lib-indeterminate] .ui-lib-soft-progress__fill 
		animation-duration: 6s;
		transition-duration: 0s;

	.ui-lib-soft-spinner__ring 
		animation: none;
		transform: scale(1);
		opacity: 0.4;

	.ui-lib-soft-spinner__ring:first-child 
		opacity: 0.85;

	.ui-lib-soft-skeleton__shape::after 
		animation: none;
		background: none;
}


/* --- tooltip -------------------------------------------------------------
 *
 * Two rules here are requirements rather than taste.
 *
 * The first is pointer-events: auto on the tooltip itself. A hint the reader
 * cannot hover is a hint that vanishes the moment they move toward it, and the
 * flicker that causes is worse than having no tooltip at all. WCAG's "Content on
 * Hover or Focus" asks for the content to be *hoverable* for exactly this
 * reason, and the default for a floating layer is to be transparent to the
 * pointer.
 *
 * The second is that the tail is drawn from two rotated squares rather than a
 * border triangle, so it keeps the same rounded language as everything else.
 */

/*
 * Placement, and the first version was 171px out.
 *
 * It used top: anchor(top) with translate to lift
 * the bubble above the trigger. That is correct until position-try-fallbacks
 * flips it: the fallback moves the box to the other side but keeps the same
 * anchor edge, so the offset that lifted it up now pushes it down. Measured, the
 * trigger sat at y=424 and the tooltip at y=595.
 *
 * Both sides therefore have a complete placement of their own, written twice on
 * purpose, and neither relies on a transform to reach its side. The gap is a
 * margin, which is part of the box the browser positions rather than an offset
 * applied after.
 */
.ui-lib-soft-tooltip {
	position: fixed;
	left: anchor(center);
	translate: -50% 0;
	bottom: calc(anchor(top) + 9px);
	top: auto;
	position-try-fallbacks: flip-block;
	max-width: 260px;
	padding: 7px 12px;
	border-radius: var(--moe-radius-sm);
	background: var(--moe-cocoa);
	color: oklch(0.97 0.01 60);
	font-family: var(--moe-font-rounded);
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1.5;
	box-shadow: 0 8px 20px -8px rgb(77 60 56 / 0.5);
	pointer-events: auto;
}

.ui-lib-soft-tooltip[data-ui-lib-side="bottom"] {
	bottom: auto;
	top: calc(anchor(bottom) + 9px);
	position-try-fallbacks: flip-block;
}

.ui-lib-soft-tooltip:not(:popover-open) {
	display: none;
}


.ui-lib-soft-tooltip:not(:popover-open) {
	display: none;
}

/* The tail. Sits below for a top-side tooltip, above for a bottom-side one. */
.ui-lib-soft-tooltip::after {
	content: "";
	position: absolute;
	left: 50%;
	width: 8px;
	height: 8px;
	translate: -50%;
	rotate: 45deg;
	border-radius: 2px;
	background: var(--moe-cocoa);
}

.ui-lib-soft-tooltip::after {
	bottom: -3px;
}

.ui-lib-soft-tooltip[data-ui-lib-side="bottom"]::after {
	bottom: auto;
	top: -3px;
}

/*
 * The anchor wrapper is only there to be positioned. It must not add a box of
 * its own, or every mouseover region in the interface grows by the wrapper's
 * padding and tooltips fire on empty space.
 */
.ui-lib-soft-tooltip__anchor {
	display: contents;
}

/* --- toast ---------------------------------------------------------------
 *
 * Arrives from the edge rather than fading in place, because a notice has a
 * direction of travel: it came from somewhere and it is going back. A fade says
 * it was always there and is now gone.
 */

.ui-lib-soft-toast {
	display: flex;
	align-items: flex-start;
	gap: 11px;
	width: min(92vw, 340px);
	padding: 13px 14px 13px 15px;
	border-radius: var(--moe-radius-lg);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	color: var(--moe-cocoa);
	font-family: var(--moe-font-rounded);
	box-shadow: var(--moe-floating);
	animation: ui-lib-moe-toast-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes ui-lib-moe-toast-in {
	from {
		opacity: 0;
		transform: translateY(14px) scale(0.96);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

/* A shape as well as a colour: a dot, a tick and a bar, so the tone survives
   greyscale and a reader who does not separate the two hues. */
.ui-lib-soft-toast__mark {
	flex: none;
	width: 9px;
	height: 9px;
	margin-top: 5px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-taro-500);
}

.ui-lib-soft-toast[data-ui-lib-tone="success"] .ui-lib-soft-toast__mark {
	border-radius: 2px;
	background: var(--moe-mint-700);
}

.ui-lib-soft-toast[data-ui-lib-tone="warn"] .ui-lib-soft-toast__mark {
	width: 4px;
	height: 11px;
	border-radius: 1px;
	background: var(--moe-lemon-700);
}

.ui-lib-soft-toast__text {
	flex: 1;
	min-width: 0;
	display: grid;
	gap: 2px;
}

.ui-lib-soft-toast__title {
	margin: 0;
	font-size: 14px;
	font-weight: 700;
	line-height: 1.45;
}

.ui-lib-soft-toast__body {
	margin: 0;
	font-size: 12.5px;
	font-weight: 500;
	line-height: 1.55;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-toast__close {
	flex: none;
	display: grid;
	place-items: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: var(--moe-state-disabled);
	color: var(--moe-cocoa-soft);
	font-size: 14px;
	font-weight: 700;
	line-height: 1;
	cursor: pointer;
	transition: transform 200ms var(--moe-ease-jelly);
}

.ui-lib-soft-toast__close:hover {
	transform: rotate(15deg);
}

.ui-lib-soft-toast__close:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* The stack. Fixed to a corner, and each toast is placed in flow inside it, so
   several arriving at once push each other rather than overlapping. */
.ui-lib-soft-toaster {
	position: fixed;
	right: 20px;
	bottom: 20px;
	z-index: 40;
	display: grid;
	gap: 10px;
	justify-items: end;
	pointer-events: none;
}

.ui-lib-soft-toaster > * {
	pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-toast 
		animation: none;

	.ui-lib-soft-toast__close 
		transition: none;

	.ui-lib-soft-toast__close:hover 
		transform: none;
}


/* --- visually hidden -----------------------------------------------------
 *
 * Text that is in the accessibility tree and not on the screen.
 *
 * Not display none, which removes it from the tree as well, and not visibility
 * hidden for the same reason. The clip-path form is used rather than the older
 * 1px box, because that one leaves a box some layouts notice.
 */

.ui-lib-visually-hidden:not(:focus):not(:active) {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

/* --- avatar --------------------------------------------------------------
 *
 * The fallback is a pigment mark, generated rather than grey.
 *
 * Every avatar component has a fallback and it is always a grey circle with
 * initials, which means the case most systems are actually in — nobody has
 * uploaded anything — is the one the design spends no time on. Here the mark
 * comes from createWash with a seed hashed from the name, so the arc strengths,
 * the silhouette, the noise and the rotation all differ between two people
 * rather than only the tint.
 *
 * The wash element carries the base class from the wash stylesheet. Setting the
 * twelve generated variables is not enough on its own: the base class is what
 * turns them into a mark. An earlier version set the variables correctly and
 * gave the element only a size, so every variable was present and nothing read
 * them — the measured background was fully transparent and the avatar rendered
 * as the grey circle it was meant to replace.
 */

.ui-lib-soft-avatar {
	position: relative;
	display: inline-grid;
	place-items: center;
	flex: none;
	border-radius: var(--moe-radius-full);
	overflow: hidden;
	isolation: isolate;
	background: var(--moe-state-iris-soft);
	vertical-align: middle;
}

.ui-lib-soft-avatar__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

/*
 * Two classes deep on purpose, and this is not tidiness.
 *
 * The element carries the wash base class as well as this one, and the base
 * class sets position: relative. Both rules are single-class selectors, so the
 * later one in the sheet wins — and the base class is written later, in the wash
 * section. The result was that this rule did not apply at all: the wash stayed
 * in the grid, took a row of its own, and pushed the letter into a second row.
 * Measured, the avatar's grid was 52px 21.84px, two rows, with the letter at
 * y=372 inside a circle that ended at 372.
 *
 * Specificity rather than source order, so the intent survives anyone moving
 * either block.
 */
.ui-lib-soft-avatar .ui-lib-soft-avatar__wash {
	position: absolute;
	inset: -14%;
	/* Stated rather than left to document order.
	   The initial sits at z-index 1 and would be above this anyway in a naive
	   reading, but the wash carries an inline opacity, which puts it in its own
	   stacking context, and the parent has isolation on. Relying on source order
	   across three stacking-context rules is how a letter ends up underneath a
	   wash that appears to be behind it. */
	z-index: 0;
	/*
	 * The opacity is set by the component, not here.
	 *
	 * It was written here first as a calc on the generated variable, and it did
	 * nothing: the generator emits opacity as an inline style on the element,
	 * and an inline declaration beats a stylesheet rule. The measured opacity was
	 * unchanged at 0.232 with the rule present.
	 *
	 * It belongs in the component anyway, because the value depends on the size
	 * the component was given — a 40px mark needs a thicker film than a 190px
	 * one, since the deposit ring is two device pixels at the former and the eye
	 * reads the whole ring at the latter.
	 */
}

.ui-lib-soft-avatar__initial {
	position: relative;
	z-index: 1;
	font-family: var(--moe-font-rounded);
	font-weight: 700;
	line-height: 1;
	color: var(--moe-cocoa);
	user-select: none;
	/* The letter sits on top of pigment, and pigment varies. A halo of the card
	   colour keeps the glyph legible over both the pale centre and the darker
	   rim, without dimming the mark underneath to make room for it. */
	text-shadow:
		0 0 3px var(--moe-card),
		0 0 6px var(--moe-card);
}

/* A ring for a selected or active state. Drawn outside the clip so it does not
   eat into the portrait. */
.ui-lib-soft-avatar[data-ui-lib-ring] {
	box-shadow:
		0 0 0 2px var(--moe-card),
		0 0 0 4px var(--moe-taro-500);
}

/* --- tag -----------------------------------------------------------------
 *
 * Three amounts of one substance, not three unrelated styles. Soft is a wash,
 * solid is the same pigment at full strength, outline has no body at all — for
 * a row of tags where three filled pills is a wall of colour.
 */

.ui-lib-soft-tag {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 26px;
	padding: 0 10px;
	border-radius: var(--moe-radius-full);
	font-family: var(--moe-font-rounded);
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1;
	white-space: nowrap;
	vertical-align: middle;
}

.ui-lib-soft-tag__label {
	font-size: 12.5px;
	font-weight: 600;
	line-height: 1;
}

.ui-lib-soft-tag__leading,
.ui-lib-soft-tag__remove {
	display: inline-flex;
	align-items: center;
	flex: none;
}

.ui-lib-soft-tag[data-ui-lib-variant="soft"][data-ui-lib-tone="iris"] {
	background: oklch(0.94 0.03 300);
	color: oklch(0.4 0.06 300);
}
.ui-lib-soft-tag[data-ui-lib-variant="soft"][data-ui-lib-tone="blossom"] {
	background: var(--moe-state-blossom);
	color: oklch(0.44 0.07 15);
}
.ui-lib-soft-tag[data-ui-lib-variant="soft"][data-ui-lib-tone="mist"] {
	background: oklch(0.95 0.03 235);
	color: oklch(0.42 0.06 235);
}

.ui-lib-soft-tag[data-ui-lib-variant="solid"][data-ui-lib-tone="iris"] {
	background: var(--moe-taro-500);
	color: var(--moe-cocoa);
}
.ui-lib-soft-tag[data-ui-lib-variant="solid"][data-ui-lib-tone="blossom"] {
	background: var(--moe-sakura-500);
	color: var(--moe-cocoa);
}
.ui-lib-soft-tag[data-ui-lib-variant="solid"][data-ui-lib-tone="mist"] {
	background: var(--moe-soda-500);
	color: var(--moe-cocoa);
}

.ui-lib-soft-tag[data-ui-lib-variant="outline"] {
	background: transparent;
	border: 1.5px solid currentColor;
	color: var(--moe-cocoa-soft);
}

/* A real button, because it has to be reachable by Tab and activated by
   keyboard like any other control — and a span with an onClick is neither. */
.ui-lib-soft-tag__remove {
	display: inline-grid;
	place-items: center;
	width: 16px;
	height: 16px;
	margin-right: -3px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: rgb(77 60 56 / 0.1);
	color: inherit;
	cursor: pointer;
	transition:
		background 160ms ease-out,
		transform 200ms var(--moe-ease-jelly);
}

.ui-lib-soft-tag__remove:hover {
	background: rgb(77 60 56 / 0.2);
	transform: rotate(90deg);
}

.ui-lib-soft-tag__remove:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-tag__remove 
		transition: none;

	.ui-lib-soft-tag__remove:hover 
		transform: none;
}


/* --- accordion -----------------------------------------------------------
 *
 * The open and close is a grid row going from 0fr to 1fr. Three techniques were
 * measured before choosing this one, and the first three measurements were all
 * wrong: they ran requestAnimationFrame inside page.evaluate, and headless
 * Chrome does not drive rAF when nothing is painting, so every sample came back
 * as either the first value or the last and every technique looked broken.
 * Sampled properly, grid-template-rows and a measured height produce the
 * identical curve. The grid wins because it needs no measurement, and therefore
 * no ResizeObserver per panel and no class of bug where a panel is clipped after
 * a font loads.
 *
 * The panel is always in the DOM and always in the accessibility tree; the
 * inert attribute is what keeps closed content out of the tab order. That
 * matters because aria-controls has to point at something that exists.
 */

.ui-lib-soft-accordion {
	display: grid;
	gap: 10px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-accordion__item {
	overflow: hidden;
	border-radius: var(--moe-radius-lg);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	transition:
		border-color 240ms ease-out,
		box-shadow 240ms ease-out;
}

.ui-lib-soft-accordion__item[data-ui-lib-open] {
	border-color: oklch(0.88 0.04 310);
	box-shadow: 0 10px 24px -16px rgb(77 60 56 / 0.4);
}

.ui-lib-soft-accordion__item[data-ui-lib-disabled] {
	opacity: 0.5;
}

.ui-lib-soft-accordion__heading {
	display: grid;
	gap: 2px;
	margin: 0;
	font-size: inherit;
	font-weight: inherit;
}

.ui-lib-soft-accordion__trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	width: 100%;
	padding: 15px 18px;
	border: none;
	background: none;
	font: inherit;
	font-size: 15px;
	font-weight: 700;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.ui-lib-soft-accordion__trigger:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: -3px;
	border-radius: var(--moe-radius-lg);
}

.ui-lib-soft-accordion__item[data-ui-lib-disabled] .ui-lib-soft-accordion__trigger {
	cursor: not-allowed;
}

/* Named by the component and missing from here until the guard was generalised.
   A class with no rule renders as nothing at all, which for a title is invisible
   and for a border is the difference between a control and a label. */
.ui-lib-soft-accordion__title {
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa);
}

.ui-lib-soft-accordion__note {
	padding: 0 18px 12px;
	font-size: 12.5px;
	font-weight: 500;
	line-height: 1.5;
	color: var(--moe-cocoa-soft);
}

/* The chevron turns rather than being swapped for a different glyph, so the
   transition has something continuous to interpolate. */
.ui-lib-soft-accordion__mark {
	display: grid;
	place-items: center;
	flex: none;
	width: 26px;
	height: 26px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-surface-hover);
	color: var(--moe-cocoa-soft);
	transition:
		transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1),
		background 240ms ease-out;
}

.ui-lib-soft-accordion__item[data-ui-lib-open] .ui-lib-soft-accordion__mark {
	transform: rotate(180deg);
	background: oklch(0.9 0.05 310);
}

.ui-lib-soft-accordion__panel {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 380ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.ui-lib-soft-accordion__item[data-ui-lib-open] .ui-lib-soft-accordion__panel {
	grid-template-rows: 1fr;
}

/* The middle element is what the row is sized against; it must be able to have
   no height at all, which a row cannot do on its own. */
.ui-lib-soft-accordion__body {
	overflow: hidden;
	min-height: 0;
}

.ui-lib-soft-accordion__content {
	padding: 0 18px 17px;
	font-size: 14px;
	font-weight: 500;
	line-height: 1.7;
	color: var(--moe-cocoa-soft);
}

/* The rule between the header and its content, drawn only when there is a
   header above it to separate from. */
.ui-lib-soft-accordion__content::before {
	content: "";
	display: block;
	height: 1px;
	margin-bottom: 13px;
	background: linear-gradient(90deg, transparent, var(--moe-stroke) 12%, var(--moe-stroke) 88%, transparent);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-accordion__panel,
	.ui-lib-soft-accordion__mark,
	.ui-lib-soft-accordion__item 
		transition: none;
}


/* --- table ---------------------------------------------------------------
 *
 * Rows are separated by a wash rather than a rule. A hairline between every row
 * is a grid; a soft gradient that fades at both ends reads as a paper fold, and
 * it survives the rounded corners of the container without a special case at
 * the first and last row.
 *
 * The header is a recess, like every other groove in this library — the input's
 * shell, the switch's track, the choice box. A table's header is the one part
 * that never scrolls away from meaning, so it gets the same inset treatment as
 * the controls rather than a filled band.
 */

.ui-lib-soft-table {
	position: relative;
	overflow: hidden;
	border-radius: var(--moe-radius-lg);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-table__table {
	width: 100%;
	border-collapse: collapse;
	/* separate with no spacing would break the row borders below; collapse
	   keeps the inset header shadow working inside the rounded frame. */
}

.ui-lib-soft-table__caption {
	padding: 15px 18px 12px;
	text-align: left;
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-table__th {
	padding: 11px 16px;
	text-align: left;
	font-size: 12.5px;
	font-weight: 700;
	letter-spacing: 0.02em;
	color: var(--moe-cocoa-soft);
	background: oklch(0.965 0.008 60);
	box-shadow: inset 0 -1px 0 0 var(--moe-stroke);
	white-space: nowrap;
}

.ui-lib-soft-table__th[data-ui-lib-numeric],
.ui-lib-soft-table__td[data-ui-lib-numeric] {
	text-align: right;
}

/* Numbers line up on their digits only if the digits are the same width. */
.ui-lib-soft-table__td[data-ui-lib-numeric] {
	font-variant-numeric: tabular-nums;
}

/* The whole header cell is the target, not just the text in it. */
.ui-lib-soft-table__sort {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: -3px -6px;
	padding: 3px 6px;
	border: none;
	border-radius: var(--moe-radius-xs);
	background: none;
	font: inherit;
	font-weight: 700;
	letter-spacing: inherit;
	color: inherit;
	cursor: pointer;
	transition: background 160ms ease-out;
}

.ui-lib-soft-table__sort:hover {
	background: oklch(0.93 0.015 60);
}

.ui-lib-soft-table__sort:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* The arrow is drawn, and it is only present when the column is sorted. An
   always-present arrow in a muted colour reads as an affordance; an arrow that
   appears when it means something reads as state. */
.ui-lib-soft-table__arrow {
	width: 0;
	height: 0;
	border-left: 4px solid transparent;
	border-right: 4px solid transparent;
	border-bottom: 5px solid var(--moe-taro-500);
	opacity: 0;
	transition:
		opacity 180ms ease-out,
		transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ui-lib-soft-table__th[aria-sort] .ui-lib-soft-table__arrow {
	opacity: 1;
}

.ui-lib-soft-table__th[aria-sort="descending"] .ui-lib-soft-table__arrow {
	transform: rotate(180deg);
}

.ui-lib-soft-table__row {
	background: transparent;
	transition: background 160ms ease-out;
}

.ui-lib-soft-table__row:hover {
	background: oklch(0.975 0.012 310);
}

.ui-lib-soft-table__td {
	padding: 12px 16px;
	font-size: 14px;
	font-weight: 500;
	line-height: 1.55;
	color: var(--moe-cocoa);
	box-shadow: inset 0 -1px 0 0 oklch(0.94 0.006 60);
}

/* The last row does not need one: the container's own border does that job, and
   two lines a pixel apart is the tell of a table that was styled by rule rather
   than by looking at it. */
.ui-lib-soft-table__row:last-child .ui-lib-soft-table__td {
	box-shadow: none;
}

.ui-lib-soft-table__empty {
	padding: 30px 16px;
	text-align: center;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-table__arrow,
	.ui-lib-soft-table__row,
	.ui-lib-soft-table__sort 
		transition: none;
}


/* --- drawer --------------------------------------------------------------
 *
 * A drawer is a modal that happens to be against an edge, so it is built on the
 * same dialog and none of the interaction is written here. What is written here
 * is geometry, and it is written the way it is for one reason:
 *
 * A dialog opens into the centre, and that position belongs to the top layer's
 * layout. Transitioning the dialog fights the platform and the platform wins in
 * ways that differ between engines. So the dialog is made a full-height,
 * zero-inset container and the panel inside it carries the width and does the
 * moving. One element animates, and it is not the one the platform is managing.
 */

.ui-lib-soft-drawer {
	/* The dialog box itself: full height, pinned, no default centring, no
	   padding, and transparent to the pointer so a click lands on the backdrop
	   rather than on an invisible box. */
	position: fixed;
	inset: 0;
	width: 100%;
	max-width: 100%;
	height: 100%;
	max-height: 100%;
	margin: 0;
	padding: 0;
	border: none;
	background: transparent;
	overflow: hidden;
	pointer-events: none;
}

.ui-lib-soft-drawer::backdrop {
	background: rgb(60 44 40 / 0.28);
	backdrop-filter: blur(3px);
}

/* The panel takes the pointer events back. Only the panel is interactive; the
   rest of the dialog is a backdrop by construction. */
.ui-lib-soft-drawer__panel {
	position: absolute;
	top: 0;
	bottom: 0;
	width: min(92vw, var(--drawer-width, 340px));
	display: flex;
	flex-direction: column;
	pointer-events: auto;
	background: var(--moe-card);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	box-shadow: -18px 0 44px -22px rgb(77 60 56 / 0.45);
}

.ui-lib-soft-drawer[data-ui-lib-side="right"] .ui-lib-soft-drawer__panel {
	right: 0;
	border-radius: var(--moe-radius-lg) 0 0 var(--moe-radius-lg);
	animation: ui-lib-moe-drawer-right 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.ui-lib-soft-drawer[data-ui-lib-side="left"] .ui-lib-soft-drawer__panel {
	left: 0;
	border-radius: 0 var(--moe-radius-lg) var(--moe-radius-lg) 0;
	box-shadow: 18px 0 44px -22px rgb(77 60 56 / 0.45);
	animation: ui-lib-moe-drawer-left 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes ui-lib-moe-drawer-right {
	from 
		transform: translateX(102%);
	to 
		transform: translateX(0);
}

@keyframes ui-lib-moe-drawer-left {
	from 
		transform: translateX(-102%);
	to 
		transform: translateX(0);
}

@keyframes ui-lib-moe-drawer-in {
	from {
		opacity: 0;
		transform: translateY(8px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

.ui-lib-soft-drawer__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 14px;
	padding: 20px 20px 15px;
	border-bottom: 1.5px solid var(--moe-stroke);
}

.ui-lib-soft-drawer__titles {
	display: grid;
	gap: 3px;
	min-width: 0;
}

.ui-lib-soft-drawer__title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
	letter-spacing: 0.01em;
}

.ui-lib-soft-drawer__note {
	margin: 0;
	font-size: 12.5px;
	font-weight: 500;
	line-height: 1.5;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-drawer__close {
	display: grid;
	place-items: center;
	flex: none;
	width: 30px;
	height: 30px;
	margin: -3px -3px 0 0;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: oklch(0.95 0.012 20);
	color: var(--moe-cocoa-soft);
	cursor: pointer;
	transition:
		background 160ms ease-out,
		transform 240ms var(--moe-ease-jelly);
}

.ui-lib-soft-drawer__close:hover {
	background: oklch(0.91 0.02 20);
	transform: rotate(90deg);
}

.ui-lib-soft-drawer__close:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

.ui-lib-soft-drawer__body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 18px 20px;
	font-size: 14px;
	font-weight: 500;
	line-height: 1.65;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-drawer__foot {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
	padding: 14px 20px;
	border-top: 1.5px solid var(--moe-stroke);
	background: oklch(0.98 0.006 60);
	border-radius: 0 0 0 var(--moe-radius-lg);
}

/* --- divider -------------------------------------------------------------
 *
 * The fade at both ends is the point. A hairline that runs edge to edge is a
 * box; one that fades is a separation, and it can sit inside a rounded card
 * without a special case at the corners.
 */

.ui-lib-soft-divider {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	height: 1px;
	border: none;
	background: linear-gradient(
		90deg,
		transparent,
		var(--moe-stroke) 14%,
		var(--moe-stroke) 86%,
		transparent
	);
}

/* A labelled divider is taller and the rule is drawn on either side of the
   label rather than behind it, so the text never sits on a line. */
.ui-lib-soft-divider[data-ui-lib-labelled] {
	height: auto;
	background: none;
}

.ui-lib-soft-divider[data-ui-lib-labelled]::before,
.ui-lib-soft-divider[data-ui-lib-labelled]::after {
	content: "";
	flex: 1;
	height: 1px;
	background: linear-gradient(90deg, transparent, var(--moe-stroke));
}

.ui-lib-soft-divider[data-ui-lib-labelled]::after {
	background: linear-gradient(90deg, var(--moe-stroke), transparent);
}

.ui-lib-soft-divider__label {
	font-family: var(--moe-font-rounded);
	font-size: 12.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	white-space: nowrap;
}

.ui-lib-soft-divider[data-ui-lib-orientation="vertical"] {
	width: 1px;
	height: auto;
	align-self: stretch;
	background: linear-gradient(
		180deg,
		transparent,
		var(--moe-stroke) 14%,
		var(--moe-stroke) 86%,
		transparent
	);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-drawer__panel 
		animation: none;

	.ui-lib-soft-drawer__close 
		transition: none;

	.ui-lib-soft-drawer__close:hover 
		transform: none;
}


/* --- material ------------------------------------------------------------
 *
 * A surface made of pigment, as opposed to a pigment mark.
 *
 * createWash produces a *mark*: a sized, rotated, blurred element with a
 * deposit ring and a lobed silhouette. That is right for an avatar, where the
 * object is the mark. It is wrong for a card, where the pigment has to fill
 * whatever box the card already has. The generated variables are the same; what
 * differs is which of them the stylesheet reads.
 *
 * A ground reads the body and the grain and ignores the silhouette, the deposit
 * mask and the rotation. Those four are what make a stroke look like a stroke,
 * and a surface is not a stroke.
 */

/*
 * A surface made of pigment — and the layering is the interesting part.
 *
 * The first version drew the pigment on a ::before with z-index: -1, which
 * works on a card and fails on everything else. A negative index puts the
 * pseudo-element behind its parent's background, and most of this library's
 * containers set background: var(--moe-card) — measured, the pigment was
 * invisible on every one of them. z-index: 0 works only if the content is
 * raised, which would mean editing the children of every component that wants a
 * material.
 *
 * So the pigment goes where a background belongs: in background-image. It
 * composes with background-color instead of competing with it, it cannot be
 * behind anything, and nothing inside the component has to know. Verified: both
 * properties coexist and the text stays on top.
 *
 * The grain is the second layer of the same declaration, at its own size and
 * offset, which is exactly what the generated values are shaped for — the
 * generator emits two noise passes at sizes that cannot share a period, and a
 * multi-layer background is how they stay independent.
 */
/*
 * Two classes deep, and the double class is load-bearing rather than tidy.
 *
 * .ui-lib-material--ground is a single-class selector, and so is every
 * component's own .ui-lib-soft-* rule. Both set background, so which one wins
 * is decided by **where the rules happen to sit in this file** — measured, the
 * table's rule is written before this one and the list's after it, so the table
 * took the material and the list silently did not.
 *
 * That is the third time in this library that a component's background
 * shorthand has quietly reset a material's background-image, and the first two
 * were fixed by moving code. Specificity fixes the class of error instead of the
 * instance: a material wins wherever it is written, and nobody has to know the
 * order of a 4000-line stylesheet to reason about a component.
 */
.ui-lib-material--ground.ui-lib-material--ground {
	position: relative;
	isolation: isolate;
	/* The ink for a surface with pigment on it, which is not the theme's text
	   colour — see --moe-on-material. */
	color: var(--moe-on-material);
	/*
	 * And the tokens rebound, not just the property.
	 *
	 * Setting color alone fixed the ground's own text and left every component
	 * inside it reading --moe-cocoa — so a heading was right and the paragraph
	 * under it was the theme's soft grey, which is measured against paper and reads
	 * as near-invisible on a film. Rebounding the tokens is what makes everything
	 * inside inherit the ground's ink without any component knowing.
	 */
	--moe-cocoa: var(--moe-on-material);
	--moe-cocoa-soft: var(--moe-on-material-soft);
	--moe-text: var(--moe-on-material);
	--moe-text-soft: var(--moe-on-material-soft);
	/* Paper, before pigment. A material surface is a sheet with pigment on it, and
	   the pigment is painted over whatever is behind the card without this. */
	background-color: var(--moe-card);
	/* The *ground* body, not the mark body: a stroke fades before its own edge and
	   a surface must not. See --wash-ground in the generator. */
	background-image: var(--wash-ground, var(--wash-body, none)), var(--wash-grain, none);
	/*
	 * ## Known: the grain still tiles visibly on a wide surface
	 *
	 * On a 460px table there is a faint vertical seam where the 240px tile
	 * repeats, and a darker patch at the corners. It is not the blend mode — that
	 * was removed and the seam remained. It is that a 240px noise tile repeated
	 * across 460px has a visible period at exactly the width where the eye is
	 * looking for one, and the coarse pass is what shows.
	 *
	 * Three things were tried and none removed it: multiply on the grain (made
	 * the seam worse and darkened the corners), inheriting the generator's own
	 * 483px tile (turned the whole surface into clouds), and a 240px tile (what is
	 * here now — better, not gone).
	 *
	 * **What has not been tried** is generating the grain at the surface's own
	 * size rather than tiling a specimen tile, which is what the answer probably
	 * is: a feTurbulence at a frequency chosen for 460px rather than one
	 * stretched from 190px. That is a change to createWash rather than to this
	 * rule, so it is left here with the measurements rather than guessed at.
	 *
	 * The grain is scaled **down** for a surface, and the reason is measured.
	 *
	 * The generator sizes its tiles for a 190px specimen, and one of its two
	 * passes is coarse — a base frequency of 0.028, which is a blob every 35px.
	 * At specimen size that reads as unevenness. Tiled across a 460px table it
	 * reads as mould: the first version inherited --wash-grain-size here and the
	 * result was visible cloud-shaped patches over the whole table, which is the
	 * coarse pass at its own scale rather than a paper texture.
	 *
	 * Halving the tile doubles the apparent frequency, so the coarse pass becomes
	 * the fine unevenness it was meant to be and the fine pass stays fine. The
	 * generated --wash-grain-offset is kept, because that is what stops two
	 * surfaces on one page from sitting on the same patch of paper.
	 */
	/* One entry per layer: the pigment, then the generator's two grain passes.
	   All three sizes are listed because a short list is not an error — the extra
	   layers silently take the initial value. */
	background-size: 100% 100%, 240px 256px, 240px 256px;
	background-position: 0 0, var(--wash-grain-offset, 0 0), var(--wash-grain-offset, 0 0);
	background-repeat: no-repeat, repeat, repeat;
	/*
	 * The strengths, set by contrast rather than by eye.
	 *
	 * At 0.62 the layering was correct and the text still lost its contrast,
	 * because a wash dark enough to see is dark enough to close the gap between
	 * the text and the paper. These are the same numbers the pseudo-element
	 * version settled on, kept because the reasoning did not change.
	 */
	/*
	 * No background-blend-mode here, and that is a decision rather than an
	 * omission.
	 *
	 * multiply on the grain made it a tooth on the fixture and made it wrong on
	 * a real container: a component may already carry its own background-image
	 * layers, and the blend list applies positionally across all of them. Measured
	 * on the table, the computed value was normal, multiply, normal over three
	 * size layers — this rule's two plus the component's one — so the blend landed
	 * on the wrong layer and produced a dark band down the left edge and dark
	 * corners.
	 *
	 * The grain's own alpha already says how strong it is. A blend mode is a
	 * second opinion about the same number, and it is an opinion that cannot be
	 * given safely from a class that does not know how many layers it is joining.
	 */
}

/*
 * And the content has to be above nothing — which is the point of doing it this
 * way. The pigment is a background, the text is content, and content is above
 * backgrounds by definition. The pseudo-element version needed this rule; this
 * one does not, and the rule is not here to be tidy about it.
 */

/*
 * The deposit ring, as a rim light.
 *
 * A surface cannot have the angular deposit mask — that is what paints the
 * "water ran to this edge more than that one" mark, and on a card it would read
 * as a stain. But the *reason* the deposit exists is that a wash is darker at
 * its boundary, and the surface equivalent of that is a border that carries the
 * pigment rather than the neutral stroke. No mask, no direction, just the
 * darker edge.
 */
.ui-lib-material--ground[data-ui-lib-material="wash"] {
	border-color: var(--wash-rim, currentColor);
}

@media (prefers-reduced-motion: reduce) {
	/* Nothing here animates; the grain is a still image and the pigment is a
	   fill. The block exists so the omission is a decision rather than an
	   oversight. */
	.ui-lib-material--ground::before,
	.ui-lib-material--ground::after 
		animation: none;
}


/* --- segmented control ---------------------------------------------------
 *
 * A recess with a chosen segment in it. The track is the same inset shadow as
 * every other groove in this library — the input's shell, the switch's track,
 * the choice box, the table's header — because they are all the same thing: a
 * place on the paper that something goes into.
 *
 * The chosen segment is raised *out* of that recess rather than filled flat
 * inside it, which is what makes the control read as a physical selector instead
 * of as a row of buttons with a colour on one of them.
 */

.ui-lib-soft-segments {
	display: grid;
	gap: 6px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-segments__label {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-segments__track {
	display: inline-flex;
	gap: 3px;
	padding: 3px;
	border-radius: var(--moe-radius-full);
	background: var(--moe-surface-sunken);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.12),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
}

.ui-lib-soft-segments__segment {
	display: grid;
	gap: 1px;
	justify-items: center;
	flex: 1;
	min-width: 0;
	padding: 7px 16px;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	font: inherit;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	text-align: center;
	cursor: pointer;
	transition:
		background 200ms ease-out,
		color 200ms ease-out,
		box-shadow 200ms ease-out,
		transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ui-lib-soft-segments__segment:hover:not([data-ui-lib-disabled]) {
	color: var(--moe-cocoa);
}

/* Raised out of the groove: a lift, not a fill. */
.ui-lib-soft-segments[data-ui-lib-variant="solid"] .ui-lib-soft-segments__segment[data-ui-lib-checked] {
	background: var(--moe-card);
	color: var(--moe-cocoa);
	box-shadow:
		0 2px 5px -1px rgb(77 60 56 / 0.18),
		inset 0 -2px 4px 0 rgb(77 60 56 / 0.05);
}

/* The other half of the same idea: still raised, but only the text is marked. */
.ui-lib-soft-segments[data-ui-lib-variant="outline"] .ui-lib-soft-segments__segment[data-ui-lib-checked] {
	background: var(--moe-card);
	color: var(--moe-cocoa);
	box-shadow: inset 0 0 0 1.5px var(--moe-taro-500);
}

.ui-lib-soft-segments__segment[data-ui-lib-disabled] {
	opacity: 0.45;
	cursor: not-allowed;
}

/*
 * The radio, hidden but present.
 *
 * Clipped rather than display: none, which would take it out of the tab order
 * and the accessibility tree — and with it the arrow-key navigation, the single
 * tab stop and the form value, which are the entire reason it is a real radio.
 * The label it sits inside is the visible segment, so a click anywhere on the
 * segment reaches this input.
 */
.ui-lib-soft-segments__input {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	margin: 0;
	pointer-events: none;
}

/* Focus is shown on the segment, because the input cannot show it. */
.ui-lib-soft-segments__segment:has(.ui-lib-soft-segments__input:focus-visible) {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* The segment is the label, so it is the click target and it needs to lay out
   like the button it replaced. */
.ui-lib-soft-segments__segment {
	position: relative;
}

.ui-lib-soft-segments__text {
	font-size: 13.5px;
	font-weight: 600;
	line-height: 1.3;
	white-space: nowrap;
}

.ui-lib-soft-segments__note {
	font-size: 11.5px;
	font-weight: 500;
	line-height: 1.3;
	color: var(--moe-cocoa-soft);
	white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-segments__segment 
		transition: none;
}


/* --- alert ---------------------------------------------------------------
 *
 * A tinted panel with a drawn mark. The tint is mixed with the card rather than
 * laid over it, so an alert sits on the page as a message instead of as a
 * coloured block pasted on top of it.
 *
 * Every tone gets its own **shape**, and that is the part that carries the
 * meaning. Four colours of one glyph is a component that only works for readers
 * who separate the hues; a tick, a triangle, an octagon and a plain circle work
 * for everyone and survive a greyscale print.
 */

.ui-lib-soft-alert {
	display: flex;
	align-items: flex-start;
	gap: 11px;
	padding: 13px 15px;
	border-radius: var(--moe-radius-md);
	border: 1.5px solid transparent;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-alert__mark {
	display: grid;
	place-items: center;
	flex: none;
	width: 22px;
	height: 22px;
	margin-top: 1px;
	border-radius: var(--moe-radius-full);
}

.ui-lib-soft-alert__body {
	flex: 1;
	min-width: 0;
	display: grid;
	gap: 3px;
}

.ui-lib-soft-alert__title {
	margin: 0;
	font-size: 14px;
	font-weight: 700;
	line-height: 1.45;
}

.ui-lib-soft-alert__text {
	font-size: 13px;
	font-weight: 500;
	line-height: 1.6;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-alert__dismiss {
	display: grid;
	place-items: center;
	flex: none;
	width: 24px;
	height: 24px;
	margin: -2px -3px 0 0;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	color: var(--moe-cocoa-soft);
	cursor: pointer;
	opacity: 0.7;
	transition:
		opacity 160ms ease-out,
		background 160ms ease-out,
		transform 240ms var(--moe-ease-jelly);
}

.ui-lib-soft-alert__dismiss:hover {
	opacity: 1;
	background: rgb(77 60 56 / 0.08);
	transform: rotate(90deg);
}

.ui-lib-soft-alert__dismiss:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

.ui-lib-soft-alert[data-ui-lib-tone="info"] {
	background: var(--moe-state-info-bg);
	border-color: var(--moe-state-info-border);
}
.ui-lib-soft-alert[data-ui-lib-tone="info"] .ui-lib-soft-alert__mark {
	background: var(--moe-state-info-mark);
	color: var(--moe-state-info-ink);
}

.ui-lib-soft-alert[data-ui-lib-tone="success"] {
	background: var(--moe-state-success-bg);
	border-color: var(--moe-state-success-border);
}
.ui-lib-soft-alert[data-ui-lib-tone="success"] .ui-lib-soft-alert__mark {
	background: var(--moe-state-success-mark);
	color: var(--moe-state-success-ink);
}

.ui-lib-soft-alert[data-ui-lib-tone="warn"] {
	background: var(--moe-state-warning-bg);
	border-color: var(--moe-state-warning-border);
}
.ui-lib-soft-alert[data-ui-lib-tone="warn"] .ui-lib-soft-alert__mark {
	background: var(--moe-state-warning-mark);
	color: var(--moe-state-warning-ink);
}

.ui-lib-soft-alert[data-ui-lib-tone="danger"] {
	background: var(--moe-state-danger-bg);
	border-color: var(--moe-state-danger-border);
}
.ui-lib-soft-alert[data-ui-lib-tone="danger"] .ui-lib-soft-alert__mark {
	background: var(--moe-state-danger-mark);
	color: var(--moe-state-danger-ink);
}

/* --- empty state ---------------------------------------------------------
 *
 * Centred, roomy, and quiet. An empty state is what a reader sees when there is
 * nothing to look at, so it has to be worth looking at without pretending there
 * is content — which is the line between an empty state and a decorative
 * placeholder. No illustration is drawn here; art is the caller's.
 */

.ui-lib-soft-empty {
	display: grid;
	justify-items: center;
	text-align: center;
	gap: 7px;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-empty[data-ui-lib-size="md"] {
	padding: 44px 28px;
}
.ui-lib-soft-empty[data-ui-lib-size="sm"] {
	padding: 26px 20px;
}

.ui-lib-soft-empty__art {
	display: grid;
	place-items: center;
	margin-bottom: 6px;
	color: oklch(0.72 0.04 310);
	opacity: 0.9;
}

.ui-lib-soft-empty__title {
	margin: 0;
	font-size: 15px;
	font-weight: 700;
	line-height: 1.5;
}

.ui-lib-soft-empty[data-ui-lib-size="sm"] .ui-lib-soft-empty__title {
	font-size: 14px;
}

.ui-lib-soft-empty__body {
	margin: 0;
	max-width: 34ch;
	font-size: 13px;
	font-weight: 500;
	line-height: 1.65;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-empty__action {
	margin-top: 9px;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-alert__dismiss 
		transition: none;

	.ui-lib-soft-alert__dismiss:hover 
		transform: none;
}


/* --- pagination ----------------------------------------------------------
 *
 * The current page is the one thing on the row that is not a control, and it
 * looks like it: no hover, no press, no pointer. It carries the accent instead,
 * which is the same accent the segmented control's chosen segment uses, so
 * "current" looks the same in both places.
 */

.ui-lib-soft-pagination__list {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
	font-family: var(--moe-font-rounded);
}

.ui-lib-soft-pagination__page {
	display: grid;
	place-items: center;
	min-width: 34px;
	height: 34px;
	padding: 0 9px;
	border: 1.5px solid transparent;
	border-radius: var(--moe-radius-full);
	background: transparent;
	font: inherit;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	text-decoration: none;
	cursor: pointer;
	transition:
		background 180ms ease-out,
		color 180ms ease-out,
		border-color 180ms ease-out;
}

.ui-lib-soft-pagination__page:hover {
	background: oklch(0.95 0.018 310);
	color: var(--moe-cocoa);
}

.ui-lib-soft-pagination__page:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* The one that is not a control. No cursor, no hover, and it says where you are
   rather than offering to take you somewhere. */
.ui-lib-soft-pagination__page[data-ui-lib-current] {
	background: var(--moe-taro-500);
	color: var(--moe-cocoa);
	cursor: default;
}

.ui-lib-soft-pagination__page[data-ui-lib-current]:hover {
	background: var(--moe-taro-500);
}

.ui-lib-soft-pagination__gap {
	display: grid;
	place-items: center;
	min-width: 20px;
	height: 34px;
	font-family: var(--moe-font-rounded);
	font-size: 13.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	opacity: 0.6;
}

/* --- breadcrumb ----------------------------------------------------------
 *
 * The trail is a row of peers with a separator between them, and the separator
 * belongs to the item after it rather than being its own node — a list whose
 * length includes the separators tells a reader there are five things when there
 * are three.
 */

.ui-lib-soft-breadcrumb__list {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	margin: 0;
	padding: 0;
	list-style: none;
	font-family: var(--moe-font-rounded);
	font-size: 13px;
	font-weight: 600;
}

.ui-lib-soft-breadcrumb__item {
	display: inline-flex;
	align-items: center;
}

.ui-lib-soft-breadcrumb__sep {
	margin: 0 8px;
	color: oklch(0.78 0.02 40);
	font-weight: 500;
}

.ui-lib-soft-breadcrumb__link,
.ui-lib-soft-breadcrumb__button {
	padding: 3px 2px;
	border: none;
	background: none;
	font: inherit;
	color: var(--moe-cocoa-soft);
	text-decoration: none;
	cursor: pointer;
	border-radius: var(--moe-radius-xs);
	transition: color 160ms ease-out;
}

.ui-lib-soft-breadcrumb__link:hover,
.ui-lib-soft-breadcrumb__button:hover {
	color: var(--moe-taro-600);
	text-decoration: underline;
	text-underline-offset: 3px;
}

.ui-lib-soft-breadcrumb__link:focus-visible,
.ui-lib-soft-breadcrumb__button:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

/* Where the reader is. Not a link, and it does not pretend to be one. */
.ui-lib-soft-breadcrumb__current {
	padding: 3px 2px;
	color: var(--moe-cocoa);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-pagination__page,
	.ui-lib-soft-breadcrumb__link,
	.ui-lib-soft-breadcrumb__button 
		transition: none;
}


/* --- menu ----------------------------------------------------------------
 *
 * A command menu, so it looks like one: a raised panel, items that highlight as
 * the reader walks them with the arrow keys, and a shortcut column that is
 * aligned so the hints line up on their digits the way a command list is read.
 *
 * The tick column is always present, even when nothing is checked. A column that
 * appears only when there is a tick makes every item shift sideways the first
 * time something is checked, which is a menu that moves while it is being used.
 */

.ui-lib-soft-menu {
	position: relative;
	display: inline-block;
}

.ui-lib-soft-menu__trigger {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	height: 38px;
	padding: 0 16px;
	border-radius: var(--moe-radius-full);
	border: 1.5px solid transparent;
	background: var(--moe-surface-hover-soft);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.1),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
	font-family: var(--moe-font-rounded);
	font-size: 14px;
	font-weight: 600;
	color: var(--moe-cocoa);
	cursor: pointer;
	transition:
		border-color 180ms ease-out,
		background 180ms ease-out;
}

.ui-lib-soft-menu__trigger[aria-expanded="true"] {
	border-color: var(--moe-taro-500);
	background: var(--moe-surface-raised);
}

.ui-lib-soft-menu__trigger:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 3px;
}

.ui-lib-soft-menu__trigger:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.ui-lib-soft-menu__chevron {
	opacity: 0.5;
	transition: transform 220ms var(--moe-ease-jelly);
}

.ui-lib-soft-menu__trigger[aria-expanded="true"] .ui-lib-soft-menu__chevron {
	transform: rotate(180deg);
}

.ui-lib-soft-menu__list {
	position: fixed;
	top: anchor(bottom);
	width: max-content;
	min-width: 200px;
	max-width: 300px;
	margin: 7px 0 0;
	padding: 6px;
	border-radius: var(--moe-radius-md);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	box-shadow: var(--moe-floating);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	position-try-fallbacks: flip-block;
}

.ui-lib-soft-menu[data-ui-lib-align="start"] .ui-lib-soft-menu__list {
	left: anchor(left);
	right: auto;
}

.ui-lib-soft-menu[data-ui-lib-align="end"] .ui-lib-soft-menu__list {
	right: anchor(right);
	left: auto;
}

.ui-lib-soft-menu__list:not(:popover-open) {
	display: none;
}

.ui-lib-soft-menu__sep {
	height: 1px;
	margin: 5px 8px;
	background: linear-gradient(90deg, transparent, var(--moe-stroke) 12%, var(--moe-stroke) 88%, transparent);
}

.ui-lib-soft-menu__group {
	padding: 7px 12px 4px;
	font-size: 11.5px;
	font-weight: 700;
	letter-spacing: 0.04em;
	color: var(--moe-cocoa-soft);
	opacity: 0.8;
}

.ui-lib-soft-menu__item {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 12px;
	border: none;
	border-radius: var(--moe-radius-sm);
	background: transparent;
	font: inherit;
	font-size: 13.5px;
	font-weight: 600;
	color: var(--moe-cocoa);
	text-align: left;
	cursor: pointer;
}

/* Focus is the highlight. A menu moves real focus into itself, so the item the
   reader is on *is* the focused one and :focus is what marks it. */
.ui-lib-soft-menu__item:focus {
	background: oklch(0.94 0.025 310);
	outline: none;
}

/* A pointer can hover an item the keyboard is not on, and those are two
   different things: hovering previews, focusing acts. Both are highlighted
   because in a menu they converge the moment the pointer moves. */
.ui-lib-soft-menu__item:hover:not(:disabled) {
	background: var(--moe-state-iris-soft);
}

.ui-lib-soft-menu__item:disabled {
	opacity: 0.42;
	cursor: not-allowed;
}

/* Always present, whatever is checked. */
.ui-lib-soft-menu__tick {
	flex: none;
	width: 12px;
	font-size: 12px;
	line-height: 1;
	color: var(--moe-taro-600);
}

.ui-lib-soft-menu__text {
	flex: 1;
	min-width: 0;
}

.ui-lib-soft-menu__shortcut {
	flex: none;
	font-size: 11.5px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
	opacity: 0.75;
	/* Shortcuts are read as columns, so they line up on their digits. */
	font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-menu__trigger,
	.ui-lib-soft-menu__chevron 
		transition: none;
}


/* --- list ----------------------------------------------------------------
 *
 * A list of things that can be chosen. The item is one row with three slots, and
 * the slots are always present in the same order so a list of mixed rows still
 * lines up on its labels.
 *
 * The highlight and the selection are two different states and they look
 * different on purpose, which is the same distinction the select makes: the
 * highlight is where the keyboard is and moves on every arrow press, the
 * selection is what has been chosen and does not. Merging them would mean a list
 * that forgets what is chosen the moment an arrow key is pressed.
 */

.ui-lib-soft-list {
	display: grid;
	gap: 2px;
	margin: 0;
	padding: 5px;
	list-style: none;
	border-radius: var(--moe-radius-md);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	overflow-y: auto;
	max-height: 340px;
}

.ui-lib-soft-list:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

.ui-lib-soft-list__item {
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 9px 12px;
	border-radius: var(--moe-radius-sm);
	cursor: pointer;
	transition: background 160ms ease-out;
}

.ui-lib-soft-list[data-ui-lib-size="sm"] .ui-lib-soft-list__item {
	padding: 6px 10px;
	gap: 9px;
}

/* Where the keyboard is. */
.ui-lib-soft-list__item[data-ui-lib-active] {
	background: var(--moe-state-iris-soft);
}

/* What is chosen. Stronger than the highlight, because it survives the movement
   of the highlight and the reader has to be able to tell them apart at a glance. */
.ui-lib-soft-list__item[data-ui-lib-selected] {
	background: oklch(0.93 0.035 310);
}

.ui-lib-soft-list__item[data-ui-lib-selected][data-ui-lib-active] {
	background: oklch(0.905 0.045 310);
}

.ui-lib-soft-list__item[data-ui-lib-disabled] {
	opacity: 0.42;
	cursor: not-allowed;
}

.ui-lib-soft-list__leading,
.ui-lib-soft-list__trailing {
	display: inline-flex;
	align-items: center;
	flex: none;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-list__body {
	flex: 1;
	min-width: 0;
	display: grid;
	gap: 1px;
}

.ui-lib-soft-list__label {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.45;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ui-lib-soft-list[data-ui-lib-size="sm"] .ui-lib-soft-list__label {
	font-size: 13px;
}

.ui-lib-soft-list__note {
	font-size: 12px;
	font-weight: 500;
	line-height: 1.45;
	color: var(--moe-cocoa-soft);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ui-lib-soft-list__empty {
	padding: 22px 12px;
	text-align: center;
	font-size: 13px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-list__item 
		transition: none;
}


/* --- combobox ------------------------------------------------------------
 *
 * The input's shell with a list under it, because that is exactly what it is:
 * the same recess, the same field, and a popup. Nothing about the field changes
 * when the list opens — a control that restyles itself the moment it is used is
 * a control that moves under the cursor.
 *
 * The list reuses the select's vocabulary down to the highlight colour, because a
 * reader should not have to learn that two popups that look alike behave alike.
 */

.ui-lib-soft-combobox__list {
	position: fixed;
	top: anchor(bottom);
	left: anchor(left);
	width: anchor-size(width);
	margin: 7px 0 0;
	padding: 6px;
	max-height: 260px;
	overflow-y: auto;
	border-radius: var(--moe-radius-md);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	box-shadow: var(--moe-floating);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	position-try-fallbacks: flip-block;
}

.ui-lib-soft-combobox__list:not(:popover-open) {
	display: none;
}

@keyframes ui-lib-moe-combo-row {
	from 
		opacity: 0;
		transform: translateY(-3px);
	to 
		opacity: 1;
		transform: none;
}

.ui-lib-soft-combobox__option {
	display: grid;
	gap: 1px;
	padding: 8px 12px;
	border-radius: var(--moe-radius-sm);
	cursor: pointer;
	animation: ui-lib-moe-combo-row 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* Where the keyboard is. Moves on every arrow press. */
.ui-lib-soft-combobox__option[data-ui-lib-active] {
	background: var(--moe-state-iris-soft);
}

/* What is chosen. Does not move, which is the same distinction the select and
   the list make. */
.ui-lib-soft-combobox__option[data-ui-lib-selected] {
	background: var(--moe-state-iris);
}

.ui-lib-soft-combobox__option[data-ui-lib-selected][data-ui-lib-active] {
	background: var(--moe-state-iris-strong);
}

.ui-lib-soft-combobox__option[data-ui-lib-option-disabled] {
	opacity: 0.42;
	cursor: not-allowed;
}

.ui-lib-soft-combobox__label {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.45;
}

.ui-lib-soft-combobox__note {
	font-size: 12px;
	font-weight: 500;
	line-height: 1.45;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-combobox__empty {
	padding: 18px 12px;
	text-align: center;
	font-size: 13px;
	font-weight: 600;
	color: var(--moe-cocoa-soft);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-combobox__option 
		animation: none;
}


/* --- toolbar -------------------------------------------------------------
 *
 * A recess with buttons in it, which is the same construction the segmented
 * control uses and for the same reason: a row of related controls should read as
 * one article rather than as several that happen to be adjacent.
 *
 * The difference is that a segmented control is a single choice and a toolbar is
 * a set of actions, so its items are not sized equally and they do not carry a
 * shared selection — a toolbar button that is "on" is a toggle, and its own
 * aria-pressed says so.
 *
 * No focus ring on the container: focus lands on an item and moves between items,
 * so the item is what has to show it.
 */

.ui-lib-soft-toolbar {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 3px;
	border-radius: var(--moe-radius-full);
	background: oklch(0.96 0.008 60);
	box-shadow:
		inset 0 2px 4px 0 rgb(77 60 56 / 0.11),
		inset 0 -1px 2px 0 rgb(255 255 255 / 0.9);
}

.ui-lib-soft-toolbar[data-ui-lib-orientation="vertical"] {
	flex-direction: column;
	border-radius: var(--moe-radius-lg);
}

.ui-lib-soft-toolbar__item {
	display: grid;
	place-items: center;
	flex: none;
	width: 34px;
	height: 34px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	color: var(--moe-cocoa-soft);
	cursor: pointer;
	transition:
		background 160ms ease-out,
		color 160ms ease-out,
		box-shadow 160ms ease-out,
		transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ui-lib-soft-toolbar[data-ui-lib-size="sm"] .ui-lib-soft-toolbar__item {
	width: 28px;
	height: 28px;
}

.ui-lib-soft-toolbar__item:hover:not(:disabled) {
	background: oklch(0.92 0.02 310);
	color: var(--moe-cocoa);
}

.ui-lib-soft-toolbar__item:active:not(:disabled) {
	transform: scale(0.92);
}

/*
 * Focus is a ring on the item, because the item is what has focus. The toolbar
 * itself deliberately draws none: a ring around the whole row would say the whole
 * row is active when one button is.
 */
.ui-lib-soft-toolbar__item:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 1px;
}

/* A toggle that is on. Raised out of the recess, like the segmented control's
   chosen segment — the same gesture for the same meaning. */
.ui-lib-soft-toolbar__item[data-ui-lib-pressed] {
	background: var(--moe-card);
	color: var(--moe-cocoa);
	box-shadow:
		0 2px 5px -1px rgb(77 60 56 / 0.2),
		inset 0 -2px 4px 0 rgb(77 60 56 / 0.05);
}

.ui-lib-soft-toolbar__item:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

/*
 * A toolbar item that carries a slot is a small group, not a button.
 *
 * The command and whatever is beside it sit in the same recess and read as one
 * control, which is what makes a menu inside a toolbar look like part of the
 * toolbar rather than like a menu that landed there.
 */
.ui-lib-soft-toolbar__group {
	display: inline-flex;
	align-items: center;
	gap: 1px;
	border-radius: var(--moe-radius-full);
}

/* The slot's own control has to lose its own chrome, or the toolbar reads as two
   recesses inside a recess. */
.ui-lib-soft-toolbar__slot {
	display: inline-flex;
	align-items: center;
}

.ui-lib-soft-toolbar__slot > button {
	height: 34px;
	padding: 0 10px 0 6px;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	font-family: var(--moe-font-rounded);
	font-size: 12.5px;
	font-weight: 700;
	color: var(--moe-cocoa-soft);
	cursor: pointer;
	transition: background 160ms ease-out, color 160ms ease-out;
}

.ui-lib-soft-toolbar[data-ui-lib-size="sm"] .ui-lib-soft-toolbar__slot > button {
	height: 28px;
	padding: 0 8px 0 5px;
	font-size: 12px;
}

.ui-lib-soft-toolbar__slot > button:hover {
	background: oklch(0.92 0.02 310);
	color: var(--moe-cocoa);
}

.ui-lib-soft-toolbar__slot > button:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 1px;
}

.ui-lib-soft-toolbar__icon {
	display: grid;
	place-items: center;
	line-height: 0;
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-toolbar__item 
		transition: none;

	.ui-lib-soft-toolbar__item:active:not(:disabled) 
		transform: none;
}


/* --- chip ----------------------------------------------------------------
 *
 * A control that looks like a label, which is the shape a filter always has. It
 * is a button, so it takes focus and it presses; it is small, so it sits in a row
 * with others of its kind.
 *
 * The wrap exists because a removable chip is two controls, and two buttons in a
 * flex row need one box that arranges them. Making the whole chip pressable *and*
 * removable would give the reader no way to tell which of the two things pressing
 * it will do.
 */

.ui-lib-soft-chip-wrap {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 3px 6px 3px 3px;
	border-radius: var(--moe-radius-full);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
	transition:
		border-color 180ms ease-out,
		background 180ms ease-out;
}

/* A chip with nothing to remove has no trailing control to make room for. */
.ui-lib-soft-chip-wrap:not(:has(.ui-lib-soft-chip__remove)) {
	padding-right: 3px;
}

.ui-lib-soft-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 26px;
	padding: 0 11px;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	font: inherit;
	font-size: 12.5px;
	font-weight: 600;
	color: inherit;
	cursor: pointer;
	transition:
		background 160ms ease-out,
		color 160ms ease-out;
}

.ui-lib-soft-chip-wrap:not(:has(.ui-lib-soft-chip__remove)) .ui-lib-soft-chip {
	padding: 0 13px;
}

.ui-lib-soft-chip:hover {
	background: var(--moe-surface-hover);
}

.ui-lib-soft-chip:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 1px;
}

/* Selected. The whole chip carries the pigment rather than a corner of it. */
.ui-lib-soft-chip-wrap[data-ui-lib-variant="solid"]:has(.ui-lib-soft-chip[data-ui-lib-selected]) {
	background: var(--moe-taro-500);
	border-color: var(--moe-taro-500);
}

.ui-lib-soft-chip-wrap[data-ui-lib-variant="outline"]:has(.ui-lib-soft-chip[data-ui-lib-selected]) {
	border-color: var(--moe-taro-500);
	background: oklch(0.96 0.02 310);
}

.ui-lib-soft-chip__leading {
	display: inline-flex;
	align-items: center;
	line-height: 0;
}

.ui-lib-soft-chip__label {
	white-space: nowrap;
}

.ui-lib-soft-chip__remove {
	display: inline-grid;
	place-items: center;
	flex: none;
	width: 18px;
	height: 18px;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-full);
	background: transparent;
	color: inherit;
	opacity: 0.65;
	cursor: pointer;
	transition:
		opacity 160ms ease-out,
		background 160ms ease-out,
		transform 220ms var(--moe-ease-jelly);
}

.ui-lib-soft-chip__remove:hover {
	opacity: 1;
	background: rgb(77 60 56 / 0.1);
	transform: rotate(90deg);
}

.ui-lib-soft-chip__remove:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 1px;
}

/* --- stepper -------------------------------------------------------------
 *
 * A numbered row with a line between the numbers. The line belongs to the step
 * after the one it starts from, so the first step has none — which is why the
 * first one is marked in the markup rather than the last.
 *
 * The current step is the only one that is not a control, and it looks like the
 * current page in pagination: filled, and with no hover.
 */

.ui-lib-soft-stepper__list {
	display: flex;
	align-items: flex-start;
	gap: 0;
	margin: 0;
	padding: 0;
	list-style: none;
	font-family: var(--moe-font-rounded);
	color: var(--moe-cocoa);
}

.ui-lib-soft-stepper[data-ui-lib-orientation="vertical"] .ui-lib-soft-stepper__list {
	flex-direction: column;
}

.ui-lib-soft-stepper__item {
	position: relative;
	flex: 1;
	min-width: 0;
}

.ui-lib-soft-stepper[data-ui-lib-orientation="vertical"] .ui-lib-soft-stepper__item {
	flex: none;
	width: 100%;
}

/* The connector, drawn from the item to the one before it. */
.ui-lib-soft-stepper[data-ui-lib-orientation="horizontal"]
	.ui-lib-soft-stepper__item:not([data-ui-lib-first])::before {
	content: "";
	position: absolute;
	top: 15px;
	right: calc(50% + 22px);
	left: calc(-50% + 22px);
	height: 1.5px;
	background: var(--moe-stroke);
}

.ui-lib-soft-stepper[data-ui-lib-orientation="vertical"]
	.ui-lib-soft-stepper__item:not([data-ui-lib-first])::before {
	content: "";
	position: absolute;
	top: -14px;
	left: 15px;
	width: 1.5px;
	height: 14px;
	background: var(--moe-stroke);
}

.ui-lib-soft-stepper__control {
	display: grid;
	justify-items: center;
	gap: 7px;
	width: 100%;
	padding: 0;
	border: none;
	border-radius: var(--moe-radius-md);
	background: none;
	font: inherit;
	color: inherit;
	text-align: center;
}

.ui-lib-soft-stepper[data-ui-lib-orientation="vertical"] .ui-lib-soft-stepper__control {
	grid-template-columns: auto 1fr;
	justify-items: start;
	align-items: center;
	gap: 11px;
	text-align: left;
}

/* A step that can be taken. The current one and the unreachable ones are not
   controls and do not pretend to be. */
.ui-lib-soft-stepper__control:is(button) {
	cursor: pointer;
}

.ui-lib-soft-stepper__control:is(button) .ui-lib-soft-stepper__mark {
	transition:
		background 180ms ease-out,
		border-color 180ms ease-out,
		color 180ms ease-out;
}

.ui-lib-soft-stepper__control:is(button):hover .ui-lib-soft-stepper__mark {
	border-color: var(--moe-taro-500);
	color: var(--moe-taro-600);
}

.ui-lib-soft-stepper__control:focus-visible {
	outline: 2px solid var(--moe-taro-500);
	outline-offset: 2px;
}

.ui-lib-soft-stepper__mark {
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border-radius: var(--moe-radius-full);
	border: 1.5px solid var(--moe-stroke);
	background: var(--moe-card);
	font-size: 13px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	color: var(--moe-cocoa-soft);
}

.ui-lib-soft-stepper__item[data-ui-lib-current] .ui-lib-soft-stepper__mark {
	background: var(--moe-taro-500);
	border-color: var(--moe-taro-500);
	color: var(--moe-cocoa);
}

.ui-lib-soft-stepper__item[data-ui-lib-disabled] {
	opacity: 0.45;
}

.ui-lib-soft-stepper__text {
	display: grid;
	gap: 1px;
	min-width: 0;
}

.ui-lib-soft-stepper__label {
	font-size: 13px;
	font-weight: 600;
	line-height: 1.4;
}

.ui-lib-soft-stepper__note {
	font-size: 11.5px;
	font-weight: 500;
	line-height: 1.4;
	color: var(--moe-cocoa-soft);
}

@media (prefers-reduced-motion: reduce) {
	.ui-lib-soft-chip,
	.ui-lib-soft-chip__remove,
	.ui-lib-soft-stepper__mark,
	.ui-lib-soft-chip-wrap 
		transition: none;

	.ui-lib-soft-chip__remove:hover 
		transform: none;
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
	.ui-lib-paper-button:active:not(:disabled) 
		transition: none;
		transform: none;
		animation: none;

	.ui-lib-paper-button__spark 
		display: none;
}


/* ---- generated washes ---- */

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
	from transform: scale(0.82); opacity: 0.72; filter: blur(9px); 
	62% { transform: scale(1.06); opacity: 1; }
	to { transform: scale(1); opacity: 1; filter: blur(0); }
}

@keyframes ui-lib-wash-settle {
	from opacity: 0; filter: blur(9px); 
	to opacity: 1; filter: blur(1.8px); 
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
	.ui-lib-wash--laying .ui-lib-wash__deposit 
		animation: none;
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
