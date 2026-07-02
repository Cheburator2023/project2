import type { RJSFSchema } from "@rjsf/utils";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	V2_ARCH_COMPONENT_LABELS,
	type V2ArchComponentType,
	extractControlCode,
	isControlTypeTriggerParam,
	isSourceTypeTriggerParam,
} from "@smart-anketa/api-contract";
import {
	isObjectFieldGroup,
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

	return "В схеме нет полей с выбором значений (enum, справочник, boolean, число)";
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

function valuesFromSchemaNode(
	node: RJSFSchema | undefined,
): Pick<V2TypicalWorkParameterDto, "values" | "numeric"> {
	if (!node) return { values: [] };

	const enumValues = Array.isArray(node.enum)
		? node.enum.filter((value): value is string => typeof value === "string")
		: [];
	const enumNames = Array.isArray(node.enumNames)
		? node.enumNames.filter((value): value is string => typeof value === "string")
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
	if (!type) return false;
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
	const base = (hint.varPath ?? hint.pointer.replace(/^\//, "").replace(/\//g, "_"))
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

export type BuildSchemaWorkParametersInput = {
	/** Не используется для фильтрации — оставлен для совместимости вызовов. */
	archComponentType?: string;
	fieldPathHints: FieldPathHint[];
	uiSchema: Record<string, unknown> | undefined;
	jsonSchema: RJSFSchema;
	enumMapByCode: Record<string, EnumMapEntry>;
};

/** Все параметры типовой работы из полей схемы анкеты (без фильтра по arch-компоненту). */
export function buildSchemaWorkParameters({
	fieldPathHints,
	uiSchema,
	jsonSchema,
	enumMapByCode,
}: BuildSchemaWorkParametersInput): V2TypicalWorkParameterDto[] {
	const params: V2TypicalWorkParameterDto[] = [];
	const usedCodes = new Set<string>();

	for (const hint of fieldPathHints) {
		if (!isArchComponentLeafField(hint.pointer, jsonSchema)) continue;

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

		if (values.length === 0 && !numeric) continue;

		const name = (hint.title ?? hint.key).trim();
		if (!name) continue;

		params.push({
			id: `schema:${hint.pointer}`,
			code: schemaParamCodeFromHint(hint, usedCodes),
			name,
			description: schemaParamDescription(hint, uiSchema),
			numeric,
			values,
		});
	}

	params.sort((a, b) => a.name.localeCompare(b.name, "ru"));
	return params;
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
>(rules: T[], groupKey: string, paramOptions: V2TypicalWorkParameterDto[]): T[] {
	return rules.filter(
		(rule) => triggerRuleGroupKey(rule, paramOptions) === groupKey,
	);
}

export function excludeRulesByGroupKey<
	T extends TriggerRuleLike,
>(rules: T[], groupKey: string, paramOptions: V2TypicalWorkParameterDto[]): T[] {
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
