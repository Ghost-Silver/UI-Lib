import { revealWeight } from "@ui-lib/motion";
import { type CSSProperties, type ElementType, type ReactNode, useRef } from "react";
import { ensureStyles } from "./injectStyles.js";
import { readReducedMotion, subscribeReducedMotion } from "./reducedMotion.js";
import { useFrame } from "./useFrame.js";
import { useIsomorphicLayoutEffect } from "./utils.js";

export interface RevealProps {
	/** Element to render. A heading stays a heading; the words are spans inside it. */
	as?: ElementType;
	children?: ReactNode;
	/**
	 * `word` splits a string on whitespace. Anything else is revealed as one unit
	 * per child, so markup is not flattened into "[object Object]".
	 */
	by?: "word" | "item";
	/** Seconds before the first unit starts. Shared scheduler clock. */
	delay?: number;
	/** Seconds between units. */
	stagger?: number;
	/** Seconds for one unit to arrive. */
	duration?: number;
	className?: string;
	style?: CSSProperties;
}

const RISE = 0.28;

/**
 * Brings HTML in by word on the shared frame clock.
 *
 * The text stays in the document: selectable, translatable, and present if
 * script never runs. Reduced motion leaves every unit at rest. This is not
 * MSDF, and it does not open a second animation loop.
 */
export function Reveal({
	as: Tag = "span",
	children,
	by = "word",
	delay = 0.16,
	stagger = 0.07,
	duration = 0.72,
	className,
	style,
}: RevealProps) {
	const rootRef = useRef<HTMLElement | null>(null);
	const wordsRef = useRef<Array<HTMLElement | null>>([]);
	const elapsedRef = useRef(0);
	const reducedRef = useRef(false);
	const settledRef = useRef(false);
	const delayRef = useRef(delay);
	const staggerRef = useRef(stagger);
	const durationRef = useRef(duration);
	delayRef.current = delay;
	staggerRef.current = stagger;
	durationRef.current = duration;

	const units = unitsOf(children, by);

	useIsomorphicLayoutEffect(() => {
		ensureStyles();
		wordsRef.current.length = units.length;
		reducedRef.current = readReducedMotion();
		settledRef.current = reducedRef.current;
		elapsedRef.current = 0;
		const release = subscribeReducedMotion((next) => {
			reducedRef.current = next;
			if (!next) return;
			settledRef.current = true;
			for (const node of wordsRef.current) {
				if (!node) continue;
				node.style.opacity = "";
				node.style.transform = "";
			}
		});
		if (!reducedRef.current) {
			for (const node of wordsRef.current) {
				if (!node) continue;
				node.style.opacity = "0";
				node.style.transform = `translate3d(0, ${RISE}em, 0)`;
			}
		}
		return release;
	}, [units.join("\u0000")]);

	useFrame((info) => {
		if (settledRef.current || reducedRef.current) return;
		elapsedRef.current += info.dt;
		let pending = false;
		const elapsed = elapsedRef.current;
		for (let index = 0; index < wordsRef.current.length; index++) {
			const node = wordsRef.current[index];
			if (!node) continue;
			const weight = revealWeight(
				elapsed,
				index,
				delayRef.current,
				staggerRef.current,
				durationRef.current,
			);
			if (weight < 1) pending = true;
			node.style.opacity = weight.toFixed(3);
			node.style.transform =
				weight >= 1 ? "" : `translate3d(0, ${((1 - weight) * RISE).toFixed(3)}em, 0)`;
		}
		if (!pending) settledRef.current = true;
	});

	const classes = className ? `ui-lib-reveal ${className}` : "ui-lib-reveal";
	const keys = revealKeys(units);
	return (
		<Tag ref={rootRef} className={classes} style={style} data-ui-lib-reveal="">
			{keys.map((key, index) => (
				<span
					key={key}
					ref={(node) => {
						wordsRef.current[index] = node;
					}}
					className="ui-lib-reveal__word"
				>
					{units[index]}
					{index < keys.length - 1 ? " " : null}
				</span>
			))}
		</Tag>
	);
}

function revealKeys(units: readonly ReactNode[]): string[] {
	const seen = new Map<string, number>();
	return units.map((unit) => {
		const label = typeof unit === "string" ? unit : "item";
		const count = seen.get(label) ?? 0;
		seen.set(label, count + 1);
		return `${label}-${count}`;
	});
}

function unitsOf(children: ReactNode, by: "word" | "item"): ReactNode[] {
	if (by === "word" && typeof children === "string") {
		return children.trim().split(/\s+/).filter(Boolean);
	}
	const items = Array.isArray(children) ? children : [children];
	return items.filter((item) => item !== null && item !== undefined && item !== false);
}
