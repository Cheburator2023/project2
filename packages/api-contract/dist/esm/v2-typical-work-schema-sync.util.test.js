import { describe, expect, it } from "vitest";
import { reconcileTypicalWorkCardWithSchemaField } from "./v2-typical-work-schema-sync.util";
function card() {
    return {
        id: "work-1",
        name: "Работа",
        archComponentType: "Источник",
        workType: null,
        streamExecutor: "Источник",
        triggerStatus: "appears",
        norms: [],
        rules: [
            {
                id: "rule-1",
                streamExecutor: "Источник",
                schemaFieldUid: "field-1",
                paramCode: "old_code",
                paramName: "Старое имя",
                operator: "in",
                valueCode: null,
                valueLabel: null,
                values: [
                    { code: "keep", label: "Старое значение" },
                    { code: "drop", label: "Удалённое значение" },
                ],
            },
        ],
        laborParams: [
            {
                schemaFieldUid: "field-1",
                paramCode: "old_code",
                paramName: "Старое имя",
                kind: "by_value",
                coefficients: [
                    {
                        id: "coeff-1",
                        streamExecutor: "Источник",
                        paramCode: "old_code",
                        paramName: "Старое имя",
                        valueCode: "keep",
                        valueLabel: "Старое значение",
                        coefficient: 2,
                    },
                ],
            },
        ],
        formula: {
            tokens: [
                { kind: "norm" },
                { kind: "operator", op: "*" },
                { kind: "param_coeff", paramCode: "old_code" },
            ],
            text: "N × коэф(old_code)",
        },
        rounding: { mode: "NONE", step: null },
    };
}
describe("reconcileTypicalWorkCardWithSchemaField", () => {
    it("preserves matching dictionary values and refreshes names and codes", () => {
        const result = reconcileTypicalWorkCardWithSchemaField(card(), {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "new_code",
                name: "Новое имя",
                values: [
                    { code: "keep", label: "Новое значение" },
                    { code: "new", label: "Новое" },
                ],
            },
        });
        expect(result.changed).toBe(true);
        expect(result.card.rules[0]).toMatchObject({
            paramCode: "new_code",
            paramName: "Новое имя",
            values: [{ code: "keep", label: "Новое значение" }],
        });
        expect(result.card.laborParams[0]?.coefficients).toMatchObject([
            { valueCode: "keep", coefficient: 2, valueLabel: "Новое значение" },
            { valueCode: "new", coefficient: 1, valueLabel: "Новое" },
        ]);
        expect(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "new_code",
            paramName: "Новое имя",
        });
    });
    it("removes field references and invalidates formula tokens", () => {
        const result = reconcileTypicalWorkCardWithSchemaField(card(), {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "delete",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
            },
        });
        expect(result.card.rules).toEqual([]);
        expect(result.card.laborParams).toEqual([]);
        expect(result.card.formula.tokens[2]).toMatchObject({
            kind: "param_coeff",
            paramCode: "old_code",
            invalid: true,
        });
        expect(result.impact).toMatchObject({
            rulesRemoved: 1,
            laborParamsRemoved: 1,
            formulasInvalidated: 1,
        });
    });
    it("backfills legacy references only by the previous code", () => {
        const legacy = card();
        delete legacy.rules[0].schemaFieldUid;
        delete legacy.laborParams[0].schemaFieldUid;
        const result = reconcileTypicalWorkCardWithSchemaField(legacy, {
            templateVersionId: "version-1",
            mode: "apply",
            operation: "upsert",
            field: {
                schemaFieldUid: "field-1",
                previousCode: "old_code",
                code: "old_code",
                name: "Имя",
                values: [{ code: "keep", label: "Значение" }],
            },
        });
        expect(result.card.rules[0]?.schemaFieldUid).toBe("field-1");
        expect(result.card.laborParams[0]?.schemaFieldUid).toBe("field-1");
    });
});
