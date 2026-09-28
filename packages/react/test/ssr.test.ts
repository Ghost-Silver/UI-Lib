import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	GlassPanel,
	GlassStage,
	Lens,
	Magnetic,
	Optics,
	ParticleField,
	PointerTrail,
	Reveal,
} from "../src/index.js";

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

	it("renders magnetic markup and no lens DOM", () => {
		const html = renderToString(
			React.createElement(
				Magnetic,
				null,
				React.createElement("button", { type: "button" }, "Hold"),
			),
		);
		expect(html).toContain("Hold");
		expect(html).toContain("data-ui-lib-magnetic");
		expect(renderToString(React.createElement(Lens))).toBe("");
		expect(renderToString(React.createElement(Optics))).toBe("");
		expect(renderToString(React.createElement(ParticleField, { pointer: true }))).toBe("");
		expect(renderToString(React.createElement(PointerTrail))).toBe("");
		const reveal = renderToString(
			React.createElement(Reveal, { as: "h1" }, "The night keeps moving."),
		);
		expect(reveal).toContain("The");
		expect(reveal).toContain("night");
		expect(reveal).toContain("keeps");
		expect(reveal).toContain("moving.");
		expect(reveal).toContain("data-ui-lib-reveal");
		expect(reveal).toContain("<h1");
	});
});
