import { Spring2 } from "@ui-lib/core";
import {
	type CSSProperties,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import { useGlassStage } from "./context.js";
import { ensureStyles } from "./injectStyles.js";
import { magneticOffset } from "./magneticMath.js";
import { acquirePointer, readPointer } from "./pointerLatch.js";
import { subscribeReducedMotion } from "./reducedMotion.js";
import { useFrame } from "./useFrame.js";

export interface MagneticProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
	/** Element to render. A string keeps the ref on a DOM node. */
	as?: "div" | "span";
	children?: ReactNode;
	/** Fraction of the pointer gap to close, after the edge falloff. */
	strength?: number;
	/** Pixel radius around the control that still attracts it. */
	radius?: number;
	stiffness?: number;
	damping?: number;
}

/**
 * Moves its child toward the pointer on the shared frame clock.
 *
 * The outer box stays put and is what we measure, so the spring cannot chase
 * its own translation. Reduced motion holds the child at rest. Several
 * controls share one pointer listener and one reduced-motion subscription.
 */
export function Magnetic({
	as: Tag = "div",
	children,
	className,
	style,
	strength = 0.34,
	radius = 140,
	stiffness = 260,
	damping = 28,
	...domProps
}: MagneticProps) {
	const anchorRef = useRef<HTMLElement | null>(null);
	const moverRef = useRef<HTMLDivElement | null>(null);
	const springRef = useRef<Spring2 | null>(null);
	if (springRef.current === null) {
		springRef.current = new Spring2(0, 0, { stiffness, damping, precision: 0.04 });
	}
	const strengthRef = useRef(strength);
	const radiusRef = useRef(radius);
	const reducedRef = useRef(false);
	const { layer } = useGlassStage();
	const layerRef = useRef(layer);
	strengthRef.current = strength;
	radiusRef.current = radius;
	layerRef.current = layer;

	useEffect(() => {
		ensureStyles();
		const releasePointer = acquirePointer();
		const releaseMotion = subscribeReducedMotion((next) => {
			reducedRef.current = next;
		});
		return () => {
			releasePointer();
			releaseMotion();
		};
	}, []);

	useEffect(() => {
		const spring = springRef.current;
		if (!spring) return;
		spring.x.stiffness = stiffness;
		spring.y.stiffness = stiffness;
		spring.x.damping = damping;
		spring.y.damping = damping;
	}, [stiffness, damping]);

	useFrame((info) => {
		const anchor = anchorRef.current;
		const mover = moverRef.current;
		const spring = springRef.current;
		if (!anchor || !mover || !spring) return;
		const state = moverState(mover);
		const pointer = readPointer();
		const idle =
			pointer.seq === state.pointerStamp &&
			pointer.layoutSeq === state.layoutStamp &&
			reducedRef.current === state.reduced &&
			spring.settled;
		if (idle) return;

		if (pointer.seq !== state.pointerStamp || pointer.layoutSeq !== state.layoutStamp) {
			const rect = anchor.getBoundingClientRect();
			state.centerX = rect.left + rect.width / 2;
			state.centerY = rect.top + rect.height / 2;
			state.pointerStamp = pointer.seq;
			state.layoutStamp = pointer.layoutSeq;
		}
		state.reduced = reducedRef.current;
		const target =
			!pointer.seen || reducedRef.current
				? { x: 0, y: 0 }
				: magneticOffset(
						pointer,
						{ x: state.centerX, y: state.centerY },
						radiusRef.current,
						strengthRef.current,
					);
		spring.target = target;
		const next = spring.step(info.dt);
		if (spring.settled && next.x === 0 && next.y === 0) {
			if (state.promoted || state.writtenX !== 0 || state.writtenY !== 0) {
				mover.style.transform = "";
				mover.style.willChange = "";
				state.promoted = false;
				state.writtenX = 0;
				state.writtenY = 0;
				// The glass quad reads layout only when the stage is dirty.
				// This runs at update priority, before the stage's render task.
				layerRef.current?.markDirty();
			}
			return;
		}
		if (Math.abs(next.x - state.writtenX) < 0.04 && Math.abs(next.y - state.writtenY) < 0.04) {
			return;
		}
		if (!state.promoted) {
			mover.style.willChange = "transform";
			state.promoted = true;
		}
		state.writtenX = next.x;
		state.writtenY = next.y;
		mover.style.transform = `translate3d(${next.x.toFixed(2)}px, ${next.y.toFixed(2)}px, 0)`;
		layerRef.current?.markDirty();
	});

	const classes = className ? `ui-lib-magnetic ${className}` : "ui-lib-magnetic";
	return (
		<Tag
			{...domProps}
			ref={(node) => {
				anchorRef.current = node;
			}}
			className={classes}
			style={style as CSSProperties}
			data-ui-lib-magnetic=""
		>
			<div ref={moverRef} className="ui-lib-magnetic__mover">
				{children}
			</div>
		</Tag>
	);
}

interface MoverState {
	pointerStamp: number;
	layoutStamp: number;
	reduced: boolean;
	centerX: number;
	centerY: number;
	writtenX: number;
	writtenY: number;
	promoted: boolean;
}

const moverStates = new WeakMap<HTMLElement, MoverState>();

function moverState(mover: HTMLElement): MoverState {
	let state = moverStates.get(mover);
	if (!state) {
		state = {
			pointerStamp: -1,
			layoutStamp: -1,
			reduced: false,
			centerX: 0,
			centerY: 0,
			writtenX: 0,
			writtenY: 0,
			promoted: false,
		};
		moverStates.set(mover, state);
	}
	return state;
}
