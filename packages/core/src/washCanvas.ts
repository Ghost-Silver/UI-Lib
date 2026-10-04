import { createWash, type WashOptions } from "./wash.js";

/**
 * Painting a wash onto a canvas, so that a renderer can sample it.
 *
 * The DOM wash and this one are the same wash. Same generator, same twelve
 * values, same five arc strengths and same noise frequencies — what differs is
 * who consumes them. The stylesheet maps them to a radial gradient, a masked
 * conic and an SVG background; this maps them to the 2D context.
 *
 * ## Why this exists
 *
 * The refraction in this library samples an offscreen target that only its own
 * canvas draws into, and DOM is layered above that canvas. So a wash written in
 * CSS is, to the glass, not there at all — it is on the wrong side of the
 * boundary. Anything meant to be bent by the glass has to be drawn where the
 * glass can read it.
 *
 * That is the whole purpose of this function: the same pigment, in the place
 * the renderer can see. It is not a second implementation of the material; it is
 * the material's output going somewhere else.
 *
 * ## What the platform made easy and what it did not
 *
 * `createConicGradient` exists natively, which is the one thing that could have
 * been genuinely hard — the deposit ring is angular and there is no way to build
 * a conic gradient out of radial ones.
 *
 * The paper fibre does **not** work through `createImageBitmap`: an SVG blob
 * fails to decode. It works through an `<img>` with a data URI, which means the
 * grain arrives asynchronously and everything else has to be drawn first.
 *
 * ## What is known to be wrong, measured
 *
 * This is close and it is not the same mark, and the gap is recorded here rather
 * than in a commit message nobody will read again.
 *
 * A radial profile of alpha, from the centre outward in ten-per-cent bands:
 *
 *     centre 22.5   middle 18.0   rim 45.2
 *
 * The rim is two and a half times the middle, so it reads as a **ring**. The
 * stylesheet's is the opposite — its concentration is in the disc and the
 * deposit is a rim *added* to it. Three things were tried against this and none
 * of them moved it:
 *
 * - Lowering the ring's `globalAlpha` from 0.55 to 0.2 changed the rim and not
 *   the relationship, which says the ring was never the dominant term.
 * - Setting the body's `globalAlpha` to the generator's opacity changed nothing
 *   at all, which means something downstream is deciding the body's alpha —
 *   most likely the `destination-in` used to mask the ring, since that composite
 *   keeps only the intersection and discards the rest of **the whole canvas**.
 *   Composing the ring in place therefore multiplies the body by the conic.
 * - Moving the ring to its own scratch canvas and compositing it once **made it
 *   visibly worse** — the body all but disappeared — so that attempt is known to
 *   be wrong as written, not merely unproven. It was reverted.
 *
 * A full rewrite was then attempted, on the principle that nothing destructive
 * should be composited onto the main canvas: one scratch per layer, and the main
 * canvas receiving nothing but `drawImage`. **It measured worse still** — the rim
 * went from 45.2 to 167.6 — and it was reverted too.
 *
 * The reason is worth keeping, because it is not obvious and it is what the next
 * attempt has to solve: in the in-place version the ring and the disc *share* a
 * canvas, so `destination-in` makes the ring the alpha of the composite. Once the
 * ring is on its own layer that relationship is gone, and the two are composited
 * with `source-over` — they **add** rather than one masking the other. Moving the
 * composite therefore changes the arithmetic, and the ring's alpha has to be
 * re-derived for the addition rather than reused from the masked version.
 *
 * **And `<conicGradient>` does not exist in SVG**, which was the promising way
 * out and is not one: measured in a `<img>`, a `radialGradient` draws and a
 * `conicGradient` comes out fully transparent. `feTurbulence` and
 * `feGaussianBlur` both work, so an SVG route would still need the conic built
 * by hand.
 *
 * The silhouette is also not the same: the stylesheet gives the mark eight
 * different border radii plus a rotation from one seed-derived number, where
 * this draws an ellipse. A `Path2D` reconstruction of those eight radii was
 * written and verified in isolation (78.6 per cent coverage, correct bounding
 * box, asymmetric left and right edges) and then **reverted**, because clipping
 * the existing pipeline to it produced a worse mark than the ellipse — which is
 * a statement about this pipeline, not about the shape.
 *
 * ## The canvas mark is not a copy of the CSS one, and chasing that was a waste
 *
 * Several rounds went into closing the gap between the two consumers, measured
 * as radial pigment density against the paper. The gap is real and one bug
 * behind it was real too (see `globalWashAlpha` and the body's transform). But
 * the *goal* was wrong, and the tell was that the numbers converged while the
 * picture got worse: mean error fell to 1.03 out of 255 while the mark turned
 * into a bullseye — a disc, a pale ring, a darker ring, a square ghost.
 *
 * A radial profile cannot see concentric structure. Every band's mean sat on
 * target while the shape was wrong, so the metric kept saying "closer" as the
 * thing being measured got further away. It is the same failure as the
 * smooth-gradient backdrop in `glass-lab`: an apparatus that cannot express the
 * property, reporting a number anyway.
 *
 * The two marks want different things and should stop being compared:
 *
 * - The **CSS** mark is looked at directly. It can afford to be soft and low
 *   contrast, because nothing is going to displace it.
 * - The **canvas** mark is sampled by the glass layer and then displaced by
 *   refraction. Softness there is lost — a displaced soft gradient is a
 *   displaced soft gradient, exactly the problem the probe backdrop exists to
 *   fix. It needs structure that survives being moved.
 *
 * So the canvas mark is tuned for legibility under displacement, and the CSS
 * mark is tuned for how it looks sitting still. They share a generator because
 * they are the same pigment; they do not have to converge pixel for pixel, and
 * trying to make them was the mistake.
 */

export interface WashCanvasOptions extends Omit<WashOptions, "size"> {
	/** Output size. The wash is drawn into this whatever its own size says. */
	width: number;
	height: number;
	/** Scale factor for the output, for a device-pixel-ratio-aware caller. */
	scale?: number;
}

/**
 * Draw a wash and return the canvas.
 *
 * The grain is asynchronous, so the returned promise resolves once the sheet is
 * complete. There is no version that skips it: a wash without the fibre is a
 * gradient, and a gradient is what this whole material exists not to be.
 */
export async function washToCanvas(options: WashCanvasOptions): Promise<HTMLCanvasElement> {
	const { width, height, scale = 1, ...washOptions } = options;

	const wash = createWash({ ...washOptions, size: Math.max(width, height) });
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);

	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	ctx.scale(scale, scale);
	ctx.clearRect(0, 0, width, height);

	const read = (name: string) => wash.style[name as keyof typeof wash.style] ?? "";

	/*
	 * The generator's overall transparency, and the reason the canvas mark used
	 * to be forty times too dark.
	 *
	 * The stylesheet applies `--wash-opacity` to the mark element, so every layer
	 * inside it is composited at that strength. This function read
	 * `--wash-body` — whose stops are *opaque* colours like `rgb(231 204 255)` —
	 * and drew them at full strength, because nothing here ever read the opacity
	 * at all.
	 *
	 * Measured against the CSS mark as a target, radial pigment density (mean
	 * RGB distance from paper, 0-255):
	 *
	 *     CSS      5.7  5.6  5.5  5.4  5.2  5.0  4.7  7.7 12.5  7.6
	 *     canvas 255.0 255.0 255.0 255.0 249.9 191.3 99.4 38.5 45.3 32.0
	 *
	 * Same generator, same arcs, same silhouette — a 45x difference in strength
	 * because one consumer honoured the opacity and the other did not.
	 *
	 * `globalAlpha` rather than baking it into the stop colours: the ring and the
	 * body are separate layers, both scaled by this, and the fibre is deliberately
	 * *not* (it has its own `--wash-grain-opacity`). Multiplying the colour stops
	 * would have rescaled only the body.
	 */
	const globalWashAlpha = Number(read("--wash-opacity")) || 1;

	/*
	 * The body. The generator's value is a CSS radial-gradient string, so rather
	 * than re-deriving the geometry this reads the three numbers back out of it —
	 * the position, the radii and the stops. Re-deriving would be a second place
	 * for the shape to be decided, and the two would drift.
	 */
	const body = read("--wash-body");
	const bodyMatch = body.match(
		/radial-gradient\(([\d.]+)% ([\d.]+)% at ([\d.]+)% ([\d.]+)%,(.+)\)$/,
	);
	if (bodyMatch) {
		const [, rxRaw, ryRaw, cxRaw, cyRaw, stopsRaw] = bodyMatch;
		const centreX = (Number(cxRaw) / 100) * width;
		const centreY = (Number(cyRaw) / 100) * height;
		/*
		 * The radii are percentages of the box **and they are different
		 * numbers** — `72% 66%` is an ellipse, not a circle. The first version
		 * used the first number as a single radius, which made the gradient
		 * reach its transparent stop before the edge and left the middle of the
		 * mark hollow: measured, the centre of a 190px wash came out paler than
		 * its rim, the exact opposite of what a wash does.
		 *
		 * A radial gradient is always circular, so the ellipse is made by
		 * scaling the context while the gradient is drawn and scaling it back
		 * afterwards.
		 */
		/*
		 * The percentages are the gradient's **size**, not its radius.
		 *
		 * `radial-gradient(72% 66% at ...)` means the ellipse is 72% of the box
		 * wide and 66% tall — so the radii are half of that, and the first
		 * version divided by two a second time. The mark came out at half size
		 * with a hollow middle, which reads as a ring rather than as a wash, and
		 * the cause was a unit confusion rather than anything about canvas.
		 */
		const radiusX = (Number(rxRaw) / 100) * width * 0.5;
		const radiusY = (Number(ryRaw) / 100) * height * 0.5;

		const gradient = ctx.createRadialGradient(
			centreX,
			centreY,
			0,
			centreX,
			centreY,
			Math.max(radiusX, 1),
		);
		for (const stop of stopsRaw!.split(/,(?![^(]*\))/)) {
			const trimmed = stop.trim();
			const lastSpace = trimmed.lastIndexOf(" ");
			const colour = trimmed.slice(0, lastSpace).trim();
			const offset = Number(trimmed.slice(lastSpace + 1).replace("%", "")) / 100;
			gradient.addColorStop(Math.min(Math.max(offset, 0), 1), colour);
		}

		/*
		 * The body is filled with **no context transform**, and that is the bug
		 * this file spent three rounds chasing from the wrong end.
		 *
		 * The previous version made the ellipse by `translate(centre)`,
		 * `scale(1, ry/rx)`, `clip()`, then filling a rect with the gradient. It
		 * produced a mark whose centre measured at alpha 0 while its rim was full.
		 * The measurement that settled the cause: the identical gradient with the
		 * identical stops, filled with and without the transform, gives
		 * `[231,204,255,255]` and `[0,0,0,0]`.
		 *
		 * **A canvas gradient's geometry is fixed in user space at creation time,
		 * and is then re-transformed by whatever transform is active when it is
		 * used as a fill.** `createRadialGradient(cx, cy, ...)` followed by
		 * `translate(cx, cy)` puts the centre at `2*cx, 2*cy` — 186,173 on a 190px
		 * canvas, off the edge — so the fill sampled the gradient's transparent
		 * tail everywhere inside the mark. The rim survived because the separate
		 * deposit ring, drawn without a transform, happened to sit there.
		 *
		 * Two earlier comments in this file blamed "unit confusion" for the same
		 * symptom. Both were guesses and both were wrong; the transform was the
		 * cause and it took a differential measurement to find.
		 *
		 * The fill also has no clip now. Clipping to `radiusX x radiusY` put a hard
		 * edge at exactly the radius where the gradient is still faintly visible,
		 * and the deposit's band starts at the same radius — so the two layers met
		 * at a seam. The gradient's own `transparent` stop ends the mark, which is
		 * what the stylesheet relies on too.
		 */
		ctx.save();
		ctx.globalAlpha = globalWashAlpha;
		ctx.fillStyle = gradient;
		ctx.fillRect(
			centreX - radiusX * 1.05,
			centreY - radiusY * 1.05,
			radiusX * 2.1,
			radiusY * 2.1,
		);
		ctx.restore();
	}

	/*
	 * The deposit ring. A conic gradient masked to a band, which is the same
	 * construction the stylesheet uses and the reason it took four attempts
	 * there: the conic drives *visibility* rather than colour, because a conic
	 * stop is a colour for a whole ray and any opaque one paints a stripe from
	 * the centre to the edge.
	 */
	const maskRaw = read("--wash-deposit-mask");
	const conic = ctx.createConicGradient(0, width / 2, height / 2);
	const arcs = [...maskRaw.matchAll(/rgb\(0 0 0 \/ ([\d.]+)\) ([\d.-]+)deg ([\d.-]+)deg/g)];
	for (const [, alpha, from, to] of arcs) {
		conic.addColorStop(Math.min(Number(from)! / 360, 1), `rgb(0 0 0 / ${alpha})`);
		conic.addColorStop(Math.min(Number(to)! / 360, 1), `rgb(0 0 0 / ${alpha})`);
	}
	if (arcs.length > 0) {
		const rim = read("--wash-rim");
		/*
		 * The band is an **ellipse**, matching the body.
		 *
		 * It was a circle of `min(width, height) / 2`, and that mismatch is what
		 * put a dark crescent in the lower right of every mark: the ring and the
		 * ground it was supposed to sit on had different shapes, so where the
		 * ground ended the ring did not. The two are one mark and have to agree.
		 */
		/*
		 * The band is built the way the stylesheet builds it, and the first two
		 * attempts here did not.
		 *
		 * The stylesheet's deposit mask is one line:
		 *
		 *     radial-gradient(closest-side,
		 *       transparent 72%, rgb(0 0 0 / 1) 86%, rgb(0 0 0 / 1) 97%, transparent 100%)
		 *
		 * Note where the gradient *starts*: at the centre. The transparent part
		 * is written as a **stop**, not expressed by moving the gradient's inner
		 * radius. This function did the opposite — it moved `inner` outward to
		 * 0.2x/0.34x/0.72x the radius and let the gradient ramp from there — and
		 * the two are not the same shape. A radial gradient's `inner` radius is
		 * the point where stop[0] begins; everything inside it is flat stop[0]
		 * colour, so moving `inner` out shortens the ramp instead of describing
		 * where the pigment sits.
		 *
		 * What that produced was a **target**: a disc, a pale gap, then a wide
		 * ring, plus a square ghost at the outer corners from the fill rect. It
		 * scored well on the radial profile — mean error 1.03 against the CSS
		 * mark — because a radial average cannot see concentric structure. Every
		 * band's mean sat on the target while the shape was wrong. Found by
		 * looking at a 3x screenshot, not by any number.
		 *
		 * So: `inner` returns to 0, and the stops carry the shape. 72% is where
		 * the deposit begins to appear, 86-97% is where it is solid, and 100% is
		 * the mark's own edge.
		 */
		const ringX = width * 0.5;
		const ringY = height * 0.5;
		const outer = Math.max(ringX, ringY);
		const inner = 0;

		/*
		 * The deposit is drawn on its own layer.
		 *
		 * The stylesheet gets the uneven rim by masking **one element**:
		 * `--wash-deposit-mask` is applied as `mask-image` on
		 * `.ui-lib-wash__deposit`, which is an empty span that carries nothing but
		 * the ring. The body is a sibling and the mask cannot reach it.
		 *
		 * This function applied the same conic with `destination-in` on the **main
		 * canvas**, which multiplies *everything already drawn* by the conic's
		 * alpha. The conic's alpha is not 1: `deriveArcs` produces five values
		 * between 0.12 and 1.0, so the body was scaled down to as little as 12% in
		 * the weakest sector and left alone in the strongest.
		 *
		 * **This was a real defect and it was not the ring.** It was fixed, and the
		 * measurement did not move: the radial profile before and after the fix
		 * were the same numbers to one decimal place. The ring's actual cause is
		 * documented above, at the body: a gradient's geometry is fixed at creation
		 * and re-transformed at use, so the body's fill was sampling the gradient's
		 * transparent tail. Two "fixes" were aimed at this conic before the real
		 * cause was measured. It is left fixed because cutting the disc into wedges
		 * is wrong regardless of whether it was visible through the other bug.
		 *
		 * So: same band, same conic, same strengths, on a scratch the size of the
		 * mark, composited in once. The stylesheet's structure, in canvas terms.
		 */
		const ringCanvas = document.createElement("canvas");
		ringCanvas.width = canvas.width;
		ringCanvas.height = canvas.height;
		const ring = ringCanvas.getContext("2d");
		if (ring) {
			ring.scale(scale, scale);
			/*
			 * Translate first, then build the gradient at the origin. The order is
			 * load-bearing for the same reason the body's was not: a gradient
			 * created at `(w/2, h/2)` and *then* translated lands at `(w, h)`,
			 * off the canvas. Creating it at `(0, 0)` after the translate puts it
			 * where the transform says. One of these two orderings works and the
			 * other silently draws nothing, which is exactly the trap the body
			 * fell into.
			 */
			ring.save();
			ring.translate(width / 2, height / 2);
			ring.scale(1, Math.max(ringY / Math.max(ringX, 1e-6), 1e-6));
			const band = ring.createRadialGradient(0, 0, inner, 0, 0, outer);
			/*
			 * The stops are the stylesheet's, transcribed.
			 *
			 * Earlier versions of this function tuned them by hand against a radial
			 * profile and produced increasingly specific wrong answers: first a hard
			 * edge, then a stroke, then a target with concentric rings. Each one
			 * scored acceptably on the metric and looked worse than the last. The
			 * stylesheet's numbers are already correct and there was never a reason
			 * to re-derive them — the two consumers share one generator, so the
			 * shape should be copied, not searched for.
			 */
			band.addColorStop(0, "rgba(0,0,0,0)");
			band.addColorStop(0.72, "rgba(0,0,0,0)");
			band.addColorStop(0.86, rim);
			band.addColorStop(0.97, rim);
			band.addColorStop(1, "rgba(0,0,0,0)");

			ring.fillStyle = band;
			/*
			 * The ring's own strength, and it is 1 rather than the 0.2 the
			 * stylesheet's element uses.
			 *
			 * The deposit is composited a second time by `globalWashAlpha` below,
			 * which is 0.24 for a dry mark at weight 0.9. The stylesheet can write
			 * 0.2 because its deposit span is inside an element whose opacity is
			 * 0.24 and the mask multiplies once. Here the same number would be
			 * multiplied twice — 0.2 x 0.24 = 0.048 — which measured as a ring of
			 * 7.1 against a CSS target of 12.5, with the outer third of the mark
			 * lighter than its centre.
			 */
			ring.globalAlpha = 1;
			ring.beginPath();
			ring.arc(0, 0, outer, 0, Math.PI * 2);
			ring.fill();

			// The conic varies the ring's *visibility* around the circumference.
			// It is confined to this layer, so the body underneath is untouched.
			ring.globalCompositeOperation = "destination-in";
			ring.globalAlpha = 1;
			ring.fillStyle = conic;
			ring.fillRect(-outer, -outer, outer * 2, outer * 2);
			ring.restore();

			ctx.save();
			// The ring is already scaled into output pixels; draw it 1:1, and at
			// the mark's own strength so the two layers composite as one material.
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.globalAlpha = globalWashAlpha;
			ctx.drawImage(ringCanvas, 0, 0);
			ctx.restore();
		}
	}

	/*
	 * Softening, which the stylesheet gets from `filter: blur(1.5px)` on the mark
	 * and which canvas has no equivalent for — `ctx.filter` blurs **per draw
	 * call**, not per layer, so setting it before the ring would blur the ring
	 * and setting it before the fibre would blur the fibre.
	 *
	 * Verified rather than assumed: `ctx.filter = "blur(4px)"` is supported and
	 * takes effect. What it cannot do is blur something already drawn, so the
	 * softening is applied by drawing the whole mark into a scratch canvas and
	 * compositing it back once.
	 */
	const scratch = document.createElement("canvas");
	scratch.width = canvas.width;
	scratch.height = canvas.height;
	const soft = scratch.getContext("2d");
	if (soft) {
		soft.drawImage(canvas, 0, 0);
		ctx.clearRect(0, 0, width, height);
		ctx.save();
		ctx.filter = `blur(${read("--wash-blur").replace(/px$/, "") || "1.5"}px)`;
		ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
		ctx.restore();
	}

	// The fibre, last and asynchronously. A wash without it is a gradient.
	await paintGrain(ctx, read("--wash-grain"), width, height, read("--wash-grain-opacity"));

	return canvas;
}

/**
 * The paper fibre, over everything.
 *
 * Drawn as two images rather than one because the generator emits two, at sizes
 * that deliberately cannot share a period — a single tile would be findable as a
 * grid of squares, which is what the first version of the CSS noise did.
 *
 * `multiply` rather than `source-over`, matching the stylesheet: the fibre
 * should darken the sheet, not sit on top of it.
 */
async function paintGrain(
	ctx: CanvasRenderingContext2D,
	grainRaw: string,
	width: number,
	height: number,
	opacityRaw: string,
): Promise<void> {
	const urls = [...grainRaw.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]!);
	if (urls.length === 0) return;
	const opacity = Number(opacityRaw.replace(/[^\d.]/g, "")) || 0.17;

	const images = await Promise.all(
		urls.map(
			(url) =>
				new Promise<HTMLImageElement | null>((resolve) => {
					const image = new Image();
					image.onload = () => resolve(image);
					// A fibre that fails to load is a missing texture, not a broken
					// wash: the pigment is already down and is the part that carries
					// the colour.
					image.onerror = () => resolve(null);
					image.src = url;
				}),
		),
	);

	ctx.save();
	ctx.globalCompositeOperation = "multiply";
	/*
	 * The generator's opacity is for **one** layer composited once, and the
	 * first version applied it to each layer independently — two multiply passes
	 * at 0.17 is very nearly a multiply at 0.31, and the fibre came out strong
	 * enough to bury the pigment underneath it. Measured across a horizontal
	 * profile, the alpha alternated between 33 and 66 with no shape to it at
	 * all: the paper was the picture and the wash was noise on top of it.
	 */
	ctx.globalAlpha = opacity / Math.max(images.length, 1);
	for (const image of images) {
		if (!image) continue;
		// Tiled rather than stretched, so the fibre keeps the scale it was
		// generated at — stretching a 480px turbulence field over 1200px turns
		// paper tooth into weather.
		const pattern = ctx.createPattern(image, "repeat");
		if (!pattern) continue;
		ctx.fillStyle = pattern;
		ctx.fillRect(0, 0, width, height);
	}
	ctx.restore();
}
