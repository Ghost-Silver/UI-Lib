import {
	driveSpring,
	type MotionPresetName,
	type MotionSpec,
	type SpringDriver,
} from "@ui-lib/core";
import { useCallback, useEffect, useRef } from "react";

/**
 * Dimensionless damping curve zeta = 0.55 easing function for hardware-accelerated CSS.
 */
export const PRESS_EASING = "cubic-bezier(0.28, 1.38, 0.48, 1)";

/**
 * Calibrated press damping ratio matching MOTION_PRESETS.press.
 */
export const PRESS_DAMPING = 0.55;

/**
 * Two-layer soft diffuse focus-visible halo.
 */
export const FOCUS_HALO = "0 0 0 2px var(--moe-card), 0 0 12px 3px var(--moe-taro-500)";

export interface SpringInteractionOptions {
	property?: string;
	motion?: MotionPresetName | MotionSpec;
	initial?: number;
	unit?: string;
	format?: (v: number) => string;
}

export interface SpringInteractionResult<T extends HTMLElement = HTMLElement> {
	ref: React.RefObject<T | null>;
	driver: SpringDriver | null;
	to: (value: number, next?: MotionPresetName | MotionSpec) => void;
	set: (value: number) => void;
}

/**
 * Hook driving an element's CSS custom property via spring physics,
 * defaulting to the calibrated press damping curve (zeta = 0.55).
 */
export function useSpringInteraction<T extends HTMLElement = HTMLElement>(
	options: SpringInteractionOptions = {},
): SpringInteractionResult<T> {
	const { property = "--press", motion = "press", initial = 0, unit = "", format } = options;
	const ref = useRef<T | null>(null);
	const driverRef = useRef<SpringDriver | null>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const driver = driveSpring(node, property, motion, { initial, unit, format });
		driverRef.current = driver;
		return () => {
			driver.stop();
		};
	}, [property, motion, initial, unit, format]);

	const to = useCallback((value: number, next?: MotionPresetName | MotionSpec) => {
		driverRef.current?.to(value, next);
	}, []);

	const set = useCallback((value: number) => {
		driverRef.current?.set(value);
	}, []);

	return { ref, driver: driverRef.current, to, set };
}
