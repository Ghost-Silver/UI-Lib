import { PLAYGROUND_FIELD, PLAYGROUND_FIELD_CAMERA } from "@ui-lib/particles";
import {
	FrostedGround,
	GlassStage,
	ParticleField,
	useGlassStage,
	WatercolorBoard,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useMemo, useRef } from "react";
import {
	cameraPosition,
	dot,
	mix,
	normalize,
	normalWorld,
	oneMinus,
	positionWorld,
	saturate,
	vec3,
} from "three/tsl";
import {
	AdditiveBlending,
	IcosahedronGeometry,
	Mesh,
	MeshBasicNodeMaterial,
} from "three/webgpu";
import { StatusHud } from "./components/StatusHud.js";
import { IrisHeroSection } from "./home/IrisHeroSection.js";
import { IrisNavCapsule } from "./home/IrisNavCapsule.js";
import { MaterialSynthesizerDeck } from "./home/MaterialSynthesizerDeck.js";
import { TechPillarsGrid } from "./home/TechPillarsGrid.js";
import { useIrisSynthesizer } from "./home/useIrisSynthesizer.js";
import { WorkbenchGateways } from "./home/WorkbenchGateways.js";

const PALETTES = {
	aurora: ["#16255e", "#7b2ff7", "#f107a3", "#00d4ff"],
	ember: ["#240b12", "#c2410c", "#f59e0b", "#7f1d1d"],
	mint: ["#04212a", "#0f766e", "#22d3ee", "#a3e635"],
	ink: ["#05060c", "#1f2937", "#3f4b63", "#8ea0bd"],
} as const;

function HeroCrystal() {
	const { layer } = useGlassStage();

	useEffect(() => {
		if (!layer) return;
		const geometry = new IcosahedronGeometry(2.25, 5);
		const material = new MeshBasicNodeMaterial({ transparent: true, opacity: 0.88 });
		const viewDirection = normalize(cameraPosition.sub(positionWorld));
		const rim = oneMinus(saturate(dot(normalWorld, viewDirection))).pow(1.7);
		material.colorNode = mix(vec3(0.04, 0.32, 0.5), vec3(0.85, 0.2, 0.68), rim);
		material.opacityNode = mix(0.54, 0.96, rim);
		material.transparent = true;
		material.depthWrite = false;
		material.blending = AdditiveBlending;

		const crystal = new Mesh(geometry, material);
		crystal.name = "ui-lib:hero-crystal";
		crystal.scale.setScalar(1.08);
		crystal.position.x = 4.2;
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const attachment = layer.addWorldObject(crystal, (info) => {
			if (prefersReducedMotion) return;
			crystal.rotation.y += info.dt * 0.22;
			crystal.rotation.x = Math.sin(info.elapsed * 0.42) * 0.12;
			crystal.position.y = Math.sin(info.elapsed * 0.68) * 0.28;
		});

		return () => {
			attachment.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [layer]);

	return null;
}

interface SceneProps {
	synth: ReturnType<typeof useIrisSynthesizer>;
}

function Scene({ synth }: SceneProps) {
	const { stats, status } = useGlassStage();
	const boardRef = useRef<HTMLDivElement>(null);

	const handleExploreClick = () => {
		boardRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<FrostedGround inset={16} radius={28} className="iris-home-ground">
			<div className="iris-home-container">
				{/* 1. Floating Glass Capsule Nav */}
				<IrisNavCapsule
					palette={synth.palette}
					setPalette={synth.setPalette}
					tone={synth.tone}
					pillProps={synth.pill}
					forceFallback={synth.forceFallback}
					setForceFallback={synth.setForceFallback}
					backend={synth.backend}
					setBackend={synth.setBackend}
				/>

				{/* 2. Hero Section */}
				<IrisHeroSection
					palette={synth.palette}
					tone={synth.tone}
					onExploreClick={handleExploreClick}
					synth={synth}
				/>

				{/* 3. Oriental Xuan Paper & Watercolor Board (宣纸水墨底板) */}
				<div ref={boardRef}>
					<WatercolorBoard tone={synth.tone} moisture={synth.moisture}>
						{/* Material Synthesizer Deck */}
						<MaterialSynthesizerDeck
							params={synth.params}
							setParam={synth.setParam}
							tone={synth.tone}
							cardProps={synth.card}
							activeTab={synth.activeTab}
							setActiveTab={synth.setActiveTab}
							materialMode={synth.materialMode}
							setMaterialMode={synth.setMaterialMode}
							zetaDamping={synth.zetaDamping}
							setZetaDamping={synth.setZetaDamping}
							moisture={synth.moisture}
							setMoisture={synth.setMoisture}
							promptInput={synth.promptInput}
							setPromptInput={synth.setPromptInput}
							targetExecutor={synth.targetExecutor}
							setTargetExecutor={synth.setTargetExecutor}
							stepperStep={synth.stepperStep}
							setStepperStep={synth.setStepperStep}
							forceSensing={synth.forceSensing}
							setForceSensing={synth.setForceSensing}
							smoothMotion={synth.smoothMotion}
							setSmoothMotion={synth.setSmoothMotion}
						/>

						{/* Four Technical Pillars */}
						<TechPillarsGrid cardProps={synth.card} />
					</WatercolorBoard>
				</div>

				{/* 4. Showcase & Workbench Gateways */}
				<WorkbenchGateways palette={synth.palette} tone={synth.tone} cardProps={synth.card} />

				{/* 5. Footer */}
				<footer className="iris-home-footer">
					<div>
						<strong>UI-LIB</strong> · Iris AGI Framework Visual Foundation
					</div>
					<div>“积微成智，万象自生。” · WebGPU / WebGL 2 with TSL Shaders</div>
				</footer>

				{/* Real-time Status HUD */}
				<StatusHud stats={stats} status={status} forceFallback={synth.forceFallback} />
			</div>
		</FrostedGround>
	);
}

export function IrisHomepage() {
	const synth = useIrisSynthesizer();

	const backdrop = useMemo<BackdropSpec>(
		() => ({ type: "gradient", colors: [...PALETTES[synth.palette]], speed: 0.25 }),
		[synth.palette],
	);

	const post = useMemo<PostProcessingOptions>(
		() => ({
			bloomStrength: synth.params.bloomStrength,
			haloStrength: synth.params.haloStrength,
			flareStrength: synth.params.flareStrength,
			chromaticAberration: synth.params.chromaticAberration,
			focusBlur: synth.params.focusBlur,
			focusDepth: synth.params.focusDepth,
			motionBlur: synth.params.motionBlur,
			temporalReactive: synth.params.temporalReactive,
			grain: synth.params.grain,
			vignette: synth.params.vignette,
		}),
		[
			synth.params.bloomStrength,
			synth.params.haloStrength,
			synth.params.flareStrength,
			synth.params.chromaticAberration,
			synth.params.focusBlur,
			synth.params.focusDepth,
			synth.params.motionBlur,
			synth.params.temporalReactive,
			synth.params.grain,
			synth.params.vignette,
		],
	);

	return (
		<GlassStage
			backdrop={backdrop}
			post={post}
			forceFallback={synth.forceFallback}
			forceWebGL={synth.backend === "webgl"}
			className="stage"
		>
			<HeroCrystal />
			<ParticleField
				options={PLAYGROUND_FIELD}
				camera={{
					cameraPosition: PLAYGROUND_FIELD_CAMERA.position,
					cameraTarget: PLAYGROUND_FIELD_CAMERA.target,
					fov: PLAYGROUND_FIELD_CAMERA.fov,
				}}
				pointer
			/>
			<Scene synth={synth} />
		</GlassStage>
	);
}
