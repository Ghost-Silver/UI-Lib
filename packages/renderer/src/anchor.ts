import { type PerspectiveCamera, Vector3 } from "three/webgpu";

const rayNear = new Vector3();
const rayFar = new Vector3();
const rayHit = new Vector3();
const rayForward = new Vector3();
const rayOffset = new Vector3();

/** A hit farther than this is a grazing ray. Callers keep the last point. */
const MAX_HIT_DISTANCE_SQ = 1e8;

/**
 * How a DOM slot becomes a world point.
 *
 * `fit` wins, then `distance`, then `plane`. `fit` needs `radius`: the
 * sphere's projected diameter matches that fraction of the slot's shorter side,
 * so a dolly or a zoom does not resize it. `distance` is world units along the
 * ray — the centre stays on the slot, and a dolly still changes the size.
 */
export interface AnchorPlacement {
	plane?: number;
	distance?: number;
	fit?: number;
	radius?: number;
}

/**
 * NDC from a client pixel. `x` is right, `y` is up, matching three's camera.
 * Returns null when the canvas has no area yet.
 */
/**
 * Client pixel from the tracker's smoothed sample.
 *
 * A window tracker already stores client pixels. A section tracker stores
 * pixels relative to the stage, which is also what the glass highlight uses.
 * Adding the stage origin once makes `clientToNdc` undo the same offset.
 */
export function pointerClient(
	smoothX: number,
	smoothY: number,
	bounds: { left: number; top: number },
	local: boolean,
): readonly [number, number] {
	if (!local) return [smoothX, smoothY];
	return [bounds.left + smoothX, bounds.top + smoothY];
}

export function clientToNdc(
	clientX: number,
	clientY: number,
	bounds: { left: number; top: number; width: number; height: number },
): readonly [number, number] | null {
	if (!(bounds.width >= 1) || !(bounds.height >= 1)) return null;
	return [
		((clientX - bounds.left) / bounds.width) * 2 - 1,
		1 - ((clientY - bounds.top) / bounds.height) * 2,
	];
}

/**
 * Intersect the camera ray through NDC with the plane `z = planeZ`.
 *
 * The ray is three's own unproject, so a tilted camera and a reverse-Z
 * projection stay in agreement with the draw. A parallel ray, a hit behind
 * the camera, or a grazing hit returns null.
 */
export function rayPlanePoint(
	camera: PerspectiveCamera,
	ndcX: number,
	ndcY: number,
	planeZ: number,
): [number, number, number] | null {
	camera.updateMatrixWorld();
	rayNear.set(ndcX, ndcY, -1).unproject(camera);
	rayFar.set(ndcX, ndcY, 1).unproject(camera);
	rayFar.sub(rayNear);
	if (Math.abs(rayFar.z) < 1e-8) return null;
	const t = (planeZ - rayNear.z) / rayFar.z;
	rayHit.copy(rayNear).addScaledVector(rayFar, t);
	if (!Number.isFinite(rayHit.x) || !Number.isFinite(rayHit.y) || !Number.isFinite(rayHit.z)) {
		return null;
	}
	camera.getWorldDirection(rayForward);
	rayOffset.copy(rayHit).sub(camera.position);
	if (rayOffset.dot(rayForward) <= 1e-5) return null;
	if (rayOffset.lengthSq() > MAX_HIT_DISTANCE_SQ) return null;
	return [rayHit.x, rayHit.y, rayHit.z];
}

/**
 * Direction from the camera through NDC, into the scene. Module scratch —
 * use it before the next anchor query.
 */
function rayThrough(camera: PerspectiveCamera, ndcX: number, ndcY: number): Vector3 | null {
	camera.updateMatrixWorld();
	camera.getWorldDirection(rayForward);
	rayNear.set(ndcX, ndcY, -1).unproject(camera);
	rayOffset.copy(rayNear).sub(camera.position);
	if (rayOffset.dot(rayForward) <= 1e-6) {
		rayFar.set(ndcX, ndcY, 1).unproject(camera);
		rayOffset.copy(rayFar).sub(camera.position);
	}
	if (rayOffset.dot(rayForward) <= 1e-6 || rayOffset.lengthSq() < 1e-12) return null;
	return rayOffset.normalize();
}

/** Point on the ray through NDC, `distance` world units from the camera. */
export function pointAtDistance(
	camera: PerspectiveCamera,
	ndcX: number,
	ndcY: number,
	distance: number,
): [number, number, number] | null {
	if (!(distance > 0) || distance * distance > MAX_HIT_DISTANCE_SQ) return null;
	const dir = rayThrough(camera, ndcX, ndcY);
	if (!dir) return null;
	rayHit.copy(camera.position).addScaledVector(dir, distance);
	if (!Number.isFinite(rayHit.x) || !Number.isFinite(rayHit.y) || !Number.isFinite(rayHit.z)) {
		return null;
	}
	return [rayHit.x, rayHit.y, rayHit.z];
}

/**
 * Place a sphere of `radius` so its projected diameter is `spanPx` CSS pixels.
 * Depth, not ray length, is what the projection uses, so an off-centre slot
 * stays the same size as a centred one.
 */
export function pointForSpan(
	camera: PerspectiveCamera,
	ndcX: number,
	ndcY: number,
	radius: number,
	spanPx: number,
	viewHeightPx: number,
): [number, number, number] | null {
	if (!(radius > 0) || !(spanPx > 1) || !(viewHeightPx > 1) || !(camera.fov > 0)) return null;
	const fovRad = (camera.fov * Math.PI) / 180;
	const angular = (spanPx / viewHeightPx) * fovRad;
	if (!(angular > 1e-4) || angular > Math.PI * 0.85) return null;
	const depth = radius / Math.tan(angular * 0.5);
	if (depth < camera.near + radius * 0.25) return null;
	const dir = rayThrough(camera, ndcX, ndcY);
	if (!dir) return null;
	const along = dir.dot(rayForward);
	if (along < 1e-4) return null;
	const rayDistance = depth / along;
	if (rayDistance * rayDistance > MAX_HIT_DISTANCE_SQ) return null;
	rayHit.copy(camera.position).addScaledVector(dir, rayDistance);
	if (!Number.isFinite(rayHit.x) || !Number.isFinite(rayHit.y) || !Number.isFinite(rayHit.z)) {
		return null;
	}
	return [rayHit.x, rayHit.y, rayHit.z];
}
