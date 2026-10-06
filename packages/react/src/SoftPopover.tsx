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

export interface SoftPopoverProps {
	/** Interactive element that triggers the popover card when clicked. */
	trigger: ReactElement;
	/** Card body content. */
	children?: ReactNode;
	/** Optional title rendered in the popover header. */
	title?: ReactNode;
	/** Optional action controls placed in the footer slot. */
	actions?: ReactNode;
	/** Controlled open state. */
	open?: boolean;
	/** Default open state in uncontrolled mode. */
	defaultOpen?: boolean;
	/** Callback fired when open state changes. */
	onOpenChange?: (open: boolean) => void;
	/** Preferred placement relative to trigger. Default is "bottom". */
	placement?: FloatingPlacement;
	/** Gap in pixels between anchor and popover card. Default is 10. */
	offset?: number;
	/** Whether to display a close button in the header. Default is true. */
	showClose?: boolean;
	/** Surface material look: "glass", "plain", "wash", or "tint". Default is "glass". */
	material?: SoftOverlayMaterial;
	/** Pigment tone for paper or glass tinting. */
	tone?: IrisTone;
	/** Additional class name for the popover card. */
	className?: string;
	/** Disable trigger interaction. */
	disabled?: boolean;
}

/**
 * Rich contextual popover card with collision avoidance and physical spring damping.
 *
 * Implements WAI-ARIA role="dialog", click-outside dismissal, Escape key handling,
 * and automatic focus restoration to the trigger element upon closing.
 */
export const SoftPopover = forwardRef<HTMLDivElement, SoftPopoverProps>(function SoftPopover(
	{
		trigger,
		children,
		title,
		actions,
		open: controlledOpen,
		defaultOpen = false,
		onOpenChange,
		placement = "bottom",
		offset = 10,
		showClose = true,
		material = "glass",
		tone,
		className,
		disabled = false,
	},
	ref,
) {
	useStyles();
	const surface = useMaterial(material && material !== "glass" ? { material, tone } : {});
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const [mounted, setMounted] = useState(false);

	const isControlled = controlledOpen !== undefined;
	const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

	const id = useId();
	const popoverId = `ui-popover-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const titleId = `${popoverId}-title`;

	const anchorRef = useRef<HTMLElement | null>(null);
	const floatingRef = useRef<HTMLDivElement | null>(null);

	const setOpen = useCallback(
		(next: boolean) => {
			if (disabled) return;
			if (!isControlled) setUncontrolledOpen(next);
			onOpenChange?.(next);
		},
		[disabled, isControlled, onOpenChange],
	);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Click outside and escape listeners
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node | null;
			if (!target) return;
			if (anchorRef.current?.contains(target)) return;
			if (floatingRef.current?.contains(target)) return;
			setOpen(false);
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				setOpen(false);
				anchorRef.current?.focus();
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, setOpen]);

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

	// Trigger element wiring
	const originalProps = isValidElement(trigger)
		? (trigger.props as Record<string, unknown>)
		: {};

	const triggerElement = isValidElement(trigger)
		? cloneElement(trigger, {
				ref: (node: HTMLElement | null) => {
					anchorRef.current = node;
					const childRef = (trigger as unknown as { ref?: (n: HTMLElement | null) => void })
						.ref;
					if (typeof childRef === "function") childRef(node);
					else if (childRef && typeof childRef === "object" && "current" in childRef) {
						(childRef as { current: HTMLElement | null }).current = node;
					}
				},
				"aria-haspopup": "dialog",
				"aria-expanded": isOpen,
				"aria-controls": isOpen ? popoverId : undefined,
				onClick: (e: React.MouseEvent) => {
					(originalProps.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
					setOpen(!isOpen);
				},
			} as Record<string, unknown>)
		: trigger;

	const actualSide = coords?.side ?? "bottom";
	const actualPlacement = coords?.placement ?? placement;

	const popoverContent = isOpen && (
		<div
			ref={(node) => {
				floatingRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref && typeof ref === "object") ref.current = node;
			}}
			id={popoverId}
			role="dialog"
			aria-modal="false"
			aria-labelledby={title ? titleId : undefined}
			data-ui-lib-placement={actualPlacement}
			data-ui-lib-side={actualSide}
			className={[
				"ui-lib-soft-popover",
				"ui-lib-soft-popover--open",
				material && `ui-lib-soft-popover--${material}`,
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
			<div className="ui-lib-soft-popover__card">
				{(title || showClose) && (
					<div className="ui-lib-soft-popover__header">
						{title && (
							<h3 id={titleId} className="ui-lib-soft-popover__title">
								{title}
							</h3>
						)}
						{showClose && (
							<button
								type="button"
								className="ui-lib-soft-popover__close"
								aria-label="关闭弹出卡片"
								onClick={() => {
									setOpen(false);
									anchorRef.current?.focus();
								}}
							>
								✕
							</button>
						)}
					</div>
				)}

				{children && <div className="ui-lib-soft-popover__body">{children}</div>}

				{actions && <div className="ui-lib-soft-popover__footer">{actions}</div>}

				{coords?.arrow && (
					<div
						className="ui-lib-soft-popover__arrow"
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
		</div>
	);

	return (
		<>
			{triggerElement}
			{mounted && typeof document !== "undefined"
				? createPortal(popoverContent, document.body)
				: popoverContent}
		</>
	);
});
