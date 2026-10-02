import { evaluateMSDF } from "@ui-lib/shaders";
import { color, float, uv, vec4 } from "three/tsl";
import {
	Color,
	DoubleSide,
	Mesh,
	MeshBasicNodeMaterial,
	PlaneGeometry,
	TextureLoader,
} from "three/webgpu";
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

	const material = new MeshBasicNodeMaterial();
	material.transparent = true;
	material.side = DoubleSide;

	// Use evaluateMSDF from shaders to calculate proper opacity
	const msdfAlpha = evaluateMSDF(texture, uv(), float(4.0)); // 4.0 is pxRange
	const tint = color(new Color(options.color || "#ffffff"));

	// Assign to material output node using TSL
	material.colorNode = vec4(tint.r, tint.g, tint.b, msdfAlpha);

	// Creates the text plane
	// TODO: A complete implementation requires BMFont parsing to generate word wrapping
	// and glyph layout buffers instead of a single plane.
	const geometry = new PlaneGeometry(1, 1);
	const mesh = new Mesh(geometry, material);

	// Call base effect initializer but we would ideally add a 3D mesh instead of a panel.
	// For now we just return the mesh as a proof of concept.
	return mesh;
}
