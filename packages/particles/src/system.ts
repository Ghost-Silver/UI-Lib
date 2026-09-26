import {
	cos,
	cross,
	dot,
	Fn,
	float,
	fract,
	hash,
	If,
	instancedArray,
	instanceIndex,
	length,
	max,
	mix,
	mx_noise_vec3,
	normalize,
	pow,
	saturate,
	select,
	shapeCircle,
	sin,
	smoothstep,
	sqrt,
	uniform,
	uv,
	vec3,
} from "three/tsl";
import {
	AdditiveBlending,
	Color,
	type Node,
	NormalBlending,
	Sprite,
	SpriteNodeMaterial,
	Vector3,
	type WebGPURenderer,
} from "three/webgpu";

export type ParticleEmitterShape = "point" | "sphere" | "box" | "disc" | "ring" | "cone";
export type ParticleBounds = "none" | "sphere" | "box";
export type ParticleBlending = "additive" | "normal";

export interface ParticleEmitterOptions {
	shape?: ParticleEmitterShape;
	position?: [number, number, number];
	/** Outer radius for sphere / disc / ring / cone. */
	radius?: number;
	/** Inner radius for ring. */
	innerRadius?: number;
	/** Half-extents for box. */
	size?: [number, number, number];
	/** Emission direction (normalised internally). */
	direction?: [number, number, number];
	/** Initial speed. */
	speed?: number;
	/** 0 = perfectly along `direction`, 1 = uniformly random direction. */
	spread?: number;
	/** Cone half-angle in degrees. */
	angle?: number;
}

export interface ParticleForceOptions {
	gravity?: [number, number, number];
	/** Fraction of velocity removed per second. 0 = none, 1 = molasses. */
	drag?: number;
	wind?: [number, number, number];
	/** Flow-field amplitude. */
	turbulence?: number;
	noiseScale?: number;
	/** How fast the noise field evolves. */
	noiseDrift?: number;
	/** Swirl around the Y axis. */
	vortex?: number;
	/** Pointer attraction (negative repels). */
	attractor?: number;
	attractorRadius?: number;
	/** Falloff exponent: higher = tighter influence. */
	attractorFalloff?: number;
}

export interface ParticleSystemOptions {
	/** Use the renderer adapter's backend budget when used through `<ParticleField>`. */
	count?: number | "auto";
	emitter?: ParticleEmitterOptions;
	forces?: ParticleForceOptions;
	/** `[min, max]` lifespan in seconds. */
	life?: [number, number];
	/** `[min, max]` sprite size in world units. */
	size?: [number, number];
	sizeScale?: number;
	/** Colour ramp across a particle's life. */
	colors?: [string, string, string];
	/** Colour mixed in by speed — makes fast particles glow. */
	hotColor?: string;
	hotAmount?: number;
	/** Speed that maps to a full `hotColor` mix. */
	speedReference?: number;
	intensity?: number;
	opacity?: number;
	bounds?: ParticleBounds;
	boundsRadius?: number;
	boundsSize?: [number, number, number];
	/** Restitution against the bounds, 0–1. */
	bounce?: number;
	blending?: ParticleBlending;
}

export const PARTICLE_DEFAULTS = {
	count: 80_000,
	emitter: {
		shape: "sphere" as ParticleEmitterShape,
		position: [0, 0, 0] as [number, number, number],
		radius: 5,
		innerRadius: 2.4,
		size: [6, 0.4, 6] as [number, number, number],
		direction: [0, 1, 0] as [number, number, number],
		speed: 1.1,
		spread: 1,
		angle: 32,
	},
	forces: {
		gravity: [0, -0.35, 0] as [number, number, number],
		drag: 0.55,
		wind: [0, 0, 0] as [number, number, number],
		turbulence: 1.5,
		noiseScale: 0.22,
		noiseDrift: 0.18,
		vortex: 0.9,
		attractor: 3.2,
		attractorRadius: 7,
		attractorFalloff: 2.2,
	},
	life: [2.5, 7] as [number, number],
	size: [0.02, 0.075] as [number, number],
	sizeScale: 1,
	colors: ["#5eead4", "#a78bfa", "#f472b6"] as [string, string, string],
	hotColor: "#fff7d6",
	hotAmount: 0.55,
	speedReference: 3.5,
	intensity: 1.25,
	opacity: 0.9,
	bounds: "sphere" as ParticleBounds,
	boundsRadius: 11,
	boundsSize: [16, 10, 16] as [number, number, number],
	bounce: 0.55,
	blending: "additive" as ParticleBlending,
};

/** Single-input hash → [0,1). Cheap, deterministic, good enough for spawning. */
const hash11 = (x: Node<"float">) => fract(sin(x.mul(127.1)).mul(43758.5453));

const signOf = (x: Node<"float">) => select(x.lessThan(float(0)), float(-1), float(1));

export interface ParticleSystem {
	/** Add this to a scene. */
	readonly object: Sprite;
	readonly material: SpriteNodeMaterial;
	readonly count: number;
	/** Advance the simulation. Call once per frame, before rendering. */
	step(renderer: WebGPURenderer, dt: number): void;
	/** Re-seed every particle. Call once after the renderer is initialised. */
	reset(renderer: WebGPURenderer): void;
	update(options: Partial<ParticleSystemOptions>): void;
	/** World-space position used by the attractor force. */
	setAttractor(x: number, y: number, z: number): void;
	dispose(): void;
}

/** `toAttribute()` exists at runtime but is missing from `@types/three`. */
type WithToAttribute = { toAttribute(): Node<"vec4"> };

/**
 * A GPU particle system.
 *
 * State lives in storage buffers laid out struct-of-arrays style
 * (`positions`, `velocities`, `attribs`) and **all** of the simulation runs in
 * compute shaders — the CPU never touches particle data. On WebGPU that is a
 * real compute pass; on the WebGL 2 fallback three compiles the same kernel to
 * a transform-feedback pass, so there is still only one implementation.
 *
 * `attribs` packs what would otherwise be three extra buffers:
 * `x` = age, `y` = lifespan, `z` = seed, `w` = size scale.
 */
export function createParticleSystem(options: ParticleSystemOptions = {}): ParticleSystem {
	const requestedCount = options.count === "auto" ? PARTICLE_DEFAULTS.count : options.count;
	const count = Math.max(1, Math.floor(requestedCount ?? PARTICLE_DEFAULTS.count));
	const emitter = { ...PARTICLE_DEFAULTS.emitter, ...options.emitter };
	const forces = { ...PARTICLE_DEFAULTS.forces, ...options.forces };
	const life = options.life ?? PARTICLE_DEFAULTS.life;
	const sizeRange = options.size ?? PARTICLE_DEFAULTS.size;
	const colors = options.colors ?? PARTICLE_DEFAULTS.colors;
	const bounds = options.bounds ?? PARTICLE_DEFAULTS.bounds;
	const blending = options.blending ?? PARTICLE_DEFAULTS.blending;

	const positions = instancedArray(count, "vec3");
	const velocities = instancedArray(count, "vec3");
	const attribs = instancedArray(count, "vec4");

	const u = {
		dt: uniform(1 / 60),
		time: uniform(0),
		gravity: uniform(new Vector3(...forces.gravity)),
		drag: uniform(forces.drag),
		wind: uniform(new Vector3(...forces.wind)),
		turbulence: uniform(forces.turbulence),
		noiseScale: uniform(forces.noiseScale),
		noiseDrift: uniform(forces.noiseDrift),
		vortex: uniform(forces.vortex),
		attractor: uniform(forces.attractor),
		attractorRadius: uniform(forces.attractorRadius),
		attractorFalloff: uniform(forces.attractorFalloff),
		attractorPosition: uniform(new Vector3(0, 0, 0)),
		emitterPosition: uniform(new Vector3(...emitter.position)),
		emitterRadius: uniform(emitter.radius),
		emitterInnerRadius: uniform(emitter.innerRadius),
		emitterSize: uniform(new Vector3(...emitter.size)),
		emitterDirection: uniform(new Vector3(...emitter.direction)),
		emitterSpeed: uniform(emitter.speed),
		emitterSpread: uniform(emitter.spread),
		lifeMin: uniform(life[0]),
		lifeMax: uniform(life[1]),
		sizeMin: uniform(sizeRange[0]),
		sizeMax: uniform(sizeRange[1]),
		sizeScale: uniform(options.sizeScale ?? PARTICLE_DEFAULTS.sizeScale),
		boundsRadius: uniform(options.boundsRadius ?? PARTICLE_DEFAULTS.boundsRadius),
		boundsSize: uniform(new Vector3(...(options.boundsSize ?? PARTICLE_DEFAULTS.boundsSize))),
		bounce: uniform(options.bounce ?? PARTICLE_DEFAULTS.bounce),
		colorA: uniform(new Color(colors[0])),
		colorB: uniform(new Color(colors[1])),
		colorC: uniform(new Color(colors[2])),
		hotColor: uniform(new Color(options.hotColor ?? PARTICLE_DEFAULTS.hotColor)),
		hotAmount: uniform(options.hotAmount ?? PARTICLE_DEFAULTS.hotAmount),
		speedReference: uniform(options.speedReference ?? PARTICLE_DEFAULTS.speedReference),
		intensity: uniform(options.intensity ?? PARTICLE_DEFAULTS.intensity),
		opacity: uniform(options.opacity ?? PARTICLE_DEFAULTS.opacity),
	};

	/* ------------------------------------------------------------ spawning -- */

	/**
	 * Writes a fresh particle into `pos` / `vel` / `att`. The caller advances the
	 * seed in `att.z` before each respawn so every rebirth differs.
	 */
	const spawn = (pos: Node<"vec3">, vel: Node<"vec3">, att: Node<"vec4">, first: boolean) => {
		const r1 = hash11(att.z.mul(311.7).add(1.37));
		const r2 = hash11(att.z.mul(127.1).add(7.77));
		const r3 = hash11(att.z.mul(271.9).add(19.31));

		// Uniform direction on the unit sphere.
		const zDir = r1.mul(2).sub(1);
		const phi = r2.mul(Math.PI * 2);
		const ring = sqrt(max(float(0), float(1).sub(zDir.mul(zDir))));
		const randomDir = vec3(ring.mul(cos(phi)), zDir, ring.mul(sin(phi)));

		let offset: Node<"vec3">;
		switch (emitter.shape) {
			case "sphere":
				// cbrt keeps the distribution uniform inside the volume.
				offset = randomDir.mul(pow(r3, float(1 / 3))).mul(u.emitterRadius);
				break;
			case "box":
				offset = vec3(r1.sub(0.5), r2.sub(0.5), r3.sub(0.5)).mul(u.emitterSize).mul(2);
				break;
			case "disc": {
				const angle = r1.mul(Math.PI * 2);
				const radius = sqrt(r2).mul(u.emitterRadius);
				offset = vec3(cos(angle).mul(radius), float(0), sin(angle).mul(radius));
				break;
			}
			case "ring": {
				const angle = r1.mul(Math.PI * 2);
				const radius = mix(u.emitterInnerRadius, u.emitterRadius, r2);
				offset = vec3(cos(angle).mul(radius), float(0), sin(angle).mul(radius));
				break;
			}
			case "cone": {
				const cosCut = Math.cos((emitter.angle * Math.PI) / 180);
				const localZ = mix(float(1), float(cosCut), r3);
				const rr = sqrt(max(float(0), float(1).sub(localZ.mul(localZ))));
				const angle = r1.mul(Math.PI * 2);
				offset = vec3(rr.mul(cos(angle)), localZ, rr.mul(sin(angle)))
					.mul(u.emitterRadius)
					.mul(r2);
				break;
			}
			default:
				offset = vec3(r1.sub(0.5), r2.sub(0.5), r3.sub(0.5)).mul(0.02);
				break;
		}

		pos.assign(u.emitterPosition.add(offset));

		// Direction: blend the emitter axis with the random sphere direction.
		const axis = normalize(u.emitterDirection.add(vec3(0, 1e-5, 0)));
		const dir = normalize(mix(axis, randomDir, u.emitterSpread));
		const speed = u.emitterSpeed.mul(mix(float(0.45), float(1.55), hash11(att.z.mul(511.3))));
		vel.assign(dir.mul(speed));

		// First fill staggers ages so the opening seconds are not a synchronised
		// puff that then pulses in lockstep forever.
		att.x.assign(first ? mix(u.lifeMin, u.lifeMax, r3) : float(0));
		att.y.assign(mix(u.lifeMin, u.lifeMax, hash11(att.z.mul(97.3).add(5.1))));
		if (first) att.w.assign(hash(instanceIndex.add(29)));
	};

	/* ------------------------------------------------------------- kernels -- */

	const computeInit = Fn(() => {
		const pos = positions.element(instanceIndex);
		const vel = velocities.element(instanceIndex);
		const att = attribs.element(instanceIndex);

		att.z.assign(hash(instanceIndex.add(3)));
		spawn(pos, vel, att, true);
	})().compute(count);

	const computeUpdate = Fn(() => {
		const pos = positions.element(instanceIndex);
		const vel = velocities.element(instanceIndex);
		const att = attribs.element(instanceIndex);

		const dt = u.dt;

		att.x.assign(att.x.add(dt));

		vel.assign(vel.add(u.gravity.mul(dt)));
		vel.assign(vel.add(u.wind.mul(dt)));
		// Explicit damping: stable for any dt, unlike pow(drag, dt) at large dt.
		vel.assign(vel.mul(max(float(0), float(1).sub(u.drag.mul(dt)))));

		// Divergence-free-ish flow: the cross product of two decorrelated noise
		// vectors. Two vec3 samples instead of the six a true curl needs.
		const noisePoint = pos.mul(u.noiseScale).add(vec3(0, u.time.mul(u.noiseDrift), 0));
		const flow = cross(
			mx_noise_vec3(noisePoint),
			mx_noise_vec3(noisePoint.add(vec3(19.3, 7.7, 31.1))),
		);
		vel.assign(vel.add(flow.mul(u.turbulence).mul(dt)));

		// Vortex: tangential velocity around the Y axis.
		const radial = vec3(pos.x, float(0), pos.z);
		const radialLength = max(length(radial), float(0.001));
		const tangent = vec3(radial.z.negate(), float(0), radial.x).div(radialLength);
		vel.assign(vel.add(tangent.mul(u.vortex).mul(dt)));

		// Pointer attractor with a smooth radial falloff.
		const toAttractor = u.attractorPosition.sub(pos);
		const attractorDistance = max(length(toAttractor), float(0.001));
		const falloff = pow(
			saturate(float(1).sub(attractorDistance.div(max(u.attractorRadius, float(0.001))))),
			u.attractorFalloff,
		);
		vel.assign(
			vel.add(toAttractor.div(attractorDistance).mul(u.attractor).mul(falloff).mul(dt)),
		);

		pos.assign(pos.add(vel.mul(dt)));

		if (bounds === "sphere") {
			const distance = length(pos);
			If(distance.greaterThan(u.boundsRadius), () => {
				const n = pos.div(max(distance, float(0.001)));
				pos.assign(n.mul(u.boundsRadius));
				const into = dot(vel, n);
				vel.assign(vel.sub(n.mul(into.mul(float(1).add(u.bounce)))));
			});
		} else if (bounds === "box") {
			const limit = u.boundsSize;
			If(pos.x.abs().greaterThan(limit.x), () => {
				pos.x.assign(signOf(pos.x).mul(limit.x));
				vel.assign(
					vel.sub(vec3(signOf(pos.x), float(0), float(0)).mul(vel.x.mul(u.bounce.add(1)))),
				);
			});
			If(pos.y.abs().greaterThan(limit.y), () => {
				pos.y.assign(signOf(pos.y).mul(limit.y));
				vel.assign(
					vel.sub(vec3(float(0), signOf(pos.y), float(0)).mul(vel.y.mul(u.bounce.add(1)))),
				);
			});
			If(pos.z.abs().greaterThan(limit.z), () => {
				pos.z.assign(signOf(pos.z).mul(limit.z));
				vel.assign(
					vel.sub(vec3(float(0), float(0), signOf(pos.z)).mul(vel.z.mul(u.bounce.add(1)))),
				);
			});
		}

		If(att.x.greaterThan(att.y), () => {
			// Golden-ratio scramble: a cheap new seed for the next life.
			att.z.assign(fract(att.z.mul(1.6180339887).add(0.3183098861)));
			spawn(pos, vel, att, false);
		});
	})().compute(count);

	/* ------------------------------------------------------------ material -- */

	// `toAttribute()` turns the storage buffers into instanced vertex
	// attributes — the only form WebGL 2 can actually read them in.
	const positionAttribute = (positions as unknown as WithToAttribute).toAttribute();
	const velocityAttribute = (velocities as unknown as WithToAttribute).toAttribute();
	const attributeNode = (attribs as unknown as WithToAttribute).toAttribute();

	const age = saturate(attributeNode.x.div(max(attributeNode.y, float(0.0001))));
	// Fade in fast, out slowly: reads as a soft puff rather than a blink.
	const lifeCurve = smoothstep(float(0), float(0.12), age).mul(
		smoothstep(float(1), float(0.72), age),
	);

	const speedNormalised = saturate(
		length(velocityAttribute).div(max(u.speedReference, float(0.0001))),
	);

	const ramp = select(
		age.lessThan(float(0.5)),
		mix(u.colorA, u.colorB, age.mul(2)),
		mix(u.colorB, u.colorC, age.sub(0.5).mul(2)),
	);
	const color = mix(ramp, u.hotColor, speedNormalised.mul(u.hotAmount));

	const material = new SpriteNodeMaterial();
	material.positionNode = positionAttribute;
	material.scaleNode = mix(u.sizeMin, u.sizeMax, attributeNode.w)
		.mul(lifeCurve)
		.mul(u.sizeScale);
	material.colorNode = color.mul(u.intensity);
	material.opacityNode = (shapeCircle(uv()) as Node<"float">).mul(u.opacity).mul(lifeCurve);
	material.transparent = true;
	material.depthWrite = false;
	material.blending = blending === "additive" ? AdditiveBlending : NormalBlending;
	material.toneMapped = false;

	const sprite = new Sprite(material) as Sprite & { count: number };
	sprite.count = count;
	sprite.frustumCulled = false;
	sprite.name = "ui-lib:particles";

	return {
		object: sprite,
		material,
		count,
		step(renderer: WebGPURenderer, dt: number) {
			// Clamp: a two-second stall must not teleport every particle.
			u.dt.value = Math.min(Math.max(dt, 0), 1 / 20);
			u.time.value += u.dt.value;
			renderer.compute(computeUpdate);
		},
		reset(renderer: WebGPURenderer) {
			u.dt.value = 1 / 60;
			renderer.compute(computeInit);
		},
		update(patch: Partial<ParticleSystemOptions>) {
			if (patch.count !== undefined) {
				console.warn("[ui-lib] particle count is fixed at creation; recreate the system.");
			}
			const f = patch.forces;
			if (f) {
				if (f.gravity) u.gravity.value.set(...f.gravity);
				if (f.drag !== undefined) u.drag.value = f.drag;
				if (f.wind) u.wind.value.set(...f.wind);
				if (f.turbulence !== undefined) u.turbulence.value = f.turbulence;
				if (f.noiseScale !== undefined) u.noiseScale.value = f.noiseScale;
				if (f.noiseDrift !== undefined) u.noiseDrift.value = f.noiseDrift;
				if (f.vortex !== undefined) u.vortex.value = f.vortex;
				if (f.attractor !== undefined) u.attractor.value = f.attractor;
				if (f.attractorRadius !== undefined) u.attractorRadius.value = f.attractorRadius;
				if (f.attractorFalloff !== undefined) u.attractorFalloff.value = f.attractorFalloff;
			}
			const e = patch.emitter;
			if (e) {
				if (e.position) u.emitterPosition.value.set(...e.position);
				if (e.radius !== undefined) u.emitterRadius.value = e.radius;
				if (e.innerRadius !== undefined) u.emitterInnerRadius.value = e.innerRadius;
				if (e.size) u.emitterSize.value.set(...e.size);
				if (e.direction) u.emitterDirection.value.set(...e.direction);
				if (e.speed !== undefined) u.emitterSpeed.value = e.speed;
				if (e.spread !== undefined) u.emitterSpread.value = e.spread;
			}
			if (patch.life) {
				u.lifeMin.value = patch.life[0];
				u.lifeMax.value = patch.life[1];
			}
			if (patch.size) {
				u.sizeMin.value = patch.size[0];
				u.sizeMax.value = patch.size[1];
			}
			if (patch.sizeScale !== undefined) u.sizeScale.value = patch.sizeScale;
			if (patch.colors) {
				u.colorA.value.set(patch.colors[0]);
				u.colorB.value.set(patch.colors[1]);
				u.colorC.value.set(patch.colors[2]);
			}
			if (patch.hotColor) u.hotColor.value.set(patch.hotColor);
			if (patch.hotAmount !== undefined) u.hotAmount.value = patch.hotAmount;
			if (patch.speedReference !== undefined) u.speedReference.value = patch.speedReference;
			if (patch.intensity !== undefined) u.intensity.value = patch.intensity;
			if (patch.opacity !== undefined) u.opacity.value = patch.opacity;
			if (patch.boundsRadius !== undefined) u.boundsRadius.value = patch.boundsRadius;
			if (patch.boundsSize) u.boundsSize.value.set(...patch.boundsSize);
			if (patch.bounce !== undefined) u.bounce.value = patch.bounce;
		},
		setAttractor(x: number, y: number, z: number) {
			u.attractorPosition.value.set(x, y, z);
		},
		dispose() {
			material.dispose();
			sprite.removeFromParent();
		},
	};
}
