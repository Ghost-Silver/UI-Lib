import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	target: "es2022",
	external: [
		"three",
		"three/webgpu",
		"three/tsl",
		"@ui-lib/core",
		"@ui-lib/particles",
		"@ui-lib/post",
		"@ui-lib/shaders",
	],
});
