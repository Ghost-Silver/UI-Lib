import { describe, expect, it } from "vitest";

/**
 * The page range, which is the whole of the pagination component's arithmetic.
 *
 * It is exported for this and lives in its own module for the same reason: the
 * edges are where it goes wrong, and the edges are three or four cells wide in a
 * browser and impossible to inspect there. A test that walks every combination
 * says more than a screenshot of page 1 of 12 ever could.
 */
import { pageRange } from "../src/softNavigationRange.js";

describe("pageRange", () => {
	it("shows every page when they all fit", () => {
		expect(pageRange(1, 5, 1, 1)).toEqual([1, 2, 3, 4, 5]);
		expect(pageRange(3, 7, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it("elides only where something is actually omitted", () => {
		// A gap of one page is not an omission, it is a page with a glyph in place
		// of it. Without the rule the list reads "1 … 3 4 5" for a current page of
		// 4, which is a gap standing in for nothing.
		const atStart = pageRange(2, 12, 1, 1);
		expect(atStart.slice(0, 3)).toEqual([1, 2, 3]);
		expect(atStart.filter((x) => x === "gap")).toHaveLength(1);

		// Three of twelve: the left side is contiguous, so only the right elides.
		expect(pageRange(3, 12, 1, 1)).toEqual([1, 2, 3, 4, "gap", 12]);
	});

	it("keeps the current page visible at both ends", () => {
		const first = pageRange(1, 12, 1, 1);
		expect(first).toContain(1);
		expect(first.at(-1)).toBe(12);

		const last = pageRange(12, 12, 1, 1);
		expect(last[0]).toBe(1);
		expect(last).toContain(12);
	});

	it("widens with siblingCount rather than ignoring it", () => {
		const tight = pageRange(6, 20, 1, 1);
		const wide = pageRange(6, 20, 3, 1);
		expect(wide.filter((x) => typeof x === "number").length).toBeGreaterThan(
			tight.filter((x) => typeof x === "number").length,
		);
	});

	it("never repeats a page number", () => {
		// The boundary and the siblings can collide when they are close together,
		// and a repeated number is a row with two identical controls on it.
		for (let count = 1; count <= 40; count += 1) {
			for (let page = 1; page <= count; page += 1) {
				const numbers = pageRange(page, count, 1, 1).filter(
					(x): x is number => typeof x === "number",
				);
				expect(new Set(numbers).size, `count ${count}, page ${page}`).toBe(numbers.length);
			}
		}
	});

	it("always includes the current page", () => {
		for (let count = 1; count <= 40; count += 1) {
			for (let page = 1; page <= count; page += 1) {
				expect(pageRange(page, count, 1, 1), `count ${count}, page ${page}`).toContain(page);
			}
		}
	});

	it("is in ascending order with the gaps in the right places", () => {
		for (let count = 1; count <= 40; count += 1) {
			for (let page = 1; page <= count; page += 1) {
				const items = pageRange(page, count, 1, 1);
				const numbers = items.filter((x): x is number => typeof x === "number");
				for (let i = 1; i < numbers.length; i += 1) {
					expect(numbers[i]!, `count ${count}, page ${page}`).toBeGreaterThan(numbers[i - 1]!);
				}
				// A gap never sits at either end: there is nothing to the left of the
				// first page or to the right of the last.
				expect(items[0], `count ${count}, page ${page}`).not.toBe("gap");
				expect(items.at(-1), `count ${count}, page ${page}`).not.toBe("gap");
			}
		}
	});

	it("clamps a page that is out of range rather than dropping it", () => {
		// A caller can be one render behind a shortened list, and the alternative
		// is a range with no current page in it at all.
		expect(pageRange(99, 12, 1, 1)).toContain(12);
		expect(pageRange(0, 12, 1, 1)).toContain(1);
	});

	it("returns nothing for a count that is not a page count", () => {
		expect(pageRange(1, 0, 1, 1)).toEqual([]);
		expect(pageRange(1, -3, 1, 1)).toEqual([]);
	});
});
