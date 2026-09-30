import {
	beatLocal,
	beatWeight,
	GLASS_LOOKS,
	GlassPanel,
	GlassStage,
	Magnetic,
	Optics,
	ScrollPin,
	type ScrollState,
	ScrollTrack,
	sampleTrack,
	useGlassStage,
	useReducedMotion,
	useScrollTrackHandle,
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useRef, useState } from "react";
import { Group } from "three/webgpu";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#0b0a09", "#241910", "#6b4632", "#1a3a42"],
	speed: 0.045,
};

// Grade is `look="product"`. These are the camera, not the brightness.
const CAMERA_POST: PostProcessingOptions = {
	chromaticAberration: 0.12,
	focusBlur: 0.7,
	focusDepth: 0.2,
	motionBlur: 0.16,
	cameraMotionBlur: true,
	vignette: 0.22,
};

const CAMERA = [
	{ at: 0, value: [-0.55, 0.18, 9.6, 0.55, 0.02, 0, 34] },
	{ at: 0.32, value: [0.35, 0.06, 6.4, 0.95, 0, 0, 29] },
	{ at: 0.62, value: [1.7, 0.32, 7.2, 0.72, 0.06, 0, 32] },
	{ at: 1, value: [-0.2, 0.24, 11.4, 0.48, 0.05, 0, 40] },
] as const;

const CAMERA_NARROW = [
	{ at: 0, value: [0.05, 0.85, 12.2, 0.05, -0.55, 0, 42] },
	{ at: 0.45, value: [0.2, 0.15, 8.4, 0.05, -0.2, 0, 38] },
	{ at: 1, value: [0, 0.55, 12.8, 0.05, -0.35, 0, 44] },
] as const;

const CHAPTERS = [
	{
		index: "01",
		kicker: "Form",
		title: "Look through it.",
		body: "A desk instrument. One optic, untinted. Scroll and it turns. The words stay in the document.",
		start: -0.08,
		end: 0.28,
	},
	{
		index: "02",
		kicker: "Turn",
		title: "Then it turns.",
		body: "The camera and this sentence share a clock. Nothing is catching up.",
		start: 0.28,
		end: 0.52,
	},
	{
		index: "03",
		kicker: "Measure",
		title: "Three numbers.",
		body: "Mass, glass, focus. The card is HTML. The optic behind it is not.",
		start: 0.52,
		end: 0.78,
	},
	{
		index: "04",
		kicker: "Leave",
		title: "It stays.",
		body: "The pin releases. The instrument does not follow you into the next section.",
		start: 0.78,
		end: 1.08,
	},
] as const;

const SPECS = [
	{ label: "Mass", value: "186 g" },
	{ label: "Glass", value: "Untinted" },
	{ label: "Focus", value: "0.4 – 2 m" },
] as const;

const SHEET = [...SPECS, { label: "Finish", value: "Warm nickel" }] as const;

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

function useWide(query = "(min-width: 900px)"): boolean {
	const [wide, setWide] = useState(() =>
		typeof window === "undefined" ? true : window.matchMedia(query).matches,
	);
	useEffect(() => {
		const media = window.matchMedia(query);
		const apply = () => setWide(media.matches);
		apply();
		media.addEventListener("change", apply);
		return () => media.removeEventListener("change", apply);
	}, [query]);
	return wide;
}

export function ProductHeroPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	const wide = useWide();
	const slotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = "Lumen · UI-Lib";
	}, []);

	return (
		<div className="lumen" data-ui-lib-acceptance="product-hero">
			<ScrollTrack length={3.2}>
				{(scroll) => (
					<ScrollPin className="lumen-pin" height="100dvh">
						<GlassStage
							mode="section"
							look="product"
							className="lumen-stage"
							style={{ width: "100%", height: "100%" }}
							backdrop={BACKDROP}
							post={CAMERA_POST}
							forceWebGL={forceWebGL}
							forceFallback={forceFallback}
						>
							<HeroCamera progress={scroll.progress} wide={wide} />
							<HeroOptic progress={scroll.progress} anchor={slotRef} />
							<HeroOverlay scroll={scroll} slot={slotRef} />
						</GlassStage>
					</ScrollPin>
				)}
			</ScrollTrack>
			<HeroAfter />
		</div>
	);
}

function HeroCamera({ progress, wide }: { progress: number; wide: boolean }) {
	const progressRef = useRef(progress);
	const wideRef = useRef(wide);
	progressRef.current = progress;
	wideRef.current = wide;
	const { layer } = useGlassStage();

	useEffect(() => {
		if (!layer) return;
		const anchor = new Group();
		const attachment = layer.addWorldObject(anchor, () => {
			const cam = sampleTrack(progressRef.current, wideRef.current ? CAMERA : CAMERA_NARROW);
			layer.setCamera({
				cameraPosition: [cam[0] ?? 0, cam[1] ?? 0.2, cam[2] ?? 10],
				cameraTarget: [cam[3] ?? 0.5, cam[4] ?? 0, cam[5] ?? 0],
				fov: cam[6] ?? 34,
			});
		});
		return () => attachment.dispose();
	}, [layer]);

	return null;
}

function HeroOptic({
	progress,
	anchor,
}: {
	progress: number;
	anchor: { readonly current: HTMLElement | null };
}) {
	const bend = beatLocal(progress, 0.18, 0.62);
	const reduced = useReducedMotion();

	return (
		<Optics
			look="crystal"
			mote="quiet"
			spark={false}
			radius={1.05}
			anchor={anchor}
			fit={0.8}
			position={[1.12, 0.02, 0]}
			rotation={[0.5, 0.15, 0]}
			refraction={reduced ? 14 : 18 + bend * 16}
			dispersion={0.05 + bend * 0.07}
			lightDirection={[-0.25 + bend * 0.4, 0.55]}
			spin={0.035}
		/>
	);
}

function HeroOverlay({
	scroll,
	slot,
}: {
	scroll: ScrollState;
	slot: { readonly current: HTMLDivElement | null };
}) {
	const track = useScrollTrackHandle();
	const hint = 1 - beatLocal(scroll.progress, 0.02, 0.14);
	const active = CHAPTERS.find(
		(chapter) => beatWeight(scroll.progress, chapter.start, chapter.end, 0.07) > 0.45,
	);

	return (
		<div className="lumen-ui">
			<header className="lumen-top">
				<p className="lumen-mark">
					<i className="lumen-glyph" aria-hidden="true" />
					Lumen
					<span>Edition 01</span>
				</p>
				<nav className="lumen-nav" aria-label="Site">
					<Magnetic strength={0.4} radius={90}>
						<a href="/?demo=scroll-cinema">Cinema</a>
					</Magnetic>
					<Magnetic strength={0.4} radius={90}>
						<a href="/">Playground</a>
					</Magnetic>
				</nav>
			</header>

			<div className="lumen-main">
				<div className="lumen-copy">
					{CHAPTERS.map((chapter) => {
						const weight = beatWeight(scroll.progress, chapter.start, chapter.end, 0.07);
						const Title = chapter.index === "01" ? "h1" : "h2";
						return (
							<div
								key={chapter.index}
								className="lumen-chapter"
								style={{
									opacity: weight,
									transform: `translate3d(0, ${(1 - weight) * 18}px, 0)`,
								}}
								aria-hidden={weight < 0.2}
							>
								<p className="lumen-kicker">
									{chapter.index} / {chapter.kicker}
								</p>
								<Title>{chapter.title}</Title>
								<p>{chapter.body}</p>
							</div>
						);
					})}
					<div className="lumen-dock">
						<Magnetic strength={0.42} radius={120}>
							<GlassPanel
								as="button"
								className="lumen-cta"
								{...GLASS_LOOKS.pill}
								onClick={() => track?.scrollToProgress(0.64)}
							>
								See the numbers
							</GlassPanel>
						</Magnetic>
						<GlassPanel className="lumen-spec" {...GLASS_LOOKS.quiet}>
							<dl>
								{SPECS.map((spec) => (
									<div key={spec.label}>
										<dt>{spec.label}</dt>
										<dd>{spec.value}</dd>
									</div>
								))}
							</dl>
						</GlassPanel>
					</div>
				</div>
				<div ref={slot} className="lumen-slot" data-ui-lib-anchor="optic" aria-hidden="true" />
			</div>

			<footer className="lumen-foot">
				<p className="lumen-hint" style={{ opacity: hint }} aria-hidden={hint < 0.2}>
					Scroll to turn
				</p>
				<div
					className="lumen-meter"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(scroll.progress * 100)}
					aria-label="Story"
				>
					<span style={{ transform: `scaleX(${scroll.progress})` }} />
				</div>
			</footer>
			<p className="lumen-sr" aria-live="polite">
				{active ? active.title : ""}
			</p>
		</div>
	);
}

function HeroAfter() {
	return (
		<section className="lumen-after">
			<p className="lumen-kicker">After the pin</p>
			<h2>It stays on the desk.</h2>
			<p className="lumen-lede">
				The instrument unpinned with the section above. What follows is the document —
				selectable, ordinary, and still the product.
			</p>
			<dl className="lumen-sheet">
				{SHEET.map((spec) => (
					<div key={spec.label}>
						<dt>{spec.label}</dt>
						<dd>{spec.value}</dd>
					</div>
				))}
			</dl>
			<div className="lumen-notes">
				<article>
					<h3>Untinted</h3>
					<p>The glass does not colour the room. It only bends it.</p>
				</article>
				<article>
					<h3>One clock</h3>
					<p>Scroll moves the camera. The type does not wait on a second loop.</p>
				</article>
				<article>
					<h3>Still HTML</h3>
					<p>Select this sentence. The optic never took the focus.</p>
				</article>
			</div>
			<p className="lumen-colophon">
				<code>look=&quot;product&quot;</code>
				<code>{`<Optics anchor={slot} fit={0.8} />`}</code>
			</p>
			<Magnetic strength={0.36} radius={110}>
				<a className="lumen-back" href="/">
					Back to the playground
				</a>
			</Magnetic>
		</section>
	);
}
