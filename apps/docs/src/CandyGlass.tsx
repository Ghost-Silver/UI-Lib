import {
	BubbleBadge,
	fieldOptions,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	Magnetic,
	Optics,
	ParticleField,
	Reveal,
	useReducedMotion,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#3f2450", "#5e3568", "#8a5580", "#4e2c66"],
	speed: 0.025,
};

// Grade is `quiet`. These keep the pastel cloud from milking the type.
const POST: PostProcessingOptions = {
	chromaticAberration: 0.05,
	focusBlur: 0,
	motionBlur: 0,
};

const CAMERA = {
	cameraPosition: [0, 0.04, 7.4] as [number, number, number],
	cameraTarget: [0.7, 0, 0] as [number, number, number],
	fov: 32,
};

/** Same depth as the cloud, so the stir stays in the candy field. */
const POINTER_DISTANCE = 7.4;
const STIR_AT: [number, number, number] = [1.2, 0.7, 0.2];

const NOTES = [
	{ label: "Soft", body: "Fourteen thousand pastel points. Not a million, not a claim." },
	{ label: "Round", body: "The badge is a bead, not a pane. Fully rounded, gentle rim." },
	{ label: "Quiet", body: "Dimmer than aurora, so the sentence beside it still wins." },
] as const;

const BADGES = ["sakura", "peach", "iris"] as const;

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export function CandyGlassPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	const slotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = "Candy Glass · UI-Lib";
	}, []);

	return (
		<GlassStage
			className="candy-stage"
			look="quiet"
			mode="section"
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
				options={fieldOptions("pastel")}
			/>
			<CandyBead anchor={slotRef} />
			<div className="candy" data-ui-lib-acceptance="candy-glass">
				<header className="candy-top">
					<p className="candy-kicker">
						Candy <span>Glass</span>
					</p>
					<nav className="candy-links" aria-label="Pages">
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

				<div className="candy-main">
					<div className="candy-copy">
						<Reveal as="h1" delay={0.16} stagger={0.07}>
							Sweet, but it still bends light.
						</Reveal>
						<Reveal as="p" className="candy-lead" delay={0.62} stagger={0.04}>
							A pastel cloud, a rounded bead, and three named badges. The words are HTML and
							stay selectable.
						</Reveal>
						<div className="candy-badges">
							{BADGES.map((label) => (
								<BubbleBadge key={label} className="candy-badge">
									{label}
								</BubbleBadge>
							))}
						</div>
					</div>

					<Magnetic className="candy-card-hold" strength={0.1} radius={200}>
						<GlassPanel className="candy-card" {...GLASS_LOOKS.veil}>
							<p className="candy-kicker">On the GPU</p>
							<Reveal as="h2" delay={0.96}>
								Not a sticker.
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
							<div ref={slotRef} className="candy-slot" data-ui-lib-anchor="bead" />
						</GlassPanel>
					</Magnetic>
				</div>
			</div>
		</GlassStage>
	);
}

/** A small bead that follows an empty layout slot, like the other pages do. */
function CandyBead({ anchor }: { anchor: { readonly current: HTMLElement | null } }) {
	const reduced = useReducedMotion();
	return (
		<Optics
			look="sakura"
			mote="quiet"
			spark={false}
			radius={1.05}
			anchor={anchor}
			fit={0.8}
			position={[1.12, 0.02, 0]}
			rotation={[0.5, 0.15, 0]}
			refraction={reduced ? 14 : 18}
			dispersion={0.05}
			caustic={0.06}
		/>
	);
}
