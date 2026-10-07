import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/gpu.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	target: "es2022",
	external: [
		"react",
		"react-dom",
		"three",
		"three/webgpu",
		"three/tsl",
		"@ui-lib/core",
		"@ui-lib/motion",
		"@ui-lib/particles",
		"@ui-lib/renderer",
		"@ui-lib/shaders",
	],
});
