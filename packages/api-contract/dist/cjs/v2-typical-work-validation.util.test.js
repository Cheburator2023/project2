"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_validation_util_1 = require("./v2-typical-work-validation.util");
(0, vitest_1.describe)("validateNormInputs coverage", () => {
    (0, vitest_1.it)("requires exactly one active norm on coverage date", () => {
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
        const issues = (0, v2_typical_work_validation_util_1.validateNormInputs)(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        (0, vitest_1.expect)(issues.some((i) => i.path === "norms")).toBe(false);
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.countActiveNormsOnDate)(norms, "2025-06-01")).toBe(1);
    });
    (0, vitest_1.it)("reports gap when no norm covers today", () => {
        const norms = [
            {
                normValue: 1,
                validFrom: "2024-01-01",
                validTo: "2024-12-31",
            },
        ];
        const issues = (0, v2_typical_work_validation_util_1.validateNormInputs)(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        (0, vitest_1.expect)(issues).toContainEqual(vitest_1.expect.objectContaining({
            path: "norms",
            message: vitest_1.expect.stringContaining("нет действующей нормы"),
        }));
    });
    (0, vitest_1.it)("reports multiple active norms on coverage date", () => {
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
        const issues = (0, v2_typical_work_validation_util_1.validateNormInputs)(norms, "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        (0, vitest_1.expect)(issues).toContainEqual(vitest_1.expect.objectContaining({
            path: "norms",
            message: vitest_1.expect.stringContaining("более одной нормы"),
        }));
    });
    (0, vitest_1.it)("skips coverage check for empty norms list", () => {
        const issues = (0, v2_typical_work_validation_util_1.validateNormInputs)([], "ИД. Внутренний", {
            coverageDate: "2025-06-01",
        });
        (0, vitest_1.expect)(issues).toHaveLength(0);
    });
});
(0, vitest_1.describe)("computeWorkTriggerStatus", () => {
    const catalog = [
        {
            code: "complexity",
            values: [
                { code: "low", label: "Низкая" },
                { code: "high", label: "Высокая" },
            ],
        },
    ];
    (0, vitest_1.it)("marks unknown param as invalid", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "missing",
                valueCode: "low",
                valueLabel: "Низкая",
            },
        ], catalog)).toBe("invalid");
    });
    (0, vitest_1.it)("marks stale value as invalid", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "complexity",
                valueCode: "removed",
                valueLabel: "Удалённое",
            },
        ], catalog)).toBe("invalid");
    });
});
