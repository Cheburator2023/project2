import { describe, expect, it } from "vitest";
import { countActiveNormsOnDate, computeWorkTriggerStatus, isWorkCoefficientValueAvailable, isTypicalWorkParameterValueActiveOnDate, validateNormInputs, } from "./v2-typical-work-validation.util";
describe("validateNormInputs coverage", () => {
    it("requires exactly one active norm on coverage date", () => {
        const norms = [
            {
                normValue: 1,
                validFrom: "2024-01-01",
                validTo: "2024-12-31",
            },
            {
                normValue: 2,
                validFrom: "2025-01-01",
                validTo: null,
            },
        ];
        const issues = validateNormInputs(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        expect(issues.some((i) => i.path === "norms")).toBe(false);
        expect(countActiveNormsOnDate(norms, "2025-06-01")).toBe(1);
    });
    it("reports gap when no norm covers today", () => {
        const norms = [
            {
                normValue: 1,
                validFrom: "2024-01-01",
                validTo: "2024-12-31",
            },
        ];
        const issues = validateNormInputs(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        expect(issues).toContainEqual(expect.objectContaining({
            path: "norms",
            message: expect.stringContaining("нет действующей нормы"),
        }));
    });
    it("reports multiple active norms on coverage date", () => {
        const norms = [
            {
                normValue: 1,
                validFrom: "2024-01-01",
                validTo: null,
            },
            {
                normValue: 2,
                validFrom: "2025-01-01",
                validTo: null,
            },
        ];
        const issues = validateNormInputs(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        expect(issues).toContainEqual(expect.objectContaining({
            path: "norms",
            message: expect.stringContaining("более одной нормы"),
        }));
    });
    it("skips coverage check for empty norms list", () => {
        const issues = validateNormInputs([], "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        expect(issues).toHaveLength(0);
    });
});
describe("computeWorkTriggerStatus", () => {
    const catalog = [
        {
            code: "complexity",
            values: [
                { code: "low", label: "Низкая" },
                { code: "high", label: "Высокая" },
            ],
        },
    ];
    it("marks unknown param as invalid", () => {
        expect(computeWorkTriggerStatus([
            {
                paramCode: "missing",
                valueCode: "low",
                valueLabel: "Низкая",
            },
        ], catalog)).toBe("invalid");
    });
    it("marks stale value as invalid", () => {
        expect(computeWorkTriggerStatus([
            {
                paramCode: "complexity",
                valueCode: "removed",
                valueLabel: "Удалённое",
            },
        ], catalog)).toBe("invalid");
    });
    it("marks expired value as invalid for calculation date", () => {
        expect(computeWorkTriggerStatus([
            {
                paramCode: "complexity",
                valueCode: "old",
                valueLabel: "Старое",
            },
        ], [
            {
                code: "complexity",
                values: [
                    {
                        code: "old",
                        label: "Старое",
                        validFrom: "2024-01-01",
                        validTo: "2024-12-31",
                    },
                ],
            },
        ], "2025-06-01")).toBe("invalid");
    });
});
describe("isWorkCoefficientValueAvailable (F-03 §578)", () => {
    const catalog = [
        {
            code: "complexity",
            values: [
                { code: "low", label: "Низкая" },
                { code: "high", label: "Высокая" },
            ],
        },
    ];
    it("treats an existing dictionary value as available", () => {
        expect(isWorkCoefficientValueAvailable({ paramCode: "complexity", valueCode: "low", valueLabel: "Низкая" }, catalog)).toBe(true);
    });
    it("matches by label when the code was re-slugged", () => {
        expect(isWorkCoefficientValueAvailable({ paramCode: "complexity", valueCode: "stale", valueLabel: "Высокая" }, catalog)).toBe(true);
    });
    it("excludes a coefficient whose value was deleted from the dictionary", () => {
        expect(isWorkCoefficientValueAvailable({
            paramCode: "complexity",
            valueCode: "removed",
            valueLabel: "Удалённое",
        }, catalog)).toBe(false);
    });
    it("excludes a coefficient whose whole parameter is gone", () => {
        expect(isWorkCoefficientValueAvailable({ paramCode: "missing", valueCode: "low", valueLabel: "Низкая" }, catalog)).toBe(false);
    });
    it("keeps presence-flag rows (no value) available — no dictionary to delete from", () => {
        expect(isWorkCoefficientValueAvailable({ paramCode: "flag", valueCode: null, valueLabel: null }, catalog)).toBe(true);
    });
    it("excludes an expired value on calculation date", () => {
        expect(isWorkCoefficientValueAvailable({ paramCode: "complexity", valueCode: "old", valueLabel: "Старое" }, [
            {
                code: "complexity",
                values: [
                    {
                        code: "old",
                        label: "Старое",
                        validFrom: "2024-01-01",
                        validTo: "2024-12-31",
                    },
                ],
            },
        ], "2025-06-01")).toBe(false);
    });
});
describe("isTypicalWorkParameterValueActiveOnDate", () => {
    it("checks inclusive validFrom/validTo window", () => {
        const value = { validFrom: "2025-01-01", validTo: "2025-12-31" };
        expect(isTypicalWorkParameterValueActiveOnDate(value, "2024-12-31")).toBe(false);
        expect(isTypicalWorkParameterValueActiveOnDate(value, "2025-01-01")).toBe(true);
        expect(isTypicalWorkParameterValueActiveOnDate(value, "2025-12-31")).toBe(true);
        expect(isTypicalWorkParameterValueActiveOnDate(value, "2026-01-01")).toBe(false);
    });
});
