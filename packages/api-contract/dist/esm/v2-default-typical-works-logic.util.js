import { resolveStreamExecutorForTypicalWorkOutputPath } from "./v2-anketa-section-ui.util";
import { V2_MODEL_STREAM_EXECUTOR, V2_MODEL_STREAM_FACTORY_WORK_IDS, } from "./v2-model-stream-typical-works.constants";
/** Источник триггеров модельного стрима — arch object list «Модельный сервис». */
export const V2_MODEL_STREAM_SOURCE_ARRAY_PATH = "generalInfo.modelService";
import { collectTypicalWorkBlockBindings, collectGeneratedTypicalWorkArrayPaths, resolveSourceTypicalWorksOutputPath, LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS, V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH, V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH, } from "./v2-typical-work-output-paths.util";
/** Заменяет dot-путь в JsonLogic (`{"var": "a.b.c"}` и вложенные узлы). */
export function replaceDotPathInJsonLogic(value, oldPath, newPath) {
    if (oldPath === newPath)
        return value;
    if (value === null || value === undefined)
        return value;
    if (typeof value === "string") {
        return value === oldPath ? newPath : value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => replaceDotPathInJsonLogic(item, oldPath, newPath));
    }
    if (typeof value === "object") {
        const next = {};
        for (const [key, child] of Object.entries(value)) {
            if (key === "var") {
                if (typeof child === "string" && child === oldPath) {
                    next[key] = newPath;
                    continue;
                }
                if (Array.isArray(child) && child[0] === oldPath) {
                    next[key] = [newPath, ...child.slice(1)];
                    continue;
                }
            }
            next[key] = replaceDotPathInJsonLogic(child, oldPath, newPath);
        }
        return next;
    }
    return value;
}
function patchUnifiedTypicalTotalRule(rule, sourceOutputPath) {
    if (rule.id !== "unified-typical-total")
        return rule;
    if (!sourceOutputPath ||
        sourceOutputPath === V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH) {
        return rule;
    }
    const oldSlash = `/${V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;
    const newSlash = `/${sourceOutputPath.replace(/\./g, "/")}`;
    return {
        ...rule,
        condition: replaceDotPathInJsonLogic(rule.condition, V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH, sourceOutputPath),
        dependencies: (rule.dependencies ?? []).map((dep) => dep === oldSlash ? newSlash : dep),
    };
}
/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
export const V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export { V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH };
export function typicalWorksCatalogRuleId(outputArrayPath) {
    return `typical-works-catalog-${outputArrayPath.replace(/\./g, "-")}`;
}
export function buildModelStreamTypicalWorksCatalogRule(outputArrayPath, options) {
    const boundWorkIds = options?.boundWorkIds ?? [...V2_MODEL_STREAM_FACTORY_WORK_IDS];
    return {
        id: typicalWorksCatalogRuleId(outputArrayPath),
        kind: "task_trigger",
        targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
        condition: true,
        description: "ФТ-024: типовые работы модельного стрима из справочника (10 этапов factory snapshot).",
        dependencies: [],
        payload: {
            hint: "Типовые работы модельного стрима: этапы по триггерам из generalInfo (модельный сервис), detailInfo и неопределённости.",
            mode: "generated_rows",
            label: "Типовые работы (Модельный стрим)",
            worksCatalog: true,
            worksCatalogStream: V2_MODEL_STREAM_EXECUTOR,
            worksCatalogAllArchComponents: true,
            outputArrayPath,
            sourceArrayPath: V2_MODEL_STREAM_SOURCE_ARRAY_PATH,
            allowedWorkIds: boundWorkIds,
            sourceContextPaths: ["detailInfo", "generalInfo", "uncertaintyCalculation"],
            taskCode: "CATALOG_MODEL_STREAM_TASKS",
            calcModel: "unified",
        },
    };
}
export function buildSourceTypicalWorksCatalogRule(outputArrayPath = V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH, options) {
    const boundWorkIds = options?.boundWorkIds;
    const hasExplicitBinding = boundWorkIds !== undefined;
    const enabled = !hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;
    const payload = {
        hint: "При заполнении систем-источников подтягиваются типовые работы из справочника (стрим «Источники данных»). Появление работ управляется их триггерами. Настройка — в конструкторе → Логика.",
        mode: "generated_rows",
        label: "Типовые работы (стрим «Источники данных»)",
        worksCatalog: true,
        worksCatalogArchComponent: "Система-источник",
        worksCatalogStream: "fromSourceType",
        sourceContextPaths: [
            "detailInfo.dataMart",
            "detailInfo.dataProcess",
        ],
        taskCode: "CATALOG_SOURCE_TASKS",
        calcModel: "unified",
        outputArrayPath,
        sourceArrayPath: V2_SOURCE_SYSTEMS_ARRAY_PATH,
    };
    if (hasExplicitBinding) {
        payload.allowedWorkIds = boundWorkIds ?? [];
    }
    return {
        id: typicalWorksCatalogRuleId(outputArrayPath),
        kind: "task_trigger",
        targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
        condition: enabled,
        description: "ФТ-024: типовые работы «Система-источник» из справочника работ (назначения + триггеры).",
        dependencies: [`/${V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`],
        payload,
    };
}
/** Каталог типовых работ стрима-исполнителя (ПиРМ и др.) — все типы арх. компонентов. */
export function buildExecutorStreamTypicalWorksCatalogRule(outputArrayPath, options) {
    const streamExecutor = options.streamExecutor.trim();
    const boundWorkIds = options.boundWorkIds;
    const hasExplicitBinding = boundWorkIds !== undefined;
    const enabled = !hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;
    const streamRoot = outputArrayPath.split(".")[0] ?? outputArrayPath;
    const payload = {
        hint: `Типовые работы стрима «${streamExecutor}» из справочника. Появление работ управляется их условиями появления.`,
        mode: "generated_rows",
        label: `Типовые работы (стрим «${streamExecutor}»)`,
        worksCatalog: true,
        worksCatalogStream: streamExecutor,
        worksCatalogAllArchComponents: true,
        outputArrayPath,
        sourceContextPaths: [
            "detailInfo",
            "generalInfo",
            "uncertaintyCalculation",
            streamRoot,
        ],
        taskCode: "CATALOG_EXECUTOR_STREAM_TASKS",
        calcModel: "unified",
    };
    if (hasExplicitBinding) {
        payload.allowedWorkIds = boundWorkIds ?? [];
    }
    return {
        id: typicalWorksCatalogRuleId(outputArrayPath),
        kind: "task_trigger",
        targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
        condition: enabled,
        description: `ФТ-024: типовые работы стрима «${streamExecutor}» из справочника (все типы арх. компонентов).`,
        dependencies: [],
        payload,
    };
}
export function buildControlTypicalWorksCatalogRule() {
    return {
        id: "unified-control-typical-works",
        kind: "task_trigger",
        targetPath: `/${V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`,
        condition: false,
        description: "Контроль моделей: генерация отключена до появления поля выбора видов контроля в схеме v5.",
        dependencies: [],
        payload: {
            mode: "generated_rows",
            label: "Типовые работы (стрим «Контроль моделей»)",
            worksCatalog: true,
            worksCatalogArchComponent: "Контроль модели",
            worksCatalogStream: "Контроль моделей",
            outputArrayPath: V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
            sourceArrayPath: V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
            tasks: [],
        },
    };
}
const PATCHED_RULE_IDS = new Set([
    "unified-source-typical-works",
    "unified-control-typical-works",
]);
export function isTypicalWorksCatalogLogicRule(rule) {
    return (PATCHED_RULE_IDS.has(rule.id) || rule.id.startsWith("typical-works-catalog-"));
}
function isPatchedTypicalWorksCatalogRule(rule) {
    return isTypicalWorksCatalogLogicRule(rule);
}
function typicalRowTotalRuleId(arrayPath) {
    return `unified-typical-row-total:${arrayPath.replace(/\./g, "_")}`;
}
function isTypicalRowTotalPatchedRuleId(id) {
    return id.startsWith("unified-typical-row-total:");
}
/** Id catalog-правил, которые должны быть в зафиксированном logic snapshot шаблона. */
export function requiredTypicalWorksCatalogRuleIds(uiSchema) {
    const bindings = uiSchema ? collectTypicalWorkBlockBindings(uiSchema) : [];
    const ids = new Set();
    for (const binding of bindings) {
        if (binding.boundWorkIds !== undefined && binding.boundWorkIds.length === 0) {
            continue;
        }
        ids.add(typicalWorksCatalogRuleId(binding.outputPath));
    }
    if (ids.size === 0 &&
        schemaSupportsSourceTypicalWorksCatalog(undefined, uiSchema)) {
        ids.add(typicalWorksCatalogRuleId(resolveSourceTypicalWorksOutputPath(undefined, uiSchema) ??
            V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH));
    }
    return ids;
}
/** Logic snapshot уже содержит catalog/row-total правила — не пересобирать в рантайме. */
export function isTypicalWorksCatalogLogicComplete(logic, options) {
    const ruleIds = new Set((logic?.rules ?? []).map((rule) => rule.id));
    for (const id of requiredTypicalWorksCatalogRuleIds(options?.uiSchema)) {
        if (!ruleIds.has(id))
            return false;
    }
    const typicalPaths = options?.uiSchema
        ? collectGeneratedTypicalWorkArrayPaths(options.uiSchema)
        : [];
    for (const path of typicalPaths) {
        if (!ruleIds.has(typicalRowTotalRuleId(path)))
            return false;
    }
    if (typicalPaths.length > 0 && !ruleIds.has("unified-typical-total")) {
        return false;
    }
    return true;
}
/** Модельный стрим: не подмешивать legacy E2E-таблицу из hardcode. */
export function shouldSkipLegacyModelStreamStageSummary(uiSchema) {
    if (!uiSchema)
        return false;
    return collectTypicalWorkBlockBindings(uiSchema).some((binding) => {
        if (binding.boundWorkIds !== undefined && binding.boundWorkIds.length === 0) {
            return false;
        }
        return (resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, binding.outputPath) === V2_MODEL_STREAM_EXECUTOR);
    });
}
function buildTypicalArrayReduceTerm(arrayPath) {
    return {
        reduce: [
            { var: arrayPath },
            {
                "+": [
                    { var: "accumulator" },
                    {
                        max: [0, { var: "current.total" }],
                    },
                ],
            },
            0,
        ],
    };
}
/**
 * Итог строки типовой работы: для строк каталога (workId) сохраняем уже
 * округлённый total; иначе estimate × coefficient (ручные/legacy строки).
 */
export function buildTypicalWorkRowTotalCondition() {
    return {
        if: [
            {
                and: [
                    { "!!": [{ var: "workId" }] },
                    { "!=": [{ var: "total" }, null] },
                ],
            },
            { var: "total" },
            { "*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }] },
        ],
    };
}
export function buildTypicalWorkRowTotalRule(arrayPath) {
    return {
        id: typicalRowTotalRuleId(arrayPath),
        kind: "row_computed",
        payload: {
            label: "Per-row итог типовой работы",
            fieldVar: "total",
            arrayPath,
            formulaHint: "row.total = каталог (округл.) или норматив (ч/д) × коэффициент",
        },
        condition: buildTypicalWorkRowTotalCondition(),
        targetPath: `/${arrayPath.replace(/\./g, "/")}`,
        description: "ФТ-024: итог строки типовой работы.",
        dependencies: [],
    };
}
export function buildUnifiedTypicalTotalRule(arrayPaths) {
    if (arrayPaths.length === 0)
        return null;
    const condition = arrayPaths.length === 1
        ? buildTypicalArrayReduceTerm(arrayPaths[0])
        : {
            "+": arrayPaths.map((path) => buildTypicalArrayReduceTerm(path)),
        };
    return {
        id: "unified-typical-total",
        kind: "computed",
        payload: {
            mode: "expert",
            role: "typical_total",
            label: "Сумма по типовым работам",
            calcModel: "unified",
            formulaHint: `Σ типовые работы (${arrayPaths.join(" + ")})`,
        },
        condition,
        targetPath: "/summary/typicalTotal",
        description: "ФТ-026: сумма итоговых оценок типовых работ.",
        dependencies: arrayPaths.map((path) => `/${path.replace(/\./g, "/")}`),
    };
}
const LEGACY_CONTROL_ROW_TOTAL_RULE_IDS = new Set([
    "unified-control-row-total",
]);
function isLegacyControlRowTotalRuleId(id) {
    return LEGACY_CONTROL_ROW_TOTAL_RULE_IDS.has(id);
}
function patchTypicalWorksPathsDeep(value) {
    if (typeof value === "string") {
        let next = value;
        for (const legacyPath of LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS) {
            if (next.includes(legacyPath)) {
                next = next.replaceAll(legacyPath, V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH);
            }
            const legacySlash = `/${legacyPath.replace(/\./g, "/")}`;
            const canonicalSlash = `/${V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;
            if (next.includes(legacySlash)) {
                next = next.replaceAll(legacySlash, canonicalSlash);
            }
        }
        if (next === "streamDataSources.sourceSystems") {
            return V2_SOURCE_SYSTEMS_ARRAY_PATH;
        }
        if (next === "/streamDataSources/sourceSystems") {
            return `/${V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`;
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
export function schemaSupportsSourceTypicalWorksCatalog(jsonSchema, uiSchema) {
    return Boolean(resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema));
}
/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
export function patchV2TypicalWorksLogicRules(logic, options) {
    const rules = logic?.rules ?? [];
    const bindings = options?.uiSchema
        ? collectTypicalWorkBlockBindings(options.uiSchema)
        : [];
    const hasSourceRule = rules.some((rule) => isPatchedTypicalWorksCatalogRule(rule)) ||
        bindings.length > 0 ||
        schemaSupportsSourceTypicalWorksCatalog(options?.jsonSchema, options?.uiSchema);
    const hasControlRule = rules.some((rule) => rule.id === "unified-control-typical-works");
    const patched = [];
    const sourceOutputPath = resolveSourceTypicalWorksOutputPath(options?.jsonSchema, options?.uiSchema);
    if (hasSourceRule) {
        if (bindings.length > 0) {
            for (const binding of bindings) {
                const streamExecutor = options?.uiSchema
                    ? resolveStreamExecutorForTypicalWorkOutputPath(options.uiSchema, binding.outputPath)
                    : null;
                patched.push(buildCatalogRuleForTypicalWorkBinding(binding.outputPath, binding.boundWorkIds, streamExecutor));
            }
        }
        else {
            patched.push(buildSourceTypicalWorksCatalogRule(sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH));
        }
    }
    if (hasControlRule)
        patched.push(buildControlTypicalWorksCatalogRule());
    const typicalPaths = options?.uiSchema
        ? collectGeneratedTypicalWorkArrayPaths(options.uiSchema)
        : [];
    const rest = rules
        .filter((rule) => !isPatchedTypicalWorksCatalogRule(rule) &&
        !isTypicalRowTotalPatchedRuleId(rule.id) &&
        !isLegacyControlRowTotalRuleId(rule.id) &&
        (typicalPaths.length === 0 || rule.id !== "unified-typical-total"))
        .map((rule) => patchUnifiedTypicalTotalRule(patchLegacyRowTotalRule(patchTypicalWorksPathsDeep(rule)), sourceOutputPath));
    const injectedTypicalRows = typicalPaths.map((path) => buildTypicalWorkRowTotalRule(path));
    const unifiedTypical = buildUnifiedTypicalTotalRule(typicalPaths);
    return {
        ...logic,
        rules: [
            ...rest,
            ...patched,
            ...injectedTypicalRows,
            ...(unifiedTypical ? [unifiedTypical] : []),
        ],
    };
}
function buildCatalogRuleForTypicalWorkBinding(outputPath, boundWorkIds, streamExecutor) {
    if (streamExecutor === V2_MODEL_STREAM_EXECUTOR) {
        return buildModelStreamTypicalWorksCatalogRule(outputPath, {
            boundWorkIds,
        });
    }
    if (streamExecutor &&
        streamExecutor !== "Источники данных" &&
        streamExecutor !== "fromSourceType") {
        return buildExecutorStreamTypicalWorksCatalogRule(outputPath, {
            streamExecutor,
            boundWorkIds,
        });
    }
    return buildSourceTypicalWorksCatalogRule(outputPath, {
        boundWorkIds,
    });
}
function buildCanonicalTypicalWorksCatalogRules(options) {
    const bindings = options?.uiSchema
        ? collectTypicalWorkBlockBindings(options.uiSchema)
        : [];
    const rules = new Map();
    if (bindings.length > 0) {
        for (const binding of bindings) {
            const streamExecutor = options?.uiSchema
                ? resolveStreamExecutorForTypicalWorkOutputPath(options.uiSchema, binding.outputPath)
                : null;
            const rule = buildCatalogRuleForTypicalWorkBinding(binding.outputPath, binding.boundWorkIds, streamExecutor);
            rules.set(rule.id, rule);
        }
        return rules;
    }
    if (schemaSupportsSourceTypicalWorksCatalog(options?.jsonSchema, options?.uiSchema)) {
        const sourceOutputPath = resolveSourceTypicalWorksOutputPath(options?.jsonSchema, options?.uiSchema);
        const rule = buildSourceTypicalWorksCatalogRule(sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH);
        rules.set(rule.id, rule);
    }
    return rules;
}
const CATALOG_PAYLOAD_UPGRADE_KEYS = [
    "hint",
    "mode",
    "label",
    "worksCatalog",
    "worksCatalogStream",
    "worksCatalogAllArchComponents",
    "worksCatalogArchComponent",
    "outputArrayPath",
    "sourceArrayPath",
    "sourceContextPaths",
    "taskCode",
    "calcModel",
    "allowedWorkIds",
];
function mergeTypicalWorksCatalogRulePayload(existing, canonical) {
    const merged = { ...existing };
    for (const key of CATALOG_PAYLOAD_UPGRADE_KEYS) {
        const next = canonical[key];
        if (next === undefined || next === null || next === "")
            continue;
        const cur = merged[key];
        if (key === "allowedWorkIds") {
            if (Array.isArray(next) &&
                next.length > 0 &&
                (!Array.isArray(cur) ||
                    cur.length === 0 ||
                    JSON.stringify(cur) !== JSON.stringify(next))) {
                merged[key] = next;
            }
            continue;
        }
        if (key === "sourceArrayPath" &&
            canonical.worksCatalogStream === V2_MODEL_STREAM_EXECUTOR &&
            cur !== next) {
            merged[key] = next;
            continue;
        }
        if (cur === undefined || cur === null || cur === "") {
            merged[key] = next;
        }
    }
    return merged;
}
/**
 * Дополняет уже сохранённые catalog-правила актуальным payload из uiSchema
 * (например sourceArrayPath для модельного стрима), не пересобирая весь logic.
 */
export function upgradeTypicalWorksCatalogLogicRules(logic, options) {
    const canonicalById = buildCanonicalTypicalWorksCatalogRules(options);
    if (canonicalById.size === 0)
        return logic;
    let changed = false;
    const rules = (logic?.rules ?? []).map((rule) => {
        if (!isTypicalWorksCatalogLogicRule(rule))
            return rule;
        const canonical = canonicalById.get(rule.id);
        if (!canonical)
            return rule;
        const existingPayload = (rule.payload ?? {});
        const canonicalPayload = (canonical.payload ?? {});
        const mergedPayload = mergeTypicalWorksCatalogRulePayload(existingPayload, canonicalPayload);
        if (JSON.stringify(mergedPayload) === JSON.stringify(existingPayload)) {
            return rule;
        }
        changed = true;
        return { ...rule, payload: mergedPayload };
    });
    return changed ? { ...logic, rules } : logic;
}
/**
 * Фиксирует в logic snapshot версии шаблона актуальный payload catalog-правил
 * из uiSchema (boundWorkIds, sourceArrayPath, …). Вызывать при save/publish версии.
 */
export function syncTypicalWorksCatalogLogicSnapshot(logic, options) {
    const upgraded = upgradeTypicalWorksCatalogLogicRules(logic, options);
    return isTypicalWorksCatalogLogicComplete(upgraded, options)
        ? upgraded
        : patchV2TypicalWorksLogicRules(upgraded, options);
}
