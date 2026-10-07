import {
	cloneElement,
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { anchorNameFrom, usePopover } from "./overlay.js";
import { useStyles } from "./useStyles.js";

/* ------------------------------------------------------------------ tooltip -- */

export interface SoftTooltipProps {
	/** The text. Keep it to a phrase — this is not a place for paragraphs. */
	content: React.ReactNode;
	/** The trigger. It must be focusable, or the tooltip is unreachable by keyboard. */
	children: React.ReactElement<{
		ref?: React.Ref<HTMLElement>;
		"aria-describedby"?: string;
		onPointerEnter?: (event: React.PointerEvent<HTMLElement>) => void;
		onPointerLeave?: (event: React.PointerEvent<HTMLElement>) => void;
		onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
		onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
		onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
	}>;
	/** Which side. Falls back to the opposite when there is no room. */
	side?: "top" | "bottom";
	/** Milliseconds before it appears. Touch and keyboard show it immediately. */
	delay?: number;
}

/**
 * A hint that appears when the pointer rests and when the element is focused.
 *
 * **It is reachable by keyboard, which is the requirement most tooltips miss.**
 * WCAG's "Content on Hover or Focus" asks for three things and the platform gives
 * none of them: the content must be dismissible without moving the pointer
 * (Escape), it must stay while the pointer is over it (so the reader can finish),
 * and it must persist until the pointer leaves or it is dismissed.
 *
 * Dismissible and persistent are handled here. The middle one is why the tooltip
 * itself must be `pointer-events: auto` — a hint the reader cannot hover is a
 * hint that vanishes the moment they try to read it, and the flicker that causes
 * is worse than no tooltip.
 *
 * The delay is real and it is there for a reason: instant tooltips fire on every
 * pass of the pointer across a toolbar and turn the interface into a strobe.
 * Focus and touch bypass it, because there is no "passing over" in either case.
 *
 * The description is wired with `aria-describedby` rather than left to the
 * visual. A tooltip that a screen reader never hears is a tooltip that does not
 * exist, and the trigger would otherwise be announced with no hint that more
 * information is attached to it.
 *
 * ```tsx
 * <SoftTooltip content="这会丢掉未保存的改动">
 *   <SoftPaperButton>关闭</SoftPaperButton>
 * </SoftTooltip>
 * ```
 */
export const SoftTooltip = forwardRef<HTMLDivElement, SoftTooltipProps>(function SoftTooltip(
	{ content, children, side = "top", delay = 420 },
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const [open, setOpen] = useState(false);
	const generated = useId();
	const tipId = `${generated}-tip`;
	const anchor = anchorNameFrom(generated, "ui-anchor-tip");
	const { ref: popover } = usePopover<HTMLDivElement>(open);

	/** The trigger element, for the anchor. Set by the cloned child's ref. */
	const triggerNode = useRef<HTMLElement | null>(null);

	/*
	 * The child may already carry a ref of its own, and overwriting it would
	 * silently break whatever the caller was using it for — a focus call, a
	 * measurement, an imperative handle. React 19 passes `ref` as an ordinary
	 * prop on function components, which is why it is read from props rather
	 * than from a separate argument.
	 */
	const mergedRef = useCallback(
		(node: HTMLElement | null) => {
			triggerNode.current = node;
			const existing = (children as { ref?: React.Ref<HTMLElement> }).ref;
			if (typeof existing === "function") existing(node);
			else if (existing) {
				(existing as React.MutableRefObject<HTMLElement | null>).current = node;
			}
		},
		[children],
	);

	const timer = useRef(0);

	/** True while the pointer is on the tooltip itself, so leaving the trigger
	 *  does not close it. */
	const overTip = useRef(false);

	const show = useCallback(
		(immediate: boolean) => {
			window.clearTimeout(timer.current);
			if (immediate) setOpen(true);
			else timer.current = window.setTimeout(() => setOpen(true), delay);
		},
		[delay],
	);

	const hide = useCallback((immediate = false) => {
		window.clearTimeout(timer.current);
		// A pointer travelling from the trigger to the tooltip leaves the
		// trigger first. Closing on that would make the tooltip impossible to
		// reach, so the close is deferred by a frame and cancelled if the
		// pointer lands on the tooltip.
		if (immediate) setOpen(false);
		else
			timer.current = window.setTimeout(() => {
				if (!overTip.current) setOpen(false);
			}, 60);
	}, []);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	/*
	 * The child is cloned rather than wrapped, because the tooltip has to attach
	 * to the element the user actually focuses.
	 *
	 * An earlier version wrapped the child in a `<span>` and pointed the tooltip
	 * at that. It looks equivalent and is not: the wrapper is not focusable, so
	 * tabbing lands on the inner control and the tooltip never appears — the
	 * hint exists for keyboard users and only works for the mouse. Cloning
	 * attaches `aria-describedby` and the key handler to the real focusable
	 * element, and the anchor name goes on it too so the tooltip positions
	 * against what was actually hovered.
	 */
	const described = [children.props["aria-describedby"], tipId].filter(Boolean).join(" ");

	const trigger = cloneElement(children, {
		ref: mergedRef,
		"aria-describedby": described,
		style: {
			...(children.props as { style?: React.CSSProperties }).style,
			anchorName: anchor,
		} as React.CSSProperties,
		onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
			children.props.onPointerEnter?.(event);
			// Touch fires pointerenter too, and on touch there is no hover to wait
			// out, so the delay is skipped.
			show(event.pointerType !== "mouse");
		},
		onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
			children.props.onPointerLeave?.(event);
			hide();
		},
		onFocus: (event: React.FocusEvent<HTMLElement>) => {
			children.props.onFocus?.(event);
			// Focus has no "passing over" either: a keyboard user who tabbed here
			// asked for the tooltip by arriving.
			show(true);
		},
		onBlur: (event: React.FocusEvent<HTMLElement>) => {
			children.props.onBlur?.(event);
			hide(true);
		},
		/*
		 * Escape, which is the part of the WCAG requirement the platform does not
		 * provide. "Dismissible without moving the pointer" — a keyboard user has
		 * no pointer to move, so Escape is the only way to get rid of a hint that
		 * is covering something they are trying to read.
		 */
		onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
			children.props.onKeyDown?.(event);
			if (event.key === "Escape" && open) {
				event.stopPropagation();
				hide(true);
			}
		},
	} as Partial<typeof children.props>);

	return (
		<>
			{trigger}
			{/*
			 * `popover="manual"`: the tooltip must not close on an outside click,
			 * because an outside click is the user interacting with the rest of
			 * the page and the hint has already done its job. `auto` would also
			 * close it on a click of the trigger itself, which is exactly when a
			 * tooltip should stay.
			 */}
			<div
				ref={(node) => {
					popover.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				popover="manual"
				id={tipId}
				role="tooltip"
				data-ui-lib-side={side}
				className="ui-lib-soft-tooltip"
				style={{ positionAnchor: anchor } as React.CSSProperties}
				onPointerEnter={() => {
					overTip.current = true;
					window.clearTimeout(timer.current);
				}}
				onPointerLeave={() => {
					overTip.current = false;
					hide(true);
				}}
			>
				{content}
			</div>
		</>
	);
});

/* -------------------------------------------------------------------- toast -- */

export interface SoftToastData {
	id: string;
	title: string;
	/** A line under the title. */
	body?: string;
	/** `info` is neutral, `success` and `warn` carry a mark as well as a colour. */
	tone?: "info" | "success" | "warn";
	/** Milliseconds before it leaves. `0` keeps it until dismissed. */
	duration?: number;
}

export interface SoftToastProps extends SoftToastData {
	onDismiss: (id: string) => void;
}

/**
 * A notice that arrives on its own and leaves on its own.
 *
 * The opposite of a tooltip in every respect, which is why both exist rather
 * than one overlay with a mode: a tooltip has a trigger, waits to be asked,
 * never takes focus and never moves; a toast has no trigger, arrives uninvited,
 * and has to be able to be dismissed by someone who was not expecting it.
 *
 * `role="status"` with `aria-live="polite"`, not `role="alert"`. `alert` is
 * assertive: it interrupts whatever the screen reader is currently saying. A
 * confirmation that something saved does not warrant interrupting a sentence
 * someone is in the middle of reading — that is what the `alert` role is for,
 * and it is reserved for things that do.
 *
 * The timeout is paused while the pointer is over it and while it has focus,
 * because a notice that disappears as it is being read is a notice that was
 * never delivered.
 *
 * ```tsx
 * {toasts.map((t) => (
 *   <SoftToast key={t.id} {...t} onDismiss={dismiss} />
 * ))}
 * ```
 */
export const SoftToast = forwardRef<HTMLDivElement, SoftToastProps>(function SoftToast(
	{ id, title, body, tone = "info", duration = 4200, onDismiss },
	ref,
) {
	const [held, setHeld] = useState(false);

	useEffect(() => {
		if (duration <= 0) return;
		if (held) return;
		const timer = window.setTimeout(() => onDismiss(id), duration);
		return () => window.clearTimeout(timer);
	}, [duration, held, id, onDismiss]);

	return (
		<div
			ref={ref}
			role="status"
			aria-live="polite"
			data-ui-lib-tone={tone}
			className="ui-lib-soft-toast"
			onPointerEnter={() => setHeld(true)}
			onPointerLeave={() => setHeld(false)}
			onFocusCapture={() => setHeld(true)}
			onBlurCapture={() => setHeld(false)}
		>
			{/* A shape as well as a colour, so the tone survives greyscale and a
			    reader who does not distinguish the two hues. */}
			<span className="ui-lib-soft-toast__mark" aria-hidden="true" />
			<div className="ui-lib-soft-toast__text">
				<p className="ui-lib-soft-toast__title">{title}</p>
				{body && <p className="ui-lib-soft-toast__body">{body}</p>}
			</div>
			<button
				type="button"
				className="ui-lib-soft-toast__close"
				aria-label="关闭通知"
				onClick={() => onDismiss(id)}
			>
				×
			</button>
		</div>
	);
});
