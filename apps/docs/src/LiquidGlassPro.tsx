import {
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
} from "@ui-lib/react";
import type { BackdropSpec, PostProcessingOptions } from "@ui-lib/renderer";
import { useEffect, useRef } from "react";
import { texture } from "three/tsl";
import {
	CanvasTexture,
	Mesh,
	MeshBasicNodeMaterial,
	PlaneGeometry,
	RepeatWrapping,
	SRGBColorSpace,
} from "three/webgpu";

const BACKDROP: BackdropSpec = {
	type: "gradient",
	colors: ["#10140f", "#1a221c", "#243028", "#6e3428"],
	speed: 0,
};

// Grade is `quiet`. These keep the hairlines sharp enough to bend.
const POST: PostProcessingOptions = {
	chromaticAberration: 0.04,
	focusBlur: 0,
	motionBlur: 0,
};

const CAMERA = [
	{ at: 0, value: [0.2, 0.04, 6.6, 0.15, 0, 0, 30] },
	{ at: 1, value: [-0.25, 0.08, 7.2, -0.1, 0.02, 0, 32] },
] as const;

const CHAPTERS = [
	{
		index: "01",
		kicker: "Attach",
		title: "It is the element.",
		body: "The pane is the card. The words in it are the document, not a picture of one.",
		start: -0.08,
		end: 0.36,
	},
	{
		index: "02",
		kicker: "Bend",
		title: "The hairline moves.",
		body: "Scroll, and the registration sheet travels under the glass. The sentence does not.",
		start: 0.34,
		end: 0.7,
	},
	{
		index: "03",
		kicker: "Hold",
		title: "One stays clear.",
		body: "Clear bends. Frost softens the sheet. The type in both stays selectable.",
		start: 0.68,
		end: 1.08,
	},
] as const;

const PANES = [
	{
		look: "press",
		kicker: "Clear",
		body: "The bevel bends the sheet. This sentence stays selectable.",
	},
	{
		look: "milk",
		kicker: "Frost",
		body: "The sheet goes soft. This sentence does not.",
	},
	{
		look: "quiet",
		kicker: "Read",
		body: "Low bend, so a hairline behind the glass is still a hairline.",
	},
] as const;

function readFlag(name: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get(name) === value;
}

export function LiquidGlassProPage() {
	const forceWebGL = readFlag("backend", "webgl");
	const forceFallback = readFlag("fallback", "1");
	const slotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.title = "Liquid Glass Pro · UI-Lib";
	}, []);

	return (
		<div className="liquid" data-ui-lib-acceptance="liquid-glass">
			{/* Stable pin. Not an accordion: the stage box stays 100dvh. */}
			<ScrollTrack length={2.4}>
				{(scroll) => (
					<ScrollPin className="liquid-pin" height="100dvh">
						<GlassStage
							mode="section"
							look="quiet"
							className="liquid-stage"
							style={{ width: "100%", height: "100%" }}
							backdrop={BACKDROP}
							post={POST}
							forceWebGL={forceWebGL}
							forceFallback={forceFallback}
						>
							<RegistrationSheet progress={scroll.progress} />
							<Loupe anchor={slotRef} />
							<LiquidOverlay scroll={scroll} slot={slotRef} />
						</GlassStage>
					</ScrollPin>
				)}
			</ScrollTrack>
			<LiquidAfter />
		</div>
	);
}

function RegistrationSheet({ progress }: { progress: number }) {
	const progressRef = useRef(progress);
	const reducedRef = useRef(false);
	progressRef.current = progress;
	reducedRef.current = useReducedMotion();
	const { layer } = useGlassStage();

	useEffect(() => {
		if (!layer) return;
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 1024;
		paintRegistration(canvas);
		const map = new CanvasTexture(canvas);
		map.colorSpace = SRGBColorSpace;
		map.wrapS = RepeatWrapping;
		map.wrapT = RepeatWrapping;
		map.repeat.set(2.2, 1.6);
		map.needsUpdate = true;
		const material = new MeshBasicNodeMaterial();
		material.colorNode = texture(map);
		material.toneMapped = false;
		const mesh = new Mesh(new PlaneGeometry(22, 14), material);
		mesh.position.set(0.35, 0, -0.15);
		const attachment = layer.addWorldObject(mesh, () => {
			const pose = reducedRef.current ? 0 : progressRef.current;
			const cam = sampleTrack(pose, CAMERA);
			layer.setCamera({
				cameraPosition: [cam[0] ?? 0.2, cam[1] ?? 0.04, cam[2] ?? 6.6],
				cameraTarget: [cam[3] ?? 0.15, cam[4] ?? 0, cam[5] ?? 0],
				fov: cam[6] ?? 30,
			});
			mesh.position.x = 0.35 - pose * 1.6;
		});
		return () => {
			attachment.dispose();
			mesh.geometry.dispose();
			material.dispose();
			map.dispose();
		};
	}, [layer]);

	return null;
}

function Loupe({ anchor }: { anchor: { readonly current: HTMLElement | null } }) {
	const reduced = useReducedMotion();
	return (
		<Optics
			look="ice"
			mote="quiet"
			spark={false}
			radius={0.42}
			anchor={anchor}
			fit={0.72}
			position={[1.55, -0.95, 0.15]}
			rotation={[0.35, 0.15, 0]}
			refraction={reduced ? 10 : 12}
			dispersion={0.04}
			spin={0.02}
		/>
	);
}

function LiquidOverlay({
	scroll,
	slot,
}: {
	scroll: ScrollState;
	slot: { readonly current: HTMLDivElement | null };
}) {
	const reduced = useReducedMotion();
	const pose = reduced ? 0 : scroll.progress;
	const active = CHAPTERS.find(
		(chapter) => beatWeight(pose, chapter.start, chapter.end, 0.06) > 0.45,
	);

	return (
		<div className="liquid-ui">
			<header className="liquid-top">
				<p className="liquid-mark">
					<i className="liquid-rule" aria-hidden="true" />
					Press
					<span>014</span>
				</p>
				<nav className="liquid-links" aria-label="Pages">
					<Magnetic strength={0.32} radius={88}>
						<a href="/?demo=product-hero">Lumen</a>
					</Magnetic>
					<Magnetic strength={0.32} radius={88}>
						<a href="/?demo=scroll-cinema">Cinema</a>
					</Magnetic>
					<Magnetic strength={0.32} radius={88}>
						<a href="/">Index</a>
					</Magnetic>
				</nav>
			</header>

			<div className="liquid-main">
				<div className="liquid-copy">
					<p className="liquid-kicker">Sheet 014</p>
					<h1>Liquid Glass Pro</h1>
					<div className="liquid-chapters">
						{CHAPTERS.map((chapter) => {
							const weight = beatWeight(pose, chapter.start, chapter.end, 0.06);
							const shift = reduced ? 0 : (1 - weight) * 14;
							return (
								<div
									key={chapter.index}
									className="liquid-chapter"
									style={{ opacity: weight, transform: `translate3d(0, ${shift}px, 0)` }}
									aria-hidden={!reduced && weight < 0.2 ? true : undefined}
								>
									<p className="liquid-kicker">
										{chapter.index} / {chapter.kicker}
									</p>
									<h2>{chapter.title}</h2>
									<p>{chapter.body}</p>
								</div>
							);
						})}
					</div>
				</div>

				<div className="liquid-panes">
					{PANES.map((pane) => (
						<GlassPanel key={pane.kicker} className="liquid-pane" {...GLASS_LOOKS[pane.look]}>
							<p className="liquid-kicker">{pane.kicker}</p>
							<p>{pane.body}</p>
							{pane.look === "press" ? (
								<Magnetic strength={0.28} radius={90}>
									<a href="#liquid-after">Read the colophon</a>
								</Magnetic>
							) : null}
						</GlassPanel>
					))}
					<div
						ref={slot}
						className="liquid-slot"
						data-ui-lib-anchor="loupe"
						aria-hidden="true"
					/>
				</div>
			</div>

			<footer className="liquid-foot">
				<p>Scroll the sheet</p>
				<div
					className="liquid-meter"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(scroll.progress * 100)}
					aria-label="Sheet"
				>
					<span style={{ transform: `scaleX(${scroll.progress})` }} />
				</div>
			</footer>
			<p className="liquid-sr" aria-live="polite">
				{active ? active.title : "Liquid Glass Pro"}
			</p>
		</div>
	);
}

function LiquidAfter() {
	return (
		<section className="liquid-after" id="liquid-after">
			<p className="liquid-kicker">After the pin</p>
			<h2>The sheet stays on the page.</h2>
			<p className="liquid-lede">
				The pin released. Select this sentence. It was never baked into the canvas, and the
				glass did not take the focus.
			</p>
			<div className="liquid-notes">
				<article>
					<h3>Clear</h3>
					<p>A wide bevel and a strong bend. The hairline behind it has to move.</p>
				</article>
				<article>
					<h3>Frost</h3>
					<p>The sampled sheet goes soft. The sentence on the pane stays sharp.</p>
				</article>
				<article>
					<h3>Read</h3>
					<p>Low bend, so the registration marks stay marks.</p>
				</article>
			</div>
			<p className="liquid-colophon">
				<code>look=&quot;quiet&quot;</code>
				<code>GLASS_LOOKS.press</code>
				<code>mode=&quot;section&quot;</code>
			</p>
			<Magnetic strength={0.32} radius={100}>
				<a className="liquid-back" href="/">
					Back to the playground
				</a>
			</Magnetic>
		</section>
	);
}

/** High-frequency registration sheet. The DOM panes sample this, not a flat gradient. */
function paintRegistration(canvas: HTMLCanvasElement): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const w = canvas.width;
	const h = canvas.height;
	ctx.fillStyle = "#efe6d4";
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = "rgba(28, 36, 30, 0.22)";
	ctx.lineWidth = 1;
	for (let x = 0; x <= w; x += 32) {
		ctx.beginPath();
		ctx.moveTo(x + 0.5, 0);
		ctx.lineTo(x + 0.5, h);
		ctx.stroke();
	}
	for (let y = 0; y <= h; y += 32) {
		ctx.beginPath();
		ctx.moveTo(0, y + 0.5);
		ctx.lineTo(w, y + 0.5);
		ctx.stroke();
	}

	ctx.strokeStyle = "rgba(28, 36, 30, 0.55)";
	ctx.lineWidth = 2;
	for (let x = 0; x <= w; x += 128) {
		ctx.beginPath();
		ctx.moveTo(x + 0.5, 0);
		ctx.lineTo(x + 0.5, h);
		ctx.stroke();
	}

	ctx.fillStyle = "#1c241e";
	ctx.font = "600 42px ui-sans-serif, sans-serif";
	const words = ["REGISTER", "014", "HAIRLINE", "BEND", "SHEET"];
	for (let row = 0; row < 6; row++) {
		for (let col = 0; col < 2; col++) {
			const word = words[(row + col) % words.length] ?? "SHEET";
			ctx.fillText(word, 36 + col * 500, 120 + row * 160);
		}
	}

	ctx.strokeStyle = "#c4492c";
	ctx.lineWidth = 3;
	ctx.strokeRect(28, 28, w - 56, h - 56);
	ctx.beginPath();
	ctx.moveTo(w / 2 - 36, h / 2);
	ctx.lineTo(w / 2 + 36, h / 2);
	ctx.moveTo(w / 2, h / 2 - 36);
	ctx.lineTo(w / 2, h / 2 + 36);
	ctx.stroke();
}
