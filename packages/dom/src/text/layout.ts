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
