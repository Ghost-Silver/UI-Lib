import { createParticleSystem, type ParticleSystemOptions } from "@ui-lib/particles";
import type { ParticleLayerOptions } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";
import { useGlassStage } from "./context.js";
import { stableKey } from "./utils.js";

export interface ParticleFieldProps {
	/** GPU simulation and material options. */
	options?: ParticleSystemOptions;
	/** Perspective camera framing for the shared particle scene. */
	camera?: ParticleLayerOptions;
	/** Map the pointer to the particle attractor on the camera-facing plane. */
	pointer?: boolean;
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
	pointer = false,
	enabled = true,
}: ParticleFieldProps) {
	const { layer } = useGlassStage();
	const optionsKey = stableKey(options);
	const cameraKey = stableKey(camera);
	const optionsRef = useRef(options);
	const cameraRef = useRef(camera);
	optionsRef.current = options;
	cameraRef.current = camera;

	// biome-ignore lint/correctness/useExhaustiveDependencies: content keys intentionally replace object identity dependencies.
	useEffect(() => {
		if (!layer || !enabled) return;

		const system = createParticleSystem(optionsRef.current);
		const attachment = layer.addParticles(system, cameraRef.current);
		if (!pointer) return () => attachment.dispose();

		const onPointerMove = (event: PointerEvent) => {
			const cameraOptions = cameraRef.current;
			const position = cameraOptions?.cameraPosition ?? [0, 0, 14];
			const target = cameraOptions?.cameraTarget ?? [0, 0, 0];
			const fov = cameraOptions?.fov ?? 52;
			const depth = Math.max(0.1, Math.abs(position[2] - target[2]));
			const viewHeight = 2 * depth * Math.tan((fov * Math.PI) / 360);
			const viewWidth = viewHeight * (window.innerWidth / Math.max(window.innerHeight, 1));
			const ndcX = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
			const ndcY = 1 - (event.clientY / Math.max(window.innerHeight, 1)) * 2;
			system.setAttractor(
				target[0] + ndcX * viewWidth * 0.5,
				target[1] + ndcY * viewHeight * 0.5,
				target[2],
			);
		};
		window.addEventListener("pointermove", onPointerMove, { passive: true });

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			attachment.dispose();
		};
	}, [layer, enabled, pointer, optionsKey, cameraKey]);

	return null;
}
