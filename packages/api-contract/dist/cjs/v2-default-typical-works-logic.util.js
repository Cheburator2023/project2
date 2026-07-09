"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = exports.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = exports.V2_SOURCE_SYSTEMS_ARRAY_PATH = void 0;
exports.buildSourceTypicalWorksCatalogRule = buildSourceTypicalWorksCatalogRule;
exports.buildControlTypicalWorksCatalogRule = buildControlTypicalWorksCatalogRule;
exports.schemaSupportsSourceTypicalWorksCatalog = schemaSupportsSourceTypicalWorksCatalog;
exports.patchV2TypicalWorksLogicRules = patchV2TypicalWorksLogicRules;
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
Object.defineProperty(exports, "V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH", { enumerable: true, get: function () { return v2_typical_work_output_paths_util_1.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH; } });
/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
exports.V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = "streamModelControl.field_Khn6-HAW";
function buildSourceTypicalWorksCatalogRule(outputArrayPath = v2_typical_work_output_paths_util_1.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH) {
    return {
        id: "unified-source-typical-works",
        kind: "task_trigger",
        targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
        condition: true,
        description: "ФТ-024: типовые работы «Система-источник» из справочника работ (назначения + триггеры).",
        dependencies: [`/${exports.V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`],
        payload: {
            hint: "При заполнении систем-источников подтягиваются типовые работы из справочника (стрим «Источники данных»). Появление работ управляется их триггерами. Настройка — в конструкторе → Логика.",
            mode: "generated_rows",
            label: "Типовые работы (стрим «Источники данных»)",
            worksCatalog: true,
            worksCatalogArchComponent: "Система-источник",
            worksCatalogStream: "fromSourceType",
            taskCode: "CATALOG_SOURCE_TASKS",
            calcModel: "unified",
            outputArrayPath,
            sourceArrayPath: exports.V2_SOURCE_SYSTEMS_ARRAY_PATH,
        },
    };
}
function buildControlTypicalWorksCatalogRule() {
    return {
        id: "unified-control-typical-works",
        kind: "task_trigger",
        targetPath: `/${exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`,
        condition: false,
        description: "Контроль моделей: генерация отключена до появления поля выбора видов контроля в схеме v5.",
        dependencies: [],
        payload: {
            mode: "generated_rows",
            label: "Типовые работы (стрим «Контроль моделей»)",
            worksCatalog: true,
            worksCatalogArchComponent: "Контроль модели",
            worksCatalogStream: "Контроль моделей",
            outputArrayPath: exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
            sourceArrayPath: exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
            tasks: [],
        },
    };
}
const PATCHED_RULE_IDS = new Set([
    "unified-source-typical-works",
    "unified-control-typical-works",
]);
const LEGACY_CONTROL_TYPICAL_TASKS_PATH = "streamModelControl.control.controlTypicalTasks";
const LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH = "/streamModelControl/control/controlTypicalTasks";
const LEGACY_CONTROL_TYPICAL_TASKS_SLASH_REPLACEMENT = `/${exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;
function patchTypicalWorksPathsDeep(value) {
    if (typeof value === "string") {
        let next = value;
        if (next.includes(LEGACY_CONTROL_TYPICAL_TASKS_PATH)) {
            next = next.replaceAll(LEGACY_CONTROL_TYPICAL_TASKS_PATH, exports.V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH);
        }
        if (next.includes(LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH)) {
            next = next.replaceAll(LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH, LEGACY_CONTROL_TYPICAL_TASKS_SLASH_REPLACEMENT);
        }
        if (next === "streamDataSources.sourceSystems") {
            return exports.V2_SOURCE_SYSTEMS_ARRAY_PATH;
        }
        if (next === "/streamDataSources/sourceSystems") {
            return `/${exports.V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`;
        }
        return next;
    }
    if (Array.isArray(value)) {
        return value.map((item) => patchTypicalWorksPathsDeep(item));
    }
    if (value && typeof value === "object") {
        const next = {};
        for (const [key, child] of Object.entries(value)) {
            next[key] = patchTypicalWorksPathsDeep(child);
        }
        return next;
    }
    return value;
}
/** Legacy: правило per-row total ошибочно сохранено как visibility. */
function patchLegacyRowTotalRule(rule) {
    if (rule.kind !== "visibility")
        return rule;
    const payload = rule.payload;
    if (payload?.fieldVar !== "total")
        return rule;
    if (typeof payload.arrayPath !== "string" || !payload.arrayPath.trim()) {
        return rule;
    }
    return { ...rule, kind: "row_computed" };
}
/** Схема содержит блок типовых работ (archComponent: typicalWork) — достаточно для каталога. */
function schemaSupportsSourceTypicalWorksCatalog(jsonSchema, uiSchema) {
    return Boolean((0, v2_typical_work_output_paths_util_1.resolveSourceTypicalWorksOutputPath)(jsonSchema, uiSchema));
}
/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
function patchV2TypicalWorksLogicRules(logic, options) {
    const rules = logic?.rules ?? [];
    const hasSourceRule = rules.some((rule) => rule.id === "unified-source-typical-works") ||
        schemaSupportsSourceTypicalWorksCatalog(options?.jsonSchema, options?.uiSchema);
    const hasControlRule = rules.some((rule) => rule.id === "unified-control-typical-works");
    const patched = [];
    const sourceOutputPath = (0, v2_typical_work_output_paths_util_1.resolveSourceTypicalWorksOutputPath)(options?.jsonSchema, options?.uiSchema);
    if (hasSourceRule) {
        patched.push(buildSourceTypicalWorksCatalogRule(sourceOutputPath ?? v2_typical_work_output_paths_util_1.V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH));
    }
    if (hasControlRule)
        patched.push(buildControlTypicalWorksCatalogRule());
    const rest = rules
        .filter((rule) => !PATCHED_RULE_IDS.has(rule.id))
        .map((rule) => patchLegacyRowTotalRule(patchTypicalWorksPathsDeep(rule)));
    return { ...logic, rules: [...rest, ...patched] };
}
