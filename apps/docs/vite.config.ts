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
		alias: {
			"@ui-lib/particles": r("../../packages/particles/src/index.ts"),
			"@ui-lib/post": r("../../packages/post/src/index.ts"),
			"@ui-lib/react": r("../../packages/react/src/index.ts"),
			"@ui-lib/renderer": r("../../packages/renderer/src/index.ts"),
			"@ui-lib/shaders": r("../../packages/shaders/src/index.ts"),
			"@ui-lib/core": r("../../packages/core/src/index.ts"),
			"@ui-lib/motion": r("../../packages/motion/src/index.ts"),
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
