import { createContext, useContext } from "react";
import type { GlassLayer, GlassLayerStats } from "@ui-lib/renderer";

export type GlassStageStatus = "idle" | "loading" | "ready" | "unsupported";

export interface GlassStageValue {
	/** `null` until the GPU layer is ready — components must degrade gracefully. */
	layer: GlassLayer | null;
	status: GlassStageStatus;
	error: Error | null;
	stats: GlassLayerStats | null;
	setBackdrop(spec: Parameters<GlassLayer["setBackdrop"]>[0]): void;
}

export const GlassStageContext = createContext<GlassStageValue>({
	layer: null,
	status: "idle",
	error: null,
	stats: null,
	setBackdrop: () => {},
});

/**
 * Access the surrounding {@link GlassStage}.
 *
 * Never throws: outside a stage (or before the GPU is up) it reports
 * `status: "idle"`, and every UI-Lib component then renders its plain-DOM
 * fallback instead of crashing.
 */
export function useGlassStage(): GlassStageValue {
	return useContext(GlassStageContext);
}
