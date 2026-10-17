import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftTimeline, type SoftTimelineItem } from "../src/index.js";

const sampleItems: SoftTimelineItem[] = [
	{
		key: "step-1",
		title: "需求对齐与设计签收",
		description: "完成全部视觉规格与 WAI-ARIA 模型规划",
		timestamp: "10:00",
		status: "completed",
	},
	{
		key: "step-2",
		title: "WebGPU 光学着色器编译",
		description: "SDF 倒角与双面折射曲面求解中",
		timestamp: "10:45",
		status: "processing",
	},
	{
		key: "step-3",
		title: "自动化门禁全量校验",
		timestamp: "11:30",
		status: "pending",
	},
];

describe("SoftTimeline", () => {
	it("renders timeline container with aria-label", () => {
		const html = renderToString(
			React.createElement(SoftTimeline, {
				label: "版本发布历程",
				items: sampleItems,
			}),
		);

		expect(html).toContain("<ol");
		expect(html).toContain('aria-label="版本发布历程"');
		expect(html).toContain("ui-lib-soft-timeline");
		expect(html).toContain("需求对齐与设计签收");
		expect(html).toContain("WebGPU 光学着色器编译");
	});

	it("renders timestamps and descriptions", () => {
		const html = renderToString(
			React.createElement(SoftTimeline, {
				label: "详细节点测试",
				items: sampleItems,
			}),
		);

		expect(html).toContain("10:00");
		expect(html).toContain("10:45");
		expect(html).toContain("完成全部视觉规格与 WAI-ARIA 模型规划");
	});

	it("supports status classes and beads", () => {
		const html = renderToString(
			React.createElement(SoftTimeline, {
				label: "状态指示测试",
				items: sampleItems,
			}),
		);

		expect(html).toContain("ui-lib-soft-timeline__item--completed");
		expect(html).toContain("ui-lib-soft-timeline__item--processing");
		expect(html).toContain("ui-lib-soft-timeline__item--pending");
	});

	it("supports reverse ordering", () => {
		const html = renderToString(
			React.createElement(SoftTimeline, {
				label: "倒序历程测试",
				items: sampleItems,
				reverse: true,
			}),
		);

		const posPending = html.indexOf("自动化门禁全量校验");
		const posCompleted = html.indexOf("需求对齐与设计签收");
		expect(posPending).toBeLessThan(posCompleted);
	});

	it("supports direction and mode variants", () => {
		const html = renderToString(
			React.createElement(SoftTimeline, {
				label: "布局模式测试",
				items: sampleItems,
				direction: "horizontal",
				mode: "alternate",
				tone: "blossom",
			}),
		);

		expect(html).toContain("ui-lib-soft-timeline--horizontal");
		expect(html).toContain("ui-lib-soft-timeline--alternate");
		expect(html).toContain('data-ui-lib-tone="blossom"');
	});
});
