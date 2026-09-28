import type { Disposable } from "@ui-lib/core";
import type { AnchorPlacement } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";
import { useGlassStage } from "./context.js";

/**
 * A stable ref whose current node is the slot to follow.
 * `readonly` keeps the prop covariant, so a `HTMLDivElement` ref is accepted.
 */
export type DomAnchor = { readonly current: HTMLElement | null };

/**
 * Register a render-phase follower for `anchor`.
 *
 * The callback runs inside `GlassLayer.frame`, after the update-phase camera
 * write and before the draw, so it is not one frame behind a sibling that
 * registered later. A missing node is skipped — the caller keeps its fallback
 * position. This does not set React state.
 */
export function useAnchorFollow(
	anchor: DomAnchor | undefined,
	apply: (point: readonly [number, number, number]) => void,
	placement: AnchorPlacement = {},
): void {
	const { layer } = useGlassStage();
	const anchorRef = useRef(anchor);
	const applyRef = useRef(apply);
	const placementRef = useRef(placement);
	anchorRef.current = anchor;
	applyRef.current = apply;
	placementRef.current = placement;

	useEffect(() => {
		if (!layer) return;
		const handle: Disposable = layer.follow(
			() => anchorRef.current?.current ?? null,
			(point) => applyRef.current(point),
			() => placementRef.current,
		);
		return () => handle.dispose();
	}, [layer]);
}
