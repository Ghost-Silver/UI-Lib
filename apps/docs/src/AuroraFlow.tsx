import {
	fieldOptions,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	Magnetic,
	ParticleField,
	Reveal,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect } from "react";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#04060a", "#07141a", "#0c2428", "#0a1018"],
	speed: 0.035,
};

// Grade is `quiet`. These stop the default focus smear from eating the curtain.
const POST: PostProcessingOptions = {
	chromaticAberration: 0.06,
	focusBlur: 0,
	motionBlur: 0,
};

const CAMERA = {
	cameraPosition: [0, -0.05, 8.4] as [number, number, number],
	cameraTarget: [0.15, 0.95, 0] as [number, number, number],
	fov: 34,
};

/** Same depth as the sheet, so the eddy stays in the curtain. */
const POINTER_DISTANCE = 8.1;
const STIR_AT: [number, number, number] = [-2.2, 1.15, 0.2];

const NOTES = [
	{ label: "Drift", body: "Born across the sky, not on the pointer." },
	{ label: "Fold", body: "The weather stays when your hand is still." },
	{ label: "Stir", body: "A heart marks the eddy. It does not jump." },
] as const;

/** A slower sheet behind the curtain. No eddy, so it does not follow the hand. */
const HAZE = fieldOptions("aurora", {
	count: 7_000,
	intensity: 0.16,
	opacity: 0.3,
	hotAmount: 0,
	stirTint: 0,
	size: [0.028, 0.062],
	colors: ["#6ec8b0", "#7eb0d0", "#a898c8"],
	emitter: { position: [0.2, 1.25, -1.7], size: [8, 1.8, 0.35] },
	forces: {
		stir: 0,
		stirRadius: 0,
		turbulence: 0.28,
		wind: [0.06, 0.02, 0],
		vortex: 0.06,
		noiseDrift: 0.03,
	},
});

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export function AuroraFlowPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");

	useEffect(() => {
		document.title = "Aurora · UI-Lib";
	}, []);

	return (
		<GlassStage
			className="aurora-stage"
			look="quiet"
			backdrop={BACKDROP}
			post={POST}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
		>
			<ParticleField camera={CAMERA} options={HAZE} />
			<ParticleField
				flow
				pointerDistance={POINTER_DISTANCE}
				stirAt={STIR_AT}
				camera={CAMERA}
				options={fieldOptions("aurora")}
			/>
			<div className="aurora" data-ui-lib-acceptance="aurora-flow">
				<header className="aurora-top">
					<p className="aurora-kicker">
						Aurora <span>Flow</span>
					</p>
					<nav className="aurora-links" aria-label="Pages">
						<Magnetic strength={0.32} radius={88}>
							<a href="/">Index</a>
						</Magnetic>
						<Magnetic strength={0.32} radius={88}>
							<a href="/?demo=product-hero">Lumen</a>
						</Magnetic>
						<Magnetic strength={0.32} radius={88}>
							<a href="/?demo=scroll-cinema">Cinema</a>
						</Magnetic>
					</nav>
				</header>
				<div className="aurora-main">
					<div className="aurora-copy">
						<Reveal as="h1" delay={0.2} stagger={0.08}>
							The night keeps moving.
						</Reveal>
						<Reveal as="p" className="aurora-lead" delay={0.72} stagger={0.045}>
							A curtain of light. Move through it. The eddy comes to your hand.
						</Reveal>
					</div>
					<Magnetic className="aurora-card-hold" strength={0.12} radius={220}>
						<GlassPanel className="aurora-card" {...GLASS_LOOKS.veil}>
							<p className="aurora-kicker">Still</p>
							<Reveal as="h2" delay={1.12}>
								It does not stop.
							</Reveal>
							<ul>
								{NOTES.map((note, index) => (
									<li key={note.label}>
										<span>{note.label}</span>
										<Reveal as="span" delay={1.32 + index * 0.14}>
											{note.body}
										</Reveal>
									</li>
								))}
							</ul>
						</GlassPanel>
					</Magnetic>
				</div>
				<p className="aurora-aside">
					A heart in it
					<br />
					Shared clock
				</p>
			</div>
		</GlassStage>
	);
}
