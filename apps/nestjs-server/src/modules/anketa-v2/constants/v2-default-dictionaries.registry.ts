import type { V2JsonSchemaDto } from "@smart-anketa/api-contract";
import { V2_ORGANIZATIONAL_DICTIONARIES } from "./v2-default-organizational-dictionaries";
import { V2_METHODOLOGY_DICTIONARIES } from "./v2-methodology-dictionaries";
import { FACTORY_DICTIONARY_CODE_SET } from "./factory-dictionary-codes";
import { FACTORY_UI_ONLY_DICTIONARIES } from "./factory-ui-only-dictionaries";
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

function buildUnfilteredDefaultDictionaries(
	schemaDicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef[] {
	const byCode = new Map<string, V2DefaultDictionaryDef>();
	for (const def of [
		...filterSchemaDefaultDictionaries(schemaDicts),
		...V2_ORGANIZATIONAL_DICTIONARIES,
		...V2_METHODOLOGY_DICTIONARIES,
		...FACTORY_UI_ONLY_DICTIONARIES,
	]) {
		byCode.set(def.code, def);
	}
	return [...byCode.values()];
}

function filterByFactoryAllowlist(
	dicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef[] {
	return dicts.filter((d) => FACTORY_DICTIONARY_CODE_SET.has(d.code));
}

/** Все заводские справочники: схема + методология (не удаляемые, со сбросом). */
export function buildAllDefaultDictionaries(
	schemaDicts: V2DefaultDictionaryDef[],
): V2DefaultDictionaryDef[] {
	return filterByFactoryAllowlist(buildUnfilteredDefaultDictionaries(schemaDicts));
}

/** Коды заводских справочников до фильтра allowlist (для очистки устаревших в БД). */
export function buildLegacyFactoryDictionaryCodes(
	schemaDicts: V2DefaultDictionaryDef[],
): string[] {
	return buildUnfilteredDefaultDictionaries(schemaDicts).map((d) => d.code);
}

export function isLegacyFactoryDictionaryCode(
	code: string,
	legacyCodes: Set<string>,
): boolean {
	if (legacyCodes.has(code) || code.startsWith("v2.method.")) {
		return true;
	}

	return code.startsWith("v2.");
}

const FACTORY_DICTIONARY_CATEGORIES = new Set([
	"Схема",
	"Методология",
	"Организационный",
]);

export function isObsoleteFactoryDictionary(
	dictionary: {
		code: string;
		category: string | null;
		description: string | null;
	},
	legacyCodes: Set<string>,
): boolean {
	if (isLegacyFactoryDictionaryCode(dictionary.code, legacyCodes)) {
		return true;
	}

	if (
		dictionary.category &&
		FACTORY_DICTIONARY_CATEGORIES.has(dictionary.category)
	) {
		return true;
	}

	return Boolean(dictionary.description?.includes("Заводской"));
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
