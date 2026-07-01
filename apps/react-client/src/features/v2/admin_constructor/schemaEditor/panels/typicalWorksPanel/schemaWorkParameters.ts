import type { RJSFSchema } from "@rjsf/utils";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	V2_ARCH_COMPONENT_LABELS,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";
import {
	isObjectFieldGroup,
	resolveSchemaNode,
} from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import { pointerSegments } from "@react-client/features/v2/admin_constructor/utils/schemaPaths";
import { WORK_ARCH_COMPONENT_TYPES } from "./typicalWorkPatchErrors";
import { archComponentShortLabel } from "./typicalWorksUi";
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
	for (const candidate of candidates) {
		const trimmed = candidate?.trim();
		if (trimmed) return trimmed;
	}
	return "";
}

export function schemaWorkParameterEmptyPickerMessage(
	archComponentType: string,
	schemaFieldCount: number,
	usedParamCodesSize: number,
	allUsedMessage?: string,
): string {
	const archLabel =
		archComponentShortLabel(
			resolveEffectiveWorkArchComponentType(archComponentType),
		) || "не указан";

	if (usedParamCodesSize > 0) {
		return (
			allUsedMessage ??
			`Все параметры компонента «${archLabel}» уже добавлены`
		);
	}

	if (!resolveEffectiveWorkArchComponentType(archComponentType)) {
		return "У работы не указан тип арх. компонента — задайте его в шапке карточки";
	}

	if (!resolveWorkArchSchemaType(archComponentType)) {
		return `Тип «${archLabel}» не сопоставлен с арх. компонентом схемы`;
	}

	if (schemaFieldCount === 0) {
		return "Схема шаблона ещё не загружена или пуста";
	}

	return `В схеме нет полей для компонента «${archLabel}» с выбором значений (enum, справочник, boolean)`;
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

export type BuildSchemaWorkParametersInput = {
	archComponentType: string;
	fieldPathHints: FieldPathHint[];
	uiSchema: Record<string, unknown> | undefined;
	jsonSchema: RJSFSchema;
	enumMapByCode: Record<string, EnumMapEntry>;
};

/** Параметры типовой работы из полей схемы анкеты (те же, что в конструкторе). */
export function buildSchemaWorkParameters({
	archComponentType,
	fieldPathHints,
	uiSchema,
	jsonSchema,
	enumMapByCode,
}: BuildSchemaWorkParametersInput): V2TypicalWorkParameterDto[] {
	const normalizedArch = resolveEffectiveWorkArchComponentType(archComponentType);
	const targetArch = resolveWorkArchSchemaType(normalizedArch);
	if (!targetArch) return [];

	const params: V2TypicalWorkParameterDto[] = [];

	for (const hint of fieldPathHints) {
		const fieldArch = resolveArchComponentAtPointer(uiSchema, hint.pointer);
		if (fieldArch !== targetArch) continue;
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
		const numeric = dictionaryValues.length > 0 || previewValues.length > 0
			? false
			: schemaValues.numeric;

		if (values.length === 0 && !numeric) continue;

		const name = (hint.title ?? hint.key).trim();
		if (!name) continue;

		params.push({
			id: `schema:${hint.pointer}`,
			code: hint.key,
			name,
			description: hint.varPath || hint.pointer,
			numeric,
			values,
		});
	}

	params.sort((a, b) => a.name.localeCompare(b.name, "ru"));
	return params;
}
