import { WAKE_FIELD_CAMERA } from "@ui-lib/particles";
import {
	fieldOptions,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	Magnetic,
	ParticleField,
	Reveal,
	useGlassStage,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect } from "react";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#07060a", "#14110e", "#1c2438", "#0c0d12"],
	speed: 0.02,
};

const POST: PostProcessingOptions = {
	chromaticAberration: 0.04,
	focusBlur: 0,
	motionBlur: 0,
};

const CAMERA = {
	cameraPosition: WAKE_FIELD_CAMERA.position,
	cameraTarget: WAKE_FIELD_CAMERA.target,
	fov: WAKE_FIELD_CAMERA.fov,
};

const POINTER_DISTANCE = 11.2;
const STIR_AT: [number, number, number] = [4.4, 0.2, 0];

const NOTES = [
	{ label: "History", body: "Seven samples, a few frames apart. The head still stretches." },
	{ label: "Budget", body: "The tier decides how many move. The buffer stays." },
	{ label: "Glass", body: "The sentence is HTML. The stroke is not." },
] as const;

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

function WakeCount() {
	const { stats } = useGlassStage();
	const active = stats?.particleActive;
	const allocated = stats?.particleAllocated;
	if (active === undefined || allocated === undefined) return null;
	return (
		<p className="wake-count">
			{active.toLocaleString()} of {allocated.toLocaleString()} moving
		</p>
	);
}

export function WakePage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");

	useEffect(() => {
		document.title = "Wake · UI-Lib";
	}, []);

	return (
		<GlassStage
			className="wake-stage"
			look="quiet"
			backdrop={BACKDROP}
			post={POST}
			forceWebGL={forceWebGL}
			forceFallback={forceFallback}
		>
			<ParticleField
				flow
				pointerDistance={POINTER_DISTANCE}
				stirAt={STIR_AT}
				camera={CAMERA}
				options={fieldOptions("wake")}
			/>
			<div className="wake" data-ui-lib-acceptance="wake">
				<header className="wake-top">
					<p className="wake-kicker">
						Wake <span>History</span>
					</p>
					<nav className="wake-links" aria-label="Pages">
						<Magnetic strength={0.32} radius={88}>
							<a href="/">Index</a>
						</Magnetic>
						<Magnetic strength={0.32} radius={88}>
							<a href="/?demo=aurora-flow">Aurora</a>
						</Magnetic>
						<Magnetic strength={0.32} radius={88}>
							<a href="/?demo=liquid-glass">Glass</a>
						</Magnetic>
					</nav>
				</header>
				<div className="wake-main">
					<div className="wake-copy">
						<Reveal as="h1" delay={0.16} stagger={0.07}>
							Light keeps a line.
						</Reveal>
						<Reveal as="p" className="wake-lead" delay={0.62} stagger={0.04}>
							Each point stores a short history. Move through it. The stroke bends. It does not
							jump.
						</Reveal>
					</div>
					<Magnetic className="wake-card-hold" strength={0.1} radius={200}>
						<GlassPanel className="wake-card" {...GLASS_LOOKS.veil}>
							<p className="wake-kicker">On the GPU</p>
							<Reveal as="h2" delay={0.96}>
								Not a ribbon.
							</Reveal>
							<ul>
								{NOTES.map((note, index) => (
									<li key={note.label}>
										<span>{note.label}</span>
										<Reveal as="span" delay={1.16 + index * 0.12}>
											{note.body}
										</Reveal>
									</li>
								))}
							</ul>
							<WakeCount />
						</GlassPanel>
					</Magnetic>
				</div>
			</div>
		</GlassStage>
	);
}
