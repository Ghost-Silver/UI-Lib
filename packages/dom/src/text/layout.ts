import { BufferGeometry, Float32BufferAttribute } from "three";

export interface BMFontChar {
	id: number;
	x: number;
	y: number;
	width: number;
	height: number;
	xoffset: number;
	yoffset: number;
	xadvance: number;
}

export interface BMFont {
	common: {
		lineHeight: number;
		base: number;
		scaleW: number;
		scaleH: number;
	};
	info: {
		size: number;
	};
	chars: BMFontChar[];
}

export function createTextGeometry(text: string, font: BMFont) {
	const chars = text.split("");
	const charMap = new Map<number, BMFontChar>();
	for (const c of font.chars) charMap.set(c.id, c);

	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	let cursorX = 0;
	let cursorY = 0;

	for (let i = 0; i < chars.length; i++) {
		const charCode = chars[i].charCodeAt(0);
		if (charCode === 10) {
			// newline
			cursorX = 0;
			cursorY -= font.common.lineHeight;
			continue;
		}

		const glyph = charMap.get(charCode);
		if (!glyph) continue;

		// Quad positions
		const x0 = cursorX + glyph.xoffset;
		const y0 = cursorY - glyph.yoffset;
		const x1 = x0 + glyph.width;
		const y1 = y0 - glyph.height;

		const baseIndex = positions.length / 3;

		positions.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);

		// UVs
		const u0 = glyph.x / font.common.scaleW;
		const v0 = 1.0 - glyph.y / font.common.scaleH;
		const u1 = (glyph.x + glyph.width) / font.common.scaleW;
		const v1 = 1.0 - (glyph.y + glyph.height) / font.common.scaleH;

		uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);

		indices.push(
			baseIndex,
			baseIndex + 1,
			baseIndex + 2,
			baseIndex,
			baseIndex + 2,
			baseIndex + 3,
		);

		cursorX += glyph.xadvance;
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
	geometry.setIndex(indices);

	return geometry;
}

/**
 * Subdivides the text geometry into a point cloud array [x,y,z, x,y,z...]
 * suitable for particle attractors, scaling it to a normalized [-0.5, 0.5] unit box.
 */
export function sampleTextPoints(
	geometry: BufferGeometry,
	density: number = 0.1,
): Float32Array {
	const positions = geometry.getAttribute("position");
	const indices = geometry.getIndex();
	if (!positions || !indices) return new Float32Array(0);

	const rawPoints: number[] = [];

	let overallMinX = Infinity;
	let overallMaxX = -Infinity;
	let overallMinY = Infinity;
	let overallMaxY = -Infinity;

	// Iterate over each quad (2 triangles = 6 indices)
	for (let i = 0; i < indices.count; i += 6) {
		const a = indices.getX(i);
		const c = indices.getX(i + 2); // Bottom-right usually

		const ax = positions.getX(a);
		const ay = positions.getY(a);
		// Assuming Z is 0 for 2D text layout

		const cx = positions.getX(c);
		const cy = positions.getY(c);

		const minX = Math.min(ax, cx);
		const maxX = Math.max(ax, cx);
		const minY = Math.min(ay, cy);
		const maxY = Math.max(ay, cy);

		overallMinX = Math.min(overallMinX, minX);
		overallMaxX = Math.max(overallMaxX, maxX);
		overallMinY = Math.min(overallMinY, minY);
		overallMaxY = Math.max(overallMaxY, maxY);

		const width = maxX - minX;
		const height = maxY - minY;

		const cols = Math.max(1, Math.floor(width * density));
		const rows = Math.max(1, Math.floor(height * density));

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const px = minX + (c / cols) * width + Math.random() * (width / cols);
				const py = minY + (r / rows) * height + Math.random() * (height / rows);
				rawPoints.push(px, py, 0);
			}
		}
	}

	// Normalize to a 1x1 bounding box centered at 0,0
	const width = overallMaxX - overallMinX;
	const height = overallMaxY - overallMinY;

	// Avoid division by zero
	const scaleX = width > 0 ? 1 / width : 1;
	const scaleY = height > 0 ? 1 / height : 1;

	// We'll uniformly scale to fit within the box so we don't stretch the font ratio.
	// But since this is a 2D DOM element bounding box we often want to stretch it to match.
	// We map it to [-0.5, 0.5] range.
	const centerX = overallMinX + width * 0.5;
	const centerY = overallMinY + height * 0.5;

	for (let i = 0; i < rawPoints.length; i += 3) {
		rawPoints[i] = (rawPoints[i] - centerX) * scaleX;
		rawPoints[i + 1] = (rawPoints[i + 1] - centerY) * scaleY;
	}

	return new Float32Array(rawPoints);
}
