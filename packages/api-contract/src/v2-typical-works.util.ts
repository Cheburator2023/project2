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

function readRecordAtDotPath(
	data: Record<string, unknown>,
	dotPath: string,
): Record<string, unknown> | undefined {
	let cur: unknown = data;
	for (const key of dotPath.split(".").filter(Boolean)) {
		cur = readRecord(cur)?.[key];
	}
	return readRecord(cur);
}

/** Путь блока стрима для outputArrayPath (например generalInfo.modelService.controlTypicalTasks → generalInfo.modelService). */
function resolveTypicalWorkStreamBlockPath(
	referencePath: string,
	uiSchema?: Record<string, unknown>,
): string | null {
	const parts = referencePath.split(".").filter(Boolean);
	if (parts.length === 0) return null;

	const lastKey = parts[parts.length - 1]!;
	if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(lastKey) && parts.length > 1) {
		return parts.slice(0, -1).join(".");
	}

	const top = parts[0]!;
	return isStreamBlockDataRoot(top, uiSchema) ? top : null;
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
	const streamBlockPath = resolveTypicalWorkStreamBlockPath(
		outputArrayPath,
		uiSchema,
	);
	if (!streamBlockPath) return {};

	const topKey = streamBlockPath.split(".")[0]?.trim();
	if (!topKey || !isStreamBlockDataRoot(topKey, uiSchema)) {
		return readRecord(readRecordAtDotPath(data, streamBlockPath)?.localParams) ??
			{};
	}

	const stream = readRecord(data[topKey]);
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

/** Arch object list в storage — массив объектов; поля элементов доступны по leaf-ключу. */
function flattenArchObjectListItems(
	value: unknown,
	visitRecord: (row: Record<string, unknown>) => void,
): void {
	if (!Array.isArray(value) || isGeneratedTypicalWorkArray(value)) return;
	for (const item of value) {
		const row = readRecord(item);
		if (row) visitRecord(row);
	}
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
				flattenArchObjectListItems(value, walk);
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
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	const outputRootKey = referencePath.split(".")[0]?.trim();
	const skipRootKeys = new Set(TYPICAL_WORK_FORM_TRIGGER_SKIP_ROOT_KEYS);
	// Не пропускать generalInfo/detailInfo — только корневые stream-блоки (streamDataSources и т.п.).
	if (outputRootKey && isStreamBlockDataRoot(outputRootKey, uiSchema)) {
		skipRootKeys.add(outputRootKey);
	}

	const out: Record<string, unknown> = {};

	const walk = (node: Record<string, unknown>, atRoot: boolean): void => {
		for (const [key, value] of Object.entries(node)) {
			if (atRoot && skipRootKeys.has(key)) continue;
			if (TYPICAL_WORK_STREAM_TRIGGER_SKIP_KEYS.has(key)) continue;
			if (isGeneratedTypicalWorkArray(value)) continue;
			if (Array.isArray(value)) {
				flattenArchObjectListItems(value, (row) => walk(row, false));
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

export type TypicalWorkTriggerMatchContext = {
	referencePath?: string;
	uiSchema?: Record<string, unknown>;
	schemaParams?: ReadonlyArray<{
		code: string;
		schemaPointer?: string | null;
	}>;
};

/** Все поля анкеты, релевантные триггерам (без привязки к outputArrayPath). */
export function readTypicalWorksUniversalFormTriggerContext(
	data: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	return readTypicalWorksRootFormTriggerContext(data, "", uiSchema);
}

export function hasTypicalWorkPreviewFormContext(
	data: Record<string, unknown> | undefined | null,
	uiSchema?: Record<string, unknown>,
): boolean {
	if (!data) return false;
	return hasTypicalWorkStreamTriggerContext(
		readTypicalWorksUniversalFormTriggerContext(data, uiSchema),
	);
}

/** Контекст для проверки param-триггеров: поля формы + строка sourceSystems (строка перекрывает). */
export function buildTypicalWorkTriggerLookupSource(
	source: Record<string, unknown>,
	formData?: Record<string, unknown>,
	referencePath = "detailInfo.sourceTypicalTasks",
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	if (!formData) return source;
	const universal = readTypicalWorksUniversalFormTriggerContext(
		formData,
		uiSchema,
	);
	const scoped = readTypicalWorksStreamTriggerContext(
		formData,
		referencePath,
		uiSchema,
	);
	const fromForm = { ...universal, ...scoped };
	return { ...fromForm, ...source };
}

/** Контекст триггеров на уровне стрима (без строк sourceSystems). */
export function readTypicalWorksStreamTriggerContext(
	data: Record<string, unknown>,
	referencePath: string,
	uiSchema?: Record<string, unknown>,
): Record<string, unknown> {
	const rootContext = readTypicalWorksRootFormTriggerContext(
		data,
		referencePath,
		uiSchema,
	);
	const streamBlockPath = resolveTypicalWorkStreamBlockPath(
		referencePath,
		uiSchema,
	);
	if (streamBlockPath) {
		const stream = readRecordAtDotPath(data, streamBlockPath);
		if (stream) {
			const localParams = readStreamLocalParamsForTypicalOutput(
				data,
				referencePath,
				uiSchema,
			);
			const context = {
				...rootContext,
				...flattenTypicalWorkStreamTriggerFields(stream),
				...localParams,
			};
			if (hasTypicalWorkStreamTriggerContext(context)) return context;
		}
	}

	return rootContext;
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

/** Строки arch object list (массив или legacy singleton object). */
export function readFilledArchComponentListRows(
	value: unknown,
): Record<string, unknown>[] {
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is Record<string, unknown> =>
				item != null &&
				typeof item === "object" &&
				!Array.isArray(item) &&
				isFilledTypicalWorkSourceRow(item),
		);
	}
	const record = readRecord(value);
	if (record && isFilledTypicalWorkSourceRow(record)) {
		return [record];
	}
	return [];
}
