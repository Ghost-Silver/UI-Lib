import {
	createParticleSystem,
	type ParticleSystem,
	type ParticleSystemOptions,
} from "@ui-lib/particles";
import {
	createGlassLayer,
	type GlassLayer,
	type GlassLayerOptions,
	type GlassPanelHandle,
	type GlassPanelOptions,
} from "@ui-lib/renderer";

// Store shared contexts per page
let sharedGlassLayer: GlassLayer | null = null;
let sharedGlassLayerPromise: Promise<GlassLayer> | null = null;
const activeSystems: ParticleSystem[] = [];

/**
 * Applies a Liquid Glass effect to an existing DOM element.
 *
 * Will automatically initialize the global UI-Lib glass layer if one doesn't exist,
 * allowing multiple `makeItGlass` calls to transparently share one WebGPU canvas.
 */
export async function createEffect(
	element: HTMLElement,
	options: Partial<GlassPanelOptions> & { layerOptions?: GlassLayerOptions } = {},
): Promise<GlassPanelHandle> {
	if (!sharedGlassLayer) {
		if (!sharedGlassLayerPromise) {
			sharedGlassLayerPromise = createGlassLayer(options.layerOptions || {});
		}
		sharedGlassLayer = await sharedGlassLayerPromise;
	} else if (sharedGlassLayerPromise) {
		await sharedGlassLayerPromise; // In case it's still booting
	}

	const { layerOptions, ...panelOptions } = options;
	return sharedGlassLayer!.register(element, panelOptions);
}

/**
 * Wraps a text or div element in a particle effect system.
 *
 * Auto-initializes the global UI-Lib glass layer and adds a custom ParticleSystem to it.
 * This is a highly abstracted API that bridges a simple DOM target with the GPU particle graph.
 */
export async function magicText(
	_element: HTMLElement,
	options: ParticleSystemOptions = {},
): Promise<{ system: ParticleSystem; dispose: () => void }> {
	if (!sharedGlassLayer) {
		if (!sharedGlassLayerPromise) {
			sharedGlassLayerPromise = createGlassLayer({});
		}
		sharedGlassLayer = await sharedGlassLayerPromise;
	} else if (sharedGlassLayerPromise) {
		await sharedGlassLayerPromise; // Wait for it to boot
	}

	const system = createParticleSystem(options);

	// Default: render in the 'front' depth so it floats around the text
	sharedGlassLayer!.addParticles(system, { depth: "front" });
	activeSystems.push(system);

	// In a complete implementation, this would also include an IntersectionObserver or
	// ResizeObserver to automatically sync `system.setStir` / `boundsCenter` / etc.
	// with the element's DOM bounding rect client coordinates.
	// For this skeleton, we provide the imperative API structure and a dispose hook.

	return {
		system,
		dispose: () => {
			system.dispose();
			const idx = activeSystems.indexOf(system);
			if (idx > -1) activeSystems.splice(idx, 1);
		},
	};
}
