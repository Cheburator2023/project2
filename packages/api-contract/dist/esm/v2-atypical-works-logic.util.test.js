import { describe, expect, it } from "vitest";
import { buildUnifiedAtypicalTotalRule, collectAtypicalWorkArrayPaths, computeAtypicalWorkRowTotal, patchV2AtypicalWorksLogicRules, withComputedAtypicalWorkRowTotal, } from "./v2-atypical-works-logic.util";
describe("v2-atypical-works-logic.util", () => {
    it("computes row total from estimate and coefficient", () => {
        expect(computeAtypicalWorkRowTotal(44, 1)).toBe(44);
        expect(computeAtypicalWorkRowTotal("5", "1.2")).toBe(6);
        expect(computeAtypicalWorkRowTotal("", 1)).toBeNull();
        expect(withComputedAtypicalWorkRowTotal({
            name: "Задача",
            estimateHoursPerDay: 44,
            coefficient: 1,
        })).toEqual({
            name: "Задача",
            estimateHoursPerDay: 44,
            coefficient: 1,
            total: 44,
        });
    });
    it("collects atypicalWork array paths from uiSchema", () => {
        const paths = collectAtypicalWorkArrayPaths({
            detailInfo: {
                field_npwqpBHt: {
                    "ui:options": { archComponent: "atypicalWork" },
                },
            },
            streamDataSources: {
                field_eCyDEFw3: {
                    "ui:options": { archComponent: "atypicalWork" },
                },
            },
        });
        expect(paths).toEqual([
            "detailInfo.field_npwqpBHt",
            "streamDataSources.field_eCyDEFw3",
        ]);
    });
    it("injects row_computed and unified-atypical-total rules", () => {
        const patched = patchV2AtypicalWorksLogicRules({ rules: [] }, {
            uiSchema: {
                detailInfo: {
                    field_npwqpBHt: {
                        "ui:options": { archComponent: "atypicalWork" },
                    },
                },
            },
        });
        const ids = patched.rules?.map((rule) => rule.id) ?? [];
        expect(ids).toContain("unified-atypical-total");
        expect(ids).toContain("unified-atypical-row-total:detailInfo_field_npwqpBHt");
        const rowRule = patched.rules?.find((rule) => rule.id === "unified-atypical-row-total:detailInfo_field_npwqpBHt");
        expect(rowRule?.kind).toBe("row_computed");
        expect(rowRule?.payload?.arrayPath).toBe("detailInfo.field_npwqpBHt");
        const totalRule = patched.rules?.find((rule) => rule.id === "unified-atypical-total");
        expect(totalRule?.targetPath).toBe("/summary/atypicalTotal");
    });
    it("buildUnifiedAtypicalTotalRule sums multiple paths", () => {
        const rule = buildUnifiedAtypicalTotalRule([
            "detailInfo.field_npwqpBHt",
            "streamDataSources.field_eCyDEFw3",
        ]);
        expect(rule?.condition).toMatchObject({
            "+": expect.any(Array),
        });
        expect(rule?.dependencies).toEqual([
            "/detailInfo/field_npwqpBHt",
            "/streamDataSources/field_eCyDEFw3",
        ]);
    });
});
