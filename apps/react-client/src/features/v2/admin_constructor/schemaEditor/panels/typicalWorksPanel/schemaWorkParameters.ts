import type { RJSFSchema } from "@rjsf/utils";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	V2_ARCH_COMPONENT_LABELS,
	type V2ArchComponentType,
	extractControlCode,
	formatParamNameWithSourceKeys,
	isControlTypeTriggerParam,
	isSourceTypeTriggerParam,
	isV2AnketaSystemRootKey,
	resolveV2AnketaArchComponent,
	stripParamNameSourceKeys,
} from "@smart-anketa/api-contract";
import {
	isObjectFieldGroup,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import { pointerSegments } from "@react-client/features/v2/admin_constructor/utils/schemaPaths";
import {
	DEFAULT_WORK_ARCH_COMPONENT_TYPE,
	WORK_ARCH_COMPONENT_TYPES,
	resolveCanonicalWorkArchComponentType,
} from "./typicalWorkPatchErrors";
import {
	resolveArchComponentAtPointer,
	resolveSchemaNodeType,
} from "../../propertiesFieldKind";
import type { FieldPathHint } from "../../types";

const SCHEMA_PARAM_VALID_FROM = "2025-01-01";

type EnumMapEntry = { enums: string[]; enumNames: string[] };

/** Тип компонента из справочника работ → archComponent в uiSchema. */
const WORK_ARCH_TO_SCHEMA_ARCH: Record<string, V2ArchComponentType> = {
	"Система-источник": "sourceSystem",
	"Объект / Витрина данных": "dataMart",
	"Процесс обработки данных": "dataProcess",
	Модель: "model",
	"Модельный сервис": "modelService",
};

export function resolveEffectiveWorkArchComponentType(
	...candidates: Array<string | null | undefined>
): string {
	return (
		resolveCanonicalWorkArchComponentType(...candidates) ||
		DEFAULT_WORK_ARCH_COMPONENT_TYPE
	);
}

export function schemaWorkParameterEmptyPickerMessage(
	schemaFieldCount: number,
	usedParamCodesSize: number,
	availableCount: number,
	allUsedMessage?: string,
): string {
	if (usedParamCodesSize > 0 && availableCount === 0) {
		return allUsedMessage ?? "Все подходящие параметры схемы уже добавлены";
	}

	if (schemaFieldCount === 0) {
		return "Схема шаблона ещё не загружена или пуста";
	}

	return "В схеме нет полей, пригодных для параметров (enum, справочник, boolean, число, строка). Дождитесь загрузки словарников.";
}

export type SchemaBuiltWorkParameterDto = V2TypicalWorkParameterDto & {
	/** Свободный ввод (type: string без enum/справочника). */
	textual?: boolean;
};

export function isSchemaTextualParam(
	param: Pick<
		SchemaBuiltWorkParameterDto,
		"values" | "numeric" | "dictionaryCode" | "textual"
	>,
): boolean {
	return param.textual === true;
}

export function isSchemaLaborParamCandidate(
	param: Pick<
		SchemaBuiltWorkParameterDto,
		"values" | "numeric" | "dictionaryCode" | "textual"
	>,
): boolean {
	return (
		param.values.length > 0 ||
		param.numeric === true ||
		isSchemaTextualParam(param) ||
		Boolean(param.dictionaryCode?.trim())
	);
}

function pluralSchemaValuesRu(count: number): string {
	if (count % 10 === 1 && count % 100 !== 11) return `${count} значение`;
	if (
		count % 10 >= 2 &&
		count % 10 <= 4 &&
		(count % 100 < 12 || count % 100 > 14)
	) {
		return `${count} значения`;
	}
	return `${count} значений`;
}

/** Подсказка о режиме коэффициента в селекте «Параметр трудоёмкости». */
function schemaLaborParamModeHint(
	param: Pick<
		SchemaBuiltWorkParameterDto,
		"values" | "numeric" | "dictionaryCode" | "textual"
	>,
): string {
	if (isSchemaTextualParam(param)) {
		return "Свободная строка — Any-of без справочника обычно бесполезен; лучше «По значениям»";
	}
	if (param.numeric && param.values.length === 0) {
		return "Число без справочника — Any-of обычно бесполезен; для формулы чаще «По значениям»";
	}
	if (param.values.length > 0) {
		return `${pluralSchemaValuesRu(param.values.length)} · подходит «По значениям» и Any-of`;
	}
	if (param.dictionaryCode) {
		return "Справочник — дождитесь загрузки значений; Any-of заработает после выбора множества";
	}
	return "Нет дискретных значений — Any-of, скорее всего, не подойдёт";
}

/** Подсказка в селекте «Параметр трудоёмкости» — путь к полю и уместный режим. */
export function schemaLaborParamPickerCaption(
	param: SchemaBuiltWorkParameterDto,
): string {
	const path = param.description?.trim();
	const modeHint = schemaLaborParamModeHint(param);
	return path ? `${path} · ${modeHint}` : modeHint;
}

export function resolveWorkArchSchemaType(
	archComponentType: string,
): V2ArchComponentType | null {
	const normalized = resolveEffectiveWorkArchComponentType(archComponentType);
	if (!normalized) return null;

	const mapped = WORK_ARCH_TO_SCHEMA_ARCH[normalized];
	if (mapped) return mapped;

	for (const [arch, label] of Object.entries(V2_ARCH_COMPONENT_LABELS) as Array<
		[V2ArchComponentType, string]
	>) {
		if (label === normalized) return arch;
	}

	if ((WORK_ARCH_COMPONENT_TYPES as readonly string[]).includes(normalized)) {
		return WORK_ARCH_TO_SCHEMA_ARCH[normalized] ?? null;
	}

	return null;
}

function schemaValueDto(
	code: string,
	label: string,
	index: number,
): V2TypicalWorkParameterDto["values"][number] {
	return {
		id: `schema-value-${code}-${index}`,
		code,
		label,
		coefficient: null,
		sortOrder: index,
		validFrom: SCHEMA_PARAM_VALID_FROM,
		validTo: null,
	};
}

function valuesFromDictionary(
	dictionaryCode: string,
	enumMapByCode: Record<string, EnumMapEntry>,
): V2TypicalWorkParameterDto["values"] {
	const entry = enumMapByCode[dictionaryCode];
	if (!entry) return [];
	return entry.enums.map((code, index) =>
		schemaValueDto(code, entry.enumNames[index] ?? code, index),
	);
}

type SchemaNodeValues = Pick<
	SchemaBuiltWorkParameterDto,
	"values" | "numeric" | "textual"
>;

function valuesFromSchemaNode(node: RJSFSchema | undefined): SchemaNodeValues {
	if (!node) return { values: [] };

	const enumValues = Array.isArray(node.enum)
		? node.enum.filter((value): value is string => typeof value === "string")
		: [];
	const enumNames = Array.isArray(node.enumNames)
		? node.enumNames.filter(
				(value): value is string => typeof value === "string",
			)
		: [];
	if (enumValues.length > 0) {
		return {
			values: enumValues.map((value, index) =>
				schemaValueDto(value, enumNames[index] ?? value, index),
			),
		};
	}

	const type = Array.isArray(node.type)
		? node.type.find((item) => item !== "null")
		: node.type;

	if (type === "boolean") {
		return {
			values: [
				schemaValueDto("true", "Да", 0),
				schemaValueDto("false", "Нет", 1),
			],
		};
	}

	if (type === "number" || type === "integer") {
		return { values: [], numeric: true };
	}

	if (type === "string") {
		return { values: [], textual: true };
	}

	return { values: [] };
}

function valuesFromHintPreview(
	hint: FieldPathHint,
): V2TypicalWorkParameterDto["values"] {
	if (!hint.codesPreview?.length) return [];
	return hint.codesPreview.map((label, index) =>
		schemaValueDto(label, label, index),
	);
}

function isArchComponentLeafField(
	pointer: string,
	jsonSchema: RJSFSchema,
): boolean {
	const node = resolveSchemaNode(jsonSchema, pointerSegments(pointer));
	const type = resolveSchemaNodeType(node);
	if (!type) {
		if (Array.isArray(node?.enum) && node.enum.length > 0) return true;
		return node?.const !== undefined;
	}
	if (type === "array") return false;
	if (type === "object" && node && isObjectFieldGroup(node)) return false;
	return true;
}

function schemaParamCodeFromHint(
	hint: FieldPathHint,
	usedCodes: Set<string>,
): string {
	if (!usedCodes.has(hint.key)) {
		usedCodes.add(hint.key);
		return hint.key;
	}
	const base = (
		hint.varPath ?? hint.pointer.replace(/^\//, "").replace(/\//g, "_")
	)
		.replace(/[^\wа-яА-Я]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
	let code = base || hint.key;
	let suffix = 2;
	while (usedCodes.has(code)) {
		const tail = `_${suffix}`;
		code = `${base.slice(0, 80 - tail.length)}${tail}`;
		suffix++;
	}
	usedCodes.add(code);
	return code;
}

function schemaParamDescription(
	hint: FieldPathHint,
	uiSchema: Record<string, unknown> | undefined,
): string {
	const fieldArch = resolveArchComponentAtPointer(uiSchema, hint.pointer);
	const archLabel = fieldArch
		? (V2_ARCH_COMPONENT_LABELS[fieldArch as V2ArchComponentType] ?? fieldArch)
		: null;
	const path = hint.varPath || hint.pointer;
	return archLabel ? `${archLabel} · ${path}` : path;
}

type BuiltSchemaParam = SchemaBuiltWorkParameterDto & {
	pointer: string;
	dictionaryCode?: string;
};

/**
 * Параметры схемы НЕ дедуплицируются по названию: одинаковое имя на разных путях
 * (например «Тип работ» в разных арх-блоках) — это разные поля схемы. Работа
 * настраивается в контексте конкретного поля; путь-источник виден в описании.
 */
function finalizeSchemaWorkParameters(
	params: BuiltSchemaParam[],
): SchemaBuiltWorkParameterDto[] {
	return params
		.map((param) => ({
			id: param.id,
			schemaFieldUid: param.schemaFieldUid,
			schemaPointer: param.pointer,
			code: param.code,
			name: param.name,
			description: param.description,
			dictionaryCode: param.dictionaryCode,
			numeric: param.numeric,
			textual: param.textual,
			values: param.values,
			sourceKeys: [param.code],
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

/** Заводские ключи массивов сгенерированных типовых работ (без archComponent в legacy). */
const LEGACY_TYPICAL_WORK_OUTPUT_ARRAY_KEYS = new Set([
	"sourceTypicalTasks",
	"detailTypicalTasks",
	"controlTypicalTasks",
]);

function isLegacyGeneratedTypicalWorkArrayUi(
	uiBranch: Record<string, unknown> | undefined,
	fieldKey: string,
): boolean {
	if (!uiBranch || !LEGACY_TYPICAL_WORK_OUTPUT_ARRAY_KEYS.has(fieldKey)) {
		return false;
	}
	if (resolveV2AnketaArchComponent(uiBranch) === "typicalWork") return true;
	return uiBranch["ui:readonly"] === true;
}

/** Поле внутри блока-результата «Типовые/Нетиповые работы» — не параметр источника. */
function isWorkResultBlockField(
	uiSchema: Record<string, unknown> | undefined,
	pointer: string,
): boolean {
	const arch = resolveArchComponentAtPointer(uiSchema, pointer);
	if (arch === "typicalWork" || arch === "atypicalWork") return true;

	const segments = pointerSegments(pointer);
	for (let len = segments.length; len > 0; len -= 1) {
		const key = segments[len - 1];
		if (!key) continue;
		const partialPointer = `/${segments.slice(0, len).join("/")}`;
		const branch = readUiSchemaBranchAtPointer(uiSchema, partialPointer);
		if (isLegacyGeneratedTypicalWorkArrayUi(branch, key)) return true;
	}
	return false;
}

/**
 * Поле системного scaffold-а (meta/summary/workflow/uncertaintyCalculation/
 * groupActivation) добавляется в каждую схему автоматически и не относится к
 * параметрам работы — исключаем из пикера.
 */
function isSystemScaffoldField(pointer: string): boolean {
	const [root] = pointerSegments(pointer);
	return Boolean(root) && isV2AnketaSystemRootKey(root);
}

export type BuildSchemaWorkParametersInput = {
	/**
	 * Тип арх. компонента работы (для подсказок в UI).
	 * Не фильтрует поля: параметры берутся из live-схемы конструктора целиком.
	 */
	archComponentType?: string;
	fieldPathHints: FieldPathHint[];
	uiSchema: Record<string, unknown> | undefined;
	jsonSchema: RJSFSchema;
	enumMapByCode: Record<string, EnumMapEntry>;
};

/** Параметры типовой работы из полей схемы анкеты. */
export function buildSchemaWorkParameters({
	fieldPathHints,
	uiSchema,
	jsonSchema,
	enumMapByCode,
}: BuildSchemaWorkParametersInput): SchemaBuiltWorkParameterDto[] {
	const params: BuiltSchemaParam[] = [];
	const usedCodes = new Set<string>();

	for (const hint of fieldPathHints) {
		if (isSystemScaffoldField(hint.pointer)) continue;
		if (!isArchComponentLeafField(hint.pointer, jsonSchema)) continue;
		if (isWorkResultBlockField(uiSchema, hint.pointer)) continue;

		const node = resolveSchemaNode(jsonSchema, pointerSegments(hint.pointer));
		const dictionaryValues = hint.dictionaryCode
			? valuesFromDictionary(hint.dictionaryCode, enumMapByCode)
			: [];
		const previewValues = valuesFromHintPreview(hint);
		const schemaValues = valuesFromSchemaNode(node);
		const values =
			dictionaryValues.length > 0
				? dictionaryValues
				: previewValues.length > 0
					? previewValues
					: schemaValues.values;
		const numeric =
			dictionaryValues.length > 0 || previewValues.length > 0
				? false
				: schemaValues.numeric;
		const textual =
			dictionaryValues.length > 0 ||
			previewValues.length > 0 ||
			schemaValues.textual !== true
				? undefined
				: true;
		const dictionaryCode = hint.dictionaryCode?.trim() || undefined;

		if (values.length === 0 && !numeric && !dictionaryCode && !textual)
			continue;

		const name = (hint.title ?? hint.key).trim();
		if (!name) continue;

		const code = schemaParamCodeFromHint(hint, usedCodes);
		params.push({
			id: `schema:${hint.schemaFieldUid ?? hint.pointer}`,
			schemaFieldUid: hint.schemaFieldUid ?? undefined,
			code,
			name,
			description: schemaParamDescription(hint, uiSchema),
			dictionaryCode,
			numeric,
			textual,
			values,
			pointer: hint.pointer,
		});
	}

	return finalizeSchemaWorkParameters(params);
}

const SCHEMA_PARAM_ID_PREFIX = "schema:";

export function schemaParamIdFromPointer(
	pointer: string,
	schemaFieldUid?: string | null,
): string {
	return `${SCHEMA_PARAM_ID_PREFIX}${schemaFieldUid ?? pointer}`;
}

export function resolveSchemaParamPointerFromId(id: string): string | null {
	return id.startsWith(SCHEMA_PARAM_ID_PREFIX)
		? id.slice(SCHEMA_PARAM_ID_PREFIX.length)
		: null;
}

/** varPath с `[]` для элементов массива (как в подсказках логики). */
export function jsonPointerToLogicVarPath(pointer: string): string {
	const segments = pointerSegments(pointer);
	const parts: string[] = [];
	for (const segment of segments) {
		if (segment === "items") {
			if (parts.length > 0) {
				parts[parts.length - 1] = `${parts[parts.length - 1]}[]`;
			}
			continue;
		}
		parts.push(segment);
	}
	return parts.join(".");
}

export type SchemaParamFieldRef = {
	pointer: string | null;
	varPath: string | null;
	fieldKey: string;
};

export function resolveSchemaParamFieldRef(
	param:
		| Pick<V2TypicalWorkParameterDto, "id" | "code" | "schemaPointer">
		| undefined,
): SchemaParamFieldRef {
	const fieldKey = param?.code?.trim() || "—";
	if (!param) return { pointer: null, varPath: null, fieldKey };
	const pointer =
		param.schemaPointer ?? resolveSchemaParamPointerFromId(param.id);
	if (!pointer) {
		return { pointer: null, varPath: null, fieldKey };
	}
	return {
		pointer,
		varPath: jsonPointerToLogicVarPath(pointer),
		fieldKey: pointerSegments(pointer).at(-1) ?? fieldKey,
	};
}

/** Находит параметр схемы по коду, алиасу (sourceKeys) или имени. */
export function findSchemaWorkParameter(
	paramOptions: V2TypicalWorkParameterDto[],
	paramCode: string,
	paramName?: string | null,
): V2TypicalWorkParameterDto | undefined {
	const direct = paramOptions.find((param) => param.code === paramCode);
	if (direct) return direct;

	const byAlias = paramOptions.find((param) =>
		param.sourceKeys?.includes(paramCode),
	);
	if (byAlias) return byAlias;

	if (paramName?.trim()) {
		const name = paramName.trim();
		return paramOptions.find((param) => param.name === name);
	}

	return undefined;
}

export function isSchemaLaborParamUsed(
	laborParams: Array<{ paramCode: string }>,
	param: Pick<V2TypicalWorkParameterDto, "code" | "sourceKeys">,
): boolean {
	return laborParams.some(
		(group) =>
			group.paramCode === param.code ||
			param.sourceKeys?.includes(group.paramCode),
	);
}

export function schemaParamRuleName(param: V2TypicalWorkParameterDto): string {
	return formatParamNameWithSourceKeys(param.name, param.sourceKeys);
}

export function schemaParamDisplayName(
	paramName: string | null | undefined,
): string {
	return stripParamNameSourceKeys(paramName);
}

export type TriggerRuleLike = {
	paramCode: string;
	paramName?: string | null;
};

/** Канонический ключ группы триггеров (объединяет legacy paramCode и поле схемы `type`). */
export function triggerRuleGroupKey(
	rule: TriggerRuleLike,
	paramOptions: V2TypicalWorkParameterDto[],
): string {
	const resolved = resolveSchemaParamForTriggerRule(rule, paramOptions);
	if (resolved) return resolved.code;
	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) return "type";
	return rule.paramCode;
}

export function filterRulesByGroupKey<
	T extends TriggerRuleLike & { id?: string },
>(
	rules: T[],
	groupKey: string,
	paramOptions: V2TypicalWorkParameterDto[],
): T[] {
	return rules.filter(
		(rule) => triggerRuleGroupKey(rule, paramOptions) === groupKey,
	);
}

export function excludeRulesByGroupKey<T extends TriggerRuleLike>(
	rules: T[],
	groupKey: string,
	paramOptions: V2TypicalWorkParameterDto[],
): T[] {
	return rules.filter(
		(rule) => triggerRuleGroupKey(rule, paramOptions) !== groupKey,
	);
}

/** CSV/seed-триггер → поле схемы анкеты (алиас «Тип источника (внешний)» → `type`). */
export function resolveSchemaParamForTriggerRule(
	rule: TriggerRuleLike,
	paramOptions: V2TypicalWorkParameterDto[],
): V2TypicalWorkParameterDto | undefined {
	const direct =
		paramOptions.find((param) => param.code === rule.paramCode) ??
		(rule.paramName
			? paramOptions.find((param) => param.name === rule.paramName)
			: undefined);
	if (direct) return direct;

	const paramLabel = rule.paramName ?? rule.paramCode;

	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) {
		return (
			paramOptions.find((param) => param.code === "type") ??
			paramOptions.find((param) => /тип.*источник/i.test(param.name))
		);
	}

	if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
		const controlCode = extractControlCode(paramLabel);
		if (controlCode) {
			const byCode = paramOptions.find(
				(param) =>
					param.name.toUpperCase().includes(controlCode) ||
					param.description?.toUpperCase().includes(controlCode),
			);
			if (byCode) return byCode;
		}
		return paramOptions.find((param) => /вид контроля/i.test(param.name));
	}

	return undefined;
}
