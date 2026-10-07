import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftPopover, SoftTooltip } from "../src/index.js";

describe("SoftTooltip", () => {
	it("renders trigger element in SSR output", () => {
		const html = renderToString(
			React.createElement(
				SoftTooltip,
				{ content: "保存草稿" },
				React.createElement("button", { type: "button" }, "保存"),
			),
		);

		expect(html).toContain("<button");
		expect(html).toContain("保存");
	});

	it("preserves trigger properties and classes", () => {
		const html = renderToString(
			React.createElement(
				SoftTooltip,
				{ content: "详细说明", placement: "bottom" },
				React.createElement(
					"button",
					{ type: "button", className: "my-btn", id: "btn-1" },
					"操作",
				),
			),
		);

		expect(html).toContain('class="my-btn"');
		expect(html).toContain('id="btn-1"');
	});
});

describe("SoftPopover", () => {
	it("renders trigger element with aria-haspopup in SSR output", () => {
		const html = renderToString(
			React.createElement(
				SoftPopover,
				{
					trigger: React.createElement("button", { type: "button" }, "打开设置"),
					title: "卡片设置",
				},
				React.createElement("div", null, "内容选项"),
			),
		);

		expect(html).toContain("<button");
		expect(html).toContain("打开设置");
		expect(html).toContain('aria-haspopup="dialog"');
	});

	it("renders popover card when open is true", () => {
		const html = renderToString(
			React.createElement(
				SoftPopover,
				{
					open: true,
					trigger: React.createElement("button", { type: "button" }, "触发"),
					title: "快捷面板",
					actions: React.createElement("button", { type: "button" }, "确认"),
				},
				React.createElement("p", null, "面板描述文字"),
			),
		);

		expect(html).toContain('role="dialog"');
		expect(html).toContain("快捷面板");
		expect(html).toContain("面板描述文字");
		expect(html).toContain("确认");
		expect(html).toContain("ui-lib-soft-popover--open");
	});

	it("renders close button with accessible label", () => {
		const html = renderToString(
			React.createElement(
				SoftPopover,
				{
					open: true,
					showClose: true,
					trigger: React.createElement("button", { type: "button" }, "触发"),
				},
				React.createElement("div", null, "内容"),
			),
		);

		expect(html).toContain('aria-label="关闭弹出卡片"');
		expect(html).toContain("ui-lib-soft-popover__close");
	});
});
