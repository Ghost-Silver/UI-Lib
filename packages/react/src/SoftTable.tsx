import { useId, useMemo, useState } from "react";

export interface SoftTableColumn<T> {
	/** Stable identity, used for the sort key and the header ids. */
	key: string;
	/** The header text. */
	header: string;
	/** The cell. Defaults to `row[key]` rendered as text. */
	render?: (row: T) => React.ReactNode;
	/** Allow sorting on this column. */
	sortable?: boolean;
	/**
	 * How to compare. Defaults to a locale-aware string compare, which is right
	 * for text and wrong for numbers — pass one for those.
	 */
	compare?: (a: T, b: T) => number;
	/** Align right, for numbers. Also sets `text-align` and nothing else. */
	numeric?: boolean;
	/** A CSS width. */
	width?: string;
}

export interface SoftTableProps<T> {
	columns: readonly SoftTableColumn<T>[];
	rows: readonly T[];
	/** A stable key per row. */
	rowKey: (row: T) => string;
	/**
	 * Describes the table to assistive technology. Rendered as a visible
	 * `<caption>` unless `captionHidden` is set — a caption is not just a label,
	 * it is the table's title and belongs in the document.
	 */
	caption: string;
	captionHidden?: boolean;
	/** Sort applied initially, and the model for uncontrolled use. */
	defaultSort?: { key: string; direction: "ascending" | "descending" };
	/** Called with the new sort, and required for controlled use. */
	onSortChange?: (
		sort: { key: string; direction: "ascending" | "descending" } | undefined,
	) => void;
	/** Shown in place of the body when there are no rows. */
	empty?: React.ReactNode;
	className?: string;
}

type Sort = { key: string; direction: "ascending" | "descending" } | undefined;

/**
 * A table, and a real one.
 *
 * Built on `<table>` rather than on a grid of divs with roles, and that is not
 * a preference. A native table gives every cell a row and column index, so a
 * screen reader can announce "第 2 行 第 3 列" and let the user navigate by cell;
 * header cells are associated with their columns automatically, so the value is
 * announced with its column name. Reimplementing that with `role="grid"` means
 * a keyboard model, a focus model and the associations, all of them easy to get
 * subtly wrong and none of them the point of the component.
 *
 * ## Sorting
 *
 * The state lives on the `<th>` as `aria-sort`, which is what a screen reader
 * reads — the arrow is drawn from the same state rather than the state being
 * inferred from the arrow. Verified: setting `aria-sort` on a `<th>` does not
 * sort anything or change anything visually, so the attribute and the visual
 * have to be driven from one source or they drift apart.
 *
 * The header contains a real `<button>`, because that is what makes it reachable
 * and activatable. The cycle is ascending, descending, off — the third state
 * matters because without it there is no way back to the order the data arrived
 * in, and every column ends up permanently sorted.
 *
 * ```tsx
 * <SoftTable
 *   caption="三张卡片的用量"
 *   rowKey={(r) => r.id}
 *   columns={[
 *     { key: "name", header: "名字", sortable: true },
 *     { key: "count", header: "用量", numeric: true, sortable: true,
 *       compare: (a, b) => a.count - b.count },
 *   ]}
 *   rows={rows}
 * />
 * ```
 */
export function SoftTable<T>({
	columns,
	rows,
	rowKey,
	caption,
	captionHidden = false,
	defaultSort,
	onSortChange,
	empty,
	className,
}: SoftTableProps<T>) {
	const generated = useId();
	const [sort, setSort] = useState<Sort>(defaultSort);

	/** Left as the caller gave them when there is no sort. */
	const ordered = useMemo(() => {
		if (!sort) return rows;
		const column = columns.find((c) => c.key === sort.key);
		if (!column) return rows;
		const direction = sort.direction === "ascending" ? 1 : -1;
		const compare = column.compare ?? defaultCompare(column);
		// A copy, because sorting the caller's array in place is a side effect
		// they did not ask for and will not see.
		return [...rows].sort((a, b) => compare(a, b) * direction);
	}, [columns, rows, sort]);

	const toggle = (key: string) => {
		let next: Sort;
		if (sort?.key !== key) next = { key, direction: "ascending" };
		else if (sort.direction === "ascending") next = { key, direction: "descending" };
		// Third press clears it: without a way back to the original order, every
		// column ends up permanently sorted and the data's own order is lost.
		else next = undefined;
		setSort(next);
		onSortChange?.(next);
	};

	return (
		<div className={className ? `ui-lib-soft-table ${className}` : "ui-lib-soft-table"}>
			<table className="ui-lib-soft-table__table">
				{/*
				 * `<caption>` rather than `aria-label`, unless the caller asks for
				 * it to be hidden. A caption is the table's title and belongs in the
				 * document; `aria-label` is a name for a thing that has no visible
				 * one. Hiding is offered because a caption above a table inside a
				 * section that already says the same thing reads as a duplicate.
				 */}
				<caption
					className={captionHidden ? "ui-lib-visually-hidden" : "ui-lib-soft-table__caption"}
				>
					{caption}
				</caption>
				<thead>
					<tr>
						{columns.map((column) => {
							const active = sort?.key === column.key;
							return (
								<th
									key={column.key}
									scope="col"
									// Only on the sorted column, and only while it is sorted.
									// `aria-sort="none"` on every other header is noisy and
									// several readers announce it.
									aria-sort={active ? sort.direction : undefined}
									className="ui-lib-soft-table__th"
									data-ui-lib-numeric={column.numeric ? "" : undefined}
									style={column.width ? { width: column.width } : undefined}
								>
									{column.sortable ? (
										<button
											type="button"
											className="ui-lib-soft-table__sort"
											onClick={() => toggle(column.key)}
											/*
											 * The button's own name is the header text, so the
											 * direction has to be said somewhere. The arrow is
											 * decorative and hidden; this is what carries it.
											 */
											aria-describedby={`${generated}-${column.key}-dir`}
										>
											<span>{column.header}</span>
											<span className="ui-lib-soft-table__arrow" aria-hidden="true" />
											<span
												className="ui-lib-visually-hidden"
												id={`${generated}-${column.key}-dir`}
											>
												{active
													? sort.direction === "ascending"
														? "已按升序排列，按下改为降序"
														: "已按降序排列，按下取消排序"
													: "按下按此列升序排列"}
											</span>
										</button>
									) : (
										column.header
									)}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{ordered.length === 0 ? (
						<tr>
							<td className="ui-lib-soft-table__empty" colSpan={columns.length}>
								{empty ?? "没有内容"}
							</td>
						</tr>
					) : (
						ordered.map((row) => (
							<tr key={rowKey(row)} className="ui-lib-soft-table__row">
								{columns.map((column) => (
									<td
										key={column.key}
										className="ui-lib-soft-table__td"
										data-ui-lib-numeric={column.numeric ? "" : undefined}
									>
										{column.render
											? column.render(row)
											: String((row as Record<string, unknown>)[column.key] ?? "")}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

/** A locale-aware string compare, which is right for text and wrong for numbers. */
function defaultCompare<T>(column: SoftTableColumn<T>) {
	const collator = new Intl.Collator("zh", { numeric: true, sensitivity: "base" });
	return (a: T, b: T) => {
		const left = String((a as Record<string, unknown>)[column.key] ?? "");
		const right = String((b as Record<string, unknown>)[column.key] ?? "");
		return collator.compare(left, right);
	};
}
