import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";

export interface SoftModalProps {
	open: boolean;
	onClose: () => void;
	/** Shown as the accessible name. Also rendered as the visible title. */
	title: string;
	children?: React.ReactNode;
	/** Text for the confirm button. Omit for a message-only dialog. */
	confirmLabel?: string;
	onConfirm?: () => void;
	/** Text for the dismiss button. */
	cancelLabel?: string;
	/**
	 * Suppress the exit animation and the entry burst. Honours
	 * `prefers-reduced-motion` regardless of what is passed.
	 */
	celebrate?: boolean;
}

/** Corner sparks, one per rounded corner. */
const SPARKS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

/**
 * A dialog that inflates like a balloon.
 *
 * Built on a real `<dialog>` with `showModal()`. That is not a shortcut: the
 * platform already implements the focus trap, the Escape key, the inert
 * background and the top-layer stacking, and a hand-rolled overlay gets at
 * least one of those wrong every time. This draws on top of it rather than
 * beside it.
 *
 * The entry is `0.4 -> 1.08 -> 1.0`, which is a balloon being blown up and
 * then relaxing — a single ease would read as a box appearing. The backdrop is
 * a warm veil rather than a dark one, because a black scrim over a pastel page
 * changes the page's colour instead of dimming it.
 *
 * ```tsx
 * <SoftModal open={open} onClose={() => setOpen(false)} title="全部完成"
 *   confirmLabel="好" onConfirm={dismiss}>
 *   三张卡片都保存好了。
 * </SoftModal>
 * ```
 */
export const SoftModal = forwardRef<HTMLDialogElement, SoftModalProps>(function SoftModal(
	{
		open,
		onClose,
		title,
		children,
		confirmLabel,
		onConfirm,
		cancelLabel = "关闭",
		celebrate = true,
	},
	ref,
) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const titleId = useId();
	// `prefers-reduced-motion` in state, so the sparks are not rendered at all
	// rather than rendered and hidden — a burst that exists but is invisible
	// still costs a layout pass on every open.
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
		query.addEventListener("change", listener);
		return () => query.removeEventListener("change", listener);
	}, []);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		// `showModal` throws if it is already open, and a re-render with the same
		// `open` would call it twice.
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	}, [open]);

	// Escape and the backdrop both close through the platform, which fires
	// `cancel` and `close`. Both have to report back, or the parent's `open`
	// stays true and the dialog cannot be reopened.
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const shut = () => onClose();
		dialog.addEventListener("close", shut);
		dialog.addEventListener("cancel", shut);
		return () => {
			dialog.removeEventListener("close", shut);
			dialog.removeEventListener("cancel", shut);
		};
	}, [onClose]);

	const handleBackdrop = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		// The dialog element fills the viewport, so a click on the panel itself
		// and a click on the veil are the same event target. The panel stops its
		// own clicks, which is what leaves only the veil reaching here.
		// The veil covers the dialog, so anything that reaches here is outside the
		// panel. Closing goes through the dialog ref rather than the event target,
		// which is the veil and cannot close anything.
		if (event.target === event.currentTarget) dialogRef.current?.close();
	}, []);

	const sparks = celebrate && !reduced;

	return (
		<dialog
			ref={(node) => {
				dialogRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			aria-labelledby={titleId}
			className="ui-lib-soft-modal"
			data-ui-lib-reduced={reduced ? "" : undefined}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			{/*
			 * The veil wraps the panel, so a click that reaches it is a click
			 * outside the panel.
			 *
			 * Neither a11y rule below applies, and the reason is the same for
			 * both: the keyboard path is already complete. Escape fires the
			 * dialog's own `cancel` event, which this component handles, so
			 * there is no keyboard gap for a key handler to close. The rules ask
			 * because a click target normally needs one; this one does not,
			 * because the platform supplied it.
			 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Escape is handled via the dialog's cancel event */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled via the dialog's cancel event */}
			<div className="ui-lib-soft-modal__veil" onClick={handleBackdrop}>
				{/* Focus goes to the panel, not to the dismiss button. The platform
			    focuses the first focusable child, which put a visible ring around
			    the × for every mouse user — correct for a keyboard user who
			    opens with Enter, noise for anyone who clicked. The panel takes
			    the focus and outlines nothing; Tab reaches the buttons from
			    there, which is the order a keyboard user wants anyway. */}
				<div className="ui-lib-soft-modal__panel" tabIndex={-1}>
					{sparks &&
						SPARKS.map((corner) => (
							<span
								key={corner}
								className="ui-lib-soft-modal__spark"
								data-ui-lib-corner={corner}
								aria-hidden="true"
							>
								✦
							</span>
						))}

					<header className="ui-lib-soft-modal__head">
						<h2 id={titleId} className="ui-lib-soft-modal__title">
							{title}
						</h2>
						<button
							type="button"
							className="ui-lib-soft-modal__dismiss"
							aria-label="关闭"
							onClick={onClose}
						>
							×
						</button>
					</header>

					{children && <div className="ui-lib-soft-modal__body">{children}</div>}

					<footer className="ui-lib-soft-modal__foot">
						<button type="button" className="ui-lib-soft-modal__cancel" onClick={onClose}>
							{cancelLabel}
						</button>
						{confirmLabel && (
							<button
								type="button"
								className="ui-lib-soft-modal__confirm"
								onClick={() => {
									onConfirm?.();
									onClose();
								}}
							>
								{confirmLabel}
							</button>
						)}
					</footer>
				</div>
			</div>
		</dialog>
	);
});
