import { forwardRef, useId } from "react";
import { useStyles } from "./useStyles.js";

export interface SoftSegmentOption {
	value: string;
	label: string;
	/** A short explanation, shown under the label in the wide layout. */
	note?: string;
	disabled?: boolean;
}

export interface SoftSegmentedControlProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
	options: readonly SoftSegmentOption[];
	value: string;
	onChange: (value: string) => void;
	/** A visible label. Wired to the group, not merely placed near it. */
	label?: string;
	/** The id of an element that labels the group, if there is no `label`. */
	ariaLabelledBy?: string;
	/** `solid` fills the selected segment; `outline` only marks it. */
	variant?: "solid" | "outline";
}

/**
 * A row of mutually exclusive choices, all of them visible.
 *
 * ## It is not a tab list, and the difference is not cosmetic
 *
 * A tab list *switches a view*: the panels are alternatives and only one is ever
 * relevant, the selected one is `aria-selected`, and a reader announces
 * "tab 3 of 5". A segmented control *chooses a value*: the options are all part
 * of one question, the chosen one is `aria-checked`, and the reader announces
 * "radio 3 of 5, selected". Write it as tabs and a form's default value is
 * announced as navigation, which is the wrong model for the thing being
 * operated — and it is exactly the mistake the accordion was written to avoid
 * from the other direction.
 *
 * The roles are `radiogroup` and `radio`, and the grouping is real: one tab
 * stop for the whole set, arrow keys move the selection, `aria-checked` marks
 * the choice.
 *
 * ## Why the arrow keys move the *selection* and not just the focus
 *
 * That is what a radio group does, and it is the difference between this and a
 * listbox. In a listbox the arrows move a highlight and Enter commits; here the
 * arrow *is* the choice, because there is nothing to review — every option is on
 * screen and the consequence is one value changing. Anything else would mean two
 * keystrokes for a decision that has one.
 *
 * ```tsx
 * <SoftSegmentedControl
 *   label="密度"
 *   value={density}
 *   onChange={setDensity}
 *   options={[
 *     { value: "compact", label: "紧凑" },
 *     { value: "cosy", label: "舒适" },
 *   ]}
 * />
 * ```
 */
export const SoftSegmentedControl = forwardRef<HTMLDivElement, SoftSegmentedControlProps>(
	function SoftSegmentedControl(
		{ options, value, onChange, label, ariaLabelledBy, variant = "solid", className, ...props },
		ref,
	) {
		// The stylesheet is not injected by the GPU components alone; see useStyles.
		useStyles();
		const generated = useId();
		const labelId = `${generated}-label`;

		return (
			<div
				{...props}
				ref={ref}
				className={className ? `ui-lib-soft-segments ${className}` : "ui-lib-soft-segments"}
				data-ui-lib-variant={variant}
			>
				{label && (
					<span className="ui-lib-soft-segments__label" id={labelId}>
						{label}
					</span>
				)}
				<div
					role="radiogroup"
					aria-labelledby={label ? labelId : ariaLabelledBy}
					className="ui-lib-soft-segments__track"
				>
					{options.map((option) => {
						const checked = option.value === value;
						return (
							<label
								key={option.value}
								className="ui-lib-soft-segments__segment"
								data-ui-lib-checked={checked ? "" : undefined}
								data-ui-lib-disabled={option.disabled ? "" : undefined}
							>
								{/*
								 * A real radio, and biome was right to insist on it.
								 *
								 * The first version was a button with role="radio" and the
								 * arrow keys and the tab stop written by hand — every part
								 * of which the platform already implements for a radio
								 * group: one tab stop, arrows that move the selection,
								 * aria-checked kept in step, and a value a form submits.
								 * There is no hand-written version as complete as the one
								 * that is free.
								 *
								 * The name is what makes the group a group. Without it the
								 * browser treats three radios as three unrelated controls
								 * and every one of them becomes a tab stop.
								 */}
								<input
									type="radio"
									name={generated}
									value={option.value}
									checked={checked}
									disabled={option.disabled}
									className="ui-lib-soft-segments__input"
									onChange={() => onChange(option.value)}
								/>
								<span className="ui-lib-soft-segments__text">{option.label}</span>
								{option.note && (
									<span className="ui-lib-soft-segments__note">{option.note}</span>
								)}
							</label>
						);
					})}
				</div>
			</div>
		);
	},
);
