"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_validation_util_1 = require("./v2-typical-work-validation.util");
const v2_work_terms_formula_util_1 = require("./v2-work-terms-formula.util");
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
    (0, vitest_1.it)("does not invalidate schema field triggers against global catalog", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "field_HuOLfL4K",
                paramName: "Поле схемы",
                valueCode: "yes",
                valueLabel: "Да",
            },
        ], catalog)).toBe("appears");
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
    (0, vitest_1.it)("marks expired value as invalid for calculation date", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
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
    (0, vitest_1.it)("returns hidden when draft answers do not satisfy triggers", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "complexity",
                valueCode: "high",
                valueLabel: "Высокая",
            },
        ], catalog, undefined, { complexity: "low" })).toBe("hidden");
    });
    (0, vitest_1.it)("accepts seeded source-type triggers from CSV aliases", () => {
        const docCatalog = [
            {
                code: "тип_источника_данных",
                values: [
                    { code: "внутренний", label: "Внутренний" },
                    { code: "внешний", label: "Внешний" },
                ],
            },
        ];
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "тип_источника_внутренний",
                paramName: "Тип источника (внутренний)",
                valueCode: "внутренний",
                valueLabel: "Внутренний",
            },
        ], docCatalog)).toBe("appears");
    });
    (0, vitest_1.it)("accepts presence-only trigger rules when param exists in catalog", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "complexity",
                paramName: "Сложность",
                valueCode: null,
                valueLabel: null,
            },
        ], catalog)).toBe("appears");
    });
    (0, vitest_1.it)("accepts control-type triggers with short value codes", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.computeWorkTriggerStatus)([
            {
                paramCode: "вид_контроля_кд",
                paramName: "Вид контроля: КД",
                valueCode: "кд",
                valueLabel: "КД",
            },
        ], [
            {
                code: "вид_контроля",
                values: [
                    {
                        code: "кд",
                        label: "КД — Качество модельных данных",
                    },
                ],
            },
        ])).toBe("appears");
    });
});
(0, vitest_1.describe)("isWorkCoefficientValueAvailable (F-03 §578)", () => {
    const catalog = [
        {
            code: "complexity",
            values: [
                { code: "low", label: "Низкая" },
                { code: "high", label: "Высокая" },
            ],
        },
    ];
    (0, vitest_1.it)("treats an existing dictionary value as available", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "complexity", valueCode: "low", valueLabel: "Низкая" }, catalog)).toBe(true);
    });
    (0, vitest_1.it)("matches by label when the code was re-slugged", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "complexity", valueCode: "stale", valueLabel: "Высокая" }, catalog)).toBe(true);
    });
    (0, vitest_1.it)("excludes a coefficient whose value was deleted from the dictionary", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({
            paramCode: "complexity",
            valueCode: "removed",
            valueLabel: "Удалённое",
        }, catalog)).toBe(false);
    });
    (0, vitest_1.it)("excludes a coefficient whose whole parameter is gone", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "missing", valueCode: "low", valueLabel: "Низкая" }, catalog)).toBe(false);
    });
    (0, vitest_1.it)("treats schema field params as available without global catalog", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({
            paramCode: "field_Hqtu1z5O",
            valueCode: "Да",
            valueLabel: "Да",
        }, [])).toBe(true);
    });
    (0, vitest_1.it)("does not treat schemaFieldUid alone as available without catalog values", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({
            paramCode: "readyPromReports",
            schemaFieldUid: "field_12d42005-7d15-4d0f-9aa0-2b6eebc596c8",
            valueCode: null,
            valueLabel: "Да",
        }, [])).toBe(false);
    });
    (0, vitest_1.it)("matches short labor labels against full catalog enum labels", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "complexity", valueCode: "4", valueLabel: "4" }, [
            {
                code: "complexity",
                values: [{ code: "4", label: "4 — Высокая ×2.00" }],
            },
        ])).toBe(true);
    });
    (0, vitest_1.it)("keeps presence-flag rows (no value) available — no dictionary to delete from", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "flag", valueCode: null, valueLabel: null }, catalog)).toBe(true);
    });
    (0, vitest_1.it)("excludes an expired value on calculation date", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({ paramCode: "complexity", valueCode: "old", valueLabel: "Старое" }, [
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
    (0, vitest_1.it)("resolves labor coefficients saved under schema alias codes", () => {
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isWorkCoefficientValueAvailable)({
            paramCode: "field_yJ5IGkCR",
            valueCode: "Разработка",
            valueLabel: "Разработка",
        }, [
            {
                code: "workType",
                sourceKeys: ["field_yJ5IGkCR"],
                values: [
                    { code: "Разработка", label: "Разработка" },
                    { code: "Доработка", label: "Доработка" },
                ],
            },
        ])).toBe(true);
    });
});
(0, vitest_1.describe)("collectUnavailableLaborCoefficientIssues", () => {
    (0, vitest_1.it)("warns when labor param is unbound and missing from catalogs", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectUnavailableLaborCoefficientIssues)({
            laborParams: [
                {
                    paramCode: "readyPromReports",
                    paramName: "Наличие готовых промышленных витрин",
                    schemaFieldUid: null,
                    kind: "by_value",
                    coefficients: [
                        { valueCode: null, valueLabel: "Да" },
                        { valueCode: null, valueLabel: "Нет" },
                    ],
                },
            ],
            schemaParams: [],
            methodologyCatalog: [],
            formulaParamCodes: ["readyPromReports"],
        });
        (0, vitest_1.expect)(issues.some((issue) => /×1/.test(issue.message))).toBe(true);
    });
    (0, vitest_1.it)("warns when schemaFieldUid is missing but param exists in catalog", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectUnavailableLaborCoefficientIssues)({
            laborParams: [
                {
                    paramCode: "complexity",
                    paramName: "Сложность",
                    schemaFieldUid: null,
                    kind: "by_value",
                    coefficients: [{ valueCode: "1", valueLabel: "1" }],
                },
            ],
            schemaParams: [
                {
                    code: "complexity",
                    name: "Сложность",
                    values: [{ code: "1", label: "1" }],
                },
            ],
            formulaParamCodes: ["complexity"],
        });
        (0, vitest_1.expect)(issues.some((issue) => /без привязки к полю схемы/.test(issue.message))).toBe(true);
    });
});
(0, vitest_1.describe)("collectTypicalWorkPatchValidationErrors", () => {
    (0, vitest_1.it)("validates formulaTerms and laborParams any-of coefficients", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectTypicalWorkPatchValidationErrors)({
            streamExecutor: "ИД. Внутренний",
            formulaTerms: (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
                tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "p1" }],
                text: "H × P1",
            }),
            laborParams: [
                {
                    paramCode: "p1",
                    kind: "any_of",
                    anyOf: {
                        valueCodes: ["a"],
                        valueLabels: ["A"],
                        coeffOn: -1,
                        coeffOff: 1,
                    },
                },
            ],
        });
        (0, vitest_1.expect)(issues).toContainEqual(vitest_1.expect.objectContaining({
            path: "laborParams[0].anyOf.coeffOn",
        }));
    });
    (0, vitest_1.it)("reports unknown param in formulaTerms against laborParams", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectTypicalWorkPatchValidationErrors)({
            streamExecutor: "ИД. Внутренний",
            formulaTerms: (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
                tokens: [{ kind: "norm" }, { kind: "param_coeff", paramCode: "missing" }],
                text: "H × missing",
            }),
            laborParams: [
                {
                    paramCode: "p1",
                    kind: "by_value",
                    coefficients: [{ paramCode: "p1", valueCode: "a", valueLabel: "A", coefficient: 1 }],
                },
            ],
        });
        (0, vitest_1.expect)(issues.some((i) => i.path === "formula" || i.path === "formulaTerms")).toBe(true);
    });
    (0, vitest_1.it)("accepts any-of labor param referenced in formula by code and schema alias", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectTypicalWorkPatchValidationErrors)({
            streamExecutor: "Источники данных",
            formula: {
                tokens: [
                    { kind: "norm" },
                    { kind: "operator", op: "*" },
                    {
                        kind: "param_anyof",
                        paramCode: "field_Hqtu1z5O",
                        paramName: "Поле справочника @ field_Hqtu1z5O",
                    },
                ],
                text: "N × anyof(field_Hqtu1z5O)",
            },
            formulaTerms: (0, v2_work_terms_formula_util_1.tokensToTermsFormula)({
                tokens: [
                    { kind: "norm" },
                    { kind: "operator", op: "*" },
                    {
                        kind: "param_anyof",
                        paramCode: "field_Hqtu1z5O",
                        paramName: "Поле справочника @ field_Hqtu1z5O",
                    },
                ],
                text: "H × anyof",
            }),
            laborParams: [
                {
                    paramCode: "field_Hqtu1z5O",
                    paramName: "Поле справочника @ field_Hqtu1z5O",
                    kind: "any_of",
                    anyOf: {
                        valueCodes: ["Да"],
                        valueLabels: ["Да"],
                        coeffOn: 10,
                        coeffOff: 20,
                    },
                },
            ],
        });
        (0, vitest_1.expect)(issues.filter((issue) => issue.path === "formula")).toEqual([]);
    });
    (0, vitest_1.it)("accepts by-value labor param referenced in formula for schema field", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectTypicalWorkPatchValidationErrors)({
            streamExecutor: "Источники данных",
            formula: {
                tokens: [
                    { kind: "norm" },
                    { kind: "operator", op: "*" },
                    {
                        kind: "param_coeff",
                        paramCode: "field_dict",
                        paramName: "Поле справочника @ field_dict",
                    },
                ],
                text: "N × коэф(field_dict)",
            },
            laborParams: [
                {
                    paramCode: "field_dict",
                    paramName: "Поле справочника @ field_dict",
                    kind: "by_value",
                    coefficients: [
                        {
                            paramCode: "field_dict",
                            valueCode: "Да",
                            valueLabel: "Да",
                            coefficient: 20,
                        },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(issues.filter((issue) => issue.path === "formula")).toEqual([]);
    });
    (0, vitest_1.it)("rejects formula with negative effort for active norm (N − 30)", () => {
        const issues = (0, v2_typical_work_validation_util_1.collectTypicalWorkPatchValidationErrors)({
            streamExecutor: "ИД. Внутренний",
            formula: {
                tokens: [
                    { kind: "norm" },
                    { kind: "operator", op: "-" },
                    { kind: "number", value: 30 },
                ],
                text: "N − 30",
            },
            rounding: { mode: "CEIL", step: 1 },
            norms: [
                {
                    normValue: 20,
                    validFrom: "2020-01-01",
                    validTo: null,
                },
            ],
        }, { coverageDate: "2025-06-01" });
        (0, vitest_1.expect)(issues).toContainEqual(vitest_1.expect.objectContaining({
            path: "formula",
            message: vitest_1.expect.stringMatching(/не может быть отрицательным/i),
        }));
    });
});
(0, vitest_1.describe)("isTypicalWorkParameterValueActiveOnDate", () => {
    (0, vitest_1.it)("checks inclusive validFrom/validTo window", () => {
        const value = { validFrom: "2025-01-01", validTo: "2025-12-31" };
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isTypicalWorkParameterValueActiveOnDate)(value, "2024-12-31")).toBe(false);
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isTypicalWorkParameterValueActiveOnDate)(value, "2025-01-01")).toBe(true);
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isTypicalWorkParameterValueActiveOnDate)(value, "2025-12-31")).toBe(true);
        (0, vitest_1.expect)((0, v2_typical_work_validation_util_1.isTypicalWorkParameterValueActiveOnDate)(value, "2026-01-01")).toBe(false);
    });
});
