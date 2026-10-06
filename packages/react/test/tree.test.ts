import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftTree, type SoftTreeNode } from "../src/index.js";

const sampleNodes: SoftTreeNode[] = [
	{
		key: "root-1",
		label: "项目文档",
		children: [
			{ key: "doc-1", label: "起步指南.md", isLeaf: true },
			{ key: "doc-2", label: "架构设计.md", isLeaf: true },
		],
	},
	{
		key: "root-2",
		label: "源代码",
		children: [
			{ key: "src-1", label: "index.ts", isLeaf: true },
			{ key: "src-2", label: "SoftTree.tsx", isLeaf: true },
		],
	},
];

describe("SoftTree", () => {
	it("renders tree container with role='tree' and accessible name", () => {
		const html = renderToString(
			React.createElement(SoftTree, {
				label: "文件导航树",
				nodes: sampleNodes,
			}),
		);

		expect(html).toContain('role="tree"');
		expect(html).toContain('aria-label="文件导航树"');
		expect(html).toContain('role="treeitem"');
		expect(html).toContain("项目文档");
		expect(html).toContain("源代码");
	});

	it("renders child nodes when expandedKeys contains the parent key", () => {
		const html = renderToString(
			React.createElement(SoftTree, {
				label: "文件导航树",
				nodes: sampleNodes,
				defaultExpandedKeys: ["root-1"],
			}),
		);

		expect(html).toContain("起步指南.md");
		expect(html).toContain("架构设计.md");
		// root-2 is not expanded
		expect(html).not.toContain("SoftTree.tsx");
	});

	it("supports checkable mode and renders checkboxes", () => {
		const html = renderToString(
			React.createElement(SoftTree, {
				label: "可勾选树",
				nodes: sampleNodes,
				checkable: true,
				defaultCheckedKeys: ["root-1"],
				defaultExpandedKeys: ["root-1"],
			}),
		);

		expect(html).toContain("ui-lib-soft-tree__checkbox");
		expect(html).toContain('aria-checked="true"');
	});

	it("renders organic guide lines by default", () => {
		const html = renderToString(
			React.createElement(SoftTree, {
				label: "导引线测试",
				nodes: sampleNodes,
				showLines: true,
			}),
		);

		expect(html).toContain("ui-lib-soft-tree--lines");
	});

	it("supports selection and tone styling", () => {
		const html = renderToString(
			React.createElement(SoftTree, {
				label: "选区测试",
				nodes: sampleNodes,
				defaultSelectedKeys: ["root-1"],
				tone: "iris",
			}),
		);

		expect(html).toContain("ui-lib-soft-tree__node--selected");
		expect(html).toContain('data-ui-lib-tone="iris"');
	});
});
