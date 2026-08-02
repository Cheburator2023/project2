"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_stream_block_executor_util_1 = require("./v2-stream-block-executor.util");
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
(0, vitest_1.describe)("v2-executor-streams.util", () => {
    (0, vitest_1.it)("lists seven executor stream labels", () => {
        (0, vitest_1.expect)(v2_executor_streams_util_1.V2_EXECUTOR_STREAM_LABELS).toEqual([
            "ДАДМ",
            "ПиРМ",
            "Источники данных",
            "Контроль моделей",
            "Цифровые агенты",
            "Потоковые данные",
            "Модельный стрим",
        ]);
    });
    (0, vitest_1.it)("maps legacy block keys to implementation stream codes", () => {
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)("streamDataSources")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)("field_i8dL7QZa")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM);
    });
    (0, vitest_1.it)("validates executor stream labels", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)("ПиРМ")).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)("Unknown")).toBe(false);
    });
});
(0, vitest_1.describe)("resolveV2AnketaStreamBlockOptions", () => {
    (0, vitest_1.it)("reads explicit stream block metadata", () => {
        const opts = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)({
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT,
            },
        });
        (0, vitest_1.expect)(opts.streamBlock).toBe(true);
        (0, vitest_1.expect)(opts.streamExecutor).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)({
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            },
        }, "customBlock")).toEqual({
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            streamExecutors: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
            streamBlockRoles: [],
        });
    });
    (0, vitest_1.it)("infers legacy stream blocks without explicit flag", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(undefined, "streamModelControl")).toEqual({
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL,
            streamExecutors: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL],
            streamBlockRoles: [],
        });
    });
});
(0, vitest_1.describe)("resolveV2AnketaSectionDisplayTitle", () => {
    (0, vitest_1.it)("prefixes stream object block titles with Стрим", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC], {
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            },
        }, "field_dadm")).toBe(`Стрим «${v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]}»`);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL], undefined, "streamModelControl")).toBe(`Стрим «${v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]}»`);
    });
    (0, vitest_1.it)("keeps factory snapshot titles without double prefix", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("Стрим «Источники данных»", {
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            },
        }, "streamDataSources")).toBe("Стрим «Источники данных»");
    });
    (0, vitest_1.it)("leaves non-stream object titles unchanged", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveV2AnketaSectionDisplayTitle)("Общие сведения", { "ui:options": { sectionRole: "main" } }, "generalInfo")).toBe("Общие сведения");
    });
    (0, vitest_1.it)("formatV2StreamBlockSectionTitle is idempotent", () => {
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM)).toBe(`Стрим «${v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]}»`);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)(`Стрим «${v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]}»`)).toBe(`Стрим «${v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]}»`);
    });
});
(0, vitest_1.describe)("collectExecutorStreamBlocks", () => {
    (0, vitest_1.it)("lists explicit and legacy root stream blocks", () => {
        const blocks = (0, v2_anketa_section_ui_util_1.collectExecutorStreamBlocks)({
            field_src: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
                },
            },
            streamDataSources: {},
        });
        (0, vitest_1.expect)(blocks.map((b) => b.streamExecutors).flat().sort()).toEqual([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
        ]);
    });
    (0, vitest_1.it)("detects stream presence for logic labels and legacy db names", () => {
        const uiSchema = {
            field_src: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
                },
            },
        };
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, "ИД. Внутренний")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, "ДАДМ")).toBe(false);
    });
    (0, vitest_1.it)("expands umbrella «Модельный стрим» detailInfo to five model child codes", () => {
        const uiSchema = {
            detailInfo: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
                },
            },
        };
        const blocks = (0, v2_anketa_section_ui_util_1.collectExecutorStreamBlocks)(uiSchema);
        (0, vitest_1.expect)(blocks).toHaveLength(1);
        (0, vitest_1.expect)(blocks[0]?.pointer).toBe("/detailInfo");
        (0, vitest_1.expect)(blocks[0]?.streamExecutors).toEqual([
            ...v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES,
        ]);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.isExecutorStreamPresentInSchema)(uiSchema, v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveModelStreamUmbrellaBlockPointer)(uiSchema)).toBe("/detailInfo");
    });
    (0, vitest_1.it)("resolves stream for typicalWork block from explicit option or root stream", () => {
        const uiSchema = {
            field_stream: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
                },
                field_tasks: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
            field_root: {
                "ui:options": {
                    archComponent: "typicalWork",
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
                },
            },
        };
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveStreamExecutorForTypicalWorkOutputPath)(uiSchema, "field_stream.field_tasks")).toEqual([v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]);
        (0, vitest_1.expect)((0, v2_anketa_section_ui_util_1.resolveStreamExecutorForTypicalWorkOutputPath)(uiSchema, "field_root")).toEqual([v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]);
    });
    (0, vitest_1.it)("reads multi-stream executor metadata", () => {
        const opts = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)({
            "ui:options": {
                streamBlock: true,
                streamExecutor: [
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
                ],
            },
        });
        (0, vitest_1.expect)(opts.streamExecutor).toEqual([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
        ]);
    });
    (0, vitest_1.it)("typicalWorkAssignedToAnyExecutorStream matches any selected stream", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToAnyExecutorStream)(["ИД. Внутренний"], [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC, v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM])).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToAnyExecutorStream)(["ДАДМ"], [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC, v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM])).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToAnyExecutorStream)(["Моделирование РБ"], [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC, v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM])).toBe(false);
    });
    (0, vitest_1.it)("typicalWorkAssignedToExecutorStream matches DB stream aliases", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)(["ИД. Внутренний"], v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)(["Контроль моделей"], v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(false);
    });
    (0, vitest_1.it)("includes mdlctl DB stream in «Контроль моделей» catalog scope", () => {
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)("Контроль моделей")).toEqual(vitest_1.expect.arrayContaining(["mdlctl", "Контроль моделей"]));
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)("mdlctl")).toEqual(vitest_1.expect.arrayContaining(["mdlctl", "Контроль моделей"]));
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)(["mdlctl"], "Контроль моделей")).toBe(true);
    });
    /**
     * Заводские блоки ПиРМ/КМ хранят в `worksCatalogStream` legacy-подпись, а
     * назначения новых работ пишутся каноническим именем из каталога `v2_stream`
     * (кодом стрима либо его подписью). Без объединения scope такие работы
     * не попадают в каталог блока — «добавление работ не работает».
     */
    (0, vitest_1.it)("includes stream code and catalog labels in legacy executor label scope", () => {
        const catalog = [
            {
                code: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
                label: "Платформы и Решения для моделирования",
                isActive: true,
                order: 1,
                payload: {
                    dbNames: ["ПиРМ (правила и развитие модели)"],
                    legacyLabels: ["ПиРМ"],
                    v1Labels: [],
                    keycloakAliases: [],
                },
            },
        ];
        const scope = (0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)("ПиРМ", catalog);
        (0, vitest_1.expect)(scope).toEqual(vitest_1.expect.arrayContaining([
            "ПиРМ",
            "ПиРМ (правила и развитие модели)",
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
            "Платформы и Решения для моделирования",
        ]));
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)([v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM], "ПиРМ", catalog)).toBe(true);
        // Без каталога код стрима тоже должен попадать в scope legacy-подписи.
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)("ПиРМ")).toEqual(vitest_1.expect.arrayContaining(["ПиРМ", v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]));
    });
    (0, vitest_1.it)("expands legacy «Модельный стрим» catalog scope to five model DB streams", () => {
        const scope = (0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
        (0, vitest_1.expect)(scope).toEqual(vitest_1.expect.arrayContaining([
            v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
            "Модельные стримы",
            "Разработка моделей КМБ и КСБ",
            "Моделирование РБ",
            "AI-модели партнерств",
            "Финансовое моделирование",
            "Моделирование RnD",
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
        ]));
        (0, vitest_1.expect)((0, v2_model_stream_typical_works_constants_1.resolveModelStreamCatalogScopeDbStreams)()).toEqual(scope);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)(["Разработка моделей КМБ и КСБ"], v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR)).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)([v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR], v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB)).toBe(true);
        (0, vitest_1.expect)((0, v2_executor_streams_util_1.resolveExecutorScopeDbStreams)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB)).toEqual(vitest_1.expect.arrayContaining([
            "Разработка моделей КМБ и КСБ",
            v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
        ]));
    });
});
