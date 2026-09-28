import { dot, float, length, max, mix, saturate, smoothstep, vec2 } from "three/tsl";
import type { Node } from "three/webgpu";

/**
 * Pointer highlight shared by DOM glass and the world lens.
 *
 * Velocity is the same smoothed sample as the highlight position, in buffer
 * pixels per second. At rest the falloff is the old circle and the strength
 * is unchanged. A moving pointer stretches the sheen along the stroke and
 * adds at most 22% — a lean, not a lamp. The curve is in buffer pixels, so a
 * normal hand reads on a 2× display without changing the resting circle.
 */
export function pointerSheen(
	screen: Node<"vec2">,
	resolution: Node<"vec2">,
	pointer: Node<"vec2">,
	velocity: Node<"vec2">,
	radius: Node<"float">,
	strength: Node<"float">,
): Node<"float"> {
	const delta = screen.mul(resolution).sub(pointer);
	const speed = length(velocity);
	const dir = velocity.div(max(speed, float(0.001)));
	const along = dot(delta, dir);
	const across = length(delta.sub(dir.mul(along)));
	const motion = smoothstep(float(120), float(560), speed);
	const stretch = mix(float(1), float(1.7), motion);
	const dist = length(vec2(along.div(stretch), across));
	const boost = float(1).add(motion.mul(0.22));
	return saturate(float(1).sub(dist.div(max(radius, float(1)))))
		.pow(2)
		.mul(strength)
		.mul(boost);
}
