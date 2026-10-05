import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	computeEffectiveGroundLuminance,
	SoftAlert,
	SoftEmptyState,
	SoftLightPanel,
	SoftSegmentedControl,
	SoftSelect,
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
});
