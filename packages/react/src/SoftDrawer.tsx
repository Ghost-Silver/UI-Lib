import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useEffect, useId, useRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftDrawerProps {
	open: boolean;
	onClose: () => void;
	/** A heading, wired to the dialog for its accessible name. */
	title: string;
	/** A line under the title. */
	note?: string;
	/** Which edge it comes from. */
	side?: "right" | "left";
	/** Width. Any CSS length. */
	width?: string;
	/** The body. */
	children?: React.ReactNode;
	/** Actions pinned to the bottom. */
	footer?: React.ReactNode;
	/**
	 * What the panel is made of.
	 *
	 * Offered on the two components that are **content containers** — this and
	 * the drawer — and deliberately not on the ones that are **control groups**.
	 * A material is a claim that a surface is a thing rather than chrome: a card,
	 * a table, a list. A segmented control, a pagination row and a stepper are
	 * rows of controls, and giving them pigment is decoration rather than
	 * expression — it would also put the loudest texture in the interface behind
	 * the thing the user is trying to operate.
	 */
	material?: SoftMaterial;
	/** Which family the pigment comes from. */
	tone?: IrisTone;

	className?: string;
}

/**
 * A panel that slides in from an edge and takes the page with it.
 *
 * **It shares its mechanism with `SoftModal`, and that is the whole point.** A
 * drawer and a dialog differ in where they appear, not in what they do: both are
 * modal, both trap focus, both close on Escape, both make the page behind them
 * inert. So this is built on the same `<dialog>` with `showModal()` rather than
 * on a `<div>` with a hand-written trap, and none of the interaction is
 * reimplemented — the focus trap, the Escape handling, the inert background and
 * the top-layer stacking all come from the platform.
 *
 * The only thing written here is the geometry: the dialog is pinned to an edge,
 * told not to animate its own centring, and the panel inside it translates.
 *
 * **Why the panel animates and the dialog does not.** A `<dialog>` opens into
 * the centre by default and the position is part of the top layer's layout, so
 * transitioning it fights the platform. The dialog is size-zero and pinned; the
 * panel inside carries the size and does the moving.
 *
 * ```tsx
 * <SoftDrawer open={open} onClose={close} title="材质" footer={<button>保存</button>}>
 *   …
 * </SoftDrawer>
 * ```
 */
export const SoftDrawer = forwardRef<HTMLDialogElement, SoftDrawerProps>(function SoftDrawer(
	{
		open,
		onClose,
		title,
		note,
		side = "right",
		width = "340px",
		children,
		footer,
		material,
		tone,
		className,
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const surface = useMaterial(material && material !== "plain" ? { material, tone } : {});
	const dialog = useRef<HTMLDialogElement | null>(null);
	const headingId = `${useId()}-title`;

	useEffect(() => {
		const node = dialog.current;
		if (!node) return;
		// `showModal` throws if it is already open, so a re-render with the same
		// `open` must not call it twice.
		if (open && !node.open) node.showModal();
		else if (!open && node.open) node.close();
	}, [open]);

	// Escape and a click on the backdrop both close through the platform, which
	// fires `close`. Syncing state from that is what keeps a drawer closed by the
	// keyboard and a drawer closed by the button in the same state.
	useEffect(() => {
		const node = dialog.current;
		if (!node) return;
		const closed = () => onClose();
		node.addEventListener("close", closed);
		return () => node.removeEventListener("close", closed);
	}, [onClose]);

	/** A click on the dialog itself is a click on the backdrop, since the panel
	 *  fills it otherwise. */
	const onBackdrop = useCallback(
		(event: React.MouseEvent<HTMLDialogElement>) => {
			if (event.target === dialog.current) onClose();
		},
		[onClose],
	);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop click is a mouse convenience; Escape is the keyboard path to the same action and the platform provides it
		<dialog
			ref={(node) => {
				dialog.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			aria-labelledby={headingId}
			data-ui-lib-side={side}
			style={{ ["--drawer-width" as string]: width }}
			className={className ? `ui-lib-soft-drawer ${className}` : "ui-lib-soft-drawer"}
			onClick={onBackdrop}
		>
			<div
				className={
					surface.className
						? `ui-lib-soft-drawer__panel ${surface.className}`
						: "ui-lib-soft-drawer__panel"
				}
				style={surface.className ? surface.style : undefined}
			>
				<header className="ui-lib-soft-drawer__head">
					<div className="ui-lib-soft-drawer__titles">
						<h2 className="ui-lib-soft-drawer__title" id={headingId}>
							{title}
						</h2>
						{note && <p className="ui-lib-soft-drawer__note">{note}</p>}
					</div>
					<button
						type="button"
						className="ui-lib-soft-drawer__close"
						aria-label="关闭"
						onClick={onClose}
					>
						<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
							<path
								d="M2 2 L10 10 M10 2 L2 10"
								stroke="currentColor"
								strokeWidth="1.7"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</header>
				<div className="ui-lib-soft-drawer__body">{children}</div>
				{footer && <footer className="ui-lib-soft-drawer__foot">{footer}</footer>}
			</div>
		</dialog>
	);
});

/* ----------------------------------------------------------------- divider -- */

export interface SoftDividerProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Draw a label in the middle of the rule. */
	label?: string;
	/** Stack the label above the rule instead of breaking it. */
	orientation?: "horizontal" | "vertical";
}

/**
 * A rule between things, that fades at both ends.
 *
 * A hairline that runs edge to edge is a box; a line that fades out is a
 * separation, and the fade is what lets it sit inside a rounded card without
 * touching the corners.
 *
 * It is a `<div>` with `role="separator"` rather than an `<hr>`, and that is a
 * real difference: `<hr>` is a paragraph-level thematic break, which is a
 * document concept, while a separator between two panels of a widget is a
 * layout concept. When it carries a label it is a named separator and needs
 * `aria-orientation`; when it does not, it is decoration and is hidden.
 *
 * ```tsx
 * <SoftDivider />
 * <SoftDivider label="或" />
 * ```
 */
export const SoftDivider = forwardRef<HTMLDivElement, SoftDividerProps>(function SoftDivider(
	{ label, orientation = "horizontal", className, ...props },
	ref,
) {
	return (
		<div
			{...props}
			ref={ref}
			/*
			 * Two cases, and they are genuinely different rather than a
			 * labelled-vs-unlabelled preference.
			 *
			 * With a label, this is a real separator: it divides the content into
			 * two parts that are meant to be told apart, and the label is the
			 * reason it exists. It is announced, and it needs an orientation.
			 *
			 * Without one, it is a visual break and nothing else. The first
			 * version put `role="separator"` on both and hid the unlabelled one
			 * with `aria-hidden` — which is self-contradictory: a hidden element
			 * does not need a role, and a role on a hidden element suggests the
			 * hiding is an optimisation rather than the point. A row of things
			 * announcing "separator" between every pair is noise.
			 *
			 * (On `<hr>`: biome suggests it, and it is the document-level
			 * themed break. A separator between two parts of one widget is a
			 * layout concept, which is what `role="separator"` is for.)
			 */
			{...(label
				? { role: "separator", "aria-orientation": orientation, "aria-label": label }
				: { "aria-hidden": true })}
			className={className ? `ui-lib-soft-divider ${className}` : "ui-lib-soft-divider"}
			data-ui-lib-orientation={orientation}
			data-ui-lib-labelled={label ? "" : undefined}
		>
			{label && <span className="ui-lib-soft-divider__label">{label}</span>}
		</div>
	);
});
