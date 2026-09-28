import { useEffect, useRef } from "react";
import {
	cameraPosition,
	dot,
	mix,
	normalize,
	normalWorld,
	oneMinus,
	positionWorld,
	saturate,
	uniform,
} from "three/tsl";
import {
	AdditiveBlending,
	Color,
	Group,
	Mesh,
	MeshBasicNodeMaterial,
	SphereGeometry,
	TorusGeometry,
} from "three/webgpu";
import { type DomAnchor, useAnchorFollow } from "./anchor.js";
import { useGlassStage } from "./context.js";
import { type LensLookName, type LensOptical, resolveLensLook } from "./looks.js";
import { subscribeReducedMotion } from "./reducedMotion.js";

export interface LensProps {
	/** Named optic. `crystal` is the capped default. `flare` is the previous hot one. */
	look?: LensLookName;
	/** Sphere radius in world units. */
	radius?: number;
	/**
	 * World position until `anchor` resolves, and the position used when there
	 * is no slot. A resolved slot does not write this back into React state.
	 */
	position?: [number, number, number];
	/**
	 * DOM node whose center the optic follows. Resolved after the camera update
	 * and before the draw, so a sibling that sets the camera cannot leave it a
	 * frame behind.
	 */
	anchor?: DomAnchor;
	/** World Z when the slot maps onto a plane. Ignored when `fit` or `distance` is set. */
	plane?: number;
	/**
	 * Keep the optic this many world units from the camera, on the ray through
	 * the slot. The centre stays put on screen; a dolly still changes the size.
	 */
	distance?: number;
	/**
	 * Projected diameter as a fraction of the slot's shorter side. The optic
	 * yields when the slot reflows, and a zoom does not resize it. Needs a
	 * sized slot — a 1px marker has nothing to fit.
	 */
	fit?: number;
	/** Euler radians, applied before the idle spin. */
	rotation?: [number, number, number];
	/** Magnification in device pixels. */
	refraction?: number;
	dispersion?: number;
	specular?: number;
	shininess?: number;
	caustic?: number;
	fresnel?: number;
	fresnelPower?: number;
	tint?: string;
	tintAmount?: number;
	highlight?: string;
	lightDirection?: [number, number];
	pointerStrength?: number;
	pointerRadius?: number;
	coreColor?: string;
	/** Additive core energy. 0 hides the point of light without removing the mesh. */
	coreStrength?: number;
	rimShadow?: string;
	rimColor?: string;
	rimStrength?: number;
	/**
	 * How strongly the shared studio shows in the glass. The look sets this.
	 * `0` keeps only the scene-copy rim. Pages do not pass a cubemap.
	 */
	environment?: number;
	/** Radians per second. Skipped when the user prefers reduced motion. */
	spin?: number;
	/** Thin equatorial ring. */
	ring?: boolean;
	/** Point of light at the centre, seen through the glass. */
	core?: boolean;
}

/**
 * A refractive sphere on the surrounding {@link GlassStage}.
 *
 * Pair it with `<ParticleField depth="inside" />`, or use {@link Optics}, when
 * the motes should live in the glass instead of covering the page. The
 * component renders nothing into the DOM. Optical constants update in place;
 * the mesh is rebuilt only when the radius or the ring / core toggles change.
 */
export function Lens({
	look = "crystal",
	radius = 1.22,
	position = [0, 0, 0],
	anchor,
	plane = 0,
	distance,
	fit,
	rotation = [0.62, 0, 0],
	refraction = 36,
	dispersion = 0.14,
	specular,
	shininess,
	caustic,
	fresnel,
	fresnelPower,
	tint,
	tintAmount,
	highlight,
	lightDirection,
	pointerStrength,
	pointerRadius,
	coreColor,
	coreStrength,
	rimShadow,
	rimColor,
	rimStrength,
	environment,
	spin = 0.06,
	ring = true,
	core = true,
}: LensProps) {
	const { layer } = useGlassStage();
	const optical = resolveLensLook(look, {
		specular,
		shininess,
		caustic,
		fresnel,
		fresnelPower,
		tint,
		tintAmount,
		highlight,
		lightDirection,
		pointerStrength,
		pointerRadius,
		coreColor,
		coreStrength,
		rimShadow,
		rimColor,
		rimStrength,
		environment,
	});
	const live = useRef({ position, rotation, refraction, dispersion, spin, optical });
	live.current = { position, rotation, refraction, dispersion, spin, optical };
	const held = useRef<[number, number, number] | null>(null);
	const anchorRef = useRef(anchor);
	const meshes = useRef<{ housing: Group; optic: Mesh } | null>(null);
	anchorRef.current = anchor;

	useEffect(() => {
		if (!layer) return;
		const lensGeo = new SphereGeometry(radius, 96, 64);
		const ringGeo = new TorusGeometry(radius * 1.33, Math.max(0.012, radius * 0.015), 12, 128);
		const coreGeo = new SphereGeometry(radius * 0.16, 24, 16);
		const initial = live.current;
		const lensMat = layer.createLensMaterial(materialOptions(initial.optical, initial));
		const ringMat = new MeshBasicNodeMaterial();
		const coreMat = new MeshBasicNodeMaterial();
		const viewDirection = normalize(cameraPosition.sub(positionWorld));
		const rim = oneMinus(saturate(dot(normalWorld, viewDirection))).pow(1.35);
		const rimFloor = uniform(new Color(initial.optical.rimShadow));
		const rimPeak = uniform(new Color(initial.optical.rimColor));
		const rimGain = uniform(initial.optical.rimStrength);
		const coreTint = uniform(new Color(initial.optical.coreColor));
		const coreGain = uniform(initial.optical.coreStrength);
		ringMat.colorNode = mix(rimFloor, rimPeak, rim.mul(rimGain));
		ringMat.depthWrite = true;
		ringMat.depthTest = true;
		ringMat.toneMapped = false;
		coreMat.colorNode = coreTint.mul(coreGain);
		coreMat.transparent = true;
		coreMat.depthWrite = false;
		coreMat.depthTest = false;
		coreMat.blending = AdditiveBlending;
		coreMat.toneMapped = false;

		const housing = new Group();
		const optic = new Mesh(lensGeo, lensMat);
		if (ring) {
			const band = new Mesh(ringGeo, ringMat);
			band.rotation.x = Math.PI / 2;
			housing.add(band);
		}
		if (core) housing.add(new Mesh(coreGeo, coreMat));

		let reduced = false;
		const releaseMotion = subscribeReducedMotion((next) => {
			reduced = next;
		});
		const drive = (info: { elapsed: number }) => {
			const next = live.current;
			const placed = anchorRef.current && held.current ? held.current : next.position;
			const [x, y, z] = placed;
			const [rx, ry, rz] = next.rotation;
			const turn = reduced ? 0 : next.spin * info.elapsed;
			housing.position.set(x, y, z);
			housing.rotation.set(rx, ry + turn, rz);
			optic.position.copy(housing.position);
			optic.quaternion.copy(housing.quaternion);
			lensMat.update(materialOptions(next.optical, next));
			rimFloor.value.set(next.optical.rimShadow);
			rimPeak.value.set(next.optical.rimColor);
			rimGain.value = next.optical.rimStrength;
			coreTint.value.set(next.optical.coreColor);
			coreGain.value = next.optical.coreStrength;
		};

		meshes.current = { housing, optic };
		drive({ elapsed: 0 });
		const housingHandle = layer.addWorldObject(housing, (info) => drive(info));
		const opticHandle = layer.addWorldObject(optic, undefined, { refractive: true });
		return () => {
			meshes.current = null;
			releaseMotion();
			housingHandle.dispose();
			opticHandle.dispose();
			lensGeo.dispose();
			ringGeo.dispose();
			coreGeo.dispose();
			lensMat.dispose();
			ringMat.dispose();
			coreMat.dispose();
		};
	}, [layer, radius, ring, core]);

	useAnchorFollow(
		anchor,
		(point) => {
			const next: [number, number, number] = [point[0], point[1], point[2]];
			held.current = next;
			const liveMeshes = meshes.current;
			if (!liveMeshes) return;
			liveMeshes.housing.position.set(next[0], next[1], next[2]);
			liveMeshes.optic.position.set(next[0], next[1], next[2]);
		},
		{ plane, distance, fit, radius },
	);

	return null;
}

function materialOptions(
	optical: LensOptical,
	motion: { refraction: number; dispersion: number },
) {
	return {
		refraction: motion.refraction,
		dispersion: motion.dispersion,
		specular: optical.specular,
		shininess: optical.shininess,
		caustic: optical.caustic,
		fresnel: optical.fresnel,
		fresnelPower: optical.fresnelPower,
		tint: optical.tint,
		tintAmount: optical.tintAmount,
		highlight: optical.highlight,
		lightDirection: optical.lightDirection,
		pointerStrength: optical.pointerStrength,
		pointerRadius: optical.pointerRadius,
		environment: optical.environment,
	};
}
