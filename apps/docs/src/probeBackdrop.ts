import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three/webgpu";

/**
 * A backdrop whose job is to make refraction measurable.
 *
 * Why this exists as a module rather than inline in one page: a smooth gradient
 * is the one background against which refraction is invisible. Displacing a
 * smooth gradient yields the same smooth gradient, so every `refraction` value
 * from 0 to 400 renders identically and the page silently stops being a test of
 * anything. Two rounds were spent tuning panel numbers on exactly such a page.
 *
 * The rule this file encodes: **the backdrop must contain hard edges at several
 * spatial scales.** A hard edge is the only feature whose displacement the eye
 * (or a pixel diff) can read as a distance. The scales are deliberate:
 *
 * - 8px hairlines resolve the bevel's smallest movement, and they are what makes
 *   dispersion legible — the red and blue channels land on different lines.
 * - 64px structure gives the mid-range bend something to sweep across.
 * - 320px blocks and a heavy border give the large displacement at the rim
 *   somewhere to travel; without them a strong `refraction` only shuffles
 *   hairlines within their own neighbourhood and still reads as "not moving".
 *
 * The palette is warm paper rather than the registration sheet's ink because
 * this is a backdrop for the watercolour ground, not a calibration target.
 * Contrast is what matters: the darkest mark has to be far enough from the
 * paper that a half-pixel shift is a visible change in value.
 */
export interface ProbeBackdropOptions {
	/** Canvas edge in pixels. 1024 covers a 2880px viewport at 2x after repeat. */
	size?: number;
	/** Repeat across the viewport. Below 1 the structure is larger than a card. */
	repeat?: [number, number];
}

/**
 * Paint the probe field. Exported separately so tests can run it against a
 * headless 2D context and assert the structure actually contains edges, rather
 * than trusting that a function called `paint` painted something.
 */
export function paintProbeField(
	canvas: HTMLCanvasElement,
	options: ProbeBackdropOptions = {},
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const w = canvas.width;
	const h = canvas.height;
	const size = options.size ?? 1024;

	// Paper. Not pure white: a hairline drawn on #ffffff has less contrast than
	// the display can show, and the whole point is contrast at the edges.
	ctx.fillStyle = "#f4ece2";
	ctx.fillRect(0, 0, w, h);

	// Large blocks first, so everything fine is drawn on top of them. These are
	// pigment fields rather than a checkerboard — an even grid of equal blocks
	// reads as texture, and texture is what we are trying to avoid. Uneven sizes
	// mean the eye has no way to predict where the next edge is, so a displaced
	// edge is not attributed to the pattern itself.
	const blocks: [number, number, number, number, string][] = [
		[0.04, 0.06, 0.34, 0.28, "#e8cfc4"],
		[0.52, 0.03, 0.44, 0.34, "#cfd8e8"],
		[0.08, 0.44, 0.28, 0.5, "#d9cfe6"],
		[0.44, 0.48, 0.5, 0.44, "#ead9c0"],
		[0.72, 0.3, 0.26, 0.3, "#dfe6d4"],
	];
	for (const [bx, by, bw, bh, colour] of blocks) {
		ctx.fillStyle = colour;
		ctx.fillRect(bx * w, by * h, bw * w, bh * h);
	}

	// Mid-scale structure: 64px squares at low alpha. These give the mid-range
	// bend a repeating feature, which is what makes a displacement read as
	// *uniform across the panel* rather than as a local smudge.
	const midStep = size / 16;
	ctx.fillStyle = "rgba(48, 42, 38, 0.10)";
	for (let x = 0; x < 16; x++) {
		for (let y = 0; y < 16; y++) {
			if ((x + y) % 3 !== 0) continue;
			ctx.fillRect(x * midStep, y * midStep, midStep, midStep);
		}
	}

	// Hairlines. The finest feature, drawn at a step that divides the block
	// boundaries so the two scales align instead of producing moire.
	ctx.strokeStyle = "rgba(48, 42, 38, 0.30)";
	ctx.lineWidth = 1;
	const fineStep = size / 128;
	for (let i = 0; i <= 128; i++) {
		const p = Math.round(i * fineStep) + 0.5;
		ctx.beginPath();
		ctx.moveTo(p, 0);
		ctx.lineTo(p, h);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, p);
		ctx.lineTo(w, p);
		ctx.stroke();
	}

	// A heavy frame plus crosshair. These are the strongest edges on the field,
	// so they are the ones a large `refraction` at the rim visibly drags. A page
	// whose backdrop has no large marks cannot tell "refraction 42" from
	// "refraction 96" — this is the mark that separates them.
	ctx.strokeStyle = "rgba(150, 60, 44, 0.72)";
	ctx.lineWidth = 6;
	ctx.strokeRect(0.06 * w, 0.06 * h, 0.88 * w, 0.88 * h);
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(w / 2 - 0.06 * w, h / 2);
	ctx.lineTo(w / 2 + 0.06 * w, h / 2);
	ctx.moveTo(w / 2, h / 2 - 0.06 * h);
	ctx.lineTo(w / 2, h / 2 + 0.06 * h);
	ctx.stroke();

	// Wordmarks at a size the eye reads as an object rather than as texture. Text
	// is the best displacement target there is: a glyph is a shape of known
	// width, so a bend across it is measurable by looking.
	ctx.fillStyle = "rgba(40, 36, 34, 0.62)";
	ctx.font = `600 ${Math.round(size * 0.052)}px ui-serif, Georgia, serif`;
	const words = ["SPACE", "GLASS", "BEND", "PAPER", "DEPTH"];
	for (let row = 0; row < 5; row++) {
		const word = words[row % words.length] ?? "GLASS";
		ctx.fillText(word, 0.1 * w, (0.2 + row * 0.16) * h);
	}
}

/**
 * Build the texture the glass layer samples.
 *
 * `RepeatWrapping` with a repeat below 1 zooms the field out, which is what we
 * want: a card is roughly a quarter of the viewport, so if the field repeated
 * once per viewport a single card would contain one mark and the rim would have
 * nothing to bend.
 */
export function createProbeBackdrop(options: ProbeBackdropOptions = {}) {
	return function build(): CanvasTexture {
		const size = options.size ?? 1024;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		paintProbeField(canvas, options);
		const map = new CanvasTexture(canvas);
		map.colorSpace = SRGBColorSpace;
		map.wrapS = RepeatWrapping;
		map.wrapT = RepeatWrapping;
		const [rx, ry] = options.repeat ?? [0.42, 0.42];
		map.repeat.set(rx, ry);
		map.needsUpdate = true;
		return map;
	};
}
