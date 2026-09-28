import {
	type BackdropSpec,
	createGlassLayer,
	type GlassLayer,
	type GlassLayerMode,
	type GlassLayerOptions,
	type GlassLayerStats,
	type LookName,
	resolveLook,
} from "@ui-lib/renderer";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { GlassStageContext, type GlassStageStatus, type GlassStageValue } from "./context.js";
import { ensureStyles } from "./injectStyles.js";
import { stableKey, useIsomorphicLayoutEffect } from "./utils.js";

export interface GlassStageProps
	extends Omit<GlassLayerOptions, "parent" | "onStats" | "mode"> {
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
	/**
	 * `"viewport"` (default) mounts one fixed canvas for the page.
	 * `"section"` mounts the canvas inside this element and sizes it to the
	 * element's box. Give the element an explicit height — a sticky pin, a
	 * hero — or the canvas has nothing to fill.
	 */
	mode?: GlassLayerMode;
	onStats?: (stats: GlassLayerStats) => void;
	/** Skip the GPU layer entirely and render the CSS fallback (demo switch). */
	forceFallback?: boolean;
	/**
	 * Named grade from `@ui-lib/post`. Merged under `post`, so a page can keep
	 * camera blur while the look owns bloom and the highlight shoulder.
	 * Omitted means the stage keeps the library defaults.
	 */
	look?: LookName;
}

interface StageState {
	layer: GlassLayer | null;
	error: Error | null;
}

function backdropKeyOf(spec: BackdropSpec | undefined): string {
	if (!spec) return "default";
	if (spec.type === "texture") return `texture:${spec.texture.uuid}`;
	return stableKey(spec);
}

/**
 * Boots the shared glass layer for a subtree.
 *
 * One canvas per stage, so fifty glass panels still cost one WebGPU device.
 * Children sit in a `z-index: 1` box above that canvas — the same layering
 * Apple uses for text on glass. `"section"` keeps the canvas inside this
 * element; `"viewport"` pins it to the page.
 */
export function GlassStage({
	children,
	className,
	style,
	onStats,
	forceFallback = false,
	mode = "viewport",
	backdrop,
	post,
	look,
	zIndex = 0,
	dprCap,
	antialias = true,
	forceWebGL = false,
	tier = "auto",
	autoQuality = true,
	pointer = true,
	alwaysSyncLayout = false,
	onDeviceLost,
	onContextRestored,
}: GlassStageProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [state, setState] = useState<StageState>({ layer: null, error: null });
	const [status, setStatus] = useState<GlassStageStatus>("idle");
	const [stats, setStats] = useState<GlassLayerStats | null>(null);
	const [recoveryAttempt, setRecoveryAttempt] = useState(0);

	const backdropRef = useRef<BackdropSpec | undefined>(backdrop);
	backdropRef.current = backdrop;
	const resolvedPost = resolveLook(look, post);
	const postRef = useRef<GlassLayerOptions["post"]>(resolvedPost);
	postRef.current = resolvedPost;
	const onStatsRef = useRef(onStats);
	onStatsRef.current = onStats;

	useIsomorphicLayoutEffect(() => {
		ensureStyles();
	}, []);

	const backdropKey = backdropKeyOf(backdrop);
	const postKey = stableKey(resolvedPost);

	useEffect(() => {
		if (forceFallback) {
			setStatus("unsupported");
			return;
		}

		const parent = mode === "section" ? (rootRef.current ?? undefined) : undefined;
		if (mode === "section" && !parent) return;

		let cancelled = false;
		let created: GlassLayer | null = null;
		setStatus("loading");

		createGlassLayer({
			parent,
			mode,
			backdrop: backdropRef.current ?? { type: "gradient" },
			post: postRef.current ?? {},
			zIndex,
			dprCap,
			antialias,
			tier,
			autoQuality,
			pointer,
			alwaysSyncLayout,
			forceWebGL: forceWebGL || recoveryAttempt > 0,
			onDeviceLost: (error) => {
				if (cancelled) return;
				setState({ layer: null, error });
				setStatus("loading");
				setRecoveryAttempt((attempt) => attempt + 1);
				onDeviceLost?.(error);
			},
			onContextRestored,
			onStats: (next) => {
				setStats(next);
				onStatsRef.current?.(next);
			},
		})
			.then((layer) => {
				if (cancelled) {
					layer.dispose();
					return;
				}
				created = layer;
				setState({ layer, error: null });
				setStatus("ready");
			})
			.catch((error: Error) => {
				if (cancelled) return;
				setState({ layer: null, error });
				setStatus("unsupported");
			});

		return () => {
			cancelled = true;
			created?.dispose();
			setState({ layer: null, error: null });
			setStats(null);
		};
	}, [
		forceFallback,
		mode,
		zIndex,
		dprCap,
		antialias,
		forceWebGL,
		tier,
		autoQuality,
		pointer,
		alwaysSyncLayout,
		recoveryAttempt,
		onDeviceLost,
		onContextRestored,
	]);

	// Backdrop changes must not tear down the whole GPU layer. The ref keeps
	// object identity out of the dependency list; the content key still drives
	// this effect for inline object props.
	useEffect(() => {
		if (backdropKey) state.layer?.setBackdrop(backdropRef.current ?? { type: "gradient" });
	}, [state.layer, backdropKey]);

	useEffect(() => {
		if (postKey) state.layer?.setPostProcessing(postRef.current ?? {});
	}, [state.layer, postKey]);

	const setBackdrop = useCallback(
		(spec: BackdropSpec) => {
			backdropRef.current = spec;
			state.layer?.setBackdrop(spec);
		},
		[state.layer],
	);

	const value = useMemo<GlassStageValue>(
		() => ({ layer: state.layer, status, error: state.error, stats, setBackdrop }),
		[state.layer, state.error, status, stats, setBackdrop],
	);

	return (
		<GlassStageContext.Provider value={value}>
			<div
				ref={rootRef}
				data-ui-lib-stage={status}
				data-ui-lib-mode={mode}
				data-ui-lib-backend={stats?.backend ?? "unknown"}
				data-ui-lib-fps={stats?.fps ?? ""}
				data-ui-lib-dropped-frames={stats?.droppedFrames ?? ""}
				data-ui-lib-resource-count={stats?.resources.total ?? ""}
				className={className}
				style={{
					position: "relative",
					isolation: "isolate",
					zIndex: 1,
					...(mode === "section" ? { overflow: "hidden" } : null),
					...style,
				}}
			>
				<div
					style={{
						position: "relative",
						zIndex: 1,
						height: mode === "section" ? "100%" : undefined,
						minHeight: mode === "section" ? "100%" : undefined,
					}}
				>
					{children}
				</div>
			</div>
		</GlassStageContext.Provider>
	);
}
