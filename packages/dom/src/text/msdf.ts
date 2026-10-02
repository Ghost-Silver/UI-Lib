import type { ParticleSystemOptions } from "@ui-lib/particles";
import { magicText } from "../magic.js";
import { type BMFont, createTextGeometry, sampleTextPoints } from "./layout.js";

export interface MagicTextParticleOptions {
	text: string;
	fontUrl: string; // JSON atlas
	particleOptions?: ParticleSystemOptions;
	density?: number;
}

/**
 * Parses an MSDF font, maps the text glyphs, and hooks it to the particle engine.
 * Particles will swarm and snap to the text boundary box natively, scaled to the HTML element.
 */
export async function magicParticleText(
	element: HTMLElement,
	options: MagicTextParticleOptions,
) {
	const fontRes = await fetch(options.fontUrl);
	const fontJson = (await fontRes.json()) as BMFont;

	// Generate text quads
	const geometry = createTextGeometry(options.text, fontJson);

	// Sample attractors over the text surface, bounding box is normalized to [-0.5, 0.5]
	const pointsCloud = sampleTextPoints(geometry, options.density || 0.1);

	// Approximate physical element scale. A full implementation would actively resize this array on ResizeObserver.
	const rect = element.getBoundingClientRect();
	// Magic scale approximation for viewport projection size
	const scaleX = rect.width / 100;
	const scaleY = rect.height / 100;

	const scaledCloud = new Float32Array(pointsCloud.length);
	for (let i = 0; i < pointsCloud.length; i += 3) {
		scaledCloud[i] = (pointsCloud[i] as number) * scaleX;
		scaledCloud[i + 1] = (pointsCloud[i + 1] as number) * scaleY;
		scaledCloud[i + 2] = pointsCloud[i + 2] as number;
	}

	// Hand over to the primary particle magic wrapper
	return magicText(element, {
		...options.particleOptions,
		attractorCloud: scaledCloud,
		forces: {
			...options.particleOptions?.forces,
			// @ts-expect-error - Adding attractorMode which we monkeypatched dynamically into particle options
			attractorMode: "cloud",
		},
	});
}
