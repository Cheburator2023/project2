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
        (0, vitest_1.expect)(result.tokens.some((token) => token.kind === "arch_count_coeff")).toBe(true);
    });
});
