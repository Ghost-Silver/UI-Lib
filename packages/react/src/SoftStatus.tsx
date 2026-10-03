import { forwardRef, useId } from "react";

export interface SoftAlertProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * `info` and `success` are statements; `warn` and `danger` are problems. The
	 * difference is carried by a shape and a word as well as by a colour, so it
	 * survives greyscale and a reader who does not separate the hues.
	 */
	tone?: "info" | "success" | "warn" | "danger";
	/** A heading. Optional; without one the alert is a single line. */
	title?: string;
	/** Replaces the mark with a dismiss control. */
	onDismiss?: () => void;
	/** The label for that control. Defaults to a plain "关闭". */
	dismissLabel?: string;
	/**
	 * Whether this alert was already on the page when it loaded, or arrived
	 * afterwards in response to something.
	 *
	 * **This is the whole reason the component has a `role` decision to make**,
	 * and it is not the same decision a toast makes. An alert that is part of the
	 * initial page is content: the reader reaches it in the normal way and
	 * interrupting them to announce it would be wrong. An alert that appears
	 * after a submit *is* the outcome of an action, and if it is not announced
	 * the user is left looking at a form that did nothing.
	 *
	 * `static` (the default) declares nothing, so the element is read when the
	 * reader gets to it. `polite` announces without interrupting. `assertive`
	 * interrupts — reserved for the cases where the user will otherwise do
	 * something destructive, which is a small set.
	 */
	urgency?: "static" | "polite" | "assertive";
}

/**
 * A message about the state of something.
 *
 * The mark differs by tone and that matters more than the colour: a circle with
 * a stroke, a circle with a tick, a triangle, an octagon. Colour alone is not a
 * message, and a warning that only differs from an error by its hue is a warning
 * that half the readers cannot distinguish.
 *
 * The live-region decision is exposed rather than guessed, because the component
 * cannot know whether it was on the page at load — and the two cases want
 * opposite things. See `urgency`.
 *
 * ```tsx
 * <SoftAlert tone="success" title="已经保存了">这一笔留住了。</SoftAlert>
 * <SoftAlert tone="danger" urgency="assertive" title="没有连上">正在重试。</SoftAlert>
 * ```
 */
export const SoftAlert = forwardRef<HTMLDivElement, SoftAlertProps>(function SoftAlert(
	{
		tone = "info",
		title,
		onDismiss,
		dismissLabel = "关闭",
		urgency = "static",
		className,
		children,
		...props
	},
	ref,
) {
	const generated = useId();
	const titleId = title ? `${generated}-title` : undefined;

	/*
	 * The live region, and only when there is one to declare.
	 *
	 * A live region with no role is content the reader reaches in the normal way,
	 * and it needs no label — the title is already the first thing in it, read in
	 * order. Declaring one is a statement that the element *arrives*, and inside
	 * a live region the label is what makes the announcement carry the heading
	 * instead of only the body.
	 *
	 * The first version put `aria-labelledby` on the element unconditionally,
	 * which is an ARIA attribute a plain div does not support: with no role there
	 * is nothing to name, and the attribute is ignored. Biome reported it, which
	 * is the kind of thing a reader would never have been able to tell me.
	 */
	const liveProps =
		urgency === "static"
			? {}
			: urgency === "assertive"
				? { role: "alert", "aria-live": "assertive" as const, "aria-labelledby": titleId }
				: { role: "status", "aria-live": "polite" as const, "aria-labelledby": titleId };

	return (
		<div
			{...props}
			{...liveProps}
			ref={ref}
			className={className ? `ui-lib-soft-alert ${className}` : "ui-lib-soft-alert"}
			data-ui-lib-tone={tone}
		>
			<span className="ui-lib-soft-alert__mark" aria-hidden="true">
				<AlertGlyph tone={tone} />
			</span>
			<div className="ui-lib-soft-alert__body">
				{title && (
					<p className="ui-lib-soft-alert__title" id={titleId}>
						{title}
					</p>
				)}
				{children && <div className="ui-lib-soft-alert__text">{children}</div>}
			</div>
			{onDismiss && (
				<button
					type="button"
					className="ui-lib-soft-alert__dismiss"
					aria-label={dismissLabel}
					onClick={onDismiss}
				>
					<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
						<path
							d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
							stroke="currentColor"
							strokeWidth="1.6"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			)}
		</div>
	);
});

/**
 * The mark, drawn per tone.
 *
 * Four shapes rather than four colours of one shape. The glyph is the part of an
 * alert that survives a greyscale print, a colour-blind reader and a photograph
 * of a screen, and redrawing it per tone is the only way it carries information.
 */
function AlertGlyph({ tone }: { tone: NonNullable<SoftAlertProps["tone"]> }) {
	const common = {
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.8,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
	};
	return (
		<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
			{tone === "success" ? (
				<>
					<circle cx="8" cy="8" r="6.4" {...common} />
					<path d="M5.2 8.3 L7.2 10.3 L10.9 6" {...common} />
				</>
			) : tone === "warn" ? (
				<>
					<path d="M8 2.2 L14.4 13.2 L1.6 13.2 Z" {...common} />
					<path d="M8 6.2 L8 9.4" {...common} />
					<circle cx="8" cy="11.4" r="0.5" fill="currentColor" stroke="none" />
				</>
			) : tone === "danger" ? (
				<>
					<path
						d="M5.4 1.9 L10.6 1.9 L14.1 5.4 L14.1 10.6 L10.6 14.1 L5.4 14.1 L1.9 10.6 L1.9 5.4 Z"
						{...common}
					/>
					<path d="M8 5 L8 9" {...common} />
					<circle cx="8" cy="11.4" r="0.5" fill="currentColor" stroke="none" />
				</>
			) : (
				<>
					<circle cx="8" cy="8" r="6.4" {...common} />
					<path d="M8 7.2 L8 11.2" {...common} />
					<circle cx="8" cy="4.9" r="0.5" fill="currentColor" stroke="none" />
				</>
			)}
		</svg>
	);
}

/* -------------------------------------------------------------- empty state -- */

export interface SoftEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	/** The headline. Says what is not here. */
	title: string;
	/** A line under it. Says what would put something here, if anything would. */
	body?: string;
	/** An illustration or icon. Decorative unless it carries meaning. */
	art?: React.ReactNode;
	/** The way out — the one action that resolves the emptiness. */
	action?: React.ReactNode;
	/** `sm` is for a panel, `md` for a page. */
	size?: "sm" | "md";
}

/**
 * What is shown where content would be.
 *
 * **It is announced, and that is the decision worth naming.** An empty state is
 * not decoration standing in for content the user has not loaded yet — it is the
 * *result* of something, and usually of something the user did. A filtered list
 * that matches nothing produces this element, and if it is not announced the
 * reader gets a list that is silently empty and no explanation why.
 *
 * So it is a `role="status"`, which is polite: it says what happened without
 * interrupting whatever is being read. It is not `role="alert"`, because nothing
 * is wrong — an empty search result is information, not a fault.
 *
 * **The title is a paragraph, not a heading**, which is the opposite of what a
 * page-level empty state often does. A heading here would be a second claim on
 * the document outline for a state that is already announced by its role, and a
 * filtered list that matches nothing does not want to add a section to the page
 * — it wants to say what happened and get out of the way. The heading belongs to
 * whatever contains this, which is where the caller is already writing one.
 *
 * ```tsx
 * <SoftEmptyState
 *   title="还没有画过"
 *   body="第一笔会出现在这里。"
 *   action={<SoftPaperButton>开始</SoftPaperButton>}
 * />
 * ```
 */
export const SoftEmptyState = forwardRef<HTMLDivElement, SoftEmptyStateProps>(
	function SoftEmptyState(
		{ title, body, art, action, size = "md", className, children, ...props },
		ref,
	) {
		return (
			<div
				{...props}
				ref={ref}
				role="status"
				data-ui-lib-size={size}
				className={className ? `ui-lib-soft-empty ${className}` : "ui-lib-soft-empty"}
			>
				{art && (
					<div className="ui-lib-soft-empty__art" aria-hidden="true">
						{art}
					</div>
				)}
				<p className="ui-lib-soft-empty__title">{title}</p>
				{body && <p className="ui-lib-soft-empty__body">{body}</p>}
				{children}
				{action && <div className="ui-lib-soft-empty__action">{action}</div>}
			</div>
		);
	},
);
