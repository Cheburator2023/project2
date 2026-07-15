"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_atypical_works_logic_util_1 = require("./v2-atypical-works-logic.util");
(0, vitest_1.describe)("v2-atypical-works-logic.util", () => {
    (0, vitest_1.it)("computes row total from estimate and coefficient", () => {
        (0, vitest_1.expect)((0, v2_atypical_works_logic_util_1.computeAtypicalWorkRowTotal)(44, 1)).toBe(44);
        (0, vitest_1.expect)((0, v2_atypical_works_logic_util_1.computeAtypicalWorkRowTotal)("5", "1.2")).toBe(6);
        (0, vitest_1.expect)((0, v2_atypical_works_logic_util_1.computeAtypicalWorkRowTotal)("", 1)).toBeNull();
        (0, vitest_1.expect)((0, v2_atypical_works_logic_util_1.withComputedAtypicalWorkRowTotal)({
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
    (0, vitest_1.it)("collects atypicalWork array paths from uiSchema", () => {
        const paths = (0, v2_atypical_works_logic_util_1.collectAtypicalWorkArrayPaths)({
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
        (0, vitest_1.expect)(paths).toEqual([
            "detailInfo.field_npwqpBHt",
            "streamDataSources.field_eCyDEFw3",
        ]);
    });
    (0, vitest_1.it)("injects row_computed and unified-atypical-total rules", () => {
        const patched = (0, v2_atypical_works_logic_util_1.patchV2AtypicalWorksLogicRules)({ rules: [] }, {
            uiSchema: {
                detailInfo: {
                    field_npwqpBHt: {
                        "ui:options": { archComponent: "atypicalWork" },
                    },
                },
            },
        });
        const ids = patched.rules?.map((rule) => rule.id) ?? [];
        (0, vitest_1.expect)(ids).toContain("unified-atypical-total");
        (0, vitest_1.expect)(ids).toContain("unified-atypical-row-total:detailInfo_field_npwqpBHt");
        const rowRule = patched.rules?.find((rule) => rule.id === "unified-atypical-row-total:detailInfo_field_npwqpBHt");
        (0, vitest_1.expect)(rowRule?.kind).toBe("row_computed");
        (0, vitest_1.expect)(rowRule?.payload?.arrayPath).toBe("detailInfo.field_npwqpBHt");
        const totalRule = patched.rules?.find((rule) => rule.id === "unified-atypical-total");
        (0, vitest_1.expect)(totalRule?.targetPath).toBe("/summary/atypicalTotal");
    });
    (0, vitest_1.it)("buildUnifiedAtypicalTotalRule sums multiple paths", () => {
        const rule = (0, v2_atypical_works_logic_util_1.buildUnifiedAtypicalTotalRule)([
            "detailInfo.field_npwqpBHt",
            "streamDataSources.field_eCyDEFw3",
        ]);
        (0, vitest_1.expect)(rule?.condition).toMatchObject({
            "+": vitest_1.expect.any(Array),
        });
        (0, vitest_1.expect)(rule?.dependencies).toEqual([
            "/detailInfo/field_npwqpBHt",
            "/streamDataSources/field_eCyDEFw3",
        ]);
    });
});
