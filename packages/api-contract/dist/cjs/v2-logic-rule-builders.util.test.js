"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_logic_rule_builders_util_1 = require("./v2-logic-rule-builders.util");
(0, vitest_1.describe)("v2-logic-rule-builders.util", () => {
    (0, vitest_1.it)("maps JSON Pointer to var path", () => {
        (0, vitest_1.expect)((0, v2_logic_rule_builders_util_1.v2JsonPointerToVarPath)("/detailInfo/parameters/streamsOutsideDADM")).toBe("detailInfo.parameters.streamsOutsideDADM");
    });
    (0, vitest_1.it)("builds visibility rule for checked boolean", () => {
        const rule = (0, v2_logic_rule_builders_util_1.buildBooleanVisibilityRule)({
            id: "test",
            targetPointer: "/detailInfo/parameters/streamNames",
            sourcePointer: "/detailInfo/parameters/streamsOutsideDADM",
            description: "Названия стримов при галочке.",
        });
        (0, vitest_1.expect)(rule).toMatchObject({
            kind: "visibility",
            targetPath: "/detailInfo/parameters/streamNames",
            dependencies: ["/detailInfo/parameters/streamsOutsideDADM"],
            condition: {
                "==": [{ var: "detailInfo.parameters.streamsOutsideDADM" }, true],
            },
            description: "Названия стримов при галочке.",
        });
    });
});
