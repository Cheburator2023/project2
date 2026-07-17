import { describe, expect, it } from "vitest";
import { archCountTriggerMatches, encodeTriggerArchCountSteps, formatArchCountCoeffSteps, lookupArchCountCoefficient, parseArchCountCoeffSteps, parseWorkArchCountKindLabel, resolveArchCountCoeffFromToken, resolveWorkArchComponentCount, validateArchCountCoeffSteps, } from "./v2-work-arch-count-coeff.util";
describe("v2-work-arch-count-coeff.util", () => {
    it("resolves model count from modelsList", () => {
        expect(resolveWorkArchComponentCount({
            detailInfo: {
                modelsList: [{ name: "A" }, { name: "B" }],
            },
        }, "model")).toBe(2);
    });
    it("resolves filled source systems count", () => {
        expect(resolveWorkArchComponentCount({
            detailInfo: {
                sourceSystems: [{ name: "S1" }, {}, { name: "S2" }],
            },
        }, "sourceSystem")).toBe(2);
    });
    it("lookupArchCountCoefficient returns exact match only", () => {
        const steps = [
            { count: 1, coefficient: 2 },
            { count: 2, coefficient: 1.5 },
        ];
        expect(lookupArchCountCoefficient(steps, 1)).toBe(2);
        expect(lookupArchCountCoefficient(steps, 2)).toBe(1.5);
        expect(lookupArchCountCoefficient(steps, 3)).toBeNull();
    });
    it("resolveArchCountCoeffFromToken falls back to 1", () => {
        expect(resolveArchCountCoeffFromToken({ detailInfo: { modelsList: [{}, {}, {}] } }, "model", [{ count: 1, coefficient: 2 }])).toBe(1);
    });
    it("validateArchCountCoeffSteps enforces model range 1-99", () => {
        expect(validateArchCountCoeffSteps("model", [{ count: 100, coefficient: 1 }])).toMatch(/1.*99/);
    });
    it("parseArchCountCoeffSteps and format round-trip", () => {
        const raw = "1=2; 2=1.5";
        const steps = parseArchCountCoeffSteps(raw);
        expect(steps).toEqual([
            { count: 1, coefficient: 2 },
            { count: 2, coefficient: 1.5 },
        ]);
        expect(formatArchCountCoeffSteps(steps)).toBe("1=2; 2=1,5");
    });
    it("parseWorkArchCountKindLabel accepts Russian labels", () => {
        expect(parseWorkArchCountKindLabel("Модели")).toBe("model");
        expect(parseWorkArchCountKindLabel("Система-источник")).toBe("sourceSystem");
    });
    it("archCountTriggerMatches supports comparison operators", () => {
        const formWithTwoModels = {
            detailInfo: { modelsList: [{ id: 1 }, { id: 2 }] },
        };
        expect(archCountTriggerMatches(formWithTwoModels, "model", encodeTriggerArchCountSteps(">=", 2))).toBe(true);
        expect(archCountTriggerMatches(formWithTwoModels, "model", encodeTriggerArchCountSteps("=", 2))).toBe(true);
        expect(archCountTriggerMatches(formWithTwoModels, "model", encodeTriggerArchCountSteps("=", 3))).toBe(false);
    });
    it("archCountTriggerMatches requires count >= min step (legacy)", () => {
        expect(archCountTriggerMatches({}, "model", [{ count: 2, coefficient: 1 }])).toBe(false);
    });
});
