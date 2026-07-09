import { resolveV2AnketaStreamBlockOptions } from "./v2-anketa-section-ui.util";
import { inferLegacyStreamExecutorForBlockKey } from "./v2-executor-streams.util";
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
        if (resolveV2AnketaStreamBlockOptions(branch, streamKey).streamBlock) {
            return true;
        }
    }
    return inferLegacyStreamExecutorForBlockKey(streamKey) != null;
}
/**
 * `localParams` стрима для массива типовых работ (любой блок с `streamBlock` /
 * legacy `streamDataSources` / `streamModelControl`).
 */
export function readStreamLocalParamsForTypicalOutput(data, outputArrayPath, uiSchema) {
    const streamKey = outputArrayPath.split(".")[0]?.trim();
    if (!streamKey || !isStreamBlockDataRoot(streamKey, uiSchema)) {
        return {};
    }
    const stream = readRecord(data[streamKey]);
    return readRecord(stream?.localParams) ?? {};
}
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
export function mergeTypicalCoefficientContext(localParams, sourceRow) {
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
/**
 * Плоский контекст полей стрима для триггеров типовых работ.
 * Поля из вложенных групп (например «Группа Кирилла») доступны по ключу leaf-поля.
 */
export function flattenTypicalWorkStreamTriggerFields(streamBlock) {
    const out = {};
    const walk = (node) => {
        for (const [key, value] of Object.entries(node)) {
            if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key))
                continue;
            if (isGeneratedTypicalWorkArray(value))
                continue;
            if (Array.isArray(value)) {
                out[key] = value;
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
function readTypicalWorksRootFormTriggerContext(data, referencePath) {
    const outputRootKey = referencePath.split(".")[0]?.trim();
    const skipRootKeys = new Set(TYPICAL_WORK_FORM_TRIGGER_SKIP_ROOT_KEYS);
    if (outputRootKey)
        skipRootKeys.add(outputRootKey);
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
                out[key] = value;
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
/** Контекст триггеров на уровне стрима (без строк sourceSystems). */
export function readTypicalWorksStreamTriggerContext(data, referencePath, uiSchema) {
    const streamKey = referencePath.split(".")[0]?.trim();
    if (streamKey && isStreamBlockDataRoot(streamKey, uiSchema)) {
        const stream = readRecord(data[streamKey]);
        if (stream) {
            const localParams = readStreamLocalParamsForTypicalOutput(data, referencePath, uiSchema);
            const context = {
                ...flattenTypicalWorkStreamTriggerFields(stream),
                ...localParams,
            };
            if (hasTypicalWorkStreamTriggerContext(context))
                return context;
        }
    }
    return readTypicalWorksRootFormTriggerContext(data, referencePath);
}
export function hasTypicalWorkStreamTriggerContext(context) {
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
export function isFilledTypicalWorkSourceRow(row) {
    return Object.values(row).some(isMeaningfulTypicalWorkSourceValue);
}
