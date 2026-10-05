import type { IrisTone } from "@ui-lib/core";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftDataTableColumn<T> {
	/** Unique column key, used for sorting and field extraction */
	key: string;
	/** Header label text */
	header: string;
	/** Custom cell renderer. Defaults to `row[key]` stringified */
	render?: (row: T, index: number) => React.ReactNode;
	/** Whether this column can be sorted */
	sortable?: boolean;
	/** Custom comparator function */
	compare?: (a: T, b: T) => number;
	/** Right-align content for numeric data */
	numeric?: boolean;
	/** Explicit column width (e.g. "120px", "20%") */
	width?: string;
	/** Text alignment */
	align?: "left" | "center" | "right";
}

export type SoftDataTableSort =
	| {
			key: string;
			direction: "ascending" | "descending";
	  }
	| undefined;

export interface SoftDataTableProps<T> {
	/** Column definitions */
	columns: readonly SoftDataTableColumn<T>[];
	/** Row data array */
	rows: readonly T[];
	/** Extract stable key for each row */
	rowKey: (row: T) => string;
	/** Accessible caption describing the table */
	caption: string;
	/** Hide visible caption text */
	captionHidden?: boolean;
	/** Row selection mode: "none" (default), "single", or "multiple" */
	selectionMode?: "none" | "single" | "multiple";
	/** Controlled selected row keys */
	selectedKeys?: ReadonlySet<string>;
	/** Uncontrolled initial selected row keys */
	defaultSelectedKeys?: ReadonlySet<string>;
	/** Selection change callback */
	onSelectionChange?: (selectedKeys: Set<string>) => void;
	/** Controlled sort state */
	sort?: SoftDataTableSort;
	/** Initial uncontrolled sort state */
	defaultSort?: SoftDataTableSort;
	/** Sort change callback */
	onSortChange?: (sort: SoftDataTableSort) => void;
	/** Whether data is currently loading */
	loading?: boolean;
	/** Custom loading state content / skeleton */
	loadingSlot?: React.ReactNode;
	/** Custom empty state content */
	emptySlot?: React.ReactNode;
	/** Row click handler */
	onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
	/** Visual surface material */
	material?: SoftMaterial;
	/** Tone family */
	tone?: IrisTone;
	/** Compact vertical row padding */
	compact?: boolean;
	/** Alternating row background stripes */
	striped?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * High-performance, accessible data grid component.
 *
 * ## Features & Accessibility
 *
 * - Built on semantic `<table>` elements for native assistive technology table navigation.
 * - Multi-state header sorting: ascending -> descending -> neutral.
 * - Single and multiple row selection with accessible checkboxes and `aria-selected`.
 * - Skeleton loading and empty state fallback slots.
 * - Tactile row hover with spring damping.
 *
 * ```tsx
 * <SoftDataTable
 *   caption="任务进度表"
 *   rowKey={(r) => r.id}
 *   selectionMode="multiple"
 *   columns={[
 *     { key: "title", header: "任务名称", sortable: true },
 *     { key: "progress", header: "完成度", numeric: true, sortable: true },
 *   ]}
 *   rows={tasks}
 * />
 * ```
 */
export function SoftDataTable<T>({
	columns,
	rows,
	rowKey,
	caption,
	captionHidden = false,
	selectionMode = "none",
	selectedKeys: controlledSelectedKeys,
	defaultSelectedKeys,
	onSelectionChange,
	sort: controlledSort,
	defaultSort,
	onSortChange,
	loading = false,
	loadingSlot,
	emptySlot,
	onRowClick,
	material = "plain",
	tone,
	compact = false,
	striped = false,
	className,
	style,
}: SoftDataTableProps<T>) {
	useStyles();
	const surface = useMaterial(material && material !== "plain" ? { material, tone } : {});
	const captionId = useId();

	// Uncontrolled & controlled sort state
	const [uncontrolledSort, setUncontrolledSort] = useState<SoftDataTableSort>(defaultSort);
	const activeSort = controlledSort !== undefined ? controlledSort : uncontrolledSort;

	// Uncontrolled & controlled selection state
	const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] = useState<Set<string>>(
		() => new Set(defaultSelectedKeys ? Array.from(defaultSelectedKeys) : []),
	);
	const activeSelectedKeys = useMemo<ReadonlySet<string>>(() => {
		if (controlledSelectedKeys !== undefined) return controlledSelectedKeys;
		return uncontrolledSelectedKeys;
	}, [controlledSelectedKeys, uncontrolledSelectedKeys]);

	// Cycle column sort: undefined -> ascending -> descending -> undefined
	const toggleSort = useCallback(
		(columnKey: string) => {
			let nextSort: SoftDataTableSort;
			if (!activeSort || activeSort.key !== columnKey) {
				nextSort = { key: columnKey, direction: "ascending" };
			} else if (activeSort.direction === "ascending") {
				nextSort = { key: columnKey, direction: "descending" };
			} else {
				nextSort = undefined;
			}

			if (controlledSort === undefined) {
				setUncontrolledSort(nextSort);
			}
			onSortChange?.(nextSort);
		},
		[activeSort, controlledSort, onSortChange],
	);

	// Sort rows
	const sortedRows = useMemo(() => {
		if (!activeSort) return rows;
		const col = columns.find((c) => c.key === activeSort.key);
		if (!col) return rows;

		const sorted = [...rows];
		const dir = activeSort.direction === "ascending" ? 1 : -1;

		sorted.sort((a, b) => {
			if (col.compare) return col.compare(a, b) * dir;
			const aVal = (a as Record<string, unknown>)[col.key];
			const bVal = (b as Record<string, unknown>)[col.key];

			if (typeof aVal === "number" && typeof bVal === "number") {
				return (aVal - bVal) * dir;
			}
			const aStr = aVal == null ? "" : String(aVal);
			const bStr = bVal == null ? "" : String(bVal);
			return aStr.localeCompare(bStr, undefined, { numeric: true }) * dir;
		});

		return sorted;
	}, [rows, activeSort, columns]);

	// Selection handlers
	const allRowKeys = useMemo(() => sortedRows.map((r) => rowKey(r)), [sortedRows, rowKey]);
	const isAllSelected =
		allRowKeys.length > 0 && allRowKeys.every((k) => activeSelectedKeys.has(k));
	const isSomeSelected = !isAllSelected && allRowKeys.some((k) => activeSelectedKeys.has(k));

	const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
	if (selectAllCheckboxRef.current) {
		selectAllCheckboxRef.current.indeterminate = isSomeSelected;
	}

	const handleToggleAll = useCallback(() => {
		const next = new Set<string>();
		if (!isAllSelected) {
			for (const key of allRowKeys) next.add(key);
		}
		if (controlledSelectedKeys === undefined) {
			setUncontrolledSelectedKeys(next);
		}
		onSelectionChange?.(next);
	}, [isAllSelected, allRowKeys, controlledSelectedKeys, onSelectionChange]);

	const handleToggleRow = useCallback(
		(key: string) => {
			const next = new Set(activeSelectedKeys);
			if (selectionMode === "single") {
				next.clear();
				if (!activeSelectedKeys.has(key)) {
					next.add(key);
				}
			} else {
				if (next.has(key)) {
					next.delete(key);
				} else {
					next.add(key);
				}
			}

			if (controlledSelectedKeys === undefined) {
				setUncontrolledSelectedKeys(next);
			}
			onSelectionChange?.(next);
		},
		[activeSelectedKeys, selectionMode, controlledSelectedKeys, onSelectionChange],
	);

	const hasSelection = selectionMode !== "none";
	const totalColSpan = columns.length + (hasSelection ? 1 : 0);

	const rootClasses = [
		"ui-lib-soft-data-table",
		surface.className,
		compact && "ui-lib-soft-data-table--compact",
		striped && "ui-lib-soft-data-table--striped",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={rootClasses} style={{ ...surface.style, ...style }}>
			<table className="ui-lib-soft-data-table__table" aria-labelledby={captionId}>
				<caption
					id={captionId}
					className={
						captionHidden
							? "ui-lib-soft-data-table__caption ui-lib-soft-data-table__caption--hidden"
							: "ui-lib-soft-data-table__caption"
					}
				>
					{caption}
				</caption>

				<thead className="ui-lib-soft-data-table__thead">
					<tr className="ui-lib-soft-data-table__header-row">
						{hasSelection && (
							<th
								scope="col"
								className="ui-lib-soft-data-table__th ui-lib-soft-data-table__th--select"
								style={{ width: "44px" }}
							>
								{selectionMode === "multiple" ? (
									<label className="ui-lib-soft-data-table__checkbox-label">
										<input
											ref={selectAllCheckboxRef}
											type="checkbox"
											checked={isAllSelected}
											onChange={handleToggleAll}
											aria-label="全选所有行"
											className="ui-lib-soft-data-table__checkbox"
										/>
									</label>
								) : null}
							</th>
						)}

						{columns.map((col) => {
							const isSorted = activeSort?.key === col.key;
							const sortDirection = isSorted ? activeSort.direction : undefined;
							const alignClass = col.align
								? `ui-lib-soft-data-table__th--align-${col.align}`
								: col.numeric
									? "ui-lib-soft-data-table__th--align-right"
									: undefined;

							return (
								<th
									key={col.key}
									scope="col"
									aria-sort={sortDirection ?? (col.sortable ? "none" : undefined)}
									className={[
										"ui-lib-soft-data-table__th",
										col.sortable && "ui-lib-soft-data-table__th--sortable",
										alignClass,
									]
										.filter(Boolean)
										.join(" ")}
									style={{ width: col.width }}
								>
									{col.sortable ? (
										<button
											type="button"
											className="ui-lib-soft-data-table__sort-btn"
											onClick={() => toggleSort(col.key)}
											aria-label={`${col.header}，排序`}
										>
											<span className="ui-lib-soft-data-table__header-text">{col.header}</span>
											<span
												className="ui-lib-soft-data-table__sort-indicator"
												data-ui-lib-direction={sortDirection}
												aria-hidden="true"
											>
												{sortDirection === "ascending"
													? "↑"
													: sortDirection === "descending"
														? "↓"
														: "↕"}
											</span>
										</button>
									) : (
										<span className="ui-lib-soft-data-table__header-text">{col.header}</span>
									)}
								</th>
							);
						})}
					</tr>
				</thead>

				<tbody className="ui-lib-soft-data-table__tbody">
					{loading ? (
						<tr className="ui-lib-soft-data-table__loading-row">
							<td colSpan={totalColSpan} className="ui-lib-soft-data-table__loading-cell">
								{loadingSlot ?? (
									<div className="ui-lib-soft-data-table__shimmer" role="status">
										<div className="ui-lib-soft-data-table__shimmer-line" />
										<div className="ui-lib-soft-data-table__shimmer-line" />
										<div className="ui-lib-soft-data-table__shimmer-line" />
									</div>
								)}
							</td>
						</tr>
					) : sortedRows.length === 0 ? (
						<tr className="ui-lib-soft-data-table__empty-row">
							<td colSpan={totalColSpan} className="ui-lib-soft-data-table__empty-cell">
								{emptySlot ?? (
									<div className="ui-lib-soft-data-table__empty-text" role="status">
										暂无数据
									</div>
								)}
							</td>
						</tr>
					) : (
						sortedRows.map((row, rowIndex) => {
							const key = rowKey(row);
							const isSelected = activeSelectedKeys.has(key);

							return (
								<tr
									key={key}
									aria-selected={hasSelection ? isSelected : undefined}
									data-ui-lib-selected={isSelected ? "true" : undefined}
									className={[
										"ui-lib-soft-data-table__row",
										isSelected && "ui-lib-soft-data-table__row--selected",
										onRowClick && "ui-lib-soft-data-table__row--interactive",
									]
										.filter(Boolean)
										.join(" ")}
									onClick={(e) => onRowClick?.(row, e)}
								>
									{hasSelection && (
										<td className="ui-lib-soft-data-table__td ui-lib-soft-data-table__td--select">
											<label
												className="ui-lib-soft-data-table__checkbox-label"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
											>
												<input
													type={selectionMode === "single" ? "radio" : "checkbox"}
													checked={isSelected}
													onChange={() => handleToggleRow(key)}
													aria-label={`选择行 ${rowIndex + 1}`}
													className="ui-lib-soft-data-table__checkbox"
												/>
											</label>
										</td>
									)}

									{columns.map((col) => {
										const cellContent = col.render
											? col.render(row, rowIndex)
											: (row as Record<string, unknown>)[col.key] != null
												? String((row as Record<string, unknown>)[col.key])
												: null;

										const alignClass = col.align
											? `ui-lib-soft-data-table__td--align-${col.align}`
											: col.numeric
												? "ui-lib-soft-data-table__td--align-right"
												: undefined;

										return (
											<td
												key={col.key}
												className={["ui-lib-soft-data-table__td", alignClass]
													.filter(Boolean)
													.join(" ")}
											>
												{cellContent}
											</td>
										);
									})}
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
}
