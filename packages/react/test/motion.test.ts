import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	FOCUS_HALO,
	PinkPaperButton,
	PRESS_DAMPING,
	PRESS_EASING,
	SoftLightPanel,
	type SpringInteractionResult,
	useSpringInteraction,
	WatercolorCard,
} from "../src/index.js";

describe("Motion tokens and physics presets", () => {
	it("defines press damping zeta = 0.55 and cubic-bezier easing", () => {
		expect(PRESS_DAMPING).toBe(0.55);
		expect(PRESS_EASING).toBe("cubic-bezier(0.28, 1.38, 0.48, 1)");
	});

	it("defines two-layer soft diffuse focus halo", () => {
		expect(FOCUS_HALO).toContain("0 0 0 2px var(--moe-card)");
		expect(FOCUS_HALO).toContain("12px 3px var(--moe-taro-500)");
	});
});

describe("useSpringInteraction hook", () => {
	it("provides spring physics interaction driver methods and ref", () => {
		let captured: SpringInteractionResult<HTMLButtonElement> | null = null;
		function InteractiveButton() {
			captured = useSpringInteraction<HTMLButtonElement>({
				property: "--press",
				motion: "press",
			});
			return React.createElement("button", { type: "button", ref: captured.ref }, "Press");
		}

		const html = renderToString(React.createElement(InteractiveButton));
		expect(html).toContain("Press");
		const current = captured as SpringInteractionResult<HTMLButtonElement> | null;
		expect(current).not.toBeNull();
		expect(current?.ref).toBeDefined();
		expect(typeof current?.to).toBe("function");
		expect(typeof current?.set).toBe("function");
	});

	it("respects enabled: false without errors", () => {
		let captured: SpringInteractionResult<HTMLButtonElement> | null = null;
		function DisabledButton() {
			captured = useSpringInteraction<HTMLButtonElement>({
				enabled: false,
			});
			return React.createElement("button", { type: "button", ref: captured.ref }, "No Spring");
		}
		const html = renderToString(React.createElement(DisabledButton));
		expect(html).toContain("No Spring");
		expect(captured).not.toBeNull();
	});
});

describe("Micro-interaction physics and tilt support", () => {
	it("renders PinkPaperButton / SoftButton with tilt and spring enabled", () => {
		const html = renderToString(
			React.createElement(
				PinkPaperButton,
				{ tilt: true, spring: true, tone: "blossom" },
				"Press Me",
			),
		);
		expect(html).toContain("ui-lib-paper-button");
		expect(html).toContain("data-ui-lib-spring");
		expect(html).toContain("Press Me");
	});

	it("renders SoftLightPanel with tilt enabled", () => {
		const html = renderToString(
			React.createElement(SoftLightPanel, { tilt: true, tone: "mist" }, "Light Panel"),
		);
		expect(html).toContain("ui-lib-soft-light-panel");
		expect(html).toContain("Light Panel");
	});

	it("renders WatercolorCard with tilt enabled", () => {
		const html = renderToString(
			React.createElement(WatercolorCard, { tilt: true, tone: "iris" }, "Card Content"),
		);
		expect(html).toContain("ui-lib-watercolor-card");
		expect(html).toContain("Card Content");
	});
});
