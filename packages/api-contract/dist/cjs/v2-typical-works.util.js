"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStreamLocalParamsForTypicalOutput = readStreamLocalParamsForTypicalOutput;
exports.mergeTypicalCoefficientContext = mergeTypicalCoefficientContext;
exports.flattenTypicalWorkStreamTriggerFields = flattenTypicalWorkStreamTriggerFields;
exports.readTypicalWorksUniversalFormTriggerContext = readTypicalWorksUniversalFormTriggerContext;
exports.hasTypicalWorkPreviewFormContext = hasTypicalWorkPreviewFormContext;
exports.buildTypicalWorkTriggerLookupSource = buildTypicalWorkTriggerLookupSource;
exports.readTypicalWorksStreamTriggerContext = readTypicalWorksStreamTriggerContext;
exports.hasTypicalWorkStreamTriggerContext = hasTypicalWorkStreamTriggerContext;
exports.isFilledTypicalWorkSourceRow = isFilledTypicalWorkSourceRow;
exports.readFilledArchComponentListRows = readFilledArchComponentListRows;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function isStreamBlockDataRoot(streamKey, uiSchema) {
    if (streamKey === "streamDataSources" || streamKey === "streamModelControl") {
        return true;
    }
    if (uiSchema) {
        const branch = readRecord(uiSchema[streamKey]);
        if ((0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(branch, streamKey).streamBlock) {
            return true;
        }
    }
    return (0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)(streamKey) != null;
}
function readRecordAtDotPath(data, dotPath) {
    let cur = data;
    for (const key of dotPath.split(".").filter(Boolean)) {
        cur = readRecord(cur)?.[key];
    }
    return readRecord(cur);
}
/** Путь блока стрима для outputArrayPath (например generalInfo.modelService.controlTypicalTasks → generalInfo.modelService). */
function resolveTypicalWorkStreamBlockPath(referencePath, uiSchema) {
    const parts = referencePath.split(".").filter(Boolean);
    if (parts.length === 0)
        return null;
    const lastKey = parts[parts.length - 1];
    if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(lastKey) && parts.length > 1) {
        return parts.slice(0, -1).join(".");
    }
    const top = parts[0];
    return isStreamBlockDataRoot(top, uiSchema) ? top : null;
}
/**
 * `localParams` стрима для массива типовых работ (любой блок с `streamBlock` /
 * legacy `streamDataSources` / `streamModelControl`).
 */
function readStreamLocalParamsForTypicalOutput(data, outputArrayPath, uiSchema) {
    const streamBlockPath = resolveTypicalWorkStreamBlockPath(outputArrayPath, uiSchema);
    if (!streamBlockPath)
        return {};
    const topKey = streamBlockPath.split(".")[0]?.trim();
    if (!topKey || !isStreamBlockDataRoot(topKey, uiSchema)) {
        return readRecord(readRecordAtDotPath(data, streamBlockPath)?.localParams) ??
            {};
    }
    const stream = readRecord(data[topKey]);
    return readRecord(stream?.localParams) ?? {};
}
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
function mergeTypicalCoefficientContext(localParams, sourceRow) {
    return { ...localParams, ...sourceRow };
}
const TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS = new Set([
    "sourceSystems",
    "sourceTypicalTasks",
    "detailTypicalTasks",
    "controlTypicalTasks",
    "localParams",
    "groupActivation",
]);
function isGeneratedTypicalWorkArray(value) {
    if (!Array.isArray(value) || value.length === 0)
        return false;
    return value.every((item) => item != null &&
        typeof item === "object" &&
        ("taskCode" in item ||
            "generatedByRuleId" in item ||
            "estimateHoursPerDay" in item));
}
/** Arch object list в storage — массив объектов; поля элементов доступны по leaf-ключу. */
function flattenArchObjectListItems(value, visitRecord) {
    if (!Array.isArray(value) || isGeneratedTypicalWorkArray(value))
        return;
    for (const item of value) {
        const row = readRecord(item);
        if (row)
            visitRecord(row);
    }
}
/**
 * Плоский контекст полей стрима для триггеров типовых работ.
 * Поля из вложенных групп (например «Группа Кирилла») доступны по ключу leaf-поля.
 */
function flattenTypicalWorkStreamTriggerFields(streamBlock) {
    const out = {};
    const walk = (node) => {
        for (const [key, value] of Object.entries(node)) {
            if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key))
                continue;
            if (isGeneratedTypicalWorkArray(value))
                continue;
            if (Array.isArray(value)) {
                flattenArchObjectListItems(value, walk);
                continue;
            }
            if (value && typeof value === "object") {
                walk(value);
                continue;
            }
            if (value !== undefined)
                out[key] = value;
        }
    };
    walk(streamBlock);
    return out;
}
const TYPICAL_WORK_FORM_TRIGGER_SKIP_ROOT_KEYS = new Set([
    "meta",
    "summary",
    "workflow",
    "uncertaintyCalculation",
    "groupActivation",
]);
function readTypicalWorksRootFormTriggerContext(data, referencePath, uiSchema) {
    const outputRootKey = referencePath.split(".")[0]?.trim();
    const skipRootKeys = new Set(TYPICAL_WORK_FORM_TRIGGER_SKIP_ROOT_KEYS);
    // Не пропускать generalInfo/detailInfo — только корневые stream-блоки (streamDataSources и т.п.).
    if (outputRootKey && isStreamBlockDataRoot(outputRootKey, uiSchema)) {
        skipRootKeys.add(outputRootKey);
    }
    const out = {};
    const walk = (node, atRoot) => {
        for (const [key, value] of Object.entries(node)) {
            if (atRoot && skipRootKeys.has(key))
                continue;
            if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key))
                continue;
            if (isGeneratedTypicalWorkArray(value))
                continue;
            if (Array.isArray(value)) {
                flattenArchObjectListItems(value, (row) => walk(row, false));
                continue;
            }
            if (value && typeof value === "object") {
                walk(value, false);
                continue;
            }
            if (value !== undefined)
                out[key] = value;
        }
    };
    walk(data, true);
    return out;
}
/** Все поля анкеты, релевантные триггерам (без привязки к outputArrayPath). */
function readTypicalWorksUniversalFormTriggerContext(data, uiSchema) {
    return readTypicalWorksRootFormTriggerContext(data, "", uiSchema);
}
function hasTypicalWorkPreviewFormContext(data, uiSchema) {
    if (!data)
        return false;
    return hasTypicalWorkStreamTriggerContext(readTypicalWorksUniversalFormTriggerContext(data, uiSchema));
}
/** Контекст для проверки param-триггеров: поля формы + строка sourceSystems (строка перекрывает). */
function buildTypicalWorkTriggerLookupSource(source, formData, referencePath = "detailInfo.sourceTypicalTasks", uiSchema) {
    if (!formData)
        return source;
    const universal = readTypicalWorksUniversalFormTriggerContext(formData, uiSchema);
    const scoped = readTypicalWorksStreamTriggerContext(formData, referencePath, uiSchema);
    const fromForm = { ...universal, ...scoped };
    return { ...fromForm, ...source };
}
/** Контекст триггеров на уровне стрима (без строк sourceSystems). */
function readTypicalWorksStreamTriggerContext(data, referencePath, uiSchema) {
    const rootContext = readTypicalWorksRootFormTriggerContext(data, referencePath, uiSchema);
    const streamBlockPath = resolveTypicalWorkStreamBlockPath(referencePath, uiSchema);
    if (streamBlockPath) {
        const stream = readRecordAtDotPath(data, streamBlockPath);
        if (stream) {
            const localParams = readStreamLocalParamsForTypicalOutput(data, referencePath, uiSchema);
            const context = {
                ...rootContext,
                ...flattenTypicalWorkStreamTriggerFields(stream),
                ...localParams,
            };
            if (hasTypicalWorkStreamTriggerContext(context))
                return context;
        }
    }
    return rootContext;
}
function hasTypicalWorkStreamTriggerContext(context) {
    return Object.values(context).some(isMeaningfulTypicalWorkSourceValue);
}
function isMeaningfulTypicalWorkSourceValue(value) {
    if (value == null || value === "")
        return false;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return Number.isFinite(value) && value !== 0;
    if (Array.isArray(value))
        return value.length > 0;
    if (typeof value === "object") {
        return Object.values(value).some(isMeaningfulTypicalWorkSourceValue);
    }
    return true;
}
/** Строка sourceSystems считается заполненной, если в ней есть хотя бы одно осмысленное поле. */
function isFilledTypicalWorkSourceRow(row) {
    return Object.values(row).some(isMeaningfulTypicalWorkSourceValue);
}
/** Строки arch object list (массив или legacy singleton object). */
function readFilledArchComponentListRows(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => item != null &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            isFilledTypicalWorkSourceRow(item));
    }
    const record = readRecord(value);
    if (record && isFilledTypicalWorkSourceRow(record)) {
        return [record];
    }
    return [];
}
