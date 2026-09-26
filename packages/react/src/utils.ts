import { useEffect, useLayoutEffect } from "react";

/** `useLayoutEffect` that does not warn during SSR. */
export const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Stable key for a value that is compared by content rather than identity, so
 * an inline object literal (`backdrop={{ type: "gradient" }}`) does not recreate
 * GPU resources on every render.
 */
export function stableKey(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
