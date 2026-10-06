import {
	IRIS,
	type IrisTone,
	mixMultiPigmentsToCss,
	PROCESS_PIGMENTS,
	parseHex,
	toneToPigment,
} from "@ui-lib/core";
import { forwardRef, useCallback, useId, useMemo, useState } from "react";
import { type SoftMaterial, srgbLuminance, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export type SoftColorPickerMode = "wash" | "digital";

export interface SoftColorPickerProps {
	/** Controlled hex color string (e.g. "#4f46e5"). */
	value?: string;
	/** Default color on mount (uncontrolled). Defaults to "#5c42bd". */
	defaultValue?: string;
	/** Callback when color changes. */
	onChange?: (
		hex: string,
		details: { r: number; g: number; b: number; a: number; hex: string },
	) => void;
	/** Accessible label for the color picker. Required for a11y. */
	label: string;
	/** Color mixing engine: "wash" (Kubelka-Munk subtractive pigment physics) or "digital" (HSL/Hex). */
	mode?: SoftColorPickerMode;
	/** Allow switching between physical watercolor mode and digital mode. Defaults to true. */
	allowModeSwitch?: boolean;
	/** Show live xuan paper dried specimen preview. Defaults to true. */
	showSpecimen?: boolean;
	/** Show preset color swatches. Defaults to true. */
	showPresets?: boolean;
	/** Surface material ground. */
	material?: SoftMaterial;
	/** Tone family for UI controls. */
	tone?: IrisTone;
	/** CSS class name. */
	className?: string;
	/** Inline styles. */
	style?: React.CSSProperties;
}

/**
 * Helper: HSL to Hex conversion.
 */
function hslToHex(h: number, s: number, l: number): string {
	const sat = s / 100;
	const lum = l / 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = sat * Math.min(lum, 1 - lum);
	const f = (n: number) => lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (x: number) =>
		Math.round(x * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Helper: Hex to HSL conversion.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const [rRaw, gRaw, bRaw] = parseHex(hex) ?? [92, 66, 189];
	const r = (rRaw ?? 92) / 255;
	const g = (gRaw ?? 66) / 255;
	const b = (bRaw ?? 189) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

/**
 * A physical watercolor pigment mixer and optical color picker.
 *
 * ## Dual-Engine Color Science
 *
 * Standard color pickers interpolate in sRGB/HSL linear emission space, causing
 * complementary mixes to cross the dead grey axis (e.g. cyan + yellow becomes muddy).
 *
 * `SoftColorPicker` incorporates:
 * 1. **Kubelka-Munk Physical Wash Engine**:
 *    Subtractive optical mixing based on real pigment absorption and scattering ($K/S$),
 *    with interactive **Moisture (含水量)** and **Granulation (沉降颗粒度)** controls.
 * 2. **Digital HSL Spectrum Engine**:
 *    Smooth continuous digital color tuning with full WCAG contrast readouts.
 * 3. **Live Specimen Preview**:
 *    Simulates a dried pigment puddle on xuan paper fibers with characteristic
 *    dark deposit edge ring (Meniscus) and glass refraction optics.
 *
 * ```tsx
 * <SoftColorPicker
 *   label="宣纸水彩调色器"
 *   value={color}
 *   onChange={(hex) => setColor(hex)}
 *   showSpecimen
 * />
 * ```
 */
export const SoftColorPicker = forwardRef<HTMLElement, SoftColorPickerProps>(
	function SoftColorPicker(
		{
			value: controlledValue,
			defaultValue = "#5c42bd",
			onChange,
			label,
			mode: initialMode = "wash",
			allowModeSwitch = true,
			showSpecimen = true,
			showPresets = true,
			material,
			tone = "iris",
			className,
			style,
		},
		ref,
	) {
		useStyles();
		const generatedId = useId();
		const surface = useMaterial(material ? { material, tone } : {});

		const [internalHex, setInternalHex] = useState(defaultValue);
		const [activeMode, setActiveMode] = useState<SoftColorPickerMode>(initialMode);

		// Wash mode parameters
		const [pigmentMix, setPigmentMix] = useState(0.5); // Iris vs Blossom balance
		const [moisture, setMoisture] = useState(0.65); // Water dilution
		const [granulation, setGranulation] = useState(0.4); // Settling texture

		const isControlled = controlledValue !== undefined;
		const currentHex = isControlled ? controlledValue : internalHex;

		// Parse HSL from current hex
		const hsl = useMemo(() => hexToHsl(currentHex), [currentHex]);
		const [internalHue, setInternalHue] = useState(hsl.h);
		const [internalSat, setInternalSat] = useState(hsl.s);
		const [internalLum, setInternalLum] = useState(hsl.l);

		// Emit color changes
		const notifyColor = useCallback(
			(hex: string) => {
				if (!isControlled) setInternalHex(hex);
				const [r255, g255, b255] = parseHex(hex) ?? [92, 66, 189];
				onChange?.(hex, {
					r: r255 ?? 92,
					g: g255 ?? 66,
					b: b255 ?? 189,
					a: 1,
					hex,
				});
			},
			[isControlled, onChange],
		);

		// Compute physical KM mix color in Wash mode
		const irisPigment = useMemo(() => toneToPigment("iris", 500), []);
		const blossomPigment = useMemo(() => toneToPigment("blossom", 500), []);
		const whitePigment = PROCESS_PIGMENTS.white;

		const computeWashCss = useCallback(
			(mix: number, moist: number) => {
				const irisRatio = 1 - mix;
				const blossomRatio = mix;
				return mixMultiPigmentsToCss(
					[
						{ pigment: irisPigment, weight: irisRatio * 0.7 },
						{ pigment: blossomPigment, weight: blossomRatio * 0.7 },
						{ pigment: whitePigment, weight: Math.max(0.01, 1 - moist * 0.8) },
					],
					{ thickness: 0.05 },
				);
			},
			[irisPigment, blossomPigment],
		);

		const washHex = useMemo(
			() => computeWashCss(pigmentMix, moisture),
			[computeWashCss, pigmentMix, moisture],
		);

		// Update color when wash parameters change in Wash mode
		const handleWashParamChange = useCallback(
			(newMix: number, newMoisture: number, newGranulation: number) => {
				setPigmentMix(newMix);
				setMoisture(newMoisture);
				setGranulation(newGranulation);
				const hex = computeWashCss(newMix, newMoisture);
				notifyColor(hex);
			},
			[computeWashCss, notifyColor],
		);

		// WCAG Contrast safety against light paper ground
		const [r255, g255, b255] = parseHex(currentHex) ?? [92, 66, 189];
		const groundLuminance = srgbLuminance(r255 ?? 92, g255 ?? 66, b255 ?? 189);
		const contrastRatio = (groundLuminance + 0.05) / 0.05; // against black text
		const passesAA = contrastRatio >= 4.5;

		// Presets from UI-Lib core design tokens
		const presetColors = useMemo(
			() => [
				IRIS.iris[100],
				IRIS.iris[300],
				IRIS.iris[500],
				IRIS.iris[700],
				IRIS.blossom[100],
				IRIS.blossom[300],
				IRIS.blossom[500],
				IRIS.blossom[700],
				IRIS.mist[100],
				IRIS.mist[300],
				IRIS.mist[500],
				IRIS.mist[700],
			],
			[],
		);

		return (
			<section
				ref={ref}
				aria-label={label}
				className={["ui-lib-soft-color-picker", surface.className, className]
					.filter(Boolean)
					.join(" ")}
				style={{ ...style, ...surface.style }}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
				data-ui-lib-tone={tone}
			>
				{/* Header & Mode Switch */}
				<div className="ui-lib-soft-color-picker__header">
					<span className="ui-lib-soft-color-picker__title">{label}</span>
					{allowModeSwitch && (
						<div
							className="ui-lib-soft-color-picker__modes"
							role="tablist"
							aria-label="调色引擎模式"
						>
							<button
								type="button"
								role="tab"
								aria-selected={activeMode === "wash"}
								className={[
									"ui-lib-soft-color-picker__mode-btn",
									activeMode === "wash"
										? "ui-lib-soft-color-picker__mode-btn--active"
										: undefined,
								]
									.filter(Boolean)
									.join(" ")}
								onClick={() => {
									setActiveMode("wash");
									notifyColor(washHex);
								}}
							>
								宣纸水墨 (KM)
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={activeMode === "digital"}
								className={[
									"ui-lib-soft-color-picker__mode-btn",
									activeMode === "digital"
										? "ui-lib-soft-color-picker__mode-btn--active"
										: undefined,
								]
									.filter(Boolean)
									.join(" ")}
								onClick={() => {
									setActiveMode("digital");
								}}
							>
								数字色域 (HSL)
							</button>
						</div>
					)}
				</div>

				<div className="ui-lib-soft-color-picker__body">
					{/* Left: Specimen Preview */}
					{showSpecimen && (
						<div className="ui-lib-soft-color-picker__specimen-card">
							<div
								className="ui-lib-soft-color-picker__specimen"
								style={
									{
										"--specimen-color": currentHex,
										"--specimen-bleed": `${Math.round(moisture * 12 + 4)}px`,
										"--specimen-granulation": `${granulation}`,
									} as React.CSSProperties
								}
								aria-hidden="true"
							>
								<div className="ui-lib-soft-color-picker__specimen-rim" />
								<div className="ui-lib-soft-color-picker__specimen-core" />
								<div className="ui-lib-soft-color-picker__specimen-glass" />
							</div>

							<div className="ui-lib-soft-color-picker__specimen-meta">
								<span className="ui-lib-soft-color-picker__hex-badge">
									{currentHex.toUpperCase()}
								</span>
								<span
									className={[
										"ui-lib-soft-color-picker__contrast-badge",
										passesAA ? "ui-lib-soft-color-picker__contrast-badge--pass" : undefined,
									]
										.filter(Boolean)
										.join(" ")}
								>
									{passesAA ? "AA 对比通过" : "高亮背景"}
								</span>
							</div>
						</div>
					)}

					{/* Right: Interactive Controls */}
					<div className="ui-lib-soft-color-picker__controls">
						{activeMode === "wash" ? (
							/* Physical Wash Controls */
							<div className="ui-lib-soft-color-picker__wash-sliders">
								{/* Pigment Mix Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-mix`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>矿物基调</span>
										<span className="ui-lib-soft-color-picker__slider-val">
											{pigmentMix < 0.4 ? "花青" : pigmentMix > 0.6 ? "胭脂" : "紫藤"}
										</span>
									</label>
									<input
										id={`${generatedId}-mix`}
										type="range"
										min="0"
										max="1"
										step="0.01"
										value={pigmentMix}
										aria-label="花青与胭脂混色比例"
										className="ui-lib-soft-color-picker__range"
										onChange={(e) =>
											handleWashParamChange(Number(e.target.value), moisture, granulation)
										}
									/>
								</div>

								{/* Moisture Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-moisture`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>含水量 / 稀释度</span>
										<span className="ui-lib-soft-color-picker__slider-val">
											{Math.round(moisture * 100)}%
										</span>
									</label>
									<input
										id={`${generatedId}-moisture`}
										type="range"
										min="0.1"
										max="1"
										step="0.01"
										value={moisture}
										aria-label="水墨稀释含水量"
										className="ui-lib-soft-color-picker__range"
										onChange={(e) =>
											handleWashParamChange(pigmentMix, Number(e.target.value), granulation)
										}
									/>
								</div>

								{/* Granulation Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-gran`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>宣纸纤维沉降</span>
										<span className="ui-lib-soft-color-picker__slider-val">
											{Math.round(granulation * 100)}%
										</span>
									</label>
									<input
										id={`${generatedId}-gran`}
										type="range"
										min="0"
										max="1"
										step="0.01"
										value={granulation}
										aria-label="颜料沉降颗粒度"
										className="ui-lib-soft-color-picker__range"
										onChange={(e) =>
											handleWashParamChange(pigmentMix, moisture, Number(e.target.value))
										}
									/>
								</div>
							</div>
						) : (
							/* Digital HSL Controls */
							<div className="ui-lib-soft-color-picker__digital-sliders">
								{/* Hue Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-hue`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>色相 (Hue)</span>
										<span className="ui-lib-soft-color-picker__slider-val">{internalHue}°</span>
									</label>
									<input
										id={`${generatedId}-hue`}
										type="range"
										min="0"
										max="360"
										step="1"
										value={internalHue}
										aria-label="色相"
										className="ui-lib-soft-color-picker__range ui-lib-soft-color-picker__range--hue"
										onChange={(e) => {
											const h = Number(e.target.value);
											setInternalHue(h);
											notifyColor(hslToHex(h, internalSat, internalLum));
										}}
									/>
								</div>

								{/* Saturation Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-sat`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>饱和度 (Saturation)</span>
										<span className="ui-lib-soft-color-picker__slider-val">{internalSat}%</span>
									</label>
									<input
										id={`${generatedId}-sat`}
										type="range"
										min="0"
										max="100"
										step="1"
										value={internalSat}
										aria-label="饱和度"
										className="ui-lib-soft-color-picker__range"
										onChange={(e) => {
											const s = Number(e.target.value);
											setInternalSat(s);
											notifyColor(hslToHex(internalHue, s, internalLum));
										}}
									/>
								</div>

								{/* Lightness Slider */}
								<div className="ui-lib-soft-color-picker__slider-row">
									<label
										htmlFor={`${generatedId}-lum`}
										className="ui-lib-soft-color-picker__slider-label"
									>
										<span>明度 (Lightness)</span>
										<span className="ui-lib-soft-color-picker__slider-val">{internalLum}%</span>
									</label>
									<input
										id={`${generatedId}-lum`}
										type="range"
										min="0"
										max="100"
										step="1"
										value={internalLum}
										aria-label="明度"
										className="ui-lib-soft-color-picker__range"
										onChange={(e) => {
											const l = Number(e.target.value);
											setInternalLum(l);
											notifyColor(hslToHex(internalHue, internalSat, l));
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Presets Grid */}
				{showPresets && (
					<div className="ui-lib-soft-color-picker__presets">
						<span className="ui-lib-soft-color-picker__presets-title">设计色系预设</span>
						<div className="ui-lib-soft-color-picker__swatches">
							{presetColors.map((colorHex) => {
								const isSelected = currentHex.toLowerCase() === colorHex.toLowerCase();
								return (
									<button
										key={colorHex}
										type="button"
										className={[
											"ui-lib-soft-color-picker__swatch",
											isSelected ? "ui-lib-soft-color-picker__swatch--active" : undefined,
										]
											.filter(Boolean)
											.join(" ")}
										style={{ backgroundColor: colorHex }}
										aria-label={`选择预设色彩 ${colorHex}`}
										onClick={() => notifyColor(colorHex)}
									>
										{isSelected && (
											<svg
												viewBox="0 0 12 12"
												width="8"
												height="8"
												aria-hidden="true"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M2.5 6 L5 8.5 L9.5 3.5" />
											</svg>
										)}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</section>
		);
	},
);
