import { GlassPanel, GlassStage, ParticleField, useGlassStage } from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useMemo } from "react";
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

export type AcceptanceDemoId = "aurora-flow" | "product-hero" | "cursor-field";

type GradientColors = [string, string, string, string];

const DEMOS: Record<
	AcceptanceDemoId,
	{ title: string; eyebrow: string; colors: GradientColors }
> = {
	"aurora-flow": {
		title: "Aurora Flow",
		eyebrow: "P0 visual acceptance · GPU particles",
		colors: ["#031b2d", "#075985", "#0f766e", "#84cc16"],
	},
	"product-hero": {
		title: "Glass Product Hero",
		eyebrow: "P0 visual acceptance · world object + post graph",
		colors: ["#170b2e", "#4c1d95", "#be185d", "#f59e0b"],
	},
	"cursor-field": {
		title: "Cursor Field",
		eyebrow: "P0 interaction acceptance · pointer response",
		colors: ["#160b2a", "#581c87", "#9d174d", "#0e7490"],
	},
};

const pageStyle = {
	minHeight: "100vh",
	padding: "clamp(24px, 5vw, 72px)",
	color: "#f8fafc",
	fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const contentStyle = {
	maxWidth: 1180,
	margin: "0 auto",
	position: "relative" as const,
	zIndex: 2,
};

const glassStyle = {
	background: "rgba(255,255,255,0.06)",
	border: "1px solid rgba(255,255,255,0.12)",
	boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
	padding: "clamp(20px, 3vw, 42px)",
};

export function AcceptanceDemo({ id }: { id: AcceptanceDemoId }) {
	const demo = DEMOS[id];
	const search =
		typeof window === "undefined"
			? new URLSearchParams()
			: new URLSearchParams(window.location.search);
	const forceWebGL = search.get("backend") === "webgl";
	const forceFallback = search.get("fallback") === "1";
	const backdrop = useMemo<BackdropSpec>(
		() => ({
			type: "gradient",
			colors: demo.colors,
			speed: 0.2,
		}),
		[demo.colors],
	);
	const post = useMemo<PostProcessingOptions>(
		() => ({
			bloomStrength: id === "product-hero" ? 0.48 : 0.28,
			haloStrength: 0.16,
			flareStrength: id === "cursor-field" ? 0.2 : 0.1,
			chromaticAberration: 0.22,
			focusBlur: id === "product-hero" ? 2.2 : 0.8,
			motionBlur: 0.03,
			grain: 0.012,
			vignette: 0.18,
		}),
		[id],
	);

	useEffect(() => {
		document.title = `${demo.title} · UI-Lib acceptance`;
	}, [demo.title]);

	return (
		<GlassStage
			className="acceptance-stage"
			backdrop={backdrop}
			post={post}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
		>
			<div style={pageStyle} data-ui-lib-acceptance={id}>
				<div style={contentStyle}>
					<header
						style={{
							display: "flex",
							justifyContent: "space-between",
							gap: 24,
							alignItems: "start",
						}}
					>
						<div>
							<p
								style={{
									letterSpacing: "0.16em",
									textTransform: "uppercase",
									opacity: 0.68,
									fontSize: 12,
								}}
							>
								{demo.eyebrow}
							</p>
							<h1
								style={{
									fontSize: "clamp(40px, 8vw, 96px)",
									lineHeight: 0.95,
									margin: "16px 0 24px",
									letterSpacing: "-0.06em",
								}}
							>
								{demo.title}
							</h1>
							<p style={{ maxWidth: 570, fontSize: 18, lineHeight: 1.55, opacity: 0.8 }}>
								This page is a repeatable browser acceptance surface. It keeps semantic DOM
								above one shared canvas and exposes the accelerated and fallback paths to the
								test matrix.
							</p>
						</div>
						<AcceptanceStatus />
					</header>

					{contentFor(id)}
				</div>
			</div>
		</GlassStage>
	);
}

function AcceptanceStatus() {
	const { status, stats } = useGlassStage();
	return (
		<GlassPanel
			style={{ ...glassStyle, minWidth: 170, padding: 20 }}
			radius={24}
			refraction={28}
		>
			<strong
				style={{
					display: "block",
					fontSize: 12,
					textTransform: "uppercase",
					letterSpacing: "0.12em",
				}}
			>
				Runtime
			</strong>
			<span
				data-ui-lib-acceptance-status
				style={{ display: "block", marginTop: 12, fontSize: 18 }}
			>
				{status}
			</span>
			<span style={{ display: "block", marginTop: 8, opacity: 0.68 }}>
				{stats?.backend ?? "pending"}
			</span>
			<span style={{ display: "block", marginTop: 4, opacity: 0.68 }}>
				{stats ? `${stats.fps.toFixed(0)} FPS` : "waiting"}
			</span>
		</GlassPanel>
	);
}

function contentFor(id: AcceptanceDemoId) {
	switch (id) {
		case "aurora-flow":
			return <AuroraContent />;
		case "product-hero":
			return <ProductContent />;
		case "cursor-field":
			return <CursorContent />;
	}
}

function AuroraContent() {
	return (
		<div style={{ marginTop: 72 }}>
			<ParticleField
				options={{
					count: 12_000,
					emitter: { shape: "sphere", radius: 4, speed: 0.7, spread: 0.9 },
					forces: { turbulence: 2.1, vortex: 1.8, attractor: 0.5, attractorRadius: 7 },
					colors: ["#5eead4", "#a78bfa", "#f472b6"],
					life: [4, 9],
					size: [0.04, 0.12],
					intensity: 1.7,
					opacity: 0.8,
				}}
				camera={{ cameraPosition: [0, 0.5, 13], cameraTarget: [0, 0.3, 0], fov: 50 }}
				pointer
			/>
			<GlassPanel style={{ ...glassStyle, maxWidth: 420 }} radius={32} refraction={52}>
				<h2 style={{ fontSize: 32, marginTop: 0 }}>GPU field</h2>
				<p style={{ lineHeight: 1.6, opacity: 0.75 }}>
					Move the pointer through the field. This acceptance page checks particle compositing,
					glass refraction and the shared pointer clock together.
				</p>
			</GlassPanel>
		</div>
	);
}

function ProductContent() {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.65fr)",
				gap: 24,
				alignItems: "center",
				marginTop: 72,
			}}
		>
			<ProductCrystal />
			<GlassPanel
				style={glassStyle}
				radius={36}
				refraction={58}
				dispersion={0.38}
				roughness={0.16}
			>
				<span
					style={{
						opacity: 0.58,
						textTransform: "uppercase",
						letterSpacing: "0.14em",
						fontSize: 12,
					}}
				>
					Object / 001
				</span>
				<h2
					style={{
						fontSize: "clamp(32px, 5vw, 62px)",
						lineHeight: 0.98,
						letterSpacing: "-0.05em",
					}}
				>
					Light, held in form.
				</h2>
				<p style={{ lineHeight: 1.6, opacity: 0.72 }}>
					A small world object runs inside the same renderer and scheduler as the particles,
					backdrop and DOM glass.
				</p>
			</GlassPanel>
		</div>
	);
}

function ProductCrystal() {
	const { layer } = useGlassStage();
	useEffect(() => {
		if (!layer) return;
		const geometry = new IcosahedronGeometry(2.35, 4);
		const material = new MeshBasicNodeMaterial({ transparent: true, opacity: 0.88 });
		const viewDirection = normalize(cameraPosition.sub(positionWorld));
		const rim = oneMinus(saturate(dot(normalWorld, viewDirection))).pow(1.7);
		material.colorNode = mix(vec3(0.04, 0.32, 0.5), vec3(0.85, 0.2, 0.68), rim);
		material.opacityNode = mix(0.54, 0.96, rim);
		material.transparent = true;
		material.depthWrite = false;
		material.blending = AdditiveBlending;
		const object = new Mesh(geometry, material);
		const attachment = layer.addWorldObject(object, (info) => {
			object.rotation.y += info.dt * 0.24;
			object.rotation.x = Math.sin(info.elapsed * 0.42) * 0.14;
			object.position.y = Math.sin(info.elapsed * 0.68) * 0.28;
		});
		return () => {
			attachment.dispose();
			geometry.dispose();
			material.dispose();
		};
	}, [layer]);
	return <div aria-hidden="true" style={{ minHeight: 360 }} />;
}

function CursorContent() {
	return (
		<div style={{ marginTop: 72, minHeight: 520 }}>
			<ParticleField
				options={{
					count: 8_000,
					forces: { turbulence: 1.6, vortex: 2.4, attractor: 0.9 },
					colors: ["#f0abfc", "#67e8f9", "#fda4af"],
					intensity: 2,
					opacity: 0.9,
				}}
				camera={{ cameraPosition: [0, 0, 12], cameraTarget: [0, 0, 0] }}
				pointer
			/>
			<GlassPanel
				style={{ ...glassStyle, maxWidth: 470 }}
				radius={40}
				refraction={64}
				dispersion={0.52}
			>
				<h2 style={{ fontSize: 42, marginTop: 0 }}>Move slowly.</h2>
				<p style={{ lineHeight: 1.65, opacity: 0.72 }}>
					Pointer activity invalidates the static-frame path and keeps the glass highlight,
					particle attractor and post history responsive.
				</p>
			</GlassPanel>
		</div>
	);
}
