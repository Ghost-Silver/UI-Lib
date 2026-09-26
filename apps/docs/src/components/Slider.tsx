interface SliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 1, unit = "", onChange }: SliderProps) {
	return (
		<label className="slider">
			<span className="slider__label">
				{label}
				<em>
					{value.toFixed(step < 1 ? 2 : 0)}
					{unit}
				</em>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.currentTarget.value))}
			/>
		</label>
	);
}

interface ToggleProps {
	label: string;
	checked: boolean;
	hint?: string;
	onChange: (value: boolean) => void;
}

export function Toggle({ label, checked, hint, onChange }: ToggleProps) {
	return (
		<label className="toggle">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
			<span className="toggle__track" aria-hidden="true">
				<span className="toggle__thumb" />
			</span>
			<span className="toggle__text">
				{label}
				{hint ? <em>{hint}</em> : null}
			</span>
		</label>
	);
}

interface ChoiceProps<T extends string> {
	label: string;
	value: T;
	options: readonly { id: T; name: string }[];
	onChange: (value: T) => void;
}

export function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
	return (
		<div className="choice">
			<span className="choice__label">{label}</span>
			<div className="choice__row">
				{options.map((option) => (
					<button
						key={option.id}
						type="button"
						className={option.id === value ? "chip chip--on" : "chip"}
						onClick={() => onChange(option.id)}
					>
						{option.name}
					</button>
				))}
			</div>
		</div>
	);
}
