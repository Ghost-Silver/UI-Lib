import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Dev-only telemetry hookback: page errors on the *real device* are POSTed here
// and appended to a log the developer can read. This is how we captured the
// actual WebGPU validation failure that a desktop (no-GPU) env cannot reproduce.
function uiLibDiag(): Plugin {
	const diagDir = join(dirname(fileURLToPath(import.meta.url)), "../../.diag");
	return {
		name: "ui-lib-diag",
		configureServer(server) {
			server.middlewares.use("/__ui-lib-diag", (req, res, next) => {
				if (req.method !== "POST") return next();
				const chunks: Buffer[] = [];
				req.on("data", (c) => chunks.push(c));
				req.on("end", () => {
					try {
						mkdirSync(diagDir, { recursive: true });
						const line = `[${new Date().toISOString()}] ${Buffer.concat(chunks).toString("utf8")}\n`;
						appendFileSync(join(diagDir, "diag.log"), line);
					} catch {}
					res.statusCode = 204;
					res.end();
				});
			});
		},
	};
}

export default defineConfig({
	plugins: [react(), uiLibDiag()],
	resolve: {
		// Workspace sources, so the playground hot-reloads library changes without
		// a build step in between.
		/*
		 * An **array**, not an object, and that is the whole point.
		 *
		 * Vite matches object aliases by longest prefix, but the subpath
		 * `@ui-lib/react/gpu` and the bare `@ui-lib/react` share that prefix, and an
		 * object gives no control over which wins — measured, the bare specifier won
		 * and every GPU import resolved to the main entry, which no longer exports
		 * those components. The page died with "does not provide an export named
		 * PointerTrail" and then with a 500 from the import analysis.
		 *
		 * An array is ordered, so the longer specifier can be listed first.
		 */
		alias: [
			{ find: "@ui-lib/react/gpu", replacement: r("../../packages/react/src/gpu.ts") },
			{ find: "@ui-lib/particles", replacement: r("../../packages/particles/src/index.ts") },
			{ find: "@ui-lib/post", replacement: r("../../packages/post/src/index.ts") },
			{ find: "@ui-lib/react", replacement: r("../../packages/react/src/index.ts") },
			{ find: "@ui-lib/renderer", replacement: r("../../packages/renderer/src/index.ts") },
			{ find: "@ui-lib/shaders", replacement: r("../../packages/shaders/src/index.ts") },
			{ find: "@ui-lib/core", replacement: r("../../packages/core/src/index.ts") },
			{ find: "@ui-lib/motion", replacement: r("../../packages/motion/src/index.ts") },
		],
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
