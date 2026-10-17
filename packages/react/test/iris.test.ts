import { IRIS } from "@ui-lib/core";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	Bling,
	BubbleBadge,
	GlassStage,
	PinkPaperButton,
	SoftLightPanel,
	WatercolorCard,
} from "../src/index.js";
import { splitGlassProps } from "../src/irisPanel.js";
import { GLASS_LOOKS } from "../src/looks.js";

describe("IRIS components", () => {
	describe("the shared prop split", () => {
		it("keeps the look when a caller passes an explicit undefined", () => {
			// The whole point of `mergeDefined`: omitting a field, or spreading
			// an object that carries `undefined`, must not clobber the look.
			const { options } = splitGlassProps(
				{ frost: undefined, roughness: undefined } as Record<string, unknown>,
				{ frost: 22, roughness: 0.3 },
			);
			expect(options.frost).toBe(22);
			expect(options.roughness).toBe(0.3);
		});

		it("lets a real value win over the look", () => {
			const { options } = splitGlassProps({ frost: 4 } as Record<string, unknown>, {
				frost: 22,
			});
			expect(options.frost).toBe(4);
		});

		it("does not swallow DOM props into the optical options", () => {
			const onClick = () => {};
			const { options, rest } = splitGlassProps(
				{ onClick, className: "mine", frost: 3 } as Record<string, unknown>,
				{},
			);
			expect(rest.onClick).toBe(onClick);
			expect(rest.className).toBe("mine");
			expect(options).not.toHaveProperty("onClick");
			expect(options).not.toHaveProperty("className");
		});
	});

	describe("tones", () => {
		it("gives each tone its own rung of the palette", () => {
			expect(GLASS_LOOKS.iris.tint).toBe(IRIS.iris[100]);
			const iris = renderToString(React.createElement(BubbleBadge, { tone: "iris" }, "a"));
			const blossom = renderToString(
				React.createElement(BubbleBadge, { tone: "blossom" }, "a"),
			);
			expect(iris).toContain("ui-lib-bubble-badge--iris");
			expect(blossom).toContain("ui-lib-bubble-badge--blossom");
		});

		it("defaults to the brand violet", () => {
			expect(renderToString(React.createElement(BubbleBadge, null, "x"))).toContain(
				"ui-lib-bubble-badge--iris",
			);
		});
	});

	describe("server rendering", () => {
		it("renders every component as real DOM without a canvas", () => {
			const html = renderToString(
				React.createElement(
					React.Fragment,
					null,
					React.createElement(BubbleBadge, null, "新"),
					React.createElement(PinkPaperButton, null, "开始"),
					React.createElement(SoftLightPanel, null, "面板"),
					React.createElement(WatercolorCard, null, "卡片"),
					React.createElement(Bling, { count: 3 }),
				),
			);
			expect(html).toContain("ui-lib-bubble-badge");
			expect(html).toContain("ui-lib-paper-button");
			expect(html).toContain("ui-lib-soft-light-panel");
			expect(html).toContain("ui-lib-watercolor-card");
			expect(html).toContain("ui-lib-bling__gem");
			expect(html).not.toContain("canvas");
		});

		it("keeps the button a button", () => {
			const html = renderToString(
				React.createElement(PinkPaperButton, { disabled: true }, "停"),
			);
			expect(html).toContain("<button");
			expect(html).toContain("disabled");
			expect(html).toContain('type="button"');
		});

		it("scatters bling deterministically so hydration matches", () => {
			const once = renderToString(React.createElement(Bling, { count: 5, seed: 3 }));
			const twice = renderToString(React.createElement(Bling, { count: 5, seed: 3 }));
			expect(once).toBe(twice);
			const other = renderToString(React.createElement(Bling, { count: 5, seed: 4 }));
			expect(other).not.toBe(once);
		});

		it("renders inside a stage alongside the existing adapter", () => {
			const html = renderToString(
				React.createElement(
					GlassStage,
					{
						backdrop: {
							type: "gradient",
							colors: ["#ffffff", "#efeaff", "#ffffff", "#efeaff"],
						},
					},
					React.createElement(BubbleBadge, null, "inner"),
				),
			);
			expect(html).toContain("ui-lib-bubble-badge");
		});
	});
});
