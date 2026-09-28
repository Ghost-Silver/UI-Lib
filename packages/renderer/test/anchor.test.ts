import { PerspectiveCamera, Vector3 } from "three/webgpu";
import { describe, expect, it } from "vitest";
import {
	clientToNdc,
	pointAtDistance,
	pointerClient,
	pointForSpan,
	rayPlanePoint,
} from "../src/anchor.js";

function cameraAt(
	position: [number, number, number],
	target: [number, number, number],
	fov = 52,
	aspect = 16 / 9,
): PerspectiveCamera {
	const camera = new PerspectiveCamera(fov, aspect, 0.1, 100);
	camera.position.set(position[0], position[1], position[2]);
	camera.lookAt(target[0], target[1], target[2]);
	camera.updateProjectionMatrix();
	return camera;
}

describe("pointerClient", () => {
	it("keeps a window sample in client space and adds the section origin", () => {
		const bounds = { left: 120, top: 40 };
		expect(pointerClient(36, 18, bounds, false)).toEqual([36, 18]);
		expect(pointerClient(36, 18, bounds, true)).toEqual([156, 58]);
	});
});

describe("clientToNdc", () => {
	it("maps the canvas corners and centre", () => {
		const bounds = { left: 100, top: 40, width: 200, height: 100 };
		expect(clientToNdc(200, 90, bounds)).toEqual([0, 0]);
		expect(clientToNdc(100, 40, bounds)).toEqual([-1, 1]);
		expect(clientToNdc(300, 140, bounds)).toEqual([1, -1]);
		expect(clientToNdc(0, 0, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
	});
});

describe("rayPlanePoint", () => {
	it("hits the look-at point on z = 0 for a straight and a tilted camera", () => {
		const straight = cameraAt([0, 0, 10], [0, 0, 0], 90, 1);
		const center = rayPlanePoint(straight, 0, 0, 0);
		expect(center).not.toBeNull();
		expect(center?.[0]).toBeCloseTo(0, 5);
		expect(center?.[1]).toBeCloseTo(0, 5);
		expect(center?.[2]).toBeCloseTo(0, 5);

		const edge = rayPlanePoint(straight, 1, 0, 0);
		expect(edge?.[0]).toBeCloseTo(10, 4);
		expect(edge?.[1]).toBeCloseTo(0, 4);
		expect(edge?.[2]).toBeCloseTo(0, 4);

		const tilted = cameraAt([0, 5, 10], [0, 0, 0], 48, 1.4);
		const look = rayPlanePoint(tilted, 0, 0, 0);
		expect(look?.[0]).toBeCloseTo(0, 4);
		expect(look?.[1]).toBeCloseTo(0, 4);
		expect(look?.[2]).toBeCloseTo(0, 4);
	});

	it("projects back to the requested NDC on a product-page camera", () => {
		const camera = cameraAt([-0.55, 0.18, 9.6], [0.55, 0.02, 0], 34, 16 / 9);
		const ndc: [number, number] = [0.48, 0.08];
		const point = rayPlanePoint(camera, ndc[0], ndc[1], 0);
		expect(point).not.toBeNull();
		const projected = new Vector3(point?.[0], point?.[1], point?.[2]).project(camera);
		expect(projected.x).toBeCloseTo(ndc[0], 4);
		expect(projected.y).toBeCloseTo(ndc[1], 4);
	});

	it("keeps a fixed distance on the ray, including off centre", () => {
		const camera = cameraAt([-0.55, 0.18, 9.6], [0.55, 0.02, 0], 34, 16 / 9);
		const ndc: [number, number] = [0.48, 0.08];
		const point = pointAtDistance(camera, ndc[0], ndc[1], 8.5);
		expect(point).not.toBeNull();
		const distance = new Vector3(point?.[0], point?.[1], point?.[2]).distanceTo(
			camera.position,
		);
		expect(distance).toBeCloseTo(8.5, 4);
		const projected = new Vector3(point?.[0], point?.[1], point?.[2]).project(camera);
		expect(projected.x).toBeCloseTo(ndc[0], 4);
		expect(projected.y).toBeCloseTo(ndc[1], 4);
		expect(pointAtDistance(camera, 0, 0, 0)).toBeNull();

		const edge = pointAtDistance(camera, 0.92, -0.55, 8.5);
		const plane = rayPlanePoint(camera, 0.92, -0.55, 0);
		expect(edge).not.toBeNull();
		expect(plane).not.toBeNull();
		const edgeDistance = new Vector3(edge?.[0], edge?.[1], edge?.[2]).distanceTo(
			camera.position,
		);
		const planeDistance = new Vector3(plane?.[0], plane?.[1], plane?.[2]).distanceTo(
			camera.position,
		);
		expect(edgeDistance).toBeCloseTo(8.5, 4);
		expect(planeDistance).toBeGreaterThan(edgeDistance + 2);
	});

	it("solves depth so a sphere covers the requested pixel span", () => {
		const camera = cameraAt([0, 0, 10], [0, 0, 0], 90, 1);
		const viewH = 1000;
		const radius = 1;
		const depth = 10;
		const span = (viewH * (2 * Math.atan(radius / depth))) / (Math.PI / 2);
		const point = pointForSpan(camera, 0, 0, radius, span, viewH);
		expect(point?.[0]).toBeCloseTo(0, 3);
		expect(point?.[1]).toBeCloseTo(0, 3);
		expect(point?.[2]).toBeCloseTo(0, 3);

		const tilted = cameraAt([-0.55, 0.18, 9.6], [0.55, 0.02, 0], 34, 16 / 9);
		const off: [number, number] = [0.42, -0.12];
		const fitted = pointForSpan(tilted, off[0], off[1], 1.05, 280, 900);
		expect(fitted).not.toBeNull();
		const projected = new Vector3(fitted?.[0], fitted?.[1], fitted?.[2]).project(tilted);
		expect(projected.x).toBeCloseTo(off[0], 4);
		expect(projected.y).toBeCloseTo(off[1], 4);
		expect(pointForSpan(camera, 0, 0, 1, 0, viewH)).toBeNull();
	});

	it("keeps the last point when the plane is behind the camera or the ray is parallel", () => {
		const lookingAway = cameraAt([0, 0, -4], [0, 0, -8], 50, 1);
		expect(rayPlanePoint(lookingAway, 0, 0, 0)).toBeNull();

		const alongPlane = cameraAt([0, 0, 5], [8, 0, 5], 50, 1);
		expect(rayPlanePoint(alongPlane, 0, 0, 0)).toBeNull();
	});
});
