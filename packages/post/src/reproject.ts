/**
 * Screen-space velocity of a fragment, in device pixels.
 *
 * `uv` is top-left origin, matching `screenUV`. `depth` is the perspective
 * depth stored in the world render target, 0 at the near plane and 1 at the
 * far plane in three's standard window-Z. `inverseViewProjection` is the CPU
 * inverse of the current unjittered view-projection (the shader does not
 * invert a mat4 itself). The result is current minus previous: history should
 * be sampled at `uv - velocity / resolution`.
 */
export type Mat4 = readonly [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
];

export function reprojectionVelocity(
	uvX: number,
	uvY: number,
	depth: number,
	inverseViewProjection: Mat4,
	previousViewProjection: Mat4,
	width: number,
	height: number,
): [number, number] {
	const ndcX = uvX * 2 - 1;
	const ndcY = (1 - uvY) * 2 - 1;
	const ndcZ = depth * 2 - 1;
	const world = transform(inverseViewProjection, ndcX, ndcY, ndcZ, 1);
	const invW = Math.abs(world[3]) < 1e-8 ? 1e8 : 1 / world[3];
	const prev = transform(
		previousViewProjection,
		world[0] * invW,
		world[1] * invW,
		world[2] * invW,
		1,
	);
	const prevW = Math.abs(prev[3]) < 1e-8 ? 1e8 : 1 / prev[3];
	const prevUvX = prev[0] * prevW * 0.5 + 0.5;
	const prevUvY = 1 - (prev[1] * prevW * 0.5 + 0.5);
	return [(uvX - prevUvX) * width, (uvY - prevUvY) * height];
}

function transform(
	m: Mat4,
	x: number,
	y: number,
	z: number,
	w: number,
): [number, number, number, number] {
	return [
		m[0] * x + m[4] * y + m[8] * z + m[12] * w,
		m[1] * x + m[5] * y + m[9] * z + m[13] * w,
		m[2] * x + m[6] * y + m[10] * z + m[14] * w,
		m[3] * x + m[7] * y + m[11] * z + m[15] * w,
	];
}
