import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	target: "es2022",
	sourcemap: true,
	external: ["@ui-lib/core", "@ui-lib/renderer", "@ui-lib/particles"],
});
