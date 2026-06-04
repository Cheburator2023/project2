function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

/**
 * `localParams` стрима для массива типовых работ (`streamDataSources.*` /
 * `streamModelControl.*`).
 */
export function readStreamLocalParamsForTypicalOutput(
	data: Record<string, unknown>,
	outputArrayPath: string,
): Record<string, unknown> {
	const streamKey = outputArrayPath.split(".")[0]?.trim();
	if (streamKey !== "streamDataSources" && streamKey !== "streamModelControl") {
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
