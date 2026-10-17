import type { Tone } from "@ui-lib/core";
import { forwardRef, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMaterial } from "./material.js";
import {
	toast as globalToast,
	ToastContext,
	type ToastData,
	type ToastMaterial,
	type ToastPosition,
	type ToastVariant,
} from "./toast.js";
import { useStyles } from "./useStyles.js";

export interface SoftToastProps {
	/** Full toast data object. */
	toast?: ToastData;
	/** Toast identifier. */
	id?: string;
	title?: ReactNode;
	message?: ReactNode;
	body?: ReactNode;
	variant?: ToastVariant;
	tone?: Tone | "info" | "success" | "warn";
	material?: ToastMaterial;
	duration?: number;
	dismissible?: boolean;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: (id?: string) => void;
	className?: string;
	style?: React.CSSProperties;
	swipeToDismiss?: boolean;
}

const VARIANT_ICONS: Record<string, string> = {
	info: "ℹ",
	success: "✓",
	warning: "⚠",
	error: "✕",
	promise: "◌",
};

/**
 * Individual physical toast notification card.
 *
 * Implements accessible status announcement, gesture-based swipe-to-dismiss,
 * progress duration bar, and liquid glass / wash material styling.
 */
export const SoftToast = forwardRef<HTMLDivElement, SoftToastProps>(function SoftToast(
	{
		toast,
		id,
		title,
		message,
		body,
		variant,
		tone,
		material,
		duration,
		dismissible,
		action,
		onDismiss,
		className,
		style,
		swipeToDismiss = true,
	},
	ref,
) {
	useStyles();
	const normalizedToast: ToastData = toast ?? {
		id: id ?? "toast",
		title,
		message: message ?? body ?? "",
		variant: variant ?? (tone === "warn" ? "warning" : tone === "success" ? "success" : "info"),
		tone:
			tone === "warn"
				? "blossom"
				: tone === "success"
					? "mist"
					: tone === "info"
						? "iris"
						: tone,
		material: material ?? "glass",
		duration,
		dismissible: dismissible ?? true,
		action,
		createdAt: Date.now(),
	};

	const surface = useMaterial(
		normalizedToast.material && normalizedToast.material !== "glass"
			? { material: normalizedToast.material, tone: normalizedToast.tone }
			: {},
	);
	const [dragX, setDragX] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [paused, setPaused] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const remainingRef = useRef(normalizedToast.duration ?? 4000);
	const lastStartRef = useRef(Date.now());

	const isError = normalizedToast.variant === "error";

	// Auto-dismiss countdown
	useEffect(() => {
		if (!normalizedToast.duration || normalizedToast.duration <= 0 || !onDismiss) return;

		if (!paused) {
			lastStartRef.current = Date.now();
			timerRef.current = setTimeout(() => {
				onDismiss(normalizedToast.id);
			}, remainingRef.current);
		} else {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			const elapsed = Date.now() - lastStartRef.current;
			remainingRef.current = Math.max(0, remainingRef.current - elapsed);
		}

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [normalizedToast.duration, normalizedToast.id, onDismiss, paused]);

	const domRef = useRef<HTMLDivElement | null>(null);

	// Gesture swipe to dismiss and hover pause
	useEffect(() => {
		const node = domRef.current;
		if (!node) return;

		let startX = 0;
		let dragging = false;
		let delta = 0;

		const onDown = (e: PointerEvent) => {
			if (!swipeToDismiss) return;
			dragging = true;
			startX = e.clientX;
			setIsDragging(true);
			node.setPointerCapture?.(e.pointerId);
		};

		const onMove = (e: PointerEvent) => {
			if (!dragging) return;
			delta = (e.clientX - startX) * 0.85;
			setDragX(delta);
		};

		const onUp = (e: PointerEvent) => {
			if (!dragging) return;
			dragging = false;
			setIsDragging(false);
			node.releasePointerCapture?.(e.pointerId);

			if (Math.abs(delta) > 80 && onDismiss) {
				setDragX(delta > 0 ? 300 : -300);
				setTimeout(() => onDismiss(normalizedToast.id), 150);
			} else {
				setDragX(0);
			}
		};

		const onEnter = () => setPaused(true);
		const onLeave = () => setPaused(false);

		node.addEventListener("pointerdown", onDown);
		node.addEventListener("pointermove", onMove);
		node.addEventListener("pointerup", onUp);
		node.addEventListener("pointercancel", onUp);
		node.addEventListener("mouseenter", onEnter);
		node.addEventListener("mouseleave", onLeave);

		return () => {
			node.removeEventListener("pointerdown", onDown);
			node.removeEventListener("pointermove", onMove);
			node.removeEventListener("pointerup", onUp);
			node.removeEventListener("pointercancel", onUp);
			node.removeEventListener("mouseenter", onEnter);
			node.removeEventListener("mouseleave", onLeave);
		};
	}, [swipeToDismiss, onDismiss, normalizedToast.id]);

	return (
		<div
			ref={(node) => {
				domRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			role={isError ? "alert" : "status"}
			aria-live={isError ? "assertive" : "polite"}
			aria-atomic="true"
			data-ui-lib-variant={normalizedToast.variant}
			data-ui-lib-material={normalizedToast.material}
			className={[
				"ui-lib-soft-toast",
				normalizedToast.variant && `ui-lib-soft-toast--${normalizedToast.variant}`,
				normalizedToast.material && `ui-lib-soft-toast--${normalizedToast.material}`,
				isDragging && "ui-lib-soft-toast--dragging",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				transform: `translateX(${dragX}px)`,
				opacity: isDragging ? Math.max(0.4, 1 - Math.abs(dragX) / 200) : undefined,
				...surface.style,
				...style,
			}}
		>
			<div className="ui-lib-soft-toast__icon">
				{VARIANT_ICONS[normalizedToast.variant ?? "info"]}
			</div>

			<div className="ui-lib-soft-toast__content">
				{normalizedToast.title && (
					<div className="ui-lib-soft-toast__title">{normalizedToast.title}</div>
				)}
				<div className="ui-lib-soft-toast__message">{normalizedToast.message}</div>
			</div>

			{normalizedToast.action && (
				<button
					type="button"
					className="ui-lib-soft-toast__action"
					onClick={(e) => {
						e.stopPropagation();
						normalizedToast.action?.onClick();
					}}
				>
					{normalizedToast.action.label}
				</button>
			)}

			{normalizedToast.dismissible && onDismiss && (
				<button
					type="button"
					className="ui-lib-soft-toast__close"
					aria-label="关闭通知"
					onClick={(e) => {
						e.stopPropagation();
						onDismiss(normalizedToast.id);
					}}
				>
					✕
				</button>
			)}

			{normalizedToast.duration && normalizedToast.duration > 0 && (
				<div
					className="ui-lib-soft-toast__progress"
					style={{
						animationDuration: `${normalizedToast.duration}ms`,
						animationPlayState: paused ? "paused" : "running",
					}}
				/>
			)}
		</div>
	);
});

export interface SoftToasterProps {
	/** Fixed screen corner or center placement for toast stack. Default is "top-right". */
	position?: ToastPosition;
	/** Maximum number of toasts displayed simultaneously. Default is 5. */
	max?: number;
	/** Additional class name for container. */
	className?: string;
}

/**
 * Floating container that manages stacked toast card physics and interactive expansion.
 */
export const SoftToaster = forwardRef<HTMLDivElement, SoftToasterProps>(function SoftToaster(
	{ position = "top-right", max = 5, className },
	ref,
) {
	useStyles();
	const [toasts, setToasts] = useState<ToastData[]>([]);
	const [hovered, setHovered] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return globalToast.subscribe(setToasts);
	}, []);

	const isTop = position.startsWith("top");
	const visibleToasts = toasts.slice(0, max);

	const container = (
		<section
			ref={ref}
			aria-label="通知消息"
			data-ui-lib-position={position}
			data-ui-lib-hovered={hovered ? "true" : undefined}
			className={[
				"ui-lib-soft-toaster",
				`ui-lib-soft-toaster--${position}`,
				hovered && "ui-lib-soft-toaster--expanded",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{visibleToasts.map((toast, index) => {
				const depth = index;
				// In stacked view, calculate depth offset and scale
				const translateY = hovered ? 0 : isTop ? depth * 14 : -depth * 14;
				const scale = hovered ? 1 : Math.max(0.85, 1 - depth * 0.05);
				const opacity = hovered ? 1 : Math.max(0.6, 1 - depth * 0.15);

				return (
					<div
						key={toast.id}
						className="ui-lib-soft-toaster__item"
						style={{
							transform: `translateY(${translateY}px) scale(${scale})`,
							opacity,
							zIndex: max - depth,
						}}
					>
						<SoftToast toast={toast} onDismiss={() => globalToast.dismiss(toast.id)} />
					</div>
				);
			})}
		</section>
	);

	if (!mounted || typeof document === "undefined") {
		return null;
	}

	return createPortal(container, document.body);
});

export interface SoftToastProviderProps {
	children?: ReactNode;
	position?: ToastPosition;
	max?: number;
}

/**
 * React Context provider that mounts the toaster stack and exposes the `useToast` hook.
 */
export function SoftToastProvider({
	children,
	position = "top-right",
	max = 5,
}: SoftToastProviderProps) {
	const [toasts, setToasts] = useState<ToastData[]>([]);

	useEffect(() => {
		return globalToast.subscribe(setToasts);
	}, []);

	const dismiss = useCallback((id?: string) => {
		globalToast.dismiss(id);
	}, []);

	return (
		<ToastContext.Provider value={{ toast: globalToast, toasts, dismiss }}>
			{children}
			<SoftToaster position={position} max={max} />
		</ToastContext.Provider>
	);
}
