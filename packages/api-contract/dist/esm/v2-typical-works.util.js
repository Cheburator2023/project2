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
