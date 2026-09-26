import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassPanel, GlassStage } from "../src/index.js";

describe("React adapter SSR", () => {
	it("renders semantic fallback markup without touching the DOM", () => {
		const html = renderToString(
			React.createElement(
				GlassStage,
				{ backdrop: { type: "gradient", colors: ["#111827", "#4c1d95"] } },
				React.createElement(
					GlassPanel,
					{ as: "main", "aria-label": "Product hero" },
					React.createElement("h1", null, "SSR-safe glass"),
				),
			),
		);

		expect(html).toContain("SSR-safe glass");
		expect(html).toContain('data-ui-lib-glass="fallback"');
		expect(html).toContain('aria-label="Product hero"');
	});
});
