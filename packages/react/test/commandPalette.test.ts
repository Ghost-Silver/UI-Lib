import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { matchCommand, type SoftCommandItem, SoftCommandPalette } from "../src/index.js";

describe("SoftCommandPalette fuzzy matcher", () => {
	const sampleItem: SoftCommandItem = {
		id: "export-pdf",
		label: "导出为 PDF 文档",
		note: "包含高清矢量水墨图层",
		group: "导出",
		keywords: ["print", "save", "xuan"],
		shortcut: ["⌘", "P"],
	};

	it("returns exact match with high score", () => {
		expect(matchCommand(sampleItem, "导出为 PDF 文档")).toBe(100);
	});

	it("matches prefix and substring queries", () => {
		expect(matchCommand(sampleItem, "导出")).toBeGreaterThanOrEqual(80);
		expect(matchCommand(sampleItem, "PDF")).toBeGreaterThanOrEqual(60);
	});

	it("matches keywords, note, and group", () => {
		expect(matchCommand(sampleItem, "print")).toBe(50);
		expect(matchCommand(sampleItem, "矢量水墨")).toBe(40);
		expect(matchCommand(sampleItem, "导出")).toBeGreaterThanOrEqual(30);
	});

	it("matches subsequence fuzzy acronyms", () => {
		// "导P" matches 导 ... P
		expect(matchCommand(sampleItem, "导P")).toBeGreaterThan(0);
	});

	it("returns 0 on completely unrelated query", () => {
		expect(matchCommand(sampleItem, "xyz999")).toBe(0);
	});

	it("returns 1 on empty query so all items are shown", () => {
		expect(matchCommand(sampleItem, "")).toBe(1);
		expect(matchCommand(sampleItem, "   ")).toBe(1);
	});
});

describe("SoftCommandPalette rendering and accessibility", () => {
	const items: SoftCommandItem[] = [
		{ id: "1", label: "新建画板", group: "基础操作", shortcut: ["⌘", "N"] },
		{ id: "2", label: "清空画布", group: "基础操作", shortcut: ["⌘", "K"] },
		{ id: "3", label: "调整流体黏度", group: "高级设置", disabled: true },
	];

	it("renders dialog, combobox, and listbox semantic roles", () => {
		const html = renderToString(
			React.createElement(SoftCommandPalette, {
				open: true,
				onClose: () => {},
				items,
				title: "全局命令搜索",
				placeholder: "搜搜看...",
			}),
		);

		// Accessibility assertions
		expect(html).toContain("<dialog");
		expect(html).toContain('role="combobox"');
		expect(html).toContain('aria-autocomplete="list"');
		expect(html).toContain('role="listbox"');
		expect(html).toContain('role="option"');
		expect(html).toContain('role="group"');
		expect(html).toContain("搜搜看...");
		expect(html).toContain("新建画板");
		expect(html).toContain("基础操作");
		expect(html).toContain('aria-disabled="true"');
		expect(html).toContain("ui-lib-soft-command-palette__kbd");
	});

	it("renders empty state when items list is empty", () => {
		const html = renderToString(
			React.createElement(SoftCommandPalette, {
				open: true,
				onClose: () => {},
				items: [],
				emptyText: "空空如也的命令表",
			}),
		);

		expect(html).toContain("空空如也的命令表");
		expect(html).toContain('role="status"');
	});
});
