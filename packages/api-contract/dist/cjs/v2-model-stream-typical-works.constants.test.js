"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
(0, vitest_1.describe)("compareModelStreamTypicalWorkNames", () => {
    (0, vitest_1.it)("orders model stream stages like CSV", () => {
        const names = [
            "AutoML: внедрение",
            "05. Разработка модели",
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
        ];
        names.sort(v2_model_stream_typical_works_constants_1.compareModelStreamTypicalWorkNames);
        (0, vitest_1.expect)(names).toEqual([
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
            "05. Разработка модели",
            "AutoML: внедрение",
        ]);
    });
});
(0, vitest_1.describe)("dedupeTypicalWorkRowsByWorkId", () => {
    (0, vitest_1.it)("keeps one row per workId and sums coefficient/total", () => {
        const workId = "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001";
        const rows = (0, v2_model_stream_typical_works_constants_1.dedupeTypicalWorkRowsByWorkId)([
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
        ]);
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(rows[0]?.coefficient).toBe(4);
        (0, vitest_1.expect)(rows[0]?.total).toBe(224);
        (0, vitest_1.expect)(rows[0]).toMatchObject({
            coefficientDisplay: "×4",
            sourceName: "×4",
        });
    });
});
(0, vitest_1.describe)("isModelStreamTypicalWorkVisibleInSummary", () => {
    (0, vitest_1.it)("hides zero-total placeholder rows", () => {
        (0, vitest_1.expect)((0, v2_model_stream_typical_works_constants_1.isModelStreamTypicalWorkVisibleInSummary)({ total: 0 })).toBe(false);
        (0, vitest_1.expect)((0, v2_model_stream_typical_works_constants_1.isModelStreamTypicalWorkVisibleInSummary)({ total: 33 })).toBe(true);
    });
});
