import { useCallback, useEffect, useState } from "react";

export type FloatingSide = "top" | "bottom" | "left" | "right";
export type FloatingAlign = "start" | "center" | "end";

export type FloatingPlacement =
	| "top"
	| "top-start"
	| "top-end"
	| "bottom"
	| "bottom-start"
	| "bottom-end"
	| "left"
	| "left-start"
	| "left-end"
	| "right"
	| "right-start"
	| "right-end";

export interface FloatingRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface FloatingOptions {
	placement?: FloatingPlacement;
	offset?: number;
	flip?: boolean;
	shift?: boolean;
	padding?: number;
	viewport?: FloatingRect;
}

export interface FloatingResult {
	x: number;
	y: number;
	placement: FloatingPlacement;
	side: FloatingSide;
	align: FloatingAlign;
	arrow?: {
		x: number;
		y: number;
		side: FloatingSide;
	};
}

export function parsePlacement(placement: FloatingPlacement): {
	side: FloatingSide;
	align: FloatingAlign;
} {
	const parts = placement.split("-");
	const side = parts[0] as FloatingSide;
	const align = (parts[1] as FloatingAlign) || "center";
	return { side, align };
}

export function getOppositeSide(side: FloatingSide): FloatingSide {
	switch (side) {
		case "top":
			return "bottom";
		case "bottom":
			return "top";
		case "left":
			return "right";
		case "right":
			return "left";
	}
}

/**
 * Computes deterministic floating coordinates for an overlay relative to an anchor.
 *
 * Implements viewport boundary collision avoidance:
 * 1. Flip: Reverses primary direction if overflowing viewport.
 * 2. Shift: Clamps cross-axis position to stay within viewport bounds (padding).
 * 3. Arrow: Centers arrow relative to anchor while keeping within overlay boundaries.
 */
export function computeFloatingPosition(
	anchor: FloatingRect,
	floating: FloatingRect,
	options: FloatingOptions = {},
): FloatingResult {
	const {
		placement = "top",
		offset = 8,
		flip = true,
		shift = true,
		padding = 8,
		viewport = typeof window !== "undefined"
			? {
					x: window.scrollX || 0,
					y: window.scrollY || 0,
					width: window.innerWidth || 1024,
					height: window.innerHeight || 768,
				}
			: { x: 0, y: 0, width: 1920, height: 1080 },
	} = options;

	let { side, align } = parsePlacement(placement);

	// 1. Flip check along primary axis
	if (flip) {
		const topOverflow = anchor.y - floating.height - offset < viewport.y + padding;
		const bottomOverflow =
			anchor.y + anchor.height + offset + floating.height >
			viewport.y + viewport.height - padding;
		const leftOverflow = anchor.x - floating.width - offset < viewport.x + padding;
		const rightOverflow =
			anchor.x + anchor.width + offset + floating.width > viewport.x + viewport.width - padding;

		if (side === "top" && topOverflow && !bottomOverflow) {
			side = "bottom";
		} else if (side === "bottom" && bottomOverflow && !topOverflow) {
			side = "top";
		} else if (side === "left" && leftOverflow && !rightOverflow) {
			side = "right";
		} else if (side === "right" && rightOverflow && !leftOverflow) {
			side = "left";
		}
	}

	// 2. Primary axis coordinate
	let x = 0;
	let y = 0;

	if (side === "top") {
		y = anchor.y - floating.height - offset;
	} else if (side === "bottom") {
		y = anchor.y + anchor.height + offset;
	} else if (side === "left") {
		x = anchor.x - floating.width - offset;
	} else if (side === "right") {
		x = anchor.x + anchor.width + offset;
	}

	// 3. Cross axis coordinate
	if (side === "top" || side === "bottom") {
		if (align === "start") {
			x = anchor.x;
		} else if (align === "end") {
			x = anchor.x + anchor.width - floating.width;
		} else {
			x = anchor.x + (anchor.width - floating.width) / 2;
		}

		if (shift) {
			const minX = viewport.x + padding;
			const maxX = viewport.x + viewport.width - padding - floating.width;
			x = Math.max(minX, Math.min(x, maxX));
		}
	} else {
		// left or right
		if (align === "start") {
			y = anchor.y;
		} else if (align === "end") {
			y = anchor.y + anchor.height - floating.height;
		} else {
			y = anchor.y + (anchor.height - floating.height) / 2;
		}

		if (shift) {
			const minY = viewport.y + padding;
			const maxY = viewport.y + viewport.height - padding - floating.height;
			y = Math.max(minY, Math.min(y, maxY));
		}
	}

	// 4. Arrow positioning
	const arrowSide = getOppositeSide(side);
	let arrowX = 0;
	let arrowY = 0;

	if (side === "top" || side === "bottom") {
		const anchorCenterX = anchor.x + anchor.width / 2;
		// arrow relative to floating box
		const relativeX = anchorCenterX - x;
		arrowX = Math.max(12, Math.min(relativeX, floating.width - 12));
		arrowY = side === "top" ? floating.height : 0;
	} else {
		const anchorCenterY = anchor.y + anchor.height / 2;
		const relativeY = anchorCenterY - y;
		arrowY = Math.max(12, Math.min(relativeY, floating.height - 12));
		arrowX = side === "left" ? floating.width : 0;
	}

	const resolvedPlacement: FloatingPlacement =
		align === "center" ? side : (`${side}-${align}` as FloatingPlacement);

	return {
		x: Math.round(x),
		y: Math.round(y),
		placement: resolvedPlacement,
		side,
		align,
		arrow: {
			x: Math.round(arrowX),
			y: Math.round(arrowY),
			side: arrowSide,
		},
	};
}

export interface UseFloatingProps {
	anchorRef: { readonly current: HTMLElement | null };
	floatingRef: { readonly current: HTMLElement | null };
	open: boolean;
	placement?: FloatingPlacement;
	offset?: number;
	flip?: boolean;
	shift?: boolean;
	padding?: number;
}

export function useFloatingPosition({
	anchorRef,
	floatingRef,
	open,
	placement = "top",
	offset = 8,
	flip = true,
	shift = true,
	padding = 8,
}: UseFloatingProps) {
	const [coords, setCoords] = useState<FloatingResult | null>(null);

	const update = useCallback(() => {
		if (!open) return;
		const anchorEl = anchorRef.current;
		const floatingEl = floatingRef.current;
		if (!anchorEl || !floatingEl) return;

		const aRect = anchorEl.getBoundingClientRect();
		const fRect = floatingEl.getBoundingClientRect();

		const scrollX = window.scrollX || window.pageXOffset || 0;
		const scrollY = window.scrollY || window.pageYOffset || 0;

		const anchorBox: FloatingRect = {
			x: aRect.left + scrollX,
			y: aRect.top + scrollY,
			width: aRect.width,
			height: aRect.height,
		};

		const floatingBox: FloatingRect = {
			x: fRect.left + scrollX,
			y: fRect.top + scrollY,
			width: fRect.width,
			height: fRect.height,
		};

		const viewport: FloatingRect = {
			x: scrollX,
			y: scrollY,
			width: window.innerWidth,
			height: window.innerHeight,
		};

		const res = computeFloatingPosition(anchorBox, floatingBox, {
			placement,
			offset,
			flip,
			shift,
			padding,
			viewport,
		});

		setCoords(res);
	}, [open, placement, offset, flip, shift, padding, anchorRef, floatingRef]);

	useEffect(() => {
		if (!open) {
			setCoords(null);
			return;
		}

		update();

		const handleEvent = () => update();
		window.addEventListener("resize", handleEvent, { passive: true });
		window.addEventListener("scroll", handleEvent, { passive: true, capture: true });

		return () => {
			window.removeEventListener("resize", handleEvent);
			window.removeEventListener("scroll", handleEvent, true);
		};
	}, [open, update]);

	return { coords, update };
}
