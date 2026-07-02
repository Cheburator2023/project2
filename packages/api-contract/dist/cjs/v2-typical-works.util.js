"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStreamLocalParamsForTypicalOutput = readStreamLocalParamsForTypicalOutput;
exports.mergeTypicalCoefficientContext = mergeTypicalCoefficientContext;
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
/**
 * `localParams` стрима для массива типовых работ (любой блок с `streamBlock` /
 * legacy `streamDataSources` / `streamModelControl`).
 */
function readStreamLocalParamsForTypicalOutput(data, outputArrayPath, uiSchema) {
    const streamKey = outputArrayPath.split(".")[0]?.trim();
    if (!streamKey || !isStreamBlockDataRoot(streamKey, uiSchema)) {
        return {};
    }
    const stream = readRecord(data[streamKey]);
    return readRecord(stream?.localParams) ?? {};
}
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
function mergeTypicalCoefficientContext(localParams, sourceRow) {
    return { ...localParams, ...sourceRow };
}
