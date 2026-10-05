import {
	GlassPanel,
	type GlassPanelOptions,
	type GlassPresetName,
	resolveGlassPreset,
	useGlassStage,
} from "@ui-lib/react";
import { type ComponentPropsWithoutRef, forwardRef, useMemo } from "react";
import type { OpticalParams } from "./useIrisSynthesizer.js";

export interface LiquidGlassCardProps extends ComponentPropsWithoutRef<"div"> {
	/** Thickness in millimeters, simulates Apple visionOS physical glass (default: 28) */
	thickness?: number;
	/** Direct optical parameter override from synthesizer */
	opticalParams?: Partial<OpticalParams>;
	/** High-level semantic preset (e.g. 'apple-crystal', 'frosted-dock', 'slab', 'pane', 'dew') */
	preset?: GlassPresetName;
	/** Visual style variant */
	variant?: "apple-thick" | "crystal" | "frosted";
	/** Explicit GlassPanel options override */
	glassOptions?: Partial<GlassPanelOptions>;
}

export interface LiquidGlassPillProps extends ComponentPropsWithoutRef<"div"> {
	/** Thickness in millimeters, simulates Apple visionOS pill capsule (default: 28) */
	thickness?: number;
	/** Direct optical parameter override from synthesizer */
	opticalParams?: Partial<OpticalParams>;
	/** High-level semantic preset (e.g. 'apple-pill', 'capsule') */
	preset?: GlassPresetName;
	/** Explicit GlassPanel options override */
	glassOptions?: Partial<GlassPanelOptions>;
}

/**
 * `<LiquidGlassCard>`
 * 高度封装的 Apple 级液态厚玻璃容器。
 *
 * 核心特性：
 * 1. 支持开箱即用的感官预设 (preset="apple-crystal" | "frosted-dock" | "slab" 等)；
 * 2. 自动根据厚度 (thickness) 物理缩放倒角 (Bevel) 与多波长物理折射率 (Refraction)；
 * 3. 避免冗长零碎的 GlassPanel 参数注入，外部使用极其简单；
 * 4. 采用高透纯净高光双面法线设计，保留真实 WebGPU 折射与色散。
 */
export const LiquidGlassCard = forwardRef<HTMLDivElement, LiquidGlassCardProps>(
	(
		{
			thickness = 28,
			opticalParams,
			preset,
			variant = "apple-thick",
			glassOptions,
			className = "",
			children,
			...domProps
		},
		ref,
	) => {
		const stage = useGlassStage();
		const isGpuReady = stage.status === "ready";

		const computedCardOptions = useMemo<GlassPanelOptions>(() => {
			const activePreset: GlassPresetName =
				preset ?? (variant === "frosted" ? "frosted-dock" : "apple-crystal");

			const overrides: Partial<GlassPanelOptions> = {
				...(opticalParams && {
					...(opticalParams.radius !== undefined && { radius: opticalParams.radius }),
					...(opticalParams.roughness !== undefined && { roughness: opticalParams.roughness }),
					...(opticalParams.frost !== undefined && { frost: opticalParams.frost }),
					...(opticalParams.specular !== undefined && { specular: opticalParams.specular }),
					...(opticalParams.edgeGlow !== undefined && { edgeGlow: opticalParams.edgeGlow }),
					...(opticalParams.tintAmount !== undefined && {
						tintAmount: opticalParams.tintAmount,
					}),
					...(opticalParams.saturation !== undefined && {
						saturation: opticalParams.saturation,
					}),
					...(opticalParams.dispersion !== undefined && {
						dispersion: opticalParams.dispersion,
					}),
					...(opticalParams.bevel !== undefined && {
						bevel: Math.round((thickness / 28) * opticalParams.bevel),
					}),
					...(opticalParams.refraction !== undefined && {
						refraction: Math.round((thickness / 28) * opticalParams.refraction),
					}),
				}),
				...glassOptions,
			};

			return resolveGlassPreset({
				preset: activePreset,
				thickness,
				overrides,
			});
		}, [preset, variant, thickness, opticalParams, glassOptions]);

		const variantClass =
			variant === "crystal"
				? "iris-glass-card--crystal"
				: variant === "frosted"
					? "iris-glass-card--frosted"
					: "iris-glass-card--apple";

		const dynamicStyle = useMemo(
			() => ({
				...domProps.style,
				"--glass-thickness": `${thickness}mm`,
				"--glass-bevel": `${Math.round((thickness / 28) * 2.5 * 10) / 10}px`,
				"--glass-blur": `${Math.round(20 + (thickness / 28) * 12)}px`,
			}),
			[thickness, domProps.style],
		);

		return (
			<GlassPanel
				ref={ref}
				className={`iris-liquid-glass-card ${variantClass} ${className}`.trim()}
				data-ui-lib-thick-glass={thickness}
				data-gpu-active={isGpuReady ? "true" : "false"}
				style={dynamicStyle}
				{...computedCardOptions}
				{...domProps}
			>
				{children}
			</GlassPanel>
		);
	},
);

LiquidGlassCard.displayName = "LiquidGlassCard";

/**
 * `<LiquidGlassPill>`
 * 胶囊形态的液态厚玻璃容器（如顶部浮动导航胶囊）。
 */
export const LiquidGlassPill = forwardRef<HTMLDivElement, LiquidGlassPillProps>(
	(
		{
			thickness = 28,
			opticalParams,
			preset,
			glassOptions,
			className = "",
			children,
			...domProps
		},
		ref,
	) => {
		const stage = useGlassStage();
		const isGpuReady = stage.status === "ready";

		const computedPillOptions = useMemo<GlassPanelOptions>(() => {
			const activePreset: GlassPresetName = preset ?? "apple-pill";

			const overrides: Partial<GlassPanelOptions> = {
				radius: 999,
				...(opticalParams && {
					...(opticalParams.specular !== undefined && { specular: opticalParams.specular }),
					...(opticalParams.edgeGlow !== undefined && { edgeGlow: opticalParams.edgeGlow }),
					...(opticalParams.dispersion !== undefined && {
						dispersion: opticalParams.dispersion,
					}),
					...(opticalParams.bevel !== undefined && {
						bevel: Math.round((thickness / 28) * opticalParams.bevel),
					}),
					...(opticalParams.refraction !== undefined && {
						refraction: Math.round((thickness / 28) * opticalParams.refraction),
					}),
				}),
				...glassOptions,
			};

			return resolveGlassPreset({
				preset: activePreset,
				thickness,
				overrides,
			});
		}, [preset, thickness, opticalParams, glassOptions]);

		const dynamicStyle = useMemo(
			() => ({
				...domProps.style,
				"--glass-thickness": `${thickness}mm`,
				"--glass-bevel": `${Math.round((thickness / 28) * 2 * 10) / 10}px`,
				"--glass-blur": `${Math.round(18 + (thickness / 28) * 10)}px`,
			}),
			[thickness, domProps.style],
		);

		return (
			<GlassPanel
				ref={ref}
				className={`iris-liquid-glass-pill ${className}`.trim()}
				data-ui-lib-thick-pill={thickness}
				data-gpu-active={isGpuReady ? "true" : "false"}
				style={dynamicStyle}
				{...computedPillOptions}
				{...domProps}
			>
				{children}
			</GlassPanel>
		);
	},
);

LiquidGlassPill.displayName = "LiquidGlassPill";
