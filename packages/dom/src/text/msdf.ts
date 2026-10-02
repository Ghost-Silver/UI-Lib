import { evaluateMSDF } from "@ui-lib/shaders";
import { color, float, uv, vec4 } from "three/tsl";
import { Color, DoubleSide, Mesh, TextureLoader } from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { type BMFont, createTextGeometry } from "./layout.js";
// import { createEffect } from "../magic.js";

export interface MagicMSDFTextOptions {
	text: string;
	fontUrl: string; // JSON atlas
	textureUrl: string; // PNG MSDF texture
	color?: string;
	fontSize?: number;
}

/**
 * Creates an MSDF text mesh and embeds it inside the UI-Lib shared layer
 */
export async function magicMSDFText(_element: HTMLElement, options: MagicMSDFTextOptions) {
	const loader = new TextureLoader();
	const texture = await loader.loadAsync(options.textureUrl);
	const fontRes = await fetch(options.fontUrl);
	const fontJson = (await fontRes.json()) as BMFont;

	const material = new MeshBasicNodeMaterial();
	material.transparent = true;
	material.side = DoubleSide;

	// Use evaluateMSDF from shaders to calculate proper opacity
	const msdfAlpha = evaluateMSDF(texture, uv(), float(4.0)); // 4.0 is pxRange
	const tint = color(new Color(options.color || "#ffffff"));

	// Assign to material output node using TSL
	material.colorNode = vec4(tint.r, tint.g, tint.b, msdfAlpha);

	const geometry = createTextGeometry(options.text, fontJson);
	const mesh = new Mesh(geometry, material);

	// Call base effect initializer but we would ideally add a 3D mesh instead of a panel.
	// For now we just return the mesh as a proof of concept.
	return mesh;
}
