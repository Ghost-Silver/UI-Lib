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
		const radiusX = ((Number(rxRaw) / 100) * width) / 2;
		const radiusY = ((Number(ryRaw) / 100) * height) / 2;

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

		ctx.save();
		// Scale so the circular gradient fills the ellipse, then clip to it so
		// the corners stay clean.
		ctx.translate(centreX, centreY);
		ctx.scale(1, Math.max(radiusY / Math.max(radiusX, 1e-6), 1e-6));
		ctx.beginPath();
		ctx.arc(0, 0, Math.max(radiusX, 1), 0, Math.PI * 2);
		ctx.clip();
		ctx.fillStyle = gradient;
		// Sized to the circle that was just clipped to, not to a guess. The
		// first version filled a rectangle four times the canvas height and the
		// corner of that rectangle showed through where the clip's arc and the
		// fill's edge disagreed — a dark crescent in the lower right, which is
		// the fill stopping rather than the mark ending.
		ctx.fillRect(-radiusX * 1.05, -radiusX * 1.05, radiusX * 2.1, radiusX * 2.1);
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
		const band = ctx.createRadialGradient(
			width / 2,
			height / 2,
			Math.min(width, height) * 0.36,
			width / 2,
			height / 2,
			Math.min(width, height) * 0.5,
		);
		band.addColorStop(0, "rgba(0,0,0,0)");
		band.addColorStop(0.5, rim);
		band.addColorStop(1, "rgba(0,0,0,0)");

		ctx.save();
		// The ring is inside the band; the conic decides where along it the
		// pigment is, by being the alpha of what is drawn.
		ctx.fillStyle = band;
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = 0.55;
		ctx.beginPath();
		ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.globalCompositeOperation = "destination-in";
		ctx.globalAlpha = 1;
		ctx.fillStyle = conic;
		ctx.fillRect(0, 0, width, height);
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
	ctx.globalAlpha = opacity;
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
