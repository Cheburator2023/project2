import { describe, expect, it } from "vitest";
import { buildFactoryCatalogRowKey, extractPublishWorkStage, publishFactoryTypicalWorksBundle, rebuildFactoryCatalogSnapshotMeta, } from "./v2-factory-typical-works-publish.util";
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
describe("v2-factory-typical-works-publish.util", () => {
    it("extracts stage prefixes", () => {
        expect(extractPublishWorkStage("02. Поиск данных")).toBe("02");
        expect(extractPublishWorkStage("Этап 210. Foo")).toBe("Этап 210");
        expect(extractPublishWorkStage("AutoML: bar")).toBe("AutoML");
        expect(extractPublishWorkStage("1. Качество модельных данных [КД]")).toBeNull();
    });
    it("builds registry and upserts catalog with formula and any_of", () => {
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
        const result = publishFactoryTypicalWorksBundle({
            cards,
            existingCatalog: existing,
            templateId: "tpl-1",
            templateName: "Etalon",
            coverageDate: "2026-07-29",
        });
        expect(result.registry.works).toHaveLength(1);
        expect(result.registry.works[0]).toMatchObject({
            id: "w1",
            name: "02. Поиск данных",
            streams: ["Модельный стрим"],
            normsByStream: { "Модельный стрим": 15 },
        });
        expect(result.report.catalogPreserved).toBe(1);
        expect(result.report.catalogUpdated).toBe(1);
        expect(result.report.dropped.some((d) => d.field.includes("triggerMode"))).toBe(true);
        const updated = result.catalogRows.find((row) => buildFactoryCatalogRowKey(row) ===
            buildFactoryCatalogRowKey({
                component: "Система-источник",
                stage: "02",
                name: "Поиск данных",
                stream: "Модельный стрим",
            }));
        expect(updated?.formulaText).toContain("÷");
        expect(updated?.laborCoefficients?.[0]?.kind).toBe("any_of");
        expect(updated?.laborCoefficients?.[0]?.anyOf?.coeffOn).toBe(1.2);
        expect(updated?.triggerRules?.[0]?.paramCode).toBe("readyPromReports");
        expect(updated?.laborCoefficients?.find((g) => g.paramCode === "workType")?.values).toEqual([
            expect.objectContaining({
                label: "Обучение",
                code: "обучение",
                coefficient: 1.5,
            }),
        ]);
        expect(result.catalogRows.some((r) => r.name === "ПиРМ only")).toBe(true);
        const meta = rebuildFactoryCatalogSnapshotMeta(result.catalogRows, {
            snapshotVersion: 2,
        });
        expect(meta.counts.typicalWorks).toBe(2);
        expect(meta.counts.typicalWorksWithFormula).toBeGreaterThanOrEqual(1);
    });
    it("adds new catalog rows when key is missing", () => {
        const result = publishFactoryTypicalWorksBundle({
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
        expect(result.report.catalogAdded).toBe(1);
        expect(result.catalogRows[0]?.stage).toBe("04");
        expect(result.catalogRows[0]?.name).toBe("Витрина");
        expect(result.catalogRows[0]?.formulaText).toBe("N * 2");
    });
    it("merges legacy ИД streams into Источники данных without duplicates", () => {
        const existing = [
            {
                stream: "ИД. Внутренний",
                component: "Процесс обработки данных",
                stage: "Этап 212",
                name: "Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования",
                originalName: "legacy",
                workType: "Обязательная",
                norm: 22,
                normRaw: "22",
                triggerParam: "Тип системы-источника",
                triggerParams: ["Тип системы-источника"],
                triggerRules: [
                    {
                        paramName: "Тип системы-источника",
                        paramCode: "type",
                        operator: "=",
                        values: ["Внутренний"],
                    },
                ],
                laborParams: ["Тип работ"],
                formulaText: "N * old",
            },
            {
                stream: "ИД. Внешний",
                component: "Процесс обработки данных",
                stage: "Этап 212",
                name: "Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования",
                originalName: "legacy-ext",
                workType: "Обязательная",
                norm: 22,
                normRaw: "22",
                triggerParam: "",
                triggerParams: [],
                laborParams: [],
                formulaText: "N * old-ext",
            },
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
        ];
        const result = publishFactoryTypicalWorksBundle({
            cards: [
                baseCard({
                    id: "w212",
                    name: "Этап 212. Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования",
                    streamExecutor: "Источники данных",
                    archComponentType: "Процесс обработки данных",
                    formula: {
                        tokens: [{ kind: "norm" }],
                        text: "N × (коэф(field_yJ51GkCR) + коэф(field_qMxSfHk1))",
                    },
                    rules: [
                        {
                            id: "r1",
                            streamExecutor: "Источники данных",
                            paramCode: "type",
                            paramName: "Тип системы-источника",
                            operator: "=",
                            valueCode: "внутренний",
                            valueLabel: "Внутренний",
                        },
                    ],
                }),
            ],
            existingCatalog: existing,
            templateId: "tpl-1",
            coverageDate: "2026-07-29",
        });
        expect(result.report.catalogUpdated).toBe(1);
        expect(result.report.catalogAdded).toBe(0);
        expect(result.report.catalogPreserved).toBe(1);
        expect(result.report.legacyStreamCatalogRows).toBe(0);
        expect(result.catalogRows).toHaveLength(2);
        const updated = result.catalogRows.find((row) => row.name.includes("процесса загрузки"));
        expect(updated?.stream).toBe("Источники данных");
        expect(updated?.formulaText).toContain("field_yJ51GkCR");
        expect(updated?.triggerRules?.[0]?.valueCode).toBe("внутренний");
        expect(result.catalogRows.some((row) => row.name === "ПиРМ only")).toBe(true);
    });
});
