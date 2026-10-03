import { forwardRef, useId, useRef } from "react";

/** Shared by both controls; the difference is the mark and the corner radius. */
interface SoftChoiceBase
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	label?: React.ReactNode;
	/** A line under the label. Also matched by nothing — it is not a hint for search. */
	note?: string;
}

export interface SoftCheckboxProps extends SoftChoiceBase {
	/**
	 * Draw a dash instead of a tick, for "some but not all". Set the DOM
	 * `indeterminate` from this rather than from a class, because the property is
	 * what assistive technology reads.
	 */
	indeterminate?: boolean;
}

export interface SoftRadioProps extends SoftChoiceBase {}

/**
 * A checkbox that fills with pigment.
 *
 * The mark is drawn rather than set as a character: a `✓` glyph's weight and
 * angle come from the font, so it cannot be made to match the border beside it,
 * and it changes when the font does. Two strokes of a path can.
 *
 * The animation is a **draw**, not a fade. The tick appears along its own length
 * — `stroke-dasharray` against `stroke-dashoffset` — which is what "a short,
 * clean trajectory" means and what makes it read as a pen rather than as a
 * layer being switched on.
 *
 * The box is a recess, the same inset shadow the input and the switch track use,
 * because all three are the same thing: a place on the paper that something
 * goes into. When it is filled, the fill is the pigment colour and the inset
 * stays, so it reads as paint that settled in the groove.
 *
 * The native `<input type="checkbox">` is the control. It is visually hidden and
 * receives the focus, the click, the keyboard, the form submission and the
 * accessible name; everything drawn is `aria-hidden`. This is the only way a
 * custom check box gets `Space`, `Shift+click` ranges and form participation
 * right without reimplementing them.
 *
 * ```tsx
 * <SoftCheckbox label="记住这一笔" defaultChecked />
 * <SoftCheckbox label="部分选中" indeterminate />
 * ```
 */
export const SoftCheckbox = forwardRef<HTMLInputElement, SoftCheckboxProps>(
	function SoftCheckbox({ label, note, indeterminate = false, className, id, ...props }, ref) {
		const generated = useId();
		const fieldId = id ?? generated;
		const input = useRef<HTMLInputElement | null>(null);

		/*
		 * `indeterminate` is a property and not an attribute, which is easy to
		 * get wrong in a way nothing complains about: setting it as a JSX prop
		 * does nothing at all, the box simply never shows the dash, and the only
		 * clue is that a screen reader announces the wrong state. It has to be
		 * written to the element, and before paint.
		 */
		const assign = (node: HTMLInputElement | null) => {
			input.current = node;
			if (node) node.indeterminate = indeterminate;
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		};

		return (
			<label
				className={className ? `ui-lib-soft-choice ${className}` : "ui-lib-soft-choice"}
				data-ui-lib-kind="checkbox"
				data-ui-lib-disabled={props.disabled ? "" : undefined}
				htmlFor={fieldId}
			>
				<input
					{...props}
					ref={assign}
					id={fieldId}
					type="checkbox"
					className="ui-lib-soft-choice__input"
				/>
				<span className="ui-lib-soft-choice__box" aria-hidden="true">
					<svg
						className="ui-lib-soft-choice__mark"
						viewBox="0 0 16 16"
						fill="none"
						/* The mark is decoration. The state it depicts lives on the real
						   input, which is what a screen reader reads, so announcing the
						   drawing as well would say everything twice. */
						aria-hidden="true"
					>
						{/* A tick for checked, a dash for indeterminate. Both are
						    drawn from a fixed path so the animation is the same. */}
						<path
							className="ui-lib-soft-choice__tick"
							d="M3.5 8.4 L6.6 11.5 L12.5 5"
							strokeWidth="2.1"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							className="ui-lib-soft-choice__dash"
							d="M4.5 8 L11.5 8"
							strokeWidth="2.1"
							strokeLinecap="round"
						/>
					</svg>
				</span>
				{(label || note) && (
					<span className="ui-lib-soft-choice__text">
						{label && <span className="ui-lib-soft-choice__label">{label}</span>}
						{note && <span className="ui-lib-soft-choice__note">{note}</span>}
					</span>
				)}
			</label>
		);
	},
);

/**
 * A radio that is one option among several.
 *
 * Split from the checkbox rather than folded into it behind a `type` prop,
 * because the two differ in more than their shape. A radio is only meaningful
 * inside a group, the group has a single tab stop and the arrow keys move the
 * selection; a checkbox has none of that. One component with a mode switch would
 * have to take the group semantics on and off, and every prop would be
 * conditional on which mode it was in.
 *
 * The grouping is the platform's: give every radio in a set the same `name` and
 * the browser handles arrow-key navigation, the single tab stop and the
 * announcement of position in the set. None of it is reimplemented here.
 *
 * ```tsx
 * <SoftRadio name="material" value="paper" label="水彩纸" defaultChecked />
 * <SoftRadio name="material" value="glass" label="液态玻璃" />
 * ```
 */
export const SoftRadio = forwardRef<HTMLInputElement, SoftRadioProps>(function SoftRadio(
	{ label, note, className, id, ...props },
	ref,
) {
	const generated = useId();
	const fieldId = id ?? generated;

	return (
		<label
			className={className ? `ui-lib-soft-choice ${className}` : "ui-lib-soft-choice"}
			data-ui-lib-kind="radio"
			data-ui-lib-disabled={props.disabled ? "" : undefined}
			htmlFor={fieldId}
		>
			<input
				{...props}
				ref={ref}
				id={fieldId}
				type="radio"
				className="ui-lib-soft-choice__input"
			/>
			<span className="ui-lib-soft-choice__box" aria-hidden="true">
				<span className="ui-lib-soft-choice__dot" />
			</span>
			{(label || note) && (
				<span className="ui-lib-soft-choice__text">
					{label && <span className="ui-lib-soft-choice__label">{label}</span>}
					{note && <span className="ui-lib-soft-choice__note">{note}</span>}
				</span>
			)}
		</label>
	);
});

/**
 * A set of radios with the group semantics a bare set does not have.
 *
 * Wrapping the list in a `<fieldset>` with a `<legend>` is the difference
 * between a screen reader announcing "水彩纸, radio, 1 of 3" and announcing
 * three unrelated radios with no idea they belong together.
 */
export function SoftRadioGroup({
	legend,
	children,
	className,
}: {
	legend: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<fieldset
			className={className ? `ui-lib-soft-radio-group ${className}` : "ui-lib-soft-radio-group"}
		>
			<legend className="ui-lib-soft-radio-group__legend">{legend}</legend>
			{children}
		</fieldset>
	);
}
