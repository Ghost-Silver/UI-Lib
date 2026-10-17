import type { IrisTone } from "@ui-lib/core";
import {
	cloneElement,
	forwardRef,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { type FloatingPlacement, useFloatingPosition } from "./floating.js";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export type SoftOverlayMaterial = "glass" | SoftMaterial;

export interface SoftTooltipProps {
	/** Text or element displayed inside the floating bubble. */
	content: ReactNode;
	/** The anchor element the tooltip attaches to. Must be an interactive element. */
	children?: ReactElement;
	/** Directional preference relative to anchor. Default is "top". */
	placement?: FloatingPlacement;
	/** Gap in pixels between anchor and bubble. Default is 8. */
	offset?: number;
	/** Milliseconds before tooltip appears on hover/focus. Default is 180. */
	delayShow?: number;
	/** Milliseconds before tooltip disappears. Default is 100. */
	delayHide?: number;
	/** Surface material look: "glass", "plain", "wash", or "tint". Default is "glass". */
	material?: SoftOverlayMaterial;
	/** Pigment tone for paper or glass highlights. */
	tone?: IrisTone;
	/** Additional class name for tooltip bubble. */
	className?: string;
	/** Disable tooltip trigger completely. */
	disabled?: boolean;
}

/**
 * Lightweight, accessible floating tooltip bubble with physics spring transitions.
 *
 * Implements WAI-ARIA role="tooltip" and automatically connects `aria-describedby`
 * with the trigger child element.
 */
export const SoftTooltip = forwardRef<HTMLDivElement, SoftTooltipProps>(function SoftTooltip(
	{
		content,
		children,
		placement = "top",
		offset = 8,
		delayShow = 180,
		delayHide = 100,
		material = "glass",
		tone,
		className,
		disabled = false,
	},
	ref,
) {
	useStyles();
	const surface = useMaterial(material && material !== "glass" ? { material, tone } : {});
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const id = useId();
	const tooltipId = `ui-tooltip-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

	const anchorRef = useRef<HTMLElement | null>(null);
	const floatingRef = useRef<HTMLDivElement | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setMounted(true);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const show = useCallback(() => {
		if (disabled) return;
		clearTimer();
		if (delayShow <= 0) {
			setIsOpen(true);
		} else {
			timerRef.current = setTimeout(() => setIsOpen(true), delayShow);
		}
	}, [disabled, delayShow, clearTimer]);

	const hide = useCallback(() => {
		clearTimer();
		if (delayHide <= 0) {
			setIsOpen(false);
		} else {
			timerRef.current = setTimeout(() => setIsOpen(false), delayHide);
		}
	}, [delayHide, clearTimer]);

	const { coords } = useFloatingPosition({
		anchorRef,
		floatingRef,
		open: isOpen,
		placement,
		offset,
		flip: true,
		shift: true,
		padding: 8,
	});

	// Connect event listeners to trigger child
	const originalProps = isValidElement(children)
		? (children.props as Record<string, unknown>)
		: {};

	const triggerElement = isValidElement(children)
		? cloneElement(children, {
				ref: (node: HTMLElement | null) => {
					anchorRef.current = node;
					const childRef = (children as unknown as { ref?: (n: HTMLElement | null) => void })
						.ref;
					if (typeof childRef === "function") childRef(node);
					else if (childRef && typeof childRef === "object" && "current" in childRef) {
						(childRef as { current: HTMLElement | null }).current = node;
					}
				},
				"aria-describedby":
					[originalProps["aria-describedby"], isOpen ? tooltipId : undefined]
						.filter(Boolean)
						.join(" ") || undefined,
				onPointerEnter: (e: React.PointerEvent) => {
					(originalProps.onPointerEnter as ((e: React.PointerEvent) => void) | undefined)?.(e);
					show();
				},
				onPointerLeave: (e: React.PointerEvent) => {
					(originalProps.onPointerLeave as ((e: React.PointerEvent) => void) | undefined)?.(e);
					hide();
				},
				onFocus: (e: React.FocusEvent) => {
					(originalProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e);
					show();
				},
				onBlur: (e: React.FocusEvent) => {
					(originalProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e);
					hide();
				},
			} as Record<string, unknown>)
		: children;

	const actualSide = coords?.side ?? "top";
	const actualPlacement = coords?.placement ?? placement;

	const tooltipContent = isOpen && (
		<div
			ref={(node) => {
				floatingRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref && typeof ref === "object") ref.current = node;
			}}
			id={tooltipId}
			role="tooltip"
			data-ui-lib-placement={actualPlacement}
			data-ui-lib-side={actualSide}
			className={[
				"ui-lib-soft-tooltip",
				"ui-lib-soft-tooltip--open",
				material && `ui-lib-soft-tooltip--${material}`,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				position: "absolute",
				left: coords ? `${coords.x}px` : "-9999px",
				top: coords ? `${coords.y}px` : "-9999px",
				...surface.style,
			}}
		>
			<div className="ui-lib-soft-tooltip__content">{content}</div>
			{coords?.arrow && (
				<div
					className="ui-lib-soft-tooltip__arrow"
					data-ui-lib-arrow-side={coords.arrow.side}
					style={{
						left:
							coords.side === "top" || coords.side === "bottom"
								? `${coords.arrow.x}px`
								: undefined,
						top:
							coords.side === "left" || coords.side === "right"
								? `${coords.arrow.y}px`
								: undefined,
					}}
				/>
			)}
		</div>
	);

	return (
		<>
			{triggerElement}
			{mounted && typeof document !== "undefined"
				? createPortal(tooltipContent, document.body)
				: tooltipContent}
		</>
	);
});
