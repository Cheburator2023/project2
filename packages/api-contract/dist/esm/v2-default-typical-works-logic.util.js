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
                patched.push(buildSourceTypicalWorksCatalogRule(binding.outputPath, {
                    boundWorkIds: binding.boundWorkIds,
                }));
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
