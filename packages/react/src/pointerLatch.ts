import { hasDom } from "@ui-lib/core";

/**
 * One window pointer for every magnetic control.
 *
 * A per-component listener would wake the same springs with the same event.
 * `seq` / `layoutSeq` let a subscriber skip layout reads while nothing moved.
 */
interface PointerSample {
	x: number;
	y: number;
	seq: number;
	layoutSeq: number;
	seen: boolean;
}

const sample: PointerSample = { x: 0, y: 0, seq: 0, layoutSeq: 0, seen: false };
let refs = 0;

function onMove(event: PointerEvent): void {
	sample.x = event.clientX;
	sample.y = event.clientY;
	sample.seen = true;
	sample.seq++;
}

function onLayout(): void {
	sample.layoutSeq++;
}

export function acquirePointer(): () => void {
	if (!hasDom()) return () => {};
	if (refs === 0) {
		window.addEventListener("pointermove", onMove, { passive: true });
		window.addEventListener("scroll", onLayout, { passive: true, capture: true });
		window.addEventListener("resize", onLayout);
	}
	refs++;
	return () => {
		refs = Math.max(0, refs - 1);
		if (refs > 0) return;
		window.removeEventListener("pointermove", onMove);
		window.removeEventListener("scroll", onLayout, { capture: true });
		window.removeEventListener("resize", onLayout);
	};
}

export function readPointer(): PointerSample {
	return sample;
}
