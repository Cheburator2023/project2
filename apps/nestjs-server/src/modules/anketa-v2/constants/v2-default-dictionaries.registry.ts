import type { V2JsonSchemaDto } from "@smart-anketa/api-contract";
import { V2_METHODOLOGY_DICTIONARIES } from "./v2-methodology-dictionaries";
import type { V2DefaultDictionaryDef } from "../utils/v2-schema-dictionary.util";
import {
	extractEnumFieldsFromJsonSchema,
	jsonPointerToDictionaryCode,
} from "../utils/v2-schema-dictionary.util";

export type { V2DefaultDictionaryDef };

/** Методологический справочник с тем же названием, что у поля схемы (дубль enum-справочника). */
const METHODOLOGY_BY_NAME = new Map(
	V2_METHODOLOGY_DICTIONARIES.map((d) => [d.name, d]),
);

export function methodologyDictionaryByName(
	name: string,
): (typeof V2_METHODOLOGY_DICTIONARIES)[number] | undefined {
	return METHODOLOGY_BY_NAME.get(name);
}

/** Заводские справочники схемы (без дублей методологии). */
export function filterSchemaDefaultDictionaries(
	schemaDicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef[] {
	return schemaDicts.filter((d) => !METHODOLOGY_BY_NAME.has(d.name));
}

/** Все заводские справочники: схема + методология (не удаляемые, со сбросом). */
export function buildAllDefaultDictionaries(
	schemaDicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef[] {
	return [...filterSchemaDefaultDictionaries(schemaDicts), ...V2_METHODOLOGY_DICTIONARIES];
}

export function findDefaultDictionaryDef(
	code: string,
	schemaDicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef | undefined {
	return buildAllDefaultDictionaries(schemaDicts).find((d) => d.code === code);
}

export function isDefaultDictionaryCode(
	code: string,
	schemaDicts: V2DefaultDictionaryDef[],
): boolean {
	return buildAllDefaultDictionaries(schemaDicts).some((d) => d.code === code);
}

/** Коды enum-справочников схемы, заменённые методологическими (можно убрать из БД). */
export function supersededSchemaDictionaryCodes(
	schema: V2JsonSchemaDto,
): string[] {
	return extractEnumFieldsFromJsonSchema(schema)
		.filter((f) => METHODOLOGY_BY_NAME.has(f.title))
		.map((f) => jsonPointerToDictionaryCode(f.pointer));
}
