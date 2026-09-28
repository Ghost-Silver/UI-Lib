import {
	fieldOptions,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	Magnetic,
	ParticleField,
	PointerTrail,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect } from "react";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#07060c", "#16141c", "#2a241c", "#121820"],
	speed: 0.03,
};

// Quiet grade does not set these. The post defaults would smear the ribbon.
const POST: PostProcessingOptions = {
	chromaticAberration: 0.05,
	focusBlur: 0.15,
	focusDepth: 0.4,
};

const CAMERA = {
	cameraPosition: [0, 0.08, 9.8] as [number, number, number],
	cameraTarget: [0.2, -0.05, 0] as [number, number, number],
	fov: 36,
};

/** One distance for the cloud and the ribbon, so they share a depth. */
const POINTER_DISTANCE = 6.8;

const PILLS = ["Gather", "Hold", "Release"] as const;

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export function CursorFieldPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");

	useEffect(() => {
		document.title = "The field follows. · UI-Lib";
	}, []);

	return (
		<GlassStage
			className="cursorfield-stage"
			look="quiet"
			backdrop={BACKDROP}
			post={POST}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
		>
			<ParticleField
				pointer
				pointerDistance={POINTER_DISTANCE}
				camera={CAMERA}
				options={fieldOptions("cursor", {
					emitter: { position: [1.35, -0.2, 3.05] },
				})}
			/>
			<PointerTrail
				distance={POINTER_DISTANCE}
				length={24}
				width={0.08}
				color="#efe8ff"
				gain={0.6}
			/>
			<div className="cursorfield" data-ui-lib-acceptance="cursor-field">
				<header className="cursorfield-top">
					<div>
						<p className="cursorfield-kicker">Cursor</p>
						<h1>The field follows.</h1>
						<p className="cursorfield-lead">
							Move across the glass. The room keeps the gesture.
						</p>
					</div>
					<nav className="cursorfield-links" aria-label="Pages">
						<Magnetic strength={0.35} radius={88}>
							<a className="cursorfield-link" href="/">
								Index
							</a>
						</Magnetic>
						<Magnetic strength={0.35} radius={88}>
							<a className="cursorfield-link" href="/?demo=product-hero">
								Lumen
							</a>
						</Magnetic>
					</nav>
				</header>
				<div className="cursorfield-pills">
					{PILLS.map((label) => (
						<Magnetic key={label} strength={0.28} radius={120}>
							<GlassPanel className="cursorfield-pill" {...GLASS_LOOKS.pill}>
								{label}
							</GlassPanel>
						</Magnetic>
					))}
				</div>
				<div className="cursorfield-bottom">
					<Magnetic className="cursorfield-card-wrap" strength={0.14} radius={240}>
						<GlassPanel className="cursorfield-card" {...GLASS_LOOKS.cursor}>
							<p className="cursorfield-kicker">Gesture</p>
							<h2>It stays with you.</h2>
							<p>
								A still hand gathers the cloud. Move, and the glass leans. Stop, and the trace
								is gone.
							</p>
						</GlassPanel>
					</Magnetic>
					<p className="cursorfield-aside">
						Fixed distance
						<br />
						Shared clock
					</p>
				</div>
			</div>
		</GlassStage>
	);
}
