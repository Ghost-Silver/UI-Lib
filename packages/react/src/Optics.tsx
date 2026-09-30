import { useRef } from "react";
import { Lens, type LensProps } from "./Lens.js";
import { type FieldLookName, fieldOptions } from "./looks.js";
import { ParticleField } from "./ParticleField.js";

export interface OpticsProps extends Omit<LensProps, "look"> {
	look?: LensProps["look"];
	/**
	 * Motes born inside the lens. `true` uses the instrument field. A look name
	 * picks another cloud — `"quiet"` is the product-page one. `false` omits it.
	 */
	mote?: boolean | FieldLookName;
	/** Sparse sparks in front of the lens, hidden where the glass is. */
	spark?: boolean | FieldLookName;
}

/**
 * A lens plus the two particle fields that make it read as an instrument.
 *
 * The page animates `refraction` and `lightDirection`. Pass `anchor` when the
 * optic should sit on a DOM slot instead of a guessed world position. `fit`
 * matches the slot's shorter side; `distance` keeps a dolly. The follower
 * writes GPU uniforms directly, so a moving slot does not recreate the
 * particle system. Counts, the optical grade, and the studio reflection come
 * from a look. Pass `environment` to scale that probe; do not pass a cubemap.
 */
export function Optics({
	look = "crystal",
	position = [0, 0, 0],
	mote = true,
	spark = true,
	anchor,
	plane = 0,
	distance,
	fit,
	radius = 1.22,
	...lens
}: OpticsProps) {
	const moteLook = fieldChoice(mote, "mote");
	const sparkLook = fieldChoice(spark, "spark");
	// Freeze the seed while a slot is attached. A parent that still rebuilds
	// `position` every frame must not change the particle options key.
	const seeded = useRef(position);
	if (!anchor) seeded.current = position;
	const origin = anchor ? seeded.current : position;
	return (
		<>
			<Lens
				look={look}
				position={origin}
				anchor={anchor}
				plane={plane}
				distance={distance}
				fit={fit}
				radius={radius}
				{...lens}
			/>
			{moteLook ? (
				<ParticleField
					depth="inside"
					attractor={origin}
					anchor={anchor}
					plane={plane}
					distance={distance}
					fit={fit}
					fitRadius={radius}
					options={fieldOptions(moteLook, { emitter: { position: origin } })}
				/>
			) : null}
			{sparkLook ? (
				<ParticleField
					depth="front"
					anchor={anchor}
					plane={plane}
					distance={distance}
					fit={fit}
					fitRadius={radius}
					options={fieldOptions(sparkLook, { emitter: { position: origin } })}
				/>
			) : null}
		</>
	);
}

function fieldChoice(
	value: boolean | FieldLookName | undefined,
	whenTrue: FieldLookName,
): FieldLookName | null {
	if (value === false) return null;
	if (value === true || value === undefined) return whenTrue;
	return value;
}
