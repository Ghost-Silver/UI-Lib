import type { IrisTone } from "@ui-lib/core";
import { useCallback, useMemo, useState } from "react";

export type PaletteId = "aurora" | "ember" | "mint" | "ink";
export type MaterialMode = "solid" | "wash" | "tint" | "glass";

export interface PaletteOption {
	id: PaletteId;
	name: string;
	desc: string;
}

export const PALETTE_OPTIONS: PaletteOption[] = [
	{ id: "aurora", name: "Aurora", desc: "暮光紫蓝 · 东方水墨与光学极光" },
	{ id: "ember", name: "Ember", desc: "绛绯晚霞 · 温润水彩朱砂色" },
	{ id: "mint", name: "Mint", desc: "苍翠薄荷 · 青瓷微透琉璃" },
	{ id: "ink", name: "Ink", desc: "玄夜深墨 · 纯粹黑白高对比" },
];

export interface OpticalParams {
	radius: number;
	bevel: number;
	refraction: number;
	dispersion: number;
	roughness: number;
	frost: number;
	specular: number;
	edgeGlow: number;
	tintAmount: number;
	saturation: number;
	bloomStrength: number;
	haloStrength: number;
	flareStrength: number;
	chromaticAberration: number;
	focusBlur: number;
	focusDepth: number;
	motionBlur: number;
	temporalReactive: number;
	grain: number;
	vignette: number;
}

export const DEFAULT_OPTICAL_PARAMS: OpticalParams = {
	radius: 40,
	bevel: 16,
	refraction: 28,
	dispersion: 0.22,
	roughness: 0.02,
	frost: 0,
	specular: 0.88,
	edgeGlow: 0.62,
	tintAmount: 0.02,
	saturation: 1.18,
	bloomStrength: 0.32,
	haloStrength: 0.16,
	flareStrength: 0.12,
	chromaticAberration: 0.38,
	focusBlur: 2.5,
	focusDepth: 0.62,
	motionBlur: 0.05,
	temporalReactive: 0.8,
	grain: 0.015,
	vignette: 0.1,
};

const PALETTE_TO_TONE: Record<PaletteId, IrisTone> = {
	aurora: "iris",
	ember: "blossom",
	mint: "mist",
	ink: "iris",
};

export function useIrisSynthesizer() {
	const [params, setParams] = useState<OpticalParams>(DEFAULT_OPTICAL_PARAMS);
	const [palette, setPaletteState] = useState<PaletteId>(() => {
		if (typeof window !== "undefined") {
			const p = new URLSearchParams(window.location.search).get("palette");
			if (p === "ember" || p === "mint" || p === "ink") return p;
		}
		return "aurora";
	});

	const [backend, setBackend] = useState<"webgl" | "webgpu">(() => {
		if (typeof window !== "undefined") {
			const b = new URLSearchParams(window.location.search).get("backend");
			if (b === "webgl") return "webgl";
		}
		return "webgpu";
	});

	const [forceFallback, setForceFallback] = useState(false);

	// Synthesizer interactive states
	const [activeTab, setActiveTab] = useState(0);
	const [materialMode, setMaterialMode] = useState<MaterialMode>("wash");
	const [zetaDamping, setZetaDamping] = useState(0.55);
	const [moisture, setMoisture] = useState(65);
	const [promptInput, setPromptInput] = useState("规划 Lyra 机械臂抓取试管并执行微升移液...");
	const [targetExecutor, setTargetExecutor] = useState("lyra");
	const [stepperStep, setStepperStep] = useState("neural");
	const [forceSensing, setForceSensing] = useState(true);
	const [smoothMotion, setSmoothMotion] = useState(true);
	const [thickness, setThickness] = useState(28); // mm, Apple thick liquid glass

	const tone = PALETTE_TO_TONE[palette] ?? "iris";

	const setParam = useCallback(
		<K extends keyof OpticalParams>(key: K, value: OpticalParams[K]) => {
			setParams((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const setPalette = useCallback((next: PaletteId) => {
		setPaletteState(next);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("palette", next);
			window.history.replaceState({}, "", url.toString());
		}
	}, []);

	// Shared glass props for cards
	const glass = useMemo(
		() => ({
			radius: params.radius,
			bevel: params.bevel,
			refraction: params.refraction,
			dispersion: params.dispersion,
			roughness: params.roughness,
			frost: params.frost,
			specular: params.specular,
			edgeGlow: params.edgeGlow,
			tintAmount: params.tintAmount,
			saturation: params.saturation,
		}),
		[params],
	);

	const pill = useMemo(
		() => ({
			...glass,
			radius: 999,
			bevel: Math.round(thickness * 0.9),
			refraction: Math.round(thickness * 1.8),
			dispersion: 0.32,
			frost: 0,
			specular: 0.92,
			edgeGlow: 0.48,
		}),
		[glass, thickness],
	);

	const card = useMemo(
		() => ({
			...glass,
			radius: 32,
			bevel: Math.round(thickness * 1.5),
			refraction: Math.round(thickness * 3.2),
			dispersion: 0.36,
			roughness: 0.04,
			frost: 0,
			specular: 0.94,
			edgeGlow: 0.55,
		}),
		[glass, thickness],
	);

	return {
		params,
		setParam,
		palette,
		setPalette,
		tone,
		backend,
		setBackend,
		forceFallback,
		setForceFallback,
		glass,
		pill,
		card,
		// Interactive tab & synthesizer states
		activeTab,
		setActiveTab,
		materialMode,
		setMaterialMode,
		zetaDamping,
		setZetaDamping,
		moisture,
		setMoisture,
		promptInput,
		setPromptInput,
		targetExecutor,
		setTargetExecutor,
		stepperStep,
		setStepperStep,
		forceSensing,
		setForceSensing,
		smoothMotion,
		setSmoothMotion,
		thickness,
		setThickness,
	};
}
