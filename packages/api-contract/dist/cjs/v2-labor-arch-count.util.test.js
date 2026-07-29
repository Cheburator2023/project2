"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_labor_arch_count_util_1 = require("./v2-labor-arch-count.util");
(0, vitest_1.describe)("v2-labor-arch-count.util", () => {
    (0, vitest_1.it)("splits model count from schema labor params", () => {
        const split = (0, v2_labor_arch_count_util_1.splitCatalogLaborArchCounts)({
            laborParams: ["Кол-во моделей", "Сложность постановки"],
            laborCoefficients: [
                {
                    paramName: "Кол-во моделей",
                    values: [
                        { label: "1", coefficient: 1 },
                        { label: "2", coefficient: 1.75 },
                    ],
                },
            ],
        });
        (0, vitest_1.expect)(split.laborParams).toEqual(["Сложность постановки"]);
        (0, vitest_1.expect)(split.laborArchCounts).toHaveLength(1);
        (0, vitest_1.expect)(split.laborArchCounts[0]?.kind).toBe("model");
        (0, vitest_1.expect)(split.laborArchCounts[0]?.steps[1]).toEqual({
            count: 2,
            coefficient: 1.75,
        });
    });
    (0, vitest_1.it)("resolves source system arch count from catalog label", () => {
        const arch = (0, v2_labor_arch_count_util_1.resolveArchCountLaborFromCatalog)("Кол-во источников для проработки", [{ label: "2", coefficient: 1.2 }]);
        (0, vitest_1.expect)(arch?.kind).toBe("sourceSystem");
        (0, vitest_1.expect)(arch?.steps).toEqual([{ count: 2, coefficient: 1.2 }]);
    });
    (0, vitest_1.it)("reconciles formula arch_count_coeff tokens from laborArchCounts", () => {
        const result = (0, v2_labor_arch_count_util_1.reconcileFormulaWithLaborArchCounts)({
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "complexity" },
            ],
            text: "N * коэф(complexity)",
        }, [{ kind: "model", steps: [{ count: 1, coefficient: 1 }], paramName: null }]);
        (0, vitest_1.expect)(result.tokens).toEqual([
            { kind: "norm" },
            { kind: "operator", op: "*" },
            {
                kind: "arch_count_coeff",
                archComponentKind: "model",
                steps: [{ count: 1, coefficient: 1 }],
            },
            { kind: "operator", op: "*" },
            { kind: "param_coeff", paramCode: "complexity" },
        ]);
    });
    (0, vitest_1.it)("preserves division and operand order when syncing arch steps", () => {
        const result = (0, v2_labor_arch_count_util_1.reconcileFormulaWithLaborArchCounts)({
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "overallUncertainty" },
                { kind: "operator", op: "*" },
                {
                    kind: "arch_count_coeff",
                    archComponentKind: "sourceSystem",
                    steps: [{ count: 1, coefficient: 1 }],
                },
                { kind: "operator", op: "/" },
                { kind: "param_coeff", paramCode: "assessedInitiativesCount" },
            ],
            text: "N * коэф(overallUncertainty) * архкоэф(Система-источник; 1=1) ÷ коэф(assessedInitiativesCount)",
        }, [
            {
                kind: "sourceSystem",
                steps: [
                    { count: 1, coefficient: 1 },
                    { count: 2, coefficient: 1.2 },
                ],
                paramName: null,
            },
        ]);
        (0, vitest_1.expect)(result.tokens.map((token) => token.kind)).toEqual([
            "norm",
            "operator",
            "param_coeff",
            "operator",
            "arch_count_coeff",
            "operator",
            "param_coeff",
        ]);
        (0, vitest_1.expect)(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
        (0, vitest_1.expect)(result.tokens[4]).toMatchObject({
            kind: "arch_count_coeff",
            archComponentKind: "sourceSystem",
            steps: [
                { count: 1, coefficient: 1 },
                { count: 2, coefficient: 1.2 },
            ],
        });
        (0, vitest_1.expect)(result.text).toContain("÷");
    });
    (0, vitest_1.it)("repairs legacy arch-insert corruption (adjacent operands + * /)", () => {
        const result = (0, v2_labor_arch_count_util_1.reconcileFormulaWithLaborArchCounts)({
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                {
                    kind: "arch_count_coeff",
                    archComponentKind: "sourceSystem",
                    steps: [{ count: 1, coefficient: 1 }],
                },
                { kind: "param_coeff", paramCode: "overallUncertainty" },
                { kind: "operator", op: "*" },
                { kind: "operator", op: "/" },
                { kind: "param_coeff", paramCode: "assessedInitiativesCount" },
            ],
            text: "broken",
        }, [
            {
                kind: "sourceSystem",
                steps: [{ count: 1, coefficient: 1 }],
                paramName: null,
            },
        ]);
        (0, vitest_1.expect)(result.tokens.map((token) => token.kind)).toEqual([
            "norm",
            "operator",
            "arch_count_coeff",
            "operator",
            "param_coeff",
            "operator",
            "param_coeff",
        ]);
        (0, vitest_1.expect)(result.tokens[3]).toEqual({ kind: "operator", op: "*" });
        (0, vitest_1.expect)(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
        (0, vitest_1.expect)(result.text).toContain("÷");
    });
    (0, vitest_1.it)("inserts missing arch without creating adjacent operands", () => {
        const result = (0, v2_labor_arch_count_util_1.reconcileFormulaWithLaborArchCounts)({
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "overallUncertainty" },
                { kind: "operator", op: "/" },
                { kind: "param_coeff", paramCode: "assessedInitiativesCount" },
            ],
            text: "N * коэф(overallUncertainty) ÷ коэф(assessedInitiativesCount)",
        }, [
            {
                kind: "sourceSystem",
                steps: [{ count: 1, coefficient: 1 }],
                paramName: null,
            },
        ]);
        (0, vitest_1.expect)(result.tokens.map((token) => token.kind)).toEqual([
            "norm",
            "operator",
            "arch_count_coeff",
            "operator",
            "param_coeff",
            "operator",
            "param_coeff",
        ]);
        (0, vitest_1.expect)(result.tokens[5]).toEqual({ kind: "operator", op: "/" });
    });
});
