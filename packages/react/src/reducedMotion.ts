import { hasDom, onReducedMotionChange } from "@ui-lib/core";
import { useEffect, useState } from "react";

type Listener = (reduced: boolean) => void;

let refs = 0;
let reduced = false;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<Listener>();

export function readReducedMotion(): boolean {
	if (!hasDom() || !window.matchMedia) return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One `matchMedia` subscription for every control that has to freeze.
 * Calling `matchMedia` from a frame callback is the cost this avoids.
 */
export function subscribeReducedMotion(listener: Listener): () => void {
	if (!hasDom()) return () => {};
	if (refs === 0) {
		reduced = readReducedMotion();
		unsubscribe = onReducedMotionChange((next) => {
			reduced = next;
			for (const item of listeners) item(next);
		});
	}
	refs++;
	listeners.add(listener);
	listener(reduced);
	return () => {
		listeners.delete(listener);
		refs = Math.max(0, refs - 1);
		if (refs > 0) return;
		unsubscribe?.();
		unsubscribe = null;
	};
}

/**
 * `false` during SSR and the first client render, so hydration does not
 * disagree with the server. The subscription corrects it on mount.
 */
export function useReducedMotion(): boolean {
	const [value, setValue] = useState(false);
	useEffect(() => subscribeReducedMotion(setValue), []);
	return value;
}
