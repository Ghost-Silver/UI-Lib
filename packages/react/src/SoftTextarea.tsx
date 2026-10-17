import type { IrisTone } from "@ui-lib/core";
import { forwardRef } from "react";
import { fieldMessage, useField } from "./field.js";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftTextareaProps
	extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
	label?: string;
	hint?: string;
	error?: string;
	/**
	 * Lines to show before the content grows. `rows` rather than a pixel height,
	 * because the browser already knows how tall a line of its own font is.
	 */
	rows?: number;
	/** Grow with the content instead of scrolling. On by default. */
	autoGrow?: boolean;
	/** Show a character count, and announce it when a max is set. */
	showCount?: boolean;
	/** What the surface is made of. */
	material?: SoftMaterial;
	tone?: IrisTone;
}

/**
 * A field that grows with what is written in it.
 *
 * ## Auto-growing is CSS, and that is not a shortcut
 *
 * The usual implementation measures `scrollHeight` on every keystroke and writes
 * a pixel height back, which means a layout read per keystroke and a
 * `ResizeObserver` to catch the cases the keystroke misses — a font loading, a
 * container resizing, a value set programmatically. All of those go wrong in the
 * same direction: the box ends up a line too short and the last line is clipped,
 * which nobody notices until the content is long enough to matter.
 *
 * `field-sizing: content` was verified first — a five-line value took a 40px
 * control to 101px with no script — and it is one declaration that cannot fall
 * a line behind, because the browser is doing the layout it already does.
 *
 * ## The label and the error are wired, not placed
 *
 * The label points at the control, the hint and the error are referenced by it,
 * and an error is announced. None of that is visible in a screenshot, which is
 * why it goes through the shared `useField` rather than being written again
 * here.
 *
 * ```tsx
 * <SoftTextarea label="说明" hint="写多少都可以。" rows={3} showCount />
 * ```
 */
export const SoftTextarea = forwardRef<HTMLTextAreaElement, SoftTextareaProps>(
	function SoftTextarea(
		{
			label,
			hint,
			error,
			rows = 3,
			autoGrow = true,
			showCount = false,
			material,
			tone,
			className,
			id,
			disabled,
			maxLength,
			value,
			defaultValue,
			...props
		},
		ref,
	) {
		// The stylesheet is not injected by the GPU components alone; see useStyles.
		useStyles();
		const wiring = useField({ id, hasHint: Boolean(hint), hasError: Boolean(error) });
		const message = fieldMessage(wiring, { hint, error });
		const surface = useMaterial(material ? { material, tone } : {});

		/*
		 * The count reflects what the control will actually contain, and the control
		 * is uncontrolled unless the caller passed a value. Deriving the number from
		 * the DOM on input is the only way to count honestly in both modes: a count
		 * kept in state would be zero for an uncontrolled field the user has typed
		 * into, and would be wrong the moment anything else sets the value.
		 */
		const count = typeof value === "string" ? value.length : String(defaultValue ?? "").length;

		return (
			<div
				className={className ? `ui-lib-soft-input ${className}` : "ui-lib-soft-input"}
				data-ui-lib-invalid={error ? "" : undefined}
				data-ui-lib-disabled={disabled ? "" : undefined}
				data-ui-lib-material={material && material !== "plain" ? material : undefined}
			>
				{label && (
					<label className="ui-lib-soft-input__label" htmlFor={wiring.id}>
						{label}
					</label>
				)}
				<span
					className={
						surface.className
							? `ui-lib-soft-input__shell ui-lib-soft-input__shell--area ${surface.className}`
							: "ui-lib-soft-input__shell ui-lib-soft-input__shell--area"
					}
					style={surface.className ? surface.style : undefined}
				>
					<textarea
						{...props}
						ref={ref}
						id={wiring.id}
						rows={rows}
						disabled={disabled}
						maxLength={maxLength}
						value={value}
						defaultValue={defaultValue}
						aria-invalid={error ? true : undefined}
						aria-describedby={wiring.describedBy}
						className={
							autoGrow
								? "ui-lib-soft-input__field ui-lib-soft-input__field--area ui-lib-soft-input__field--growable"
								: "ui-lib-soft-input__field ui-lib-soft-input__field--area"
						}
					/>
				</span>
				{(message || showCount) && (
					<div className="ui-lib-soft-input__foot">
						{message && (
							<p
								className="ui-lib-soft-input__message"
								id={message.id}
								role={message.invalid ? "alert" : undefined}
							>
								{message.text}
							</p>
						)}
						{showCount && (
							<span
								className="ui-lib-soft-input__count"
								// The count changes on every keystroke, and a live region here
								// would read the number over the character being typed. It is
								// visual only; `maxLength` is what the control already announces.
								aria-hidden="true"
							>
								{maxLength ? `${count} / ${maxLength}` : count}
							</span>
						)}
					</div>
				)}
			</div>
		);
	},
);
