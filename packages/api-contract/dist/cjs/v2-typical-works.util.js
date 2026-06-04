"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStreamLocalParamsForTypicalOutput = readStreamLocalParamsForTypicalOutput;
exports.mergeTypicalCoefficientContext = mergeTypicalCoefficientContext;
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
/**
 * `localParams` стрима для массива типовых работ (`streamDataSources.*` /
 * `streamModelControl.*`).
 */
function readStreamLocalParamsForTypicalOutput(data, outputArrayPath) {
    const streamKey = outputArrayPath.split(".")[0]?.trim();
    if (streamKey !== "streamDataSources" && streamKey !== "streamModelControl") {
        return {};
    }
    const stream = readRecord(data[streamKey]);
    return readRecord(stream?.localParams) ?? {};
}
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
function mergeTypicalCoefficientContext(localParams, sourceRow) {
    return { ...localParams, ...sourceRow };
}
