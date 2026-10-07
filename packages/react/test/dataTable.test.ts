import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftDataTable, type SoftDataTableColumn } from "../src/index.js";

interface TaskItem {
	id: string;
	title: string;
	priority: string;
	count: number;
}

const sampleColumns: SoftDataTableColumn<TaskItem>[] = [
	{ key: "title", header: "任务名称", sortable: true },
	{ key: "priority", header: "优先级", align: "center" },
	{ key: "count", header: "执行次数", numeric: true, sortable: true },
];

const sampleRows: TaskItem[] = [
	{ id: "t1", title: "校准水墨前沿扩散", priority: "高", count: 42 },
	{ id: "t2", title: "液态玻璃波纹场测试", priority: "极高", count: 99 },
	{ id: "t3", title: "色彩空间矩阵对齐", priority: "中", count: 12 },
];

describe("SoftDataTable rendering and accessibility", () => {
	it("renders semantic table markup with caption, thead, and rows", () => {
		const html = renderToString(
			React.createElement(SoftDataTable<TaskItem>, {
				columns: sampleColumns,
				rows: sampleRows,
				rowKey: (r) => r.id,
				caption: "渲染管线任务清单",
			}),
		);

		expect(html).toContain("<table");
		expect(html).toContain("渲染管线任务清单");
		expect(html).toContain("<caption");
		expect(html).toContain("<thead");
		expect(html).toContain("<tbody");
		expect(html).toContain("校准水墨前沿扩散");
		expect(html).toContain("液态玻璃波纹场测试");
		expect(html).toContain('aria-sort="none"');
		expect(html).toContain("ui-lib-soft-data-table__sort-btn");
	});

	it("renders selection checkboxes in multiple selection mode", () => {
		const selected = new Set(["t2"]);
		const html = renderToString(
			React.createElement(SoftDataTable<TaskItem>, {
				columns: sampleColumns,
				rows: sampleRows,
				rowKey: (r) => r.id,
				caption: "选区测试表",
				selectionMode: "multiple",
				selectedKeys: selected,
			}),
		);

		expect(html).toContain('aria-label="全选所有行"');
		expect(html).toContain('aria-label="选择行 1"');
		expect(html).toContain('aria-selected="true"');
		expect(html).toContain('data-ui-lib-selected="true"');
	});

	it("renders empty state slot when rows array is empty", () => {
		const html = renderToString(
			React.createElement(SoftDataTable<TaskItem>, {
				columns: sampleColumns,
				rows: [],
				rowKey: (r) => r.id,
				caption: "空表",
				emptySlot: React.createElement("span", null, "没有待处理的任务"),
			}),
		);

		expect(html).toContain("没有待处理的任务");
	});

	it("renders loading shimmer slot when loading is true", () => {
		const html = renderToString(
			React.createElement(SoftDataTable<TaskItem>, {
				columns: sampleColumns,
				rows: sampleRows,
				rowKey: (r) => r.id,
				caption: "加载中测试",
				loading: true,
			}),
		);

		expect(html).toContain("ui-lib-soft-data-table__shimmer");
		expect(html).not.toContain("校准水墨前沿扩散");
	});

	it("renders controlled sort direction attribute", () => {
		const html = renderToString(
			React.createElement(SoftDataTable<TaskItem>, {
				columns: sampleColumns,
				rows: sampleRows,
				rowKey: (r) => r.id,
				caption: "排序表",
				sort: { key: "count", direction: "descending" },
			}),
		);

		expect(html).toContain('aria-sort="descending"');
	});
});
