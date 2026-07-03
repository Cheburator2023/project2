import { resolveV2AnketaStreamBlockOptions } from "./v2-anketa-section-ui.util";
import { inferLegacyStreamExecutorForBlockKey } from "./v2-executor-streams.util";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function isStreamBlockDataRoot(
	streamKey: string,
	uiSchema?: Record<string, unknown>,
): boolean {
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
export function readStreamLocalParamsForTypicalOutput(
	data: Record<string, unknown>,
	outputArrayPath: string,
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	const streamKey = outputArrayPath.split(".")[0]?.trim();
	if (!streamKey || !isStreamBlockDataRoot(streamKey, uiSchema)) {
		return {};
	}
	const stream = readRecord(data[streamKey]);
	return readRecord(stream?.localParams) ?? {};
}

/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
export function mergeTypicalCoefficientContext(
	localParams: Record<string, unknown>,
	sourceRow: Record<string, unknown>,
): Record<string, unknown> {
	return { ...localParams, ...sourceRow };
}
