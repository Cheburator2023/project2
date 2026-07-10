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

const TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS = new Set([
	"sourceSystems",
	"sourceTypicalTasks",
	"detailTypicalTasks",
	"controlTypicalTasks",
	"localParams",
	"groupActivation",
]);

function isGeneratedTypicalWorkArray(value: unknown): boolean {
	if (!Array.isArray(value) || value.length === 0) return false;
	return value.every(
		(item) =>
			item != null &&
			typeof item === "object" &&
			("taskCode" in (item as object) ||
				"generatedByRuleId" in (item as object) ||
				"estimateHoursPerDay" in (item as object)),
	);
}

/**
 * Плоский контекст полей стрима для триггеров типовых работ.
 * Поля из вложенных групп (например «Группа Кирилла») доступны по ключу leaf-поля.
 */
export function flattenTypicalWorkStreamTriggerFields(
	streamBlock: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};

	const walk = (node: Record<string, unknown>): void => {
		for (const [key, value] of Object.entries(node)) {
			if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key)) continue;
			if (isGeneratedTypicalWorkArray(value)) continue;
			if (Array.isArray(value)) {
				out[key] = value;
				continue;
			}
			if (value && typeof value === "object") {
				walk(value as Record<string, unknown>);
				continue;
			}
			if (value !== undefined) out[key] = value;
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

function readTypicalWorksRootFormTriggerContext(
	data: Record<string, unknown>,
	referencePath: string,
): Record<string, unknown> {
	const outputRootKey = referencePath.split(".")[0]?.trim();
	const skipRootKeys = new Set(TYPICAL_WORK_FORM_TRIGGER_SKIP_ROOT_KEYS);
	if (outputRootKey) skipRootKeys.add(outputRootKey);

	const out: Record<string, unknown> = {};

	const walk = (node: Record<string, unknown>, atRoot: boolean): void => {
		for (const [key, value] of Object.entries(node)) {
			if (atRoot && skipRootKeys.has(key)) continue;
			if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key)) continue;
			if (isGeneratedTypicalWorkArray(value)) continue;
			if (Array.isArray(value)) {
				out[key] = value;
				continue;
			}
			if (value && typeof value === "object") {
				walk(value as Record<string, unknown>, false);
				continue;
			}
			if (value !== undefined) out[key] = value;
		}
	};

	walk(data, true);
	return out;
}

/** Контекст триггеров на уровне стрима (без строк sourceSystems). */
export function readTypicalWorksStreamTriggerContext(
	data: Record<string, unknown>,
	referencePath: string,
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	const streamKey = referencePath.split(".")[0]?.trim();
	if (streamKey && isStreamBlockDataRoot(streamKey, uiSchema)) {
		const stream = readRecord(data[streamKey]);
		if (stream) {
			const localParams = readStreamLocalParamsForTypicalOutput(
				data,
				referencePath,
				uiSchema,
			);
			const context = {
				...flattenTypicalWorkStreamTriggerFields(stream),
				...localParams,
			};
			if (hasTypicalWorkStreamTriggerContext(context)) return context;
		}
	}

	return readTypicalWorksRootFormTriggerContext(data, referencePath);
}

export function hasTypicalWorkStreamTriggerContext(
	context: Record<string, unknown>,
): boolean {
	return Object.values(context).some(isMeaningfulTypicalWorkSourceValue);
}

function isMeaningfulTypicalWorkSourceValue(value: unknown): boolean {
	if (value == null || value === "") return false;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return Number.isFinite(value) && value !== 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "object") {
		return Object.values(value as Record<string, unknown>).some(
			isMeaningfulTypicalWorkSourceValue,
		);
	}
	return true;
}

/** Строка sourceSystems считается заполненной, если в ней есть хотя бы одно осмысленное поле. */
export function isFilledTypicalWorkSourceRow(
	row: Record<string, unknown>,
): boolean {
	return Object.values(row).some(isMeaningfulTypicalWorkSourceValue);
}
