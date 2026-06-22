"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_param_dependency_logic_util_1 = require("./v2-param-dependency-logic.util");
const bindings = [
    {
        paramCode: "source",
        paramName: "Источник",
        pointers: ["/detailInfo/parameters/streamsOutsideDADM"],
    },
    {
        paramCode: "target",
        paramName: "Цель",
        pointers: ["/detailInfo/parameters/streamNames"],
    },
];
const graph = {
    targets: [
        {
            targetParamCode: "target",
            rules: [
                {
                    id: "r1",
                    sourceParamCode: "source",
                    operator: "=",
                    valueCode: "yes",
                    valueLabel: "Да",
                },
            ],
        },
    ],
};
(0, vitest_1.describe)("v2-param-dependency-logic.util", () => {
    (0, vitest_1.it)("builds visibility rules for mapped pointers", () => {
        const rules = (0, v2_param_dependency_logic_util_1.buildParamDependencyVisibilityRules)(graph, bindings);
        (0, vitest_1.expect)(rules).toHaveLength(1);
        (0, vitest_1.expect)(rules[0]).toMatchObject({
            kind: "visibility",
            targetPath: "/detailInfo/parameters/streamNames",
            condition: {
                "==": [{ var: "detailInfo.parameters.streamsOutsideDADM" }, "Да"],
            },
            payload: {
                paramDependency: true,
                targetParamCode: "target",
            },
        });
        (0, vitest_1.expect)((0, v2_param_dependency_logic_util_1.isParamDependencyLogicRule)(rules[0])).toBe(true);
    });
    (0, vitest_1.it)("roundtrips graph through logic rules", () => {
        const merged = (0, v2_param_dependency_logic_util_1.mergeParamDependencyRulesIntoLogic)([
            {
                id: "other",
                kind: "hint",
                targetPath: "/",
                dependencies: [],
                condition: true,
            },
        ], graph, bindings);
        (0, vitest_1.expect)(merged).toHaveLength(2);
        (0, vitest_1.expect)((0, v2_param_dependency_logic_util_1.parseParamDependencyGraphFromLogic)(merged)).toEqual(graph);
    });
    (0, vitest_1.it)("uses some() for sibling fields inside array items", () => {
        const arrayBindings = [
            {
                paramCode: "tip",
                paramName: "Тип",
                pointers: ["/streamDataSources/sourceSystems/items/type"],
            },
            {
                paramCode: "slozhnost",
                paramName: "Сложность",
                pointers: ["/streamDataSources/sourceSystems/items/domainComplexity"],
            },
        ];
        const arrayGraph = {
            targets: [
                {
                    targetParamCode: "slozhnost",
                    rules: [
                        {
                            id: "r1",
                            sourceParamCode: "tip",
                            operator: "=",
                            valueCode: "vnutrennij",
                            valueLabel: "Внутренний",
                        },
                    ],
                },
            ],
        };
        const rules = (0, v2_param_dependency_logic_util_1.buildParamDependencyVisibilityRules)(arrayGraph, arrayBindings);
        (0, vitest_1.expect)(rules[0]?.condition).toEqual({
            some: [
                { var: "streamDataSources.sourceSystems" },
                { "==": [{ var: "type" }, "Внутренний"] },
            ],
        });
    });
    (0, vitest_1.it)("resolves hidden param codes from source row", () => {
        const graph = {
            targets: [
                {
                    targetParamCode: "slozhnost",
                    rules: [
                        {
                            id: "r1",
                            sourceParamCode: "type",
                            operator: "=",
                            valueCode: "vnutrennij",
                            valueLabel: "Внутренний",
                        },
                    ],
                },
            ],
        };
        const defs = [
            { code: "type", name: "Тип системы-источника" },
            { code: "slozhnost", name: "Сложность предметной области" },
        ];
        const hidden = (0, v2_param_dependency_logic_util_1.resolveHiddenParamCodesForSource)(graph, { type: "Внешний" }, defs);
        (0, vitest_1.expect)(hidden.has("slozhnost")).toBe(true);
        (0, vitest_1.expect)((0, v2_param_dependency_logic_util_1.evaluateParamDependencyRulesForSource)(graph.targets[0].rules, { type: "Внутренний" }, defs)).toBe(true);
    });
    (0, vitest_1.it)("filters coefficient logic for hidden source fields", () => {
        const logic = {
            "*": [
                {
                    if: [
                        { "==": [{ var: "domainComplexity" }, "Средняя"] },
                        1,
                        1,
                    ],
                },
                {
                    if: [
                        { "==": [{ var: "entityVolume" }, "Малое"] },
                        0.5,
                        1,
                    ],
                },
            ],
        };
        const filtered = (0, v2_param_dependency_logic_util_1.filterCoefficientLogicForHiddenFields)(logic, new Set(["domainComplexity"]));
        (0, vitest_1.expect)(filtered["*"][0]).toBe(1);
        (0, vitest_1.expect)(filtered["*"][1]).toEqual(logic["*"][1]);
    });
    (0, vitest_1.it)("maps hidden param codes to source field keys", () => {
        const keys = (0, v2_param_dependency_logic_util_1.resolveHiddenSourceFieldKeys)(new Set(["slozhnost_predmetnoj_oblasti"]), [
            {
                code: "slozhnost_predmetnoj_oblasti",
                name: "Сложность предметной области",
            },
        ], { domainComplexity: "Средняя" });
        (0, vitest_1.expect)(keys.has("domainComplexity")).toBe(true);
    });
});
