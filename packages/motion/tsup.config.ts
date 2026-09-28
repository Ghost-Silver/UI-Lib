import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	target: "es2022",
	// Keep the shared scheduler a single module. Inlining core here would give
	// scroll its own clock and tear against the renderer.
	external: ["@ui-lib/core"],
});
