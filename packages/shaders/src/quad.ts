import { Mesh, OrthographicCamera, PlaneGeometry } from "three/webgpu";

/**
 * A 2×2 plane plus a matching orthographic camera — the standard vehicle for
 * full-viewport passes (backdrops, blits, post-processing quads).
 */
export interface FullscreenQuad {
	mesh: Mesh;
	camera: OrthographicCamera;
	geometry: PlaneGeometry;
	dispose(): void;
}

export function createFullscreenQuad(material: Mesh["material"]): FullscreenQuad {
	const geometry = new PlaneGeometry(2, 2);
	const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
	const mesh = new Mesh(geometry, material);
	mesh.frustumCulled = false;
	return {
		mesh,
		camera,
		geometry,
		dispose() {
			geometry.dispose();
		},
	};
}
