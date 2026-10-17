import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	computeEffectiveGroundLuminance,
	SoftAlert,
	SoftChip,
	SoftEmptyState,
	SoftLightPanel,
	SoftMenu,
	SoftSegmentedControl,
	SoftSelect,
	SoftTabs,
	srgbLuminance,
} from "../src/index.js";

describe("Material contrast engine", () => {
	it("correctly computes sRGB relative luminance", () => {
		expect(srgbLuminance(0, 0, 0)).toBe(0);
		expect(srgbLuminance(255, 255, 255)).toBeCloseTo(1, 2);
		expect(srgbLuminance(0, 255, 0)).toBeCloseTo(0.715, 2);
	});

	it("computes high contrast tokens on light watercolor wash", () => {
		const res = computeEffectiveGroundLuminance({
			pigmentColor: "#2effff",
			weight: 1.35,
			theme: "cyberpunk",
		});
		expect(res.luminance).toBeGreaterThan(0.5);
		expect(res.onMaterial).toBe("oklch(0.10 0.02 265.76)");

		const contrast = (res.luminance + 0.05) / (0.011 + 0.05);
		expect(contrast).toBeGreaterThanOrEqual(4.5);
	});

	it("computes high contrast tokens on dark ground", () => {
		const res = computeEffectiveGroundLuminance({
			cardColor: "#111827",
			theme: "cyberpunk",
		});
		expect(res.luminance).toBeLessThan(0.2);
		expect(res.onMaterial).toBe("oklch(0.96 0.01 202.88)");

		const contrast = (0.88 + 0.05) / (res.luminance + 0.05);
		expect(contrast).toBeGreaterThanOrEqual(4.5);
	});

	it("computes high contrast tokens on obsidian theme cards", () => {
		const res = computeEffectiveGroundLuminance({
			pigmentColor: "#e0b0ff",
			weight: 0.34,
			theme: "obsidian",
		});
		expect(res.luminance).toBeGreaterThan(0.5);
		expect(res.onMaterial).toBe("oklch(0.10 0.02 265.76)");
	});

	it("computes high contrast light ink on dark Xuan paper ground with wash", () => {
		const res = computeEffectiveGroundLuminance({
			cardColor: "#181512",
			pigmentColor: "#2effff",
			weight: 0.35,
		});
		expect(res.luminance).toBeLessThan(0.22);
		expect(res.onMaterial).toBe("oklch(0.96 0.01 265.76)");
	});

	it("computes high contrast dark ink on light Xuan paper ground with wash", () => {
		const res = computeEffectiveGroundLuminance({
			cardColor: "#faf8f5",
			pigmentColor: "#ffb7c5",
			weight: 0.35,
		});
		expect(res.luminance).toBeGreaterThan(0.5);
		expect(res.onMaterial).toBe("oklch(0.10 0.02 265.76)");
	});
});

describe("Expanded component material and tone support", () => {
	it("renders SoftAlert with material and tone", () => {
		const html = renderToString(
			React.createElement(
				SoftAlert,
				{ material: "wash", tone: "iris", title: "Notice" },
				"Alert body text",
			),
		);
		expect(html).toContain("ui-lib-soft-alert");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="iris"');
		expect(html).toContain("Notice");
	});

	it("renders SoftEmptyState with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftEmptyState, {
				material: "tint",
				tone: "blossom",
				title: "No items found",
				body: "Try refreshing the list.",
			}),
		);
		expect(html).toContain("ui-lib-soft-empty");
		expect(html).toContain('data-ui-lib-material="tint"');
		expect(html).toContain('data-ui-lib-tone="blossom"');
		expect(html).toContain("No items found");
	});

	it("renders SoftSegmentedControl with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftSegmentedControl, {
				material: "wash",
				tone: "mist",
				options: [
					{ value: "a", label: "Option A" },
					{ value: "b", label: "Option B" },
				],
				value: "a",
				onChange: () => {},
			}),
		);
		expect(html).toContain("ui-lib-soft-segments");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="mist"');
		expect(html).toContain("Option A");
	});

	it("renders SoftLightPanel with material", () => {
		const html = renderToString(
			React.createElement(SoftLightPanel, { material: "wash", tone: "iris" }, "Panel content"),
		);
		expect(html).toContain("ui-lib-soft-light-panel");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain("Panel content");
	});

	it("renders SoftSelect with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftSelect, {
				material: "wash",
				tone: "blossom",
				options: [
					{ value: "1", label: "First" },
					{ value: "2", label: "Second" },
				],
				value: "1",
				onChange: () => {},
			}),
		);
		expect(html).toContain("ui-lib-soft-select");
		expect(html).toContain("First");
	});

	it("renders SoftTabs with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftTabs, {
				material: "wash",
				tone: "iris",
				items: ["First", "Second"],
			}),
		);
		expect(html).toContain("ui-lib-soft-tabs");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="iris"');
		expect(html).toContain("First");
	});

	it("renders SoftMenu with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftMenu, {
				material: "wash",
				tone: "iris",
				trigger: "Actions",
				items: [{ kind: "item", id: "edit", label: "Edit item", onSelect: () => {} }],
			}),
		);
		expect(html).toContain("ui-lib-soft-menu");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="iris"');
		expect(html).toContain("Actions");
	});

	it("renders SoftChip with material and tone", () => {
		const html = renderToString(
			React.createElement(SoftChip, { material: "wash", tone: "blossom" }, "Watercolor Tag"),
		);
		expect(html).toContain("ui-lib-soft-chip");
		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="blossom"');
		expect(html).toContain("Watercolor Tag");
	});
});
