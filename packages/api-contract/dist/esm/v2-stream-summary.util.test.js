import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import { buildExecutorStreamWorkSummaryRows } from "./v2-stream-summary.util";
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
