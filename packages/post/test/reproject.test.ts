import { Matrix4, PerspectiveCamera, Vector3 } from "three/webgpu";
import { describe, expect, it } from "vitest";
import { type Mat4, reprojectionVelocity } from "../src/reproject.js";

function viewProjection(camera: PerspectiveCamera): Matrix4 {
	camera.updateMatrixWorld();
	camera.updateProjectionMatrix();
	return new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
}

describe("reprojectionVelocity", () => {
	it("is zero when the camera does not move", () => {
		const camera = new PerspectiveCamera(48, 16 / 9, 0.1, 80);
		camera.position.set(0.2, 0.4, 9);
		camera.lookAt(0, 0, 0);
		const vp = viewProjection(camera);
		const inverse = vp.clone().invert();
		const point = new Vector3(0.4, -0.2, 0.1).project(camera);
		const uvX = point.x * 0.5 + 0.5;
		const uvY = 1 - (point.y * 0.5 + 0.5);
		const depth = point.z * 0.5 + 0.5;
		const [vx, vy] = reprojectionVelocity(
			uvX,
			uvY,
			depth,
			inverse.elements as unknown as Mat4,
			vp.elements as unknown as Mat4,
			1280,
			720,
		);
		expect(vx).toBeCloseTo(0, 4);
		expect(vy).toBeCloseTo(0, 4);
	});

	it("matches three.project for a moving perspective camera", () => {
		const current = new PerspectiveCamera(50, 16 / 9, 0.1, 100);
		current.position.set(1.1, 0.35, 7.2);
		current.lookAt(0.2, 0.1, 0);
		const previous = new PerspectiveCamera(50, 16 / 9, 0.1, 100);
		previous.position.set(0.4, 0.2, 8);
		previous.lookAt(0, 0, 0);
		const currentVP = viewProjection(current);
		const previousVP = viewProjection(previous);
		const point = new Vector3(0.3, -0.2, 0.4);
		const now = point.clone().project(current);
		const then = point.clone().project(previous);
		const uvX = now.x * 0.5 + 0.5;
		const uvY = 1 - (now.y * 0.5 + 0.5);
		const depth = now.z * 0.5 + 0.5;
		const width = 1280;
		const height = 720;
		const [vx, vy] = reprojectionVelocity(
			uvX,
			uvY,
			depth,
			currentVP.clone().invert().elements as unknown as Mat4,
			previousVP.elements as unknown as Mat4,
			width,
			height,
		);
		const expectedX = (uvX - (then.x * 0.5 + 0.5)) * width;
		const expectedY = (uvY - (1 - (then.y * 0.5 + 0.5))) * height;
		expect(vx).toBeCloseTo(expectedX, 2);
		expect(vy).toBeCloseTo(expectedY, 2);
		expect(Math.hypot(vx, vy)).toBeGreaterThan(1);
	});
});
