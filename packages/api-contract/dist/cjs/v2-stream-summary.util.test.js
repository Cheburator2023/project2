"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_stream_summary_util_1 = require("./v2-stream-summary.util");
const uiSchema = {
    streamDataSources: {
        "ui:options": { streamBlock: true, streamExecutor: "Источники данных" },
        sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    field_dadm: {
        "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    streamOptional: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: "Цифровые агенты",
            groupActivatable: true,
            groupActive: false,
        },
        field_typ: { "ui:options": { archComponent: "typicalWork" } },
    },
};
(0, vitest_1.describe)("buildExecutorStreamWorkSummaryRows", () => {
    (0, vitest_1.it)("aggregates typical and atypical totals per active stream block", () => {
        const rows = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            streamDataSources: {
                sourceTypicalTasks: [{ total: 5 }, { total: 3 }],
                field_atyp: [
                    {
                        estimateHoursPerDay: 2,
                        coefficient: 2,
                        includeInCalculation: true,
                    },
                ],
            },
            field_dadm: {
                field_atyp: [{ total: 4, includeInCalculation: true }],
            },
        }, uiSchema);
        const dadm = rows.find((row) => row.streamExecutor === "ДАДМ");
        const sources = rows.find((row) => row.streamExecutor === "Источники данных");
        (0, vitest_1.expect)(sources?.baseTypicalScore).toBe(8);
        (0, vitest_1.expect)(sources?.atypicalScore).toBe(4);
        (0, vitest_1.expect)(dadm?.baseTypicalScore).toBe(0);
        (0, vitest_1.expect)(dadm?.atypicalScore).toBe(4);
    });
    (0, vitest_1.it)("includes optional stream block only when group is active", () => {
        const inactive = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        (0, vitest_1.expect)(inactive.some((row) => row.streamExecutor === "Цифровые агенты")).toBe(false);
        const active = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            groupActivation: { streamOptional: true },
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        const optional = active.find((row) => row.streamExecutor === "Цифровые агенты");
        (0, vitest_1.expect)(optional?.baseTypicalScore).toBe(10);
    });
    (0, vitest_1.it)("applies the algorithm multiplier to adjusted typical scores", () => {
        const rows = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            streamDataSources: {
                sourceTypicalTasks: [{ total: 8 }],
            },
        }, uiSchema, 1.25);
        const sources = rows.find((row) => row.streamExecutor === "Источники данных");
        (0, vitest_1.expect)(sources).toMatchObject({
            baseTypicalScore: 8,
            adjustedTypicalScore: 10,
            deviationPercent: 25,
        });
    });
});
