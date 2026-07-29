"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_factory_typical_works_publish_util_1 = require("./v2-factory-typical-works-publish.util");
function baseCard(overrides) {
    return {
        archComponentType: "Система-источник",
        workType: "Опциональная",
        triggerStatus: "appears",
        norms: [
            {
                id: "n1",
                streamExecutor: overrides.streamExecutor,
                normValue: 15,
                validFrom: "2025-01-01",
                validTo: null,
            },
        ],
        rules: [],
        laborParams: [],
        formula: { tokens: [{ kind: "norm" }], text: "N" },
        rounding: { mode: "CEIL", step: 0.01 },
        ...overrides,
    };
}
(0, vitest_1.describe)("v2-factory-typical-works-publish.util", () => {
    (0, vitest_1.it)("extracts stage prefixes", () => {
        (0, vitest_1.expect)((0, v2_factory_typical_works_publish_util_1.extractPublishWorkStage)("02. Поиск данных")).toBe("02");
        (0, vitest_1.expect)((0, v2_factory_typical_works_publish_util_1.extractPublishWorkStage)("Этап 210. Foo")).toBe("Этап 210");
        (0, vitest_1.expect)((0, v2_factory_typical_works_publish_util_1.extractPublishWorkStage)("AutoML: bar")).toBe("AutoML");
    });
    (0, vitest_1.it)("builds registry and upserts catalog with formula and any_of", () => {
        const existing = [
            {
                stream: "ПиРМ",
                component: "Модель",
                stage: "",
                name: "ПиРМ only",
                originalName: "ПиРМ only",
                workType: "Опциональная",
                norm: 1,
                normRaw: "1",
                triggerParam: "",
                triggerParams: [],
                laborParams: [],
            },
            {
                stream: "Модельный стрим",
                component: "Система-источник",
                stage: "02",
                name: "Поиск данных",
                originalName: "Поиск данных",
                workType: "Опциональная",
                norm: 10,
                normRaw: "10",
                triggerParam: "",
                triggerParams: [],
                laborParams: [],
                formulaText: "N",
            },
        ];
        const cards = [
            baseCard({
                id: "w1",
                name: "02. Поиск данных",
                streamExecutor: "Модельный стрим",
                rules: [
                    {
                        id: "r1",
                        streamExecutor: "Модельный стрим",
                        paramCode: "readyPromReports",
                        paramName: "Продуктивизация",
                        operator: "=",
                        valueCode: "false",
                        valueLabel: "Нет",
                        schemaFieldUid: "field_x",
                    },
                ],
                formula: {
                    tokens: [
                        { kind: "norm" },
                        { kind: "operator", op: "/" },
                        { kind: "param_coeff", paramCode: "assessedInitiativesCount" },
                    ],
                    text: "N ÷ коэф(assessedInitiativesCount)",
                },
                laborParams: [
                    {
                        paramCode: "flags",
                        paramName: "Флаги",
                        kind: "any_of",
                        coefficients: [],
                        anyOf: {
                            valueCodes: ["a"],
                            valueLabels: ["A"],
                            coeffOn: 1.2,
                            coeffOff: 1,
                        },
                    },
                    {
                        paramCode: "workType",
                        paramName: "Тип работ",
                        kind: "by_value",
                        coefficients: [
                            {
                                id: "c1",
                                streamExecutor: "Модельный стрим",
                                paramCode: "workType",
                                paramName: "Тип работ",
                                valueCode: "обучение",
                                valueLabel: "Обучение",
                                coefficient: 1.5,
                            },
                        ],
                    },
                ],
                triggerMode: "formula",
                triggerFormula: {
                    tokens: [],
                    text: "x = 1",
                },
            }),
        ];
        const result = (0, v2_factory_typical_works_publish_util_1.publishFactoryTypicalWorksBundle)({
            cards,
            existingCatalog: existing,
            templateId: "tpl-1",
            templateName: "Etalon",
            coverageDate: "2026-07-29",
        });
        (0, vitest_1.expect)(result.registry.works).toHaveLength(1);
        (0, vitest_1.expect)(result.registry.works[0]).toMatchObject({
            id: "w1",
            name: "02. Поиск данных",
            streams: ["Модельный стрим"],
            normsByStream: { "Модельный стрим": 15 },
        });
        (0, vitest_1.expect)(result.report.catalogPreserved).toBe(1);
        (0, vitest_1.expect)(result.report.catalogUpdated).toBe(1);
        (0, vitest_1.expect)(result.report.dropped.some((d) => d.field.includes("triggerMode"))).toBe(true);
        const updated = result.catalogRows.find((row) => (0, v2_factory_typical_works_publish_util_1.buildFactoryCatalogRowKey)(row) ===
            (0, v2_factory_typical_works_publish_util_1.buildFactoryCatalogRowKey)({
                component: "Система-источник",
                stage: "02",
                name: "Поиск данных",
                stream: "Модельный стрим",
            }));
        (0, vitest_1.expect)(updated?.formulaText).toContain("÷");
        (0, vitest_1.expect)(updated?.laborCoefficients?.[0]?.kind).toBe("any_of");
        (0, vitest_1.expect)(updated?.laborCoefficients?.[0]?.anyOf?.coeffOn).toBe(1.2);
        (0, vitest_1.expect)(updated?.triggerRules?.[0]?.paramCode).toBe("readyPromReports");
        (0, vitest_1.expect)(updated?.laborCoefficients?.find((g) => g.paramCode === "workType")?.values).toEqual([
            vitest_1.expect.objectContaining({
                label: "Обучение",
                code: "обучение",
                coefficient: 1.5,
            }),
        ]);
        (0, vitest_1.expect)(result.catalogRows.some((r) => r.name === "ПиРМ only")).toBe(true);
        const meta = (0, v2_factory_typical_works_publish_util_1.rebuildFactoryCatalogSnapshotMeta)(result.catalogRows, {
            snapshotVersion: 2,
        });
        (0, vitest_1.expect)(meta.counts.typicalWorks).toBe(2);
        (0, vitest_1.expect)(meta.counts.typicalWorksWithFormula).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("adds new catalog rows when key is missing", () => {
        const result = (0, v2_factory_typical_works_publish_util_1.publishFactoryTypicalWorksBundle)({
            cards: [
                baseCard({
                    id: "w2",
                    name: "04. Витрина",
                    streamExecutor: "Модельный стрим",
                    formula: { tokens: [{ kind: "norm" }], text: "N * 2" },
                }),
            ],
            existingCatalog: [],
            templateId: "tpl-1",
        });
        (0, vitest_1.expect)(result.report.catalogAdded).toBe(1);
        (0, vitest_1.expect)(result.catalogRows[0]?.stage).toBe("04");
        (0, vitest_1.expect)(result.catalogRows[0]?.name).toBe("Витрина");
        (0, vitest_1.expect)(result.catalogRows[0]?.formulaText).toBe("N * 2");
    });
});
