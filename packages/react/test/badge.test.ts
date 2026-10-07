import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftBadge } from "../src/index.js";

describe("SoftBadge", () => {
	it("renders wrapper mode around children with numeric count", () => {
		const html = renderToString(
			React.createElement(
				SoftBadge,
				{ count: 5 },
				React.createElement("button", { type: "button" }, "通知"),
			),
		);

		expect(html).toContain("ui-lib-soft-badge-wrap");
		expect(html).toContain("ui-lib-soft-badge");
		expect(html).toContain("5");
		expect(html).toContain("通知");
		expect(html).toContain("5 条未读通知");
	});

	it("truncates count above maxCount with '+'", () => {
		const html = renderToString(
			React.createElement(
				SoftBadge,
				{ count: 120, maxCount: 99 },
				React.createElement("button", { type: "button" }, "收件箱"),
			),
		);

		expect(html).toContain("99+");
	});

	it("hides badge when count is 0 unless showZero is true", () => {
		const hiddenHtml = renderToString(
			React.createElement(
				SoftBadge,
				{ count: 0 },
				React.createElement("button", { type: "button" }, "消息"),
			),
		);
		expect(hiddenHtml).not.toContain("<sup");

		const visibleHtml = renderToString(
			React.createElement(
				SoftBadge,
				{ count: 0, showZero: true },
				React.createElement("button", { type: "button" }, "消息"),
			),
		);
		expect(visibleHtml).toContain("<sup");
		expect(visibleHtml).toContain("0");
	});

	it("renders dot mode without numbers", () => {
		const html = renderToString(
			React.createElement(SoftBadge, { dot: true }, React.createElement("span", null, "动态")),
		);

		expect(html).toContain("ui-lib-soft-badge--dot");
	});

	it("renders standalone status dot with accompanying text", () => {
		const html = renderToString(
			React.createElement(SoftBadge, {
				status: "processing",
				text: "渲染进行中",
			}),
		);

		expect(html).toContain("ui-lib-soft-badge-standalone");
		expect(html).toContain('role="status"');
		expect(html).toContain("ui-lib-soft-badge__dot--processing");
		expect(html).toContain("渲染进行中");
	});
});
