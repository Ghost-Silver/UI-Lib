import {
	type BMFont,
	createTextGeometry,
	createTextMaterial,
	type TextAtlas,
} from "@ui-lib/shaders";
import { useEffect, useRef, useState } from "react";
import { LinearFilter, Mesh, NoColorSpace, Texture } from "three/webgpu";
import { useGlassStage } from "./context.js";

/*
 * NOT EXPORTED, AND NOT YET USABLE.
 *
 * It draws. Getting that far took finding three separate defects, two of which
 * were silent:
 *
 *  - **Back-face culling.** `createTextGeometry` winds its quads top-left ->
 *    top-right -> bottom-right, which is clockwise from +Z and therefore a back
 *    face under three's default. Every glyph was culled and nothing reported
 *    it. Fixed with `side: DoubleSide` in `createTextMaterial` rather than by
 *    reordering the indices, because `sampleTextPoints` reads index `i` and
 *    `i + 2` as opposite corners of a quad and depends on that order.
 *  - **Scale.** The layout is in atlas pixels; `size` now means a height in
 *    world units, normalised by the real bounding box.
 *  - **Coverage applied twice.** Multiplying the colour by alpha in the shader
 *    and again in three's `srcAlpha` blend squares the coverage. Split into
 *    `colorNode` / `opacityNode`.
 *
 * What is left: the glyphs render in the right place at the right size and are
 * **far too faint to use** — a pale wash on the card rather than ink. Ruled
 * out: the atlas polarity and saturation (sampled directly — inside reaches
 * 255), placement (`follow` resolves the slot and reports
 * `[4.81, 2.08, 0]`), and the anti-aliasing width, whose derivation
 * `scaleW / (2 * distanceRange)` matches the measured per-pixel change in
 * `sigDist` to within a few percent.
 *
 * Next: the atlas's usable range against the stroke width it actually
 * rasterised, then whether the post chain is attenuating a `transparent`
 * material in the world pass.
 *
 * Kept as a starting point and out of the export surface, so nothing can depend
 * on a component that renders a ghost.
 */

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
 * Without a stage, or before the atlas arrives, it renders nothing and the
 * page is unaffected.
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
		// TEMP-DIAG
		(window as unknown as Record<string, unknown>).__crystalFollowCalled =
			anchorRef.current?.current != null;
		const follow = anchorRef.current?.current
			? layer.follow(
					() => {
						const el = anchorRef.current?.current ?? null;
						// TEMP-DIAG
						(window as unknown as Record<string, unknown>).__crystalAnchor = el
							? {
									tag: el.tagName,
									cls: String(el.className),
									rects: el.getClientRects().length,
								}
							: null;
						return el;
					},
					(point) => {
						mesh.position.set(point[0], point[1], point[2]);
						// TEMP-DIAG
						const w = window as unknown as Record<string, unknown>;
						const seen = (w.__crystalSeen as number) ?? 0;
						w.__crystalSeen = seen + 1;
						w.__crystalPos = [point[0], point[1], point[2]];
						w.__crystalScale = mesh.scale.x;
					},
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
