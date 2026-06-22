import { describe, expect, it } from "vitest";
import { countActiveNormsOnDate, computeWorkTriggerStatus, validateNormInputs, } from "./v2-typical-work-validation.util";
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
});
