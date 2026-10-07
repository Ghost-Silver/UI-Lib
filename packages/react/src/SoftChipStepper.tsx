import type { IrisTone } from "@ui-lib/core";
import { forwardRef } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

/* ------------------------------------------------------------------ chip -- */

export interface SoftChipProps
	extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	/** The text. */
	children?: React.ReactNode;
	/** A leading mark, usually a swatch or an icon. */
	leading?: React.ReactNode;
	/**
	 * The pressed state, for a chip that filters. Omit for one that only acts.
	 *
	 * This is the difference from `SoftTag`, which is a label being *displayed*.
	 * A chip is a control being *operated*: it is a button, it takes focus, and
	 * when it filters something it reports `aria-pressed`. A tag with a click
	 * handler is a chip that has not been named one.
	 */
	selected?: boolean;
	/** Adds a remove affordance beside the label. */
	onRemove?: () => void;
	/** The name of that affordance. Defaults to a plain "移除". */
	removeLabel?: string;
	/** `solid` fills it when selected; `outline` marks it. */
	variant?: "solid" | "outline";
	/** Surface material: plain paper, wash ground, or light tint. */
	material?: SoftMaterial;
	/** Pigment family for the material ground. */
	tone?: IrisTone;
}

/**
 * A small control for filtering, choosing or dismissing.
 *
 * **It is a button, not a decorated span**, and that is the whole difference from
 * `SoftTag` next to which it will usually sit. A tag is a label on the page; a
 * chip is something the user presses. Pressing it has to be reachable by Tab and
 * by Enter and Space, and a filter chip has to report whether it is on —
 * `aria-pressed`, which a span with an `onClick` cannot say.
 *
 * ```
 * selected === undefined   →  a command: "清除筛选"
 * selected === false|true  →  a toggle: reports aria-pressed
 * onRemove                 →  a second control, nested
 * ```
 *
 * A chip with a remove affordance is **two controls in one row** and they are two
 * buttons, not one button with two handlers. Making the whole chip removable and
 * also pressable means the reader cannot tell which of the two things pressing it
 * will do.
 *
 * ```tsx
 * <SoftChip selected={on} onClick={toggle}>水彩</SoftChip>
 * <SoftChip leading={<Swatch />} onRemove={() => drop(id)}>群青</SoftChip>
 * ```
 */
export const SoftChip = forwardRef<HTMLButtonElement, SoftChipProps>(function SoftChip(
	{
		children,
		leading,
		selected,
		onRemove,
		removeLabel = "移除",
		variant = "solid",
		className,
		material,
		tone,
		style,
		...props
	},
	ref,
) {
	// The stylesheet is not injected by the GPU components alone; see useStyles.
	useStyles();
	const surface = useMaterial(material ? { material, tone } : {});
	const toggle = selected !== undefined;
	return (
		<span
			className="ui-lib-soft-chip-wrap"
			data-ui-lib-variant={variant}
			data-ui-lib-disabled={props.disabled ? "" : undefined}
		>
			<button
				{...props}
				ref={ref}
				type="button"
				// Only when the caller declared a state. A command chip that reported
				// itself as an unpressed toggle would be announced as a switch that
				// does nothing when toggled.
				aria-pressed={toggle ? selected : undefined}
				data-ui-lib-selected={selected ? "" : undefined}
				data-ui-lib-removable={onRemove ? "" : undefined}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
				data-ui-lib-tone={tone}
				className={[
					className ? `ui-lib-soft-chip ${className}` : "ui-lib-soft-chip",
					surface.className,
				]
					.filter(Boolean)
					.join(" ")}
				style={{ ...style, ...surface.style }}
			>
				{leading && (
					<span className="ui-lib-soft-chip__leading" aria-hidden="true">
						{leading}
					</span>
				)}
				<span className="ui-lib-soft-chip__label">{children}</span>
			</button>
			{onRemove && (
				<button
					type="button"
					className="ui-lib-soft-chip__remove"
					disabled={props.disabled}
					aria-label={typeof children === "string" ? `${removeLabel} ${children}` : removeLabel}
					onClick={props.disabled ? undefined : onRemove}
				>
					<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
						<path
							d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
							stroke="currentColor"
							strokeWidth="1.7"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			)}
		</span>
	);
});

/* --------------------------------------------------------------- stepper -- */

export interface SoftStep {
	id: string;
	/** The step's name. */
	label: string;
	/** A line under it, for a description or a status. */
	note?: string;
	/** The step is not reachable yet. */
	disabled?: boolean;
}

export interface SoftStepperProps
	// The native onChange is a change *event* on an element; this component's is a
	// step being chosen, which is a different contract. Leaving both would make the
	// prop impossible to type and the caller's handler silently unusable.
	extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
	steps: readonly SoftStep[];
	/** Which step is current, by id. */
	current: string;
	/** Called when a step is chosen. Omit for a read-only indicator. */
	onChange?: (id: string) => void;
	/** `horizontal` is the row; `vertical` stacks them with the line down the side. */
	orientation?: "horizontal" | "vertical";
	/** Names the whole thing. Required, for the same reason the list's is. */
	label: string;
}

/**
 * Where a multi-step process has got to.
 *
 * ## It is not a progress bar
 *
 * `SoftProgress` measures a continuous quantity — how much of a download is
 * done — and reports one number. A stepper is **discrete and named**: each step
 * is a thing you can refer to, the ordering matters, and a reader needs to know
 * which one they are on and what the others are called. A bar cannot say any of
 * that, and a stepper cannot express "62 per cent".
 *
 * ## The current step is not a control
 *
 * The same rule as pagination's current page and the breadcrumb's last crumb: it
 * is marked with `aria-current="step"` and it is not pressable. Pressing it would
 * navigate to where the reader already is.
 *
 * The steps are an **ordered list**, because a process is a sequence — the third
 * step only makes sense after the second, and `<ol>` is what keeps that when it is
 * spoken. The connector between them is `aria-hidden`: the order is already in the
 * markup, and "line" read aloud between every pair is noise.
 *
 * ```tsx
 * <SoftStepper label="发布" current={step} onChange={setStep} steps={[
 *   { id: "draft", label: "草稿" },
 *   { id: "review", label: "送审" },
 * ]} />
 * ```
 */
export const SoftStepper = forwardRef<HTMLElement, SoftStepperProps>(function SoftStepper(
	{ steps, current, onChange, orientation = "horizontal", label, className, ...props },
	ref,
) {
	return (
		<nav
			{...props}
			ref={ref}
			aria-label={label}
			className={className ? `ui-lib-soft-stepper ${className}` : "ui-lib-soft-stepper"}
			data-ui-lib-orientation={orientation}
		>
			<ol className="ui-lib-soft-stepper__list">
				{steps.map((step, index) => {
					const isCurrent = step.id === current;
					const interactive = Boolean(onChange) && !step.disabled && !isCurrent;
					const marker = (
						<>
							<span className="ui-lib-soft-stepper__mark" aria-hidden="true">
								{index + 1}
							</span>
							<span className="ui-lib-soft-stepper__text">
								<span className="ui-lib-soft-stepper__label">{step.label}</span>
								{step.note && <span className="ui-lib-soft-stepper__note">{step.note}</span>}
							</span>
						</>
					);
					return (
						<li
							key={step.id}
							className="ui-lib-soft-stepper__item"
							data-ui-lib-current={isCurrent ? "" : undefined}
							data-ui-lib-disabled={step.disabled ? "" : undefined}
							// The connector belongs to the step after it, so the list's length
							// is the number of steps — not the number of steps and their
							// separators.
							data-ui-lib-first={index === 0 ? "" : undefined}
						>
							{interactive ? (
								<button
									type="button"
									className="ui-lib-soft-stepper__control"
									/*
									 * No `aria-current` here, and not as an omission: a step that can
									 * be pressed is by definition not the current one, because
									 * `interactive` excludes it. Carrying the attribute on both
									 * branches would be a second expression of a condition that can
									 * only be true for one of them.
									 */
									onClick={() => onChange?.(step.id)}
								>
									{marker}
									<span className="ui-lib-visually-hidden">
										第 {index + 1} 步，共 {steps.length} 步
									</span>
								</button>
							) : (
								<span
									className="ui-lib-soft-stepper__control"
									// Only the one the reader is on. Marking every step would say
									// they are in several places at once.
									aria-current={isCurrent ? "step" : undefined}
								>
									{marker}
									<span className="ui-lib-visually-hidden">
										第 {index + 1} 步，共 {steps.length} 步
									</span>
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
});
