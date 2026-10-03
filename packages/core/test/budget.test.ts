import { describe, expect, it } from "vitest";
import type { DeviceCapabilities } from "../src/device.js";
import {
	type PlatformBudget,
	QUALITY_PRESETS,
	QualityManager,
	resolveBudget,
	scoreTier,
} from "../src/quality.js";

const caps = (over: Partial<DeviceCapabilities> = {}): DeviceCapabilities => ({
	backend: "webgpu",
	webgpu: true,
	webgl2: true,
	cores: 10,
	memoryGB: 16,
	maxTextureSize: 16384,
	devicePixelRatio: 2,
	mobile: false,
	touch: false,
	reducedMotion: false,
	saveData: false,
	...over,
});

describe("platform budget", () => {
	describe("resolveBudget", () => {
		it("inherits every omitted field instead of blanking it", () => {
			// The whole point: a host that only cares about particle count must
			// not silently zero the DPR cap or the panel ceiling.
			const resolved = resolveBudget({
				host: "ue5-metal",
				source: "declared",
				tier: 3,
				preset: { particleBudget: 400_000 },
			});
			expect(resolved.particleBudget).toBe(400_000);
			expect(resolved.dprCap).toBe(QUALITY_PRESETS[3].dprCap);
			expect(resolved.maxPanels).toBe(QUALITY_PRESETS[3].maxPanels);
			expect(resolved.blurTaps).toBe(QUALITY_PRESETS[3].blurTaps);
		});

		it("treats an explicit undefined as omitted", () => {
			const resolved = resolveBudget({
				host: "ue5-metal",
				source: "declared",
				tier: 2,
				preset: { blurTaps: undefined, allowCompute: undefined },
			});
			expect(resolved.blurTaps).toBe(QUALITY_PRESETS[2].blurTaps);
			expect(resolved.allowCompute).toBe(QUALITY_PRESETS[2].allowCompute);
		});

		it("defaults to tier 2 when the host names no rung", () => {
			expect(resolveBudget({ host: "x", source: "declared" }).tier).toBe(2);
		});
	});

	describe("QualityManager", () => {
		it("probes the device when no budget is declared", () => {
			const manager = new QualityManager({
				capabilities: caps(),
				auto: false,
			});
			expect(manager.budgetSource).toBe("probed");
			expect(manager.budgetHost).toBe("web");
			expect(manager.tier).toBe(scoreTier(caps()));
		});

		it("takes a stated budget as-is, without a browser to probe", () => {
			// This is the seam. A UE5 host has no `navigator`; it states numbers.
			const budget: PlatformBudget = {
				host: "ue5-metal",
				source: "declared",
				tier: 1,
				preset: { particleBudget: 900_000, allowCompute: true, maxPanels: 64 },
			};
			const manager = new QualityManager({ budget });

			expect(manager.budgetHost).toBe("ue5-metal");
			expect(manager.budgetSource).toBe("declared");
			expect(manager.settings.particleBudget).toBe(900_000);
			expect(manager.settings.allowCompute).toBe(true);
			expect(manager.settings.maxPanels).toBe(64);
			// Fields the host did not mention follow the rung it named.
			expect(manager.settings.blurTaps).toBe(QUALITY_PRESETS[1].blurTaps);
		});

		it("holds a declared budget still when the runtime would downgrade", () => {
			// A host that stated its numbers is not guessing, so the adaptive
			// walk must not talk it out of them.
			const manager = new QualityManager({
				budget: { host: "ue5-metal", source: "declared", preset: { particleBudget: 500_000 } },
			});
			for (let i = 0; i < 400; i += 1) manager.sample(1 / 10);
			expect(manager.settings.particleBudget).toBe(500_000);
		});

		it("still walks the tier down when the budget was probed", () => {
			const manager = new QualityManager({ capabilities: caps(), auto: true });
			const before = manager.tier;
			for (let i = 0; i < 400; i += 1) manager.sample(1 / 10);
			expect(manager.tier).toBeLessThan(before);
		});

		it("keeps the declared overlay while the tier moves", () => {
			const manager = new QualityManager({
				budget: {
					host: "ue5-metal",
					source: "declared",
					tier: 3,
					preset: { particleBudget: 250_000 },
				},
			});
			manager.setTier(1);
			expect(manager.tier).toBe(1);
			// blurTaps follows the rung, the host's own number does not move.
			expect(manager.settings.blurTaps).toBe(QUALITY_PRESETS[1].blurTaps);
			expect(manager.settings.particleBudget).toBe(250_000);
		});
	});
});
