import type { GlassPanelHandle, GlassPanelOptions } from "@ui-lib/renderer";
import {
	type CSSProperties,
	type ElementType,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useGlassStage } from "./context.js";
import { type GlassLookName, type GlassPresetName, resolveGlassPreset } from "./looks.js";
import { stableKey, useIsomorphicLayoutEffect } from "./utils.js";

let hasWarnedMissingStage = false;
function warnMissingGlassStageOnce() {
	if (hasWarnedMissingStage || typeof console === "undefined") return;
	hasWarnedMissingStage = true;
	console.warn(
		"[UI-Lib] <GlassPanel> rendered outside <GlassStage>. Rendering in CSS fallback mode.\n" +
			"To enable real GPU liquid glass refraction, wrap your view tree or card in <GlassStage>.",
	);
}

export interface GlassPanelProps
	extends GlassPanelOptions,
		Omit<HTMLAttributes<HTMLElement>, "children"> {
	/** Element to render. Defaults to a `div`. */
	as?: ElementType;
	children?: ReactNode;
	/**
	 * High-level semantic preset (e.g. 'apple-crystal', 'capsule', 'frosted-dock', 'slab', 'pane', 'dew').
	 * Fully compatible with custom overrides.
	 */
	preset?: GlassPresetName;
	/** Alias for `preset` for backward compatibility with `look`. */
	look?: GlassLookName;
	/**
	 * Thickness in millimeters (standard reference is 28mm).
	 * Scales bevel and refraction proportionally relative to 28mm.
	 */
	thickness?: number;
	/**
	 * Render as plain DOM, keeping the same box, without asking the layer for
	 * glass. Named `plain` rather than `disabled` because `disabled` belongs to
	 * the element: a `<button>` in the `as` slot needs it to mean "cannot be
	 * activated", and a panel that consumed it silently dropped the attribute
	 * from the DOM.
	 */
	plain?: boolean;
	/**
	 * Enable dynamic interactive fluid ripples when pointer presses down on the glass.
	 * Defaults to `true`.
	 */
	interactiveRipples?: boolean;
	className?: string;
	style?: CSSProperties;
}

/**
 * A DOM element that gets real refraction.
 *
 * The element keeps its normal DOM behaviour — layout, hit-testing, focus,
 * semantics — and the glass is painted by the stage's canvas underneath it.
 * Before the GPU layer is ready (or on unsupported devices, or when the user
 * asked for reduced motion) the element renders with a CSS `backdrop-filter`
 * fallback instead, so nothing ever appears broken. The look carries the
 * studio reflection; pass `environment` to scale it, not a cubemap.
 */
export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(
	function GlassPanel(props, ref) {
		const {
			as: Tag = "div",
			plain = false,
			children,
			className,
			style,
			preset,
			look,
			thickness,
			radius,
			bevel,
			refraction,
			shift,
			dispersion,
			roughness,
			frost,
			tint,
			tintAmount,
			saturation,
			brightness,
			contrast,
			highlight,
			specular,
			shininess,
			fresnel,
			fresnelPower,
			edgeGlow,
			lightDirection,
			grain,
			opacity,
			pointerStrength,
			pointerRadius,
			rippleStrength,
			interactiveRipples = true,
			environment,
			z,
			...domProps
		} = props;

		const { layer, status } = useGlassStage();
		const innerRef = useRef<HTMLElement | null>(null);
		const handleRef = useRef<GlassPanelHandle | null>(null);

		useEffect(() => {
			const isDev =
				typeof globalThis !== "undefined" &&
				(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !==
					"production";
			if (isDev && !plain && status === "idle" && !layer) {
				warnMissingGlassStageOnce();
			}
		}, [plain, status, layer]);

		const resolvedBase = useMemo(() => {
			const activePreset = preset ?? look;
			if (!activePreset && thickness === undefined) return null;
			return resolveGlassPreset({
				preset: activePreset,
				thickness,
			});
		}, [preset, look, thickness]);

		const options = useMemo<GlassPanelOptions>(() => {
			const base = resolvedBase ?? {};
			return {
				...base,
				...(radius !== undefined && { radius }),
				...(bevel !== undefined && { bevel }),
				...(refraction !== undefined && { refraction }),
				...(shift !== undefined && { shift }),
				...(dispersion !== undefined && { dispersion }),
				...(roughness !== undefined && { roughness }),
				...(frost !== undefined && { frost }),
				...(tint !== undefined && { tint }),
				...(tintAmount !== undefined && { tintAmount }),
				...(saturation !== undefined && { saturation }),
				...(brightness !== undefined && { brightness }),
				...(contrast !== undefined && { contrast }),
				...(highlight !== undefined && { highlight }),
				...(specular !== undefined && { specular }),
				...(shininess !== undefined && { shininess }),
				...(fresnel !== undefined && { fresnel }),
				...(fresnelPower !== undefined && { fresnelPower }),
				...(edgeGlow !== undefined && { edgeGlow }),
				...(lightDirection !== undefined && { lightDirection }),
				...(grain !== undefined && { grain }),
				...(opacity !== undefined && { opacity }),
				...(pointerStrength !== undefined && { pointerStrength }),
				...(pointerRadius !== undefined && { pointerRadius }),
				...(rippleStrength !== undefined && { rippleStrength }),
				...(environment !== undefined && { environment }),
				...(z !== undefined && { z }),
			};
		}, [
			resolvedBase,
			radius,
			bevel,
			refraction,
			shift,
			dispersion,
			roughness,
			frost,
			tint,
			tintAmount,
			saturation,
			brightness,
			contrast,
			highlight,
			specular,
			shininess,
			fresnel,
			fresnelPower,
			edgeGlow,
			lightDirection,
			grain,
			opacity,
			pointerStrength,
			pointerRadius,
			rippleStrength,
			environment,
			z,
		]);

		// Keep the latest options readable from the registration effect without
		// making them a dependency of it.
		const optionsRef = useRef(options);
		optionsRef.current = options;

		const setRefs = useCallback(
			(node: HTMLElement | null) => {
				innerRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) (ref as { current: HTMLElement | null }).current = node;
			},
			[ref],
		);

		useIsomorphicLayoutEffect(() => {
			const element = innerRef.current;
			if (!layer || !element || plain) return;
			const handle = layer.register(element, optionsRef.current);
			handleRef.current = handle;
			return () => {
				handle.dispose();
				handleRef.current = null;
			};
		}, [layer, plain]);

		const optionsKey = stableKey(options);
		useIsomorphicLayoutEffect(() => {
			handleRef.current?.update(optionsRef.current);
		}, [optionsKey]);

		const handlePointerDown = useCallback(
			(e: React.PointerEvent<HTMLElement>) => {
				domProps.onPointerDown?.(e as unknown as React.PointerEvent<never>);
				if (interactiveRipples && handleRef.current && innerRef.current) {
					const rect = innerRef.current.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						const u = (e.clientX - rect.left) / rect.width;
						const v = 1 - (e.clientY - rect.top) / rect.height;
						handleRef.current.addRipple(
							Math.max(0, Math.min(1, u)),
							Math.max(0, Math.min(1, v)),
							1.2,
						);
					}
				}
			},
			[interactiveRipples, domProps.onPointerDown],
		);

		const glassState = plain ? "off" : layer ? "gpu" : "fallback";

		return (
			<Tag
				{...domProps}
				ref={setRefs}
				onPointerDown={handlePointerDown}
				className={className}
				style={style}
				data-ui-lib-glass={glassState}
				data-ui-lib-status={status}
			>
				{children}
			</Tag>
		);
	},
);
