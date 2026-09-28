import type { GlassPanelHandle, GlassPanelOptions } from "@ui-lib/renderer";
import {
	type CSSProperties,
	type ElementType,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
} from "react";
import { useGlassStage } from "./context.js";
import { stableKey, useIsomorphicLayoutEffect } from "./utils.js";

export interface GlassPanelProps
	extends GlassPanelOptions,
		Omit<HTMLAttributes<HTMLElement>, "children"> {
	/** Element to render. Defaults to a `div`. */
	as?: ElementType;
	children?: ReactNode;
	/** Render as plain DOM (no GPU effect) while keeping the same box. */
	disabled?: boolean;
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
			disabled = false,
			children,
			className,
			style,
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
			environment,
			z,
			...domProps
		} = props;

		const { layer, status } = useGlassStage();
		const innerRef = useRef<HTMLElement | null>(null);
		const handleRef = useRef<GlassPanelHandle | null>(null);

		const options = useMemo<GlassPanelOptions>(
			() => ({
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
				environment,
				z,
			}),
			[
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
				environment,
				z,
			],
		);

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
			if (!layer || !element || disabled) return;
			const handle = layer.register(element, optionsRef.current);
			handleRef.current = handle;
			return () => {
				handle.dispose();
				handleRef.current = null;
			};
		}, [layer, disabled]);

		const optionsKey = stableKey(options);
		useIsomorphicLayoutEffect(() => {
			handleRef.current?.update(optionsRef.current);
		}, [optionsKey]);

		const glassState = disabled ? "off" : layer ? "gpu" : "fallback";

		return (
			<Tag
				{...domProps}
				ref={setRefs}
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
