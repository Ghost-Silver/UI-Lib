import {
	defaultPointerDistance,
	stepTrail,
	TRAIL_CAPACITY,
	TRAIL_LIFE,
	type TrailPoint,
	trailPresence,
	trailWidth,
	writeRibbon,
	writeRibbonColors,
	writeRibbonIndices,
	writeSoftDisc,
} from "@ui-lib/renderer";
import { useEffect, useRef } from "react";
import { attribute } from "three/tsl";
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	DynamicDrawUsage,
	Group,
	Mesh,
	MeshBasicNodeMaterial,
} from "three/webgpu";
import { useGlassStage } from "./context.js";
import { readReducedMotion, subscribeReducedMotion } from "./reducedMotion.js";

export interface PointerTrailProps {
	/**
	 * World units from the camera. Omit it to use the camera-to-target distance,
	 * which is also what `<ParticleField pointer />` uses.
	 */
	distance?: number;
	/** Samples in the ribbon. Short on purpose. Capped at {@link TRAIL_CAPACITY}. */
	length?: number;
	/** World-unit width of the core at rest. A flick widens it, then it settles. */
	width?: number;
	/** CSS color. The ribbon fades to a fraction of this so it stays under bloom. */
	color?: string;
	/** Head brightness in linear units, before the color. Kept under 1. */
	gain?: number;
	enabled?: boolean;
}

const DISC_SEGMENTS = 14;

/**
 * A short gesture on the stage's pointer ray.
 *
 * The head, the core and a wider faint ribbon are the same sample the glass
 * highlight uses this frame. Speed only changes spacing and width; a still
 * hand does not grow a trail. Reduced motion drops the history and keeps the
 * head on the current point.
 */
export function PointerTrail({
	distance,
	length = 22,
	width = 0.07,
	color = "#e7dcff",
	gain = 0.58,
	enabled = true,
}: PointerTrailProps) {
	const { layer } = useGlassStage();
	const distanceRef = useRef(distance);
	const lengthRef = useRef(length);
	const widthRef = useRef(width);
	const colorRef = useRef(color);
	const gainRef = useRef(gain);
	distanceRef.current = distance;
	lengthRef.current = length;
	widthRef.current = width;
	colorRef.current = color;
	gainRef.current = gain;

	useEffect(() => {
		if (!layer || !enabled) return;
		let reduced = readReducedMotion();
		const releaseMotion = subscribeReducedMotion((next) => {
			reduced = next;
		});

		const samples: TrailPoint[] = [];
		const points: [number, number, number][] = [];
		const ages: number[] = [];
		const core = makeRibbon();
		const haze = makeRibbon();
		const discVerts = DISC_SEGMENTS * 3;
		const discPositions = new Float32Array(discVerts * 3);
		const discColors = new Float32Array(discVerts * 3);
		const discGeo = new BufferGeometry();
		const discPos = new BufferAttribute(discPositions, 3);
		const discCol = new BufferAttribute(discColors, 3);
		discPos.setUsage(DynamicDrawUsage);
		discCol.setUsage(DynamicDrawUsage);
		discGeo.setAttribute("position", discPos);
		discGeo.setAttribute("color", discCol);

		const coreMat = ribbonMaterial();
		const hazeMat = ribbonMaterial();
		const discMat = ribbonMaterial();
		const coreMesh = new Mesh(core.geometry, coreMat);
		const hazeMesh = new Mesh(haze.geometry, hazeMat);
		const discMesh = new Mesh(discGeo, discMat);
		coreMesh.frustumCulled = false;
		hazeMesh.frustumCulled = false;
		discMesh.frustumCulled = false;
		coreMesh.renderOrder = 2;
		hazeMesh.renderOrder = 1;
		discMesh.renderOrder = 3;
		discMesh.visible = false;

		const group = new Group();
		group.add(hazeMesh, coreMesh, discMesh);
		group.frustumCulled = false;
		const world = layer.addWorldObject(group);
		const tint = new Color(colorRef.current);
		let painted = "";

		const follow = layer.followPointer(
			(ray) => {
				const css = colorRef.current;
				if (css !== painted) {
					painted = css;
					tint.set(css);
				}
				const gainNow = gainRef.current > 0 ? gainRef.current : 0;
				const liveWidth = reduced ? widthRef.current : trailWidth(widthRef.current, ray.speed);
				const camera = layer.getCamera().position;
				const rgb: [number, number, number] = [tint.r, tint.g, tint.b];
				const written = writeSoftDisc(
					discPositions,
					discColors,
					ray.point,
					camera,
					Math.max(liveWidth, 0.01) * 1.7,
					rgb,
					gainNow * 0.72,
					DISC_SEGMENTS,
				);
				discPos.needsUpdate = true;
				discCol.needsUpdate = true;
				discGeo.setDrawRange(0, written);
				discMesh.visible = written > 0;
				if (reduced) {
					samples.length = 0;
					core.geometry.setDrawRange(0, 0);
					haze.geometry.setDrawRange(0, 0);
					return;
				}
				stepTrail(samples, ray.point, ray.dt, ray.speed, lengthRef.current);
				points.length = 0;
				ages.length = 0;
				for (const sample of samples) {
					points.push(sample.at);
					ages.push(sample.age);
				}
				const presence = trailPresence(ray.speed);
				paintRibbon(core, points, ages, camera, liveWidth, rgb, gainNow * presence);
				paintRibbon(
					haze,
					points,
					ages,
					camera,
					liveWidth * 2.3,
					rgb,
					gainNow * 0.28 * presence,
				);
			},
			() => {
				const explicit = distanceRef.current;
				if (explicit !== undefined && explicit > 0) return explicit;
				const live = layer.getCamera();
				return defaultPointerDistance(live.position, live.target);
			},
		);

		return () => {
			releaseMotion();
			follow.dispose();
			world.dispose();
			core.geometry.dispose();
			haze.geometry.dispose();
			discGeo.dispose();
			coreMat.dispose();
			hazeMat.dispose();
			discMat.dispose();
		};
	}, [layer, enabled]);

	return null;
}

interface RibbonBuffer {
	geometry: BufferGeometry;
	positions: Float32Array;
	colors: Float32Array;
	position: BufferAttribute;
	color: BufferAttribute;
	indexReady: boolean;
}

function makeRibbon(): RibbonBuffer {
	const positions = new Float32Array(TRAIL_CAPACITY * 6);
	const colors = new Float32Array(TRAIL_CAPACITY * 6);
	const indices = new Uint16Array((TRAIL_CAPACITY - 1) * 6);
	const geometry = new BufferGeometry();
	const position = new BufferAttribute(positions, 3);
	const color = new BufferAttribute(colors, 3);
	position.setUsage(DynamicDrawUsage);
	color.setUsage(DynamicDrawUsage);
	geometry.setAttribute("position", position);
	geometry.setAttribute("color", color);
	writeRibbonIndices(indices, TRAIL_CAPACITY);
	geometry.setIndex(new BufferAttribute(indices, 1));
	geometry.setDrawRange(0, 0);
	return { geometry, positions, colors, position, color, indexReady: false };
}

function ribbonMaterial(): MeshBasicNodeMaterial {
	const material = new MeshBasicNodeMaterial();
	material.colorNode = attribute("color", "vec3");
	material.transparent = true;
	material.depthWrite = false;
	material.blending = AdditiveBlending;
	material.toneMapped = false;
	return material;
}

function paintRibbon(
	ribbon: RibbonBuffer,
	samples: readonly (readonly [number, number, number])[],
	ages: readonly number[],
	camera: readonly [number, number, number],
	width: number,
	rgb: readonly [number, number, number],
	gain: number,
): void {
	const count = writeRibbon(ribbon.positions, samples, camera, width);
	writeRibbonColors(ribbon.colors, count, rgb[0], rgb[1], rgb[2], gain, ages, TRAIL_LIFE);
	ribbon.position.needsUpdate = true;
	ribbon.color.needsUpdate = true;
	if (count >= 2 && !ribbon.indexReady) {
		const index = ribbon.geometry.getIndex();
		if (index) index.needsUpdate = true;
		ribbon.indexReady = true;
	}
	ribbon.geometry.setDrawRange(0, count >= 2 ? (count - 1) * 6 : 0);
}
