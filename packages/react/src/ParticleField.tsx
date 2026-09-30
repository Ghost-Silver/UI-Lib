import {
	createParticleSystem,
	type ParticleSystem,
	type ParticleSystemOptions,
	resolveParticleLod,
} from "@ui-lib/particles";
import {
	approachPoint,
	defaultPointerDistance,
	type ParticleDepth,
	type ParticleLayerOptions,
	stirBreath,
} from "@ui-lib/renderer";
import { useEffect, useRef, useState } from "react";
import { type DomAnchor, useAnchorFollow } from "./anchor.js";
import { useGlassStage } from "./context.js";
import { subscribeReducedMotion } from "./reducedMotion.js";
import { stableKey } from "./utils.js";

export interface ParticleFieldProps {
	/** GPU simulation and material options. */
	options?: ParticleSystemOptions;
	/** Perspective camera framing for the shared particle scene. */
	camera?: ParticleLayerOptions;
	/**
	 * `scene` is the page (DOM glass can refract it). `inside` lives only in
	 * a lens. `front` draws after the lens and is hidden where the lens is.
	 */
	depth?: ParticleDepth;
	/** Hold the cloud on a world-space point. Useful for keeping motes in a lens. */
	attractor?: [number, number, number];
	/**
	 * Follow a DOM element's center. Updates the attractor and the emitter
	 * uniform in the render phase — it does not change `options`, so the
	 * simulation is not recreated.
	 */
	anchor?: DomAnchor;
	/** World Z of the plane `anchor` maps onto. Ignored when `fit` or `distance` is set. */
	plane?: number;
	/** World units from the camera along the ray through the slot. */
	distance?: number;
	/** Projected diameter as a fraction of the slot's shorter side. Needs `fitRadius`. */
	fit?: number;
	/** Sphere radius used with `fit`, so the cloud solves the same point as the lens. */
	fitRadius?: number;
	/**
	 * Follow the stage pointer. The attractor and the emitter sit on the shared
	 * ray — the same smoothed sample the glass highlight uses, at a fixed
	 * distance — and the system steps after that ray resolves. A camera-facing
	 * plane runs away at the edge of the view; this does not.
	 */
	pointer?: boolean;
	/**
	 * World units from the camera along the pointer ray. Defaults to the
	 * camera-to-target distance, so a centred pointer stays near the look-at
	 * point and an edge pointer stays at the same depth.
	 */
	pointerDistance?: number;
	/**
	 * Walk a local eddy along the shared pointer ray. The center approaches;
	 * it does not snap, and the field does not stop when the hand does.
	 * A flick widens the eddy, then the authored stir returns. Unlike
	 * `pointer`, this does not move the emitter or the attractor.
	 */
	flow?: boolean;
	/** Where the eddy rests until the pointer enters. Defaults to the emitter. */
	stirAt?: [number, number, number];
	enabled?: boolean;
}

/**
 * Declarative GPU particles for a surrounding {@link GlassStage}.
 *
 * This component has no DOM output: the particles live in the stage's one
 * shared canvas, behind normal DOM content and before the glass pass, so glass
 * panels can refract them. The system is created only once the renderer is
 * ready and is fully disposed when the options or stage change.
 */
export function ParticleField({
	options = {},
	camera,
	depth = "scene",
	attractor,
	anchor,
	plane = 0,
	distance,
	fit,
	fitRadius,
	pointer = false,
	pointerDistance,
	flow = false,
	stirAt,
	enabled = true,
}: ParticleFieldProps) {
	const { layer } = useGlassStage();
	const optionsKey = stableKey(options);
	const cameraKey = stableKey(camera);
	const optionsRef = useRef(options);
	const cameraRef = useRef(camera);
	const attractorRef = useRef(attractor);
	const pointerDistanceRef = useRef(pointerDistance);
	const stirAtRef = useRef(stirAt);
	const systemRef = useRef<ParticleSystem | null>(null);
	const [autoBudget, setAutoBudget] = useState<number | null>(null);
	optionsRef.current = options;
	cameraRef.current = camera;
	attractorRef.current = attractor;
	pointerDistanceRef.current = pointerDistance;
	stirAtRef.current = stirAt;

	// biome-ignore lint/correctness/useExhaustiveDependencies: content keys intentionally replace object identity dependencies.
	useEffect(() => {
		if (!layer || !enabled) return;

		const requestedOptions = optionsRef.current;
		const count =
			requestedOptions.count === "auto"
				? resolveParticleLod({
						authored: "auto",
						budget: layer.particleBudget,
						backend: layer.backend,
					}).allocated
				: requestedOptions.count;
		if (!count) return;
		const system = createParticleSystem({ ...requestedOptions, count });
		systemRef.current = system;
		const held = attractorRef.current;
		if (held) system.setAttractor(held[0], held[1], held[2]);
		const attachment = layer.addParticles(system, {
			...cameraRef.current,
			depth,
		});
		const releaseHold = anchor || pointer || flow ? layer.holdParticleStep(system) : null;
		const origin = requestedOptions.emitter?.position ?? [0, 0, 0];
		const born: [number, number, number] = [origin[0], origin[1], origin[2]];
		const rest = stirAtRef.current ?? origin;
		const eddy: [number, number, number] = [rest[0], rest[1], rest[2]];
		if (flow) system.setStir(eddy[0], eddy[1], eddy[2]);
		const baseStir = requestedOptions.forces?.stir ?? 0;
		const baseRadius = requestedOptions.forces?.stirRadius ?? 0;
		let reduced = false;
		const distanceOf = () => {
			const override = pointerDistanceRef.current;
			if (override !== undefined && override > 0) return override;
			const live = layer.getCamera();
			return defaultPointerDistance(live.position, live.target);
		};
		const releasePointer = pointer
			? layer.followPointer((ray) => {
					const next = approachPoint(born, ray.point, ray.dt);
					born[0] = next[0];
					born[1] = next[1];
					born[2] = next[2];
					const point = ray.point;
					system.setAttractor(point[0], point[1], point[2]);
					system.update({ emitter: { position: born } });
				}, distanceOf)
			: null;
		const releaseFlow = flow
			? layer.followPointer((ray) => {
					if (reduced) return;
					const next = approachPoint(eddy, ray.point, ray.dt, 2.1);
					eddy[0] = next[0];
					eddy[1] = next[1];
					eddy[2] = next[2];
					system.setStir(eddy[0], eddy[1], eddy[2]);
					const breath = stirBreath(ray.speed, baseStir, baseRadius);
					system.update({ forces: { stir: breath.stir, stirRadius: breath.radius } });
				}, distanceOf)
			: null;
		const authoredTrail =
			typeof requestedOptions.trail === "number"
				? requestedOptions.trail === 0
					? 0
					: 0.32
				: (requestedOptions.trail?.opacity ?? (requestedOptions.trail ? 0.32 : 0));
		const releaseMotion = subscribeReducedMotion((next) => {
			reduced = next;
			system.setTrailOpacity(next ? 0 : authoredTrail);
			if (!flow || !next) return;
			eddy[0] = rest[0];
			eddy[1] = rest[1];
			eddy[2] = rest[2];
			system.setStir(eddy[0], eddy[1], eddy[2]);
			system.update({ forces: { stir: baseStir, stirRadius: baseRadius } });
		});

		const releaseBudget =
			requestedOptions.count === "auto"
				? layer.subscribeQuality((_tier, budget) => {
						const next = resolveParticleLod({
							authored: "auto",
							budget,
							backend: layer.backend,
						}).allocated;
						if (next > system.count) setAutoBudget(budget);
						else system.setActive(next);
					})
				: null;

		return () => {
			releaseBudget?.dispose();
			releaseMotion();
			releaseFlow?.dispose();
			releasePointer?.dispose();
			releaseHold?.dispose();
			systemRef.current = null;
			attachment.dispose();
		};
	}, [layer, enabled, pointer, flow, depth, optionsKey, cameraKey, anchor, autoBudget]);

	// Runs every commit on purpose: scroll parents move the attractor every frame,
	// and recreating the particle system for that would reset the simulation.
	useEffect(() => {
		if (pointer || anchor) return;
		const next = attractorRef.current;
		const system = systemRef.current;
		if (!next || !system) return;
		system.setAttractor(next[0], next[1], next[2]);
	});

	useAnchorFollow(
		pointer ? undefined : anchor,
		(point) => {
			const system = systemRef.current;
			if (!system) return;
			system.setAttractor(point[0], point[1], point[2]);
			system.update({ emitter: { position: [point[0], point[1], point[2]] } });
		},
		{ plane, distance, fit, radius: fitRadius },
	);

	return null;
}
