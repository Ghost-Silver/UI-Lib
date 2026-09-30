import { type FrameCallback, getScheduler, type TaskPriorityName } from "@ui-lib/core";
import { useEffect, useRef } from "react";

/**
 * Subscribe to the shared scheduler. UI springs and GPU work stay on one clock.
 * The callback ref is updated every render, so the effect does not resubscribe
 * when the closure changes.
 */
export function useFrame(callback: FrameCallback, priority: TaskPriorityName = "update"): void {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;
	useEffect(() => {
		const scheduler = getScheduler();
		if (!scheduler) return;
		return scheduler.add((info) => callbackRef.current(info), priority);
	}, [priority]);
}
