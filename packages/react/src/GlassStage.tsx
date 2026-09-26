import {
	type BackdropSpec,
	createGlassLayer,
	type GlassLayer,
	type GlassLayerOptions,
	type GlassLayerStats,
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

export interface GlassStageProps extends Omit<GlassLayerOptions, "parent" | "onStats"> {
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
	onStats?: (stats: GlassLayerStats) => void;
	/** Skip the GPU layer entirely and render the CSS fallback (demo switch). */
	forceFallback?: boolean;
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
 * A single fixed canvas is created for the whole stage, so fifty glass panels
 * still cost one WebGPU device. Children are wrapped in a `position: relative;
 * z-index: 1` box so DOM content always sits above the canvas — the same
 * layering Apple uses for text on glass.
 */
export function GlassStage({
	children,
	className,
	style,
	onStats,
	forceFallback = false,
	backdrop,
	post,
	zIndex = 0,
	dprCap,
	antialias = true,
	forceWebGL = false,
	tier = "auto",
	autoQuality = true,
	pointer = true,
	alwaysSyncLayout = false,
}: GlassStageProps) {
	const [state, setState] = useState<StageState>({ layer: null, error: null });
	const [status, setStatus] = useState<GlassStageStatus>("idle");
	const [stats, setStats] = useState<GlassLayerStats | null>(null);

	const backdropRef = useRef<BackdropSpec | undefined>(backdrop);
	backdropRef.current = backdrop;
	const postRef = useRef<GlassLayerOptions["post"]>(post);
	postRef.current = post;
	const onStatsRef = useRef(onStats);
	onStatsRef.current = onStats;

	useIsomorphicLayoutEffect(() => {
		ensureStyles();
	}, []);

	const backdropKey = backdropKeyOf(backdrop);
	const postKey = stableKey(post);

	useEffect(() => {
		if (forceFallback) {
			setStatus("unsupported");
			return;
		}

		let cancelled = false;
		let created: GlassLayer | null = null;
		setStatus("loading");

		createGlassLayer({
			backdrop: backdropRef.current ?? { type: "gradient" },
			post: postRef.current ?? {},
			zIndex,
			dprCap,
			antialias,
			forceWebGL,
			tier,
			autoQuality,
			pointer,
			alwaysSyncLayout,
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
		};
	}, [
		forceFallback,
		zIndex,
		dprCap,
		antialias,
		forceWebGL,
		tier,
		autoQuality,
		pointer,
		alwaysSyncLayout,
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
				data-ui-lib-stage={status}
				className={className}
				style={{ position: "relative", zIndex: 1, ...style }}
			>
				{children}
			</div>
		</GlassStageContext.Provider>
	);
}
