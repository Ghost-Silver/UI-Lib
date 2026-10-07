import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftColorPicker } from "../src/index.js";

describe("SoftColorPicker rendering and accessibility", () => {
	it("renders section with accessible label and default structure", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "宣纸调色盘",
				value: "#8b5cf6",
			}),
		);

		expect(html).toContain("<section");
		expect(html).toContain('aria-label="宣纸调色盘"');
		expect(html).toContain("ui-lib-soft-color-picker");
		expect(html).toContain("宣纸水墨 (KM)");
		expect(html).toContain("数字色域 (HSL)");
	});

	it("renders mode switcher when allowModeSwitch is enabled", () => {
		const withSwitch = renderToString(
			React.createElement(SoftColorPicker, {
				label: "调色板",
				allowModeSwitch: true,
			}),
		);
		expect(withSwitch).toContain('role="tablist"');
		expect(withSwitch).toContain("宣纸水墨 (KM)");

		const withoutSwitch = renderToString(
			React.createElement(SoftColorPicker, {
				label: "调色板",
				allowModeSwitch: false,
			}),
		);
		expect(withoutSwitch).not.toContain('role="tablist"');
	});

	it("renders live specimen preview card with optics layers", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "标本展示调色器",
				showSpecimen: true,
				defaultValue: "#8b5cf6",
			}),
		);

		expect(html).toContain("ui-lib-soft-color-picker__specimen-card");
		expect(html).toContain("ui-lib-soft-color-picker__specimen-rim");
		expect(html).toContain("ui-lib-soft-color-picker__specimen-core");
		expect(html).toContain("ui-lib-soft-color-picker__specimen-glass");
		expect(html).toContain("#8B5CF6");
	});

	it("hides specimen preview when showSpecimen is false", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "无标本调色器",
				showSpecimen: false,
			}),
		);

		expect(html).not.toContain("ui-lib-soft-color-picker__specimen-card");
	});

	it("renders preset swatches grid with accessible swatch buttons", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "预设色板测试",
				showPresets: true,
				value: "#8b5cf6",
			}),
		);

		expect(html).toContain("ui-lib-soft-color-picker__presets");
		expect(html).toContain("设计色系预设");
		expect(html).toContain("ui-lib-soft-color-picker__swatch");
		expect(html).toContain('aria-label="选择预设色彩');
	});

	it("hides preset swatches when showPresets is false", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "纯净调色器",
				showPresets: false,
			}),
		);

		expect(html).not.toContain("ui-lib-soft-color-picker__presets");
	});

	it("renders wash mode sliders for physical pigment mixing", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "物理混色测试",
				mode: "wash",
			}),
		);

		expect(html).toContain("矿物基调");
		expect(html).toContain("含水量 / 稀释度");
		expect(html).toContain("宣纸纤维沉降");
	});

	it("renders digital mode sliders when mode is digital", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "数字色相测试",
				mode: "digital",
			}),
		);

		expect(html).toContain("色相 (Hue)");
		expect(html).toContain("饱和度 (Saturation)");
		expect(html).toContain("明度 (Lightness)");
	});

	it("applies material and tone data attributes", () => {
		const html = renderToString(
			React.createElement(SoftColorPicker, {
				label: "材质适配测试",
				material: "wash",
				tone: "blossom",
			}),
		);

		expect(html).toContain('data-ui-lib-material="wash"');
		expect(html).toContain('data-ui-lib-tone="blossom"');
	});
});
