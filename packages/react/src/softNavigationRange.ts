/**
 * Which page numbers to show, with `"gap"` standing for an elision.
 *
 * It lives in its own module rather than beside the component for one reason: it
 * is the entire arithmetic of pagination and it is pure, so it can be tested
 * exhaustively. The edges are three or four cells wide in a browser and
 * impossible to inspect there; walking every combination from one page to forty
 * says more about correctness than any screenshot can.
 *
 * ## Why this is built by merging sets rather than by clamping
 *
 * Two attempts clamped a single window to keep it clear of the head and the
 * tail, and both were wrong in a different combination of pages — the constraints
 * the clamp has to satisfy pull in opposite directions. Page 2 of 12 came back
 * without page 2 in it; eight pages with the first selected came back with a
 * duplicate.
 *
 * What is actually wanted is simpler than a clamp describes: **the head, the tail
 * and a window around the current page, deduplicated and sorted, with a gap
 * wherever the numbers are not contiguous**. Building it that way makes the
 * invariants properties of a set union rather than conditions on an index, and
 * the tests then check what a reader sees — no repeats, ascending, the current
 * page present — instead of checking that a formula was transcribed.
 */
export function pageRange(
	page: number,
	count: number,
	siblingCount: number,
	boundaryCount: number,
): (number | "gap")[] {
	if (count <= 0) return [];

	// Clamped rather than trusted. A caller can be one render behind a list that
	// just got shorter, and the alternative is a range with no current page in it.
	const current = Math.min(Math.max(Math.round(page), 1), count);

	// Enough room for everything: there is no elision to make.
	const total = boundaryCount * 2 + siblingCount * 2 + 3;
	if (count <= total) {
		return Array.from({ length: count }, (_, i) => i + 1);
	}

	const wanted = new Set<number>();
	for (let i = 1; i <= boundaryCount; i += 1) wanted.add(i);
	for (let i = count - boundaryCount + 1; i <= count; i += 1) wanted.add(i);
	for (let i = current - siblingCount; i <= current + siblingCount; i += 1) {
		if (i >= 1 && i <= count) wanted.add(i);
	}

	const sorted = [...wanted].sort((a, b) => a - b);
	const out: (number | "gap")[] = [];
	for (let i = 0; i < sorted.length; i += 1) {
		// A gap only where more than one page is missing. A single missing page is
		// not an omission, it is a page with a glyph in place of it — which is what
		// the first version produced and why it read "1 … 3 4 5" for a current page
		// of 4.
		if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push("gap");
		out.push(sorted[i]!);
	}
	return out;
}
