import {
	beatLocal,
	beatWeight,
	CINEMA_LENS_ENVIRONMENT,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	type LensLookName,
	Magnetic,
	SCROLL_CINEMA_BEATS,
	SCROLL_CINEMA_FADE,
	ScrollPin,
	type ScrollState,
	ScrollTrack,
	sampleTrack,
	useGlassStage,
	useReducedMotion,
	useScrollTrackHandle,
} from "@ui-lib/react";
import { Optics } from "@ui-lib/react/gpu";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";
import { Group } from "three/webgpu";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#07060c", "#1a1640", "#6a3058", "#14666a"],
	speed: 0.08,
};

// Grade lives in `look="cinema"` (shoulder + a higher bloom cutoff). These
// knobs are the camera, not the brightness. Depth-masked motion blur stays on;
// DOM glass is not in that depth buffer.
const CAMERA_POST: PostProcessingOptions = {
	focusBlur: 3.2,
	focusDepth: 0.11,
	temporalBlend: 0.78,
	temporalReactive: 0.92,
	motionBlur: 0.46,
	cameraMotionBlur: true,
};

const CAMERA = [
	{ at: 0, value: [0.2, 0.15, 12.4, 0, 0.05, 0, 46] },
	{ at: 0.28, value: [2.1, 0.55, 8.4, 0.25, 0.05, 0, 41] },
	{ at: 0.56, value: [-1.85, 0.1, 7.2, -0.2, 0, 0, 39] },
	{ at: 0.82, value: [0.35, 0.95, 10.4, 0, 0.2, 0, 47] },
	{ at: 1, value: [0.05, 0.3, 13.2, 0, 0.05, 0, 50] },
] as const;

const CHAPTER_COPY = [
	{
		index: "01",
		title: "Hold the light",
		body: "This canvas belongs to the pin, not the page. Scroll far enough and it leaves with the section.",
	},
	{
		index: "02",
		title: "Then it bends",
		body: "One clock moves the camera, the glass and the type. Refraction is not a second animation loop catching up.",
	},
	{
		index: "03",
		title: "Stay in the document",
		body: "The sentence you are reading is HTML. The crystal behind it is not. Focus, selection and the heading order never enter the canvas.",
	},
	{
		index: "04",
		title: "Let it go",
		body: "The pin releases. The device does not follow you into the next section.",
	},
] as const;

const CHAPTERS = CHAPTER_COPY.map((chapter, index) => {
	const beat = SCROLL_CINEMA_BEATS[index];
	if (!beat) throw new Error("Scroll Cinema is missing a chapter window.");
	return { ...chapter, start: beat.start, end: beat.end };
});

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

function readOptic(): LensLookName {
	if (typeof window === "undefined") return "crystal";
	const value = new URLSearchParams(window.location.search).get("optic");
	if (value === "flare" || value === "ice" || value === "ember" || value === "crystal") {
		return value;
	}
	return "crystal";
}

export function ScrollCinemaPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	const slotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = "Scroll Cinema · UI-Lib";
	}, []);

	return (
		<div className="cinema" data-ui-lib-acceptance="scroll-cinema">
			<ScrollTrack length={4.2}>
				{(scroll) => (
					<ScrollPin className="cinema-pin" height="100dvh">
						<GlassStage
							mode="section"
							className="cinema-stage"
							style={{ width: "100%", height: "100%" }}
							backdrop={BACKDROP}
							look="cinema"
							post={CAMERA_POST}
							forceWebGL={forceWebGL}
							forceFallback={forceFallback}
						>
							<CinemaCamera progress={scroll.progress} />
							<CinemaOptics progress={scroll.progress} anchor={slotRef} />
							<CinemaOverlay scroll={scroll} slot={slotRef} />
						</GlassStage>
					</ScrollPin>
				)}
			</ScrollTrack>
			<section className="cinema-after">
				<p className="cinema-kicker">After the pin</p>
				<h2>The page continues.</h2>
				<p>
					Ordinary document flow. No fixed canvas, no second ticker. The stage unpinned with the
					section above.
				</p>
				<Magnetic strength={0.36} radius={110}>
					<a className="cinema-back" href="/">
						Back to the playground
					</a>
				</Magnetic>
			</section>
		</div>
	);
}

function CinemaCamera({ progress }: { progress: number }) {
	const progressRef = useRef(progress);
	progressRef.current = progress;
	const { layer } = useGlassStage();

	useEffect(() => {
		if (!layer) return;
		const anchor = new Group();
		const attachment = layer.addWorldObject(anchor, () => {
			const cam = sampleTrack(progressRef.current, CAMERA);
			layer.setCamera({
				cameraPosition: [cam[0] ?? 0, cam[1] ?? 0.2, cam[2] ?? 12],
				cameraTarget: [cam[3] ?? 0, cam[4] ?? 0, cam[5] ?? 0],
				fov: cam[6] ?? 46,
			});
		});
		return () => attachment.dispose();
	}, [layer]);

	return null;
}

function CinemaOptics({
	progress,
	anchor,
}: {
	progress: number;
	anchor: { readonly current: HTMLElement | null };
}) {
	const bend = beatLocal(progress, 0.08, 0.72);
	const reduced = useReducedMotion();

	return (
		<Optics
			look={readOptic()}
			environment={CINEMA_LENS_ENVIRONMENT}
			anchor={anchor}
			distance={12.4}
			position={[0.78, 0.08, 0]}
			rotation={[0.62, 0, 0]}
			refraction={reduced ? 18 : 22 + bend * 46}
			dispersion={0.08 + bend * 0.2}
			lightDirection={[-0.4 + bend * 0.85, 0.5 + bend * 0.15]}
			spin={0.05}
		/>
	);
}

function CinemaOverlay({
	scroll,
	slot,
}: {
	scroll: ScrollState;
	slot: { readonly current: HTMLDivElement | null };
}) {
	const track = useScrollTrackHandle();
	const bend = beatLocal(scroll.progress, 0.08, 0.72);
	const hint = 1 - beatLocal(scroll.progress, 0.01, 0.12);
	const activeIndex = CHAPTERS.findIndex(
		(chapter) =>
			beatWeight(scroll.progress, chapter.start, chapter.end, SCROLL_CINEMA_FADE) > 0.45,
	);

	return (
		<div className="cinema-ui">
			<div ref={slot} className="cinema-slot" data-ui-lib-anchor="optic" aria-hidden="true" />
			<header className="cinema-top">
				<div>
					<p className="cinema-kicker">UI-Lib · one stage</p>
					<h1>Scroll Cinema</h1>
				</div>
				<div className="cinema-top__meta">
					<a href="/?demo=product-hero">Lumen</a>
					<a href="/">Playground</a>
					<p className="cinema-progress" data-ui-lib-scroll-readout="">
						{scroll.progress.toFixed(2)}
					</p>
				</div>
			</header>

			<nav className="cinema-index" aria-label="Chapters">
				{CHAPTERS.map((chapter, index) => (
					<Magnetic
						key={chapter.index}
						className="cinema-index__magnet"
						strength={0.42}
						radius={72}
					>
						<button
							type="button"
							className="cinema-index__item"
							data-active={index === activeIndex ? "true" : "false"}
							onClick={() => track?.scrollToProgress(Math.max(0, chapter.start) + 0.04)}
						>
							<span>{chapter.index}</span>
							{chapter.title}
						</button>
					</Magnetic>
				))}
			</nav>

			<Magnetic className="cinema-card-hold" strength={0.14} radius={220}>
				<GlassPanel
					className="cinema-card"
					{...GLASS_LOOKS.cinema}
					refraction={26 + bend * 40}
					dispersion={0.14 + bend * 0.28}
					roughness={0.18 - bend * 0.06}
					lightDirection={[
						-0.2 + Math.sin(scroll.progress * Math.PI) * 0.8,
						0.42 + bend * 0.35,
					]}
				>
					{CHAPTERS.map((chapter) => {
						const weight = beatWeight(
							scroll.progress,
							chapter.start,
							chapter.end,
							SCROLL_CINEMA_FADE,
						);
						return (
							<div
								key={chapter.index}
								className="cinema-chapter"
								style={{
									opacity: weight,
									transform: `translate3d(0, ${(1 - weight) * 22}px, 0)`,
									pointerEvents: weight > 0.35 ? "auto" : "none",
								}}
								aria-hidden={weight < 0.2}
							>
								<p className="cinema-kicker">{chapter.index} / 04</p>
								<h2>{chapter.title}</h2>
								<p>{chapter.body}</p>
							</div>
						);
					})}
				</GlassPanel>
			</Magnetic>

			<p className="cinema-hint" style={{ opacity: hint }} aria-hidden={hint < 0.2}>
				Scroll to travel
			</p>
		</div>
	);
}
