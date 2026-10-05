import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	FOCUS_HALO,
	PRESS_DAMPING,
	PRESS_EASING,
	type SpringInteractionResult,
	useSpringInteraction,
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
});
