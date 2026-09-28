import {
	SCROLL_IDLE,
	type ScrollState,
	ScrollTrack as ScrollTrackEngine,
} from "@ui-lib/motion";
import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useContext,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useIsomorphicLayoutEffect } from "./utils.js";

const ScrollTrackContext = createContext<ScrollTrackEngine | null>(null);

export interface ScrollTrackProps {
	children?: ReactNode | ((state: ScrollState) => ReactNode);
	/**
	 * Track length in viewports. `4` is `400vh` — enough for a sticky pin to
	 * travel three screens. Ignored when `height` is set.
	 */
	length?: number;
	/** Explicit CSS height. Overrides `length`. */
	height?: number | string;
	/** Pin line in CSS pixels. Match a sticky child's `top`. */
	offset?: number;
	/** Damp lambda. Reduced motion always snaps. */
	smoothing?: number;
	className?: string;
	style?: CSSProperties;
}

/**
 * A tall scroll track whose progress is sampled on the shared UI-Lib clock.
 *
 * Put a {@link ScrollPin} inside it, and a `mode="section"` stage inside the
 * pin. The canvas then stays viewport-sized while the document scrolls, and
 * unpins with the section instead of covering the rest of the page.
 */
export function ScrollTrack({
	children,
	length,
	height,
	offset = 0,
	smoothing = 12,
	className,
	style,
}: ScrollTrackProps) {
	const ref = useRef<HTMLElement>(null);
	const [engine, setEngine] = useState<ScrollTrackEngine | null>(null);
	const resolvedHeight = height ?? (length != null ? `${length * 100}vh` : "400vh");

	useIsomorphicLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		const next = new ScrollTrackEngine(element, { offset, smoothing });
		setEngine(next);
		return () => {
			next.dispose();
			setEngine(null);
		};
	}, [offset, smoothing]);

	return (
		<section
			ref={ref}
			className={className}
			data-ui-lib-scroll-track=""
			style={{ position: "relative", height: resolvedHeight, ...style }}
		>
			<ScrollTrackContext.Provider value={engine}>
				{typeof children === "function" ? (
					<ScrollTrackState track={engine} render={children} />
				) : (
					children
				)}
			</ScrollTrackContext.Provider>
		</section>
	);
}

function ScrollTrackState({
	track,
	render,
}: {
	track: ScrollTrackEngine | null;
	render: (state: ScrollState) => ReactNode;
}) {
	const state = useSyncExternalStore(
		(listener) => (track ? track.subscribe(listener) : () => {}),
		() => (track ? track.getState() : SCROLL_IDLE),
		() => SCROLL_IDLE,
	);
	return render(state);
}

/** Latest scroll state. Outside a {@link ScrollTrack}, this is the idle snapshot. */
export function useScrollTrack(): ScrollState {
	const track = useContext(ScrollTrackContext);
	return useSyncExternalStore(
		(listener) => (track ? track.subscribe(listener) : () => {}),
		() => (track ? track.getState() : SCROLL_IDLE),
		() => SCROLL_IDLE,
	);
}

/** The track handle, for imperative jumps. `null` until the element is mounted. */
export function useScrollTrackHandle(): ScrollTrackEngine | null {
	return useContext(ScrollTrackContext);
}

export interface ScrollPinProps {
	children?: ReactNode;
	/** Sticky box height. Default `100vh`. */
	height?: number | string;
	className?: string;
	style?: CSSProperties;
}

/** The viewport-sized sticky child of a {@link ScrollTrack}. */
export function ScrollPin({ children, height = "100vh", className, style }: ScrollPinProps) {
	return (
		<div
			data-ui-lib-scroll-pin=""
			className={className}
			style={{ position: "sticky", top: 0, height, width: "100%", ...style }}
		>
			{children}
		</div>
	);
}
