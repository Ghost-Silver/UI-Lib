import type { GlassLayerStats } from "@ui-lib/renderer";

interface StatusHudProps {
	stats: GlassLayerStats | null;
	status: string;
	forceFallback: boolean;
}

export function StatusHud({ stats, status, forceFallback }: StatusHudProps) {
	const backend = stats?.backend ?? (forceFallback ? "css" : "…");
	const badge =
		backend === "webgpu"
			? "WebGPU"
			: backend === "webgl2"
				? "WebGL 2"
				: backend === "css"
					? "CSS"
					: "…";

	return (
		<aside className="hud" aria-live="polite">
			<div className="hud__row">
				<span className={`hud__badge hud__badge--${backend}`}>{badge}</span>
				<span className="hud__status">{status}</span>
			</div>
			<dl className="hud__grid">
				<div>
					<dt>FPS</dt>
					<dd>{stats ? stats.fps.toFixed(0) : "—"}</dd>
				</div>
				<div>
					<dt>Tier</dt>
					<dd>{stats ? stats.tier : "—"}</dd>
				</div>
				<div>
					<dt>DPR</dt>
					<dd>{stats ? stats.dpr.toFixed(2) : "—"}</dd>
				</div>
				<div>
					<dt>Panels</dt>
					<dd>{stats ? `${stats.visiblePanels}/${stats.panels}` : "—"}</dd>
				</div>
				<div>
					<dt>Buffer</dt>
					<dd>{stats ? `${stats.bufferWidth}×${stats.bufferHeight}` : "—"}</dd>
				</div>
				<div>
					<dt>Motion</dt>
					<dd>{stats?.reducedMotion ? "reduced" : "full"}</dd>
				</div>
			</dl>
		</aside>
	);
}
