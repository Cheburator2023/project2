"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
const v2_stream_summary_util_1 = require("./v2-stream-summary.util");
const uiSchema = {
    streamDataSources: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
        },
        sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    field_pirm: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
        },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    streamOptional: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT,
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
            field_pirm: {
                field_atyp: [{ total: 4, includeInCalculation: true }],
            },
        }, uiSchema);
        const pirm = rows.find((row) => row.streamExecutor === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM);
        const sources = rows.find((row) => row.streamExecutor === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)(sources?.baseTypicalScore).toBe(8);
        (0, vitest_1.expect)(sources?.atypicalScore).toBe(4);
        (0, vitest_1.expect)(pirm?.baseTypicalScore).toBe(0);
        (0, vitest_1.expect)(pirm?.atypicalScore).toBe(4);
    });
    (0, vitest_1.it)("includes optional stream block only when group is active", () => {
        const inactive = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        (0, vitest_1.expect)(inactive.some((row) => row.streamExecutor === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT)).toBe(false);
        const active = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            groupActivation: { streamOptional: true },
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        const optional = active.find((row) => row.streamExecutor === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT);
        (0, vitest_1.expect)(optional?.baseTypicalScore).toBe(10);
    });
    (0, vitest_1.it)("applies the algorithm multiplier to adjusted typical scores", () => {
        const rows = (0, v2_stream_summary_util_1.buildExecutorStreamWorkSummaryRows)({
            streamDataSources: {
                sourceTypicalTasks: [{ total: 8 }],
            },
        }, uiSchema, 1.25);
        const sources = rows.find((row) => row.streamExecutor === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)(sources).toMatchObject({
            baseTypicalScore: 8,
            adjustedTypicalScore: 10,
            deviationPercent: 25,
        });
    });
});
(0, vitest_1.describe)("buildAtypicalTotalsByStreamLabel", () => {
    const subtotalUiSchema = {
        detailInfo: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: [
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
                ],
            },
            field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
        },
        ...uiSchema,
    };
    (0, vitest_1.it)("группирует нетиповые под меткой стрима из панели итогов", () => {
        const totals = (0, v2_stream_summary_util_1.buildAtypicalTotalsByStreamLabel)({
            detailInfo: { field_atyp: [{ total: 7, includeInCalculation: true }] },
            field_pirm: { field_atyp: [{ total: 4, includeInCalculation: true }] },
        }, subtotalUiSchema);
        // Блок модельных стримов сводится в зонтичный «Модельный стрим», иначе подытог
        // не сойдётся с таблицей типовых работ, которая группируется так же.
        (0, vitest_1.expect)(totals.find((row) => row.streamLabel === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR)
            ?.atypicalTotal).toBe(7);
        (0, vitest_1.expect)(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(4);
    });
    (0, vitest_1.it)("возвращает стримы без нетиповых работ с нулём", () => {
        const totals = (0, v2_stream_summary_util_1.buildAtypicalTotalsByStreamLabel)({}, subtotalUiSchema);
        // Панель показывает подытог у каждого стрима схемы, даже пустого.
        (0, vitest_1.expect)(totals.find((row) => row.streamLabel === "Источники данных")
            ?.atypicalTotal).toBe(0);
    });
    (0, vitest_1.it)("не учитывает строки, исключённые из расчёта", () => {
        const totals = (0, v2_stream_summary_util_1.buildAtypicalTotalsByStreamLabel)({
            field_pirm: {
                field_atyp: [
                    { total: 4, includeInCalculation: true },
                    { total: 100, includeInCalculation: false },
                ],
            },
        }, subtotalUiSchema);
        (0, vitest_1.expect)(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(4);
    });
    (0, vitest_1.it)("предпочитает свежие данные расчёта сохранённой форме", () => {
        const totals = (0, v2_stream_summary_util_1.buildAtypicalTotalsByStreamLabel)({
            field_pirm: { field_atyp: [{ total: 4, includeInCalculation: true }] },
        }, subtotalUiSchema, {
            field_pirm: { field_atyp: [{ total: 9, includeInCalculation: true }] },
        });
        (0, vitest_1.expect)(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(9);
    });
});
