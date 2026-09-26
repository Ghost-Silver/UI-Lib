import {
	Color,
	MeshBasicNodeMaterial,
	type ColorRepresentation,
	type Texture,
	type TextureNode,
} from "three/webgpu";
import { select, texture, uniform, uv, vec2 } from "three/tsl";
import {
	createGradientBackdropMaterial,
	type GradientBackdropMaterial,
	type GradientBackdropOptions,
	type SharedUniforms,
} from "@ui-lib/shaders";

export type BackdropSpec =
	| ({ type: "gradient" } & GradientBackdropOptions)
	| { type: "color"; color?: ColorRepresentation }
	| { type: "texture"; texture: Texture };

export interface BackdropInstance {
	readonly material: MeshBasicNodeMaterial;
	/** Whether the backdrop changes over time (lets the layer skip redraws). */
	animated: boolean;
	update(spec: BackdropSpec): void;
	dispose(): void;
}

interface ImageBackdropMaterial extends MeshBasicNodeMaterial {
	readonly viewportAspect: { value: number };
	readonly imageAspect: { value: number };
	/** Swapping `.value` repoints the backdrop without rebuilding the graph. */
	readonly image: TextureNode;
}

/** Aspect-preserving "cover" sampling of a single texture. */
function createImageBackdropMaterial(source: Texture): ImageBackdropMaterial {
	const viewportAspect = uniform(1);
	const imageAspect = uniform(1);

	const ratio = viewportAspect.div(imageAspect);
	const coverUv = select(
		viewportAspect.greaterThan(imageAspect),
		vec2(uv().x, uv().y.sub(0.5).mul(ratio).add(0.5)),
		vec2(uv().x.sub(0.5).mul(ratio).add(0.5), uv().y),
	);

	const image = texture(source, coverUv);

	const material = new MeshBasicNodeMaterial() as ImageBackdropMaterial;
	material.colorNode = image;
	material.depthTest = false;
	material.depthWrite = false;
	material.toneMapped = false;

	Object.defineProperties(material, {
		viewportAspect: { value: viewportAspect, enumerable: true },
		imageAspect: { value: imageAspect, enumerable: true },
		image: { value: image, enumerable: true },
	});

	return material;
}

/**
 * Builds the full-screen backdrop material for a spec, sharing the layer's
 * time / resolution / pointer uniforms so a single frame update covers everything.
 */
export function createBackdrop(spec: BackdropSpec, shared: SharedUniforms): BackdropInstance {
	if (spec.type === "color") {
		const material = new MeshBasicNodeMaterial({ color: new Color(spec.color ?? "#05060c") });
		material.depthTest = false;
		material.depthWrite = false;
		material.toneMapped = false;
		return {
			material,
			animated: false,
			update(next) {
				if (next.type === "color") material.color.set(next.color ?? "#05060c");
			},
			dispose() {
				material.dispose();
			},
		};
	}

	if (spec.type === "texture") {
		const material = createImageBackdropMaterial(spec.texture);
		return {
			material,
			animated: false,
			update(next) {
				if (next.type !== "texture") return;
				material.image.value = next.texture;
				const img = next.texture.image as { width?: number; height?: number } | undefined;
				material.imageAspect.value = img?.width && img?.height ? img.width / img.height : 1;
			},
			dispose() {
				material.dispose();
			},
		};
	}

	const material = createGradientBackdropMaterial(spec, shared) as GradientBackdropMaterial & {
		update(options: Partial<GradientBackdropOptions>): void;
	};
	const instance: BackdropInstance = {
		material,
		animated: (spec.speed ?? 1) > 0,
		update(next) {
			if (next.type !== "gradient") return;
			material.update(next);
			instance.animated = (next.speed ?? 1) > 0;
		},
		dispose() {
			material.dispose();
		},
	};
	return instance;
}

/** Shared default so a layer always has something to refract. */
export const DEFAULT_BACKDROP: BackdropSpec = { type: "gradient" };
