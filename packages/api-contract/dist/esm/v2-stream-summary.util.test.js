import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import { V2_MODEL_STREAM_EXECUTOR } from "./v2-model-stream-typical-works.constants";
import { buildAtypicalTotalsByStreamLabel, buildExecutorStreamWorkSummaryRows, } from "./v2-stream-summary.util";
const uiSchema = {
    streamDataSources: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
        },
        sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    field_pirm: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
        },
        field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
    },
    streamOptional: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: V2_IMPLEMENTATION_STREAM.DIGAGT,
            groupActivatable: true,
            groupActive: false,
        },
        field_typ: { "ui:options": { archComponent: "typicalWork" } },
    },
};
describe("buildExecutorStreamWorkSummaryRows", () => {
    it("aggregates typical and atypical totals per active stream block", () => {
        const rows = buildExecutorStreamWorkSummaryRows({
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
        const pirm = rows.find((row) => row.streamExecutor === V2_IMPLEMENTATION_STREAM.PIRM);
        const sources = rows.find((row) => row.streamExecutor === V2_IMPLEMENTATION_STREAM.IDSRC);
        expect(sources?.baseTypicalScore).toBe(8);
        expect(sources?.atypicalScore).toBe(4);
        expect(pirm?.baseTypicalScore).toBe(0);
        expect(pirm?.atypicalScore).toBe(4);
    });
    it("includes optional stream block only when group is active", () => {
        const inactive = buildExecutorStreamWorkSummaryRows({
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        expect(inactive.some((row) => row.streamExecutor === V2_IMPLEMENTATION_STREAM.DIGAGT)).toBe(false);
        const active = buildExecutorStreamWorkSummaryRows({
            groupActivation: { streamOptional: true },
            streamOptional: { field_typ: [{ total: 10 }] },
        }, uiSchema);
        const optional = active.find((row) => row.streamExecutor === V2_IMPLEMENTATION_STREAM.DIGAGT);
        expect(optional?.baseTypicalScore).toBe(10);
    });
    it("applies the algorithm multiplier to adjusted typical scores", () => {
        const rows = buildExecutorStreamWorkSummaryRows({
            streamDataSources: {
                sourceTypicalTasks: [{ total: 8 }],
            },
        }, uiSchema, 1.25);
        const sources = rows.find((row) => row.streamExecutor === V2_IMPLEMENTATION_STREAM.IDSRC);
        expect(sources).toMatchObject({
            baseTypicalScore: 8,
            adjustedTypicalScore: 10,
            deviationPercent: 25,
        });
    });
});
describe("buildAtypicalTotalsByStreamLabel", () => {
    const subtotalUiSchema = {
        detailInfo: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: [
                    V2_IMPLEMENTATION_STREAM.KMBKCB,
                    V2_IMPLEMENTATION_STREAM.RB,
                ],
            },
            field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
        },
        ...uiSchema,
    };
    it("группирует нетиповые под меткой стрима из панели итогов", () => {
        const totals = buildAtypicalTotalsByStreamLabel({
            detailInfo: { field_atyp: [{ total: 7, includeInCalculation: true }] },
            field_pirm: { field_atyp: [{ total: 4, includeInCalculation: true }] },
        }, subtotalUiSchema);
        // Блок модельных стримов сводится в зонтичный «Модельный стрим», иначе подытог
        // не сойдётся с таблицей типовых работ, которая группируется так же.
        expect(totals.find((row) => row.streamLabel === V2_MODEL_STREAM_EXECUTOR)
            ?.atypicalTotal).toBe(7);
        expect(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(4);
    });
    it("возвращает стримы без нетиповых работ с нулём", () => {
        const totals = buildAtypicalTotalsByStreamLabel({}, subtotalUiSchema);
        // Панель показывает подытог у каждого стрима схемы, даже пустого.
        expect(totals.find((row) => row.streamLabel === "Источники данных")
            ?.atypicalTotal).toBe(0);
    });
    it("не учитывает строки, исключённые из расчёта", () => {
        const totals = buildAtypicalTotalsByStreamLabel({
            field_pirm: {
                field_atyp: [
                    { total: 4, includeInCalculation: true },
                    { total: 100, includeInCalculation: false },
                ],
            },
        }, subtotalUiSchema);
        expect(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(4);
    });
    it("предпочитает свежие данные расчёта сохранённой форме", () => {
        const totals = buildAtypicalTotalsByStreamLabel({
            field_pirm: { field_atyp: [{ total: 4, includeInCalculation: true }] },
        }, subtotalUiSchema, {
            field_pirm: { field_atyp: [{ total: 9, includeInCalculation: true }] },
        });
        expect(totals.find((row) => row.streamLabel === "ПиРМ")?.atypicalTotal).toBe(9);
    });
});
