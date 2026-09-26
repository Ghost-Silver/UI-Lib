import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	plugins: [react()],
	resolve: {
		// Workspace sources, so the playground hot-reloads library changes without
		// a build step in between.
		alias: {
			"@ui-lib/react": r("../../packages/react/src/index.ts"),
			"@ui-lib/renderer": r("../../packages/renderer/src/index.ts"),
			"@ui-lib/shaders": r("../../packages/shaders/src/index.ts"),
			"@ui-lib/core": r("../../packages/core/src/index.ts"),
		},
		dedupe: ["three", "react", "react-dom"],
	},
	server: {
		host: "0.0.0.0",
		port: 5173,
		strictPort: true,
		// The playground is served through a proxied preview host.
		allowedHosts: true,
		hmr: { protocol: "wss", clientPort: 443 },
	},
	preview: {
		host: "0.0.0.0",
		port: 4173,
		allowedHosts: true,
	},
	build: { target: "es2022", sourcemap: true },
});
