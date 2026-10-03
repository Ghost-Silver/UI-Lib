import {
	type BMFont,
	createTextGeometry,
	createTextMaterial,
	type TextAtlas,
} from "@ui-lib/shaders";
import { useEffect, useRef, useState } from "react";
import { LinearFilter, Mesh, NoColorSpace, Texture } from "three/webgpu";
import { useGlassStage } from "./context.js";

export interface CrystalTextProps {
	/** The string to set. Glyphs outside the atlas are skipped, not faked. */
	text: string;
	/** Directory holding `<name>.png` and `<name>.json`. */
	atlasUrl?: string;
	/** Atlas base name. Defaults to the one `pnpm build:font-atlas` writes. */
	atlasName?: string;
	/**
	 * An empty layout box to sit on. The text follows its centre on the shared
	 * scheduler, the same way `Optics` follows its slot, so it survives scroll
	 * and resize without a listener of its own.
	 */
	anchor?: { readonly current: HTMLElement | null };
	/** Height of the string in world units. Not pixels: this is 3D geometry. */
	size?: number;
	color?: string;
	opacity?: number;
	/** Radians, applied about the string's centre. */
	rotation?: readonly [number, number, number];
}

interface LoadedAtlas {
	font: BMFont;
	atlas: TextAtlas;
}

/**
 * SDF text, mounted in the page's one world.
 *
 * The glyphs are real geometry sampling a real distance field, so the edges
 * stay crisp when the camera moves and DOM glass in front of it refracts the
 * type — neither of which a bitmap or a DOM overlay can do. The document keeps
 * its own readable copy of the string; this is the drawn layer.
 *
 * It lives in the world, so **DOM glass in front of it will frost and refract
 * it** — that is the library working, not a defect, and it is why the text
 * reads as ink under glass rather than as an overlay. Place it behind the glass
 * you want it bent by, and keep a readable DOM copy of the string for search,
 * translation and screen readers, which this component cannot provide because
 * it is not in the document.
 *
 * Without a stage, or before the atlas arrives, it renders nothing and the page
 * is unaffected.
 *
 * ```tsx
 * const slot = useRef<HTMLDivElement>(null);
 * <CrystalText text="水彩" anchor={slot} size={2.4} color="#5b3aa6" />
 * <div ref={slot} />
 * ```
 */
export function CrystalText({
	text,
	atlasUrl = "/fonts",
	atlasName = "iris-sdf",
	anchor,
	size = 1,
	color,
	opacity,
	rotation,
}: CrystalTextProps) {
	const { layer } = useGlassStage();
	const [loaded, setLoaded] = useState<LoadedAtlas | null>(null);

	useEffect(() => {
		let cancelled = false;
		let made: Texture | null = null;

		const load = async () => {
			const response = await fetch(`${atlasUrl}/${atlasName}.json`);
			if (!response.ok) throw new Error(`atlas ${atlasName}.json: ${response.status}`);
			const font = (await response.json()) as BMFont;

			const image = new Image();
			image.src = `${atlasUrl}/${atlasName}.png`;
			await image.decode();
			if (cancelled) return;

			// A distance field must not be smoothed or colour-managed on the way
			// in; the shader filters the raw texels itself.
			const texture = new Texture(image);
			texture.needsUpdate = true;
			texture.colorSpace = NoColorSpace;
			texture.minFilter = LinearFilter;
			texture.magFilter = LinearFilter;
			texture.generateMipmaps = false;
			made = texture;

			setLoaded({
				font,
				atlas: {
					texture,
					scaleW: font.common.scaleW,
					distanceRange: font.distanceField?.distanceRange ?? 4,
				},
			});
		};

		load().catch((error) => {
			// A missing atlas is not a page error: the document still holds the
			// readable string. Say so once and carry on.
			if (!cancelled) console.warn(`[ui-lib] CrystalText could not load its atlas: ${error}`);
		});

		return () => {
			cancelled = true;
			made?.dispose();
		};
	}, [atlasUrl, atlasName]);

	// Anchors and rotations arrive as literals. Holding them in refs keeps the
	// mesh effect below from depending on a fresh identity every render — the
	// stage republishes stats on a timer, so an array in the dependency list
	// tears the mesh down and rebuilds it several times a second.
	const anchorRef = useRef(anchor);
	anchorRef.current = anchor;
	const rotationRef = useRef(rotation);
	rotationRef.current = rotation;

	useEffect(() => {
		if (!layer || !loaded) return;

		const geometry = createTextGeometry(text, loaded.font);
		// The layout is authored in atlas pixels. `size` means a height in world
		// units, so normalise by the real bounds: a 48px em layout scaled
		// directly would be ~370 world units across, against a camera whose
		// whole view is about 4.
		geometry.computeBoundingBox();
		const box = geometry.boundingBox;
		const glyphHeight = box ? box.max.y - box.min.y : 0;
		const scale = glyphHeight > 0 ? size / glyphHeight : size / 48;
		if (box) geometry.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, 0);

		const material = createTextMaterial({ atlas: loaded.atlas, color, opacity });
		const mesh = new Mesh(geometry, material);
		mesh.scale.setScalar(scale);
		const r = rotationRef.current;
		if (r) mesh.rotation.set(r[0], r[1], r[2]);
		mesh.frustumCulled = false;

		const object = layer.addWorldObject(mesh, undefined, { refractive: true });
		const follow = anchorRef.current?.current
			? layer.follow(
					() => anchorRef.current?.current ?? null,
					(point) => mesh.position.set(point[0], point[1], point[2]),
					0,
				)
			: null;

		return () => {
			follow?.dispose();
			object.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [layer, loaded, text, size, color, opacity]);

	return null;
}
