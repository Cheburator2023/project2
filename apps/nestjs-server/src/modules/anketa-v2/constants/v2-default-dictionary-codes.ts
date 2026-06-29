import { V2_DEFAULT_DICTIONARIES } from "./v2-default-template-snapshot";
import {
	buildAllDefaultDictionaries,
	findDefaultDictionaryDef,
} from "./v2-default-dictionaries.registry";
import { FACTORY_DICTIONARY_CODE_SET } from "./factory-dictionary-codes";

/** Все заводские справочники (схема без дублей + методология), только factory allowlist. */
export const V2_ALL_DEFAULT_DICTIONARIES = buildAllDefaultDictionaries(
	V2_DEFAULT_DICTIONARIES,
);

/** @deprecated используйте V2_ALL_DEFAULT_DICTIONARIES */
export const V2_DEFAULT_DICTIONARY_CODES: readonly string[] =
	V2_ALL_DEFAULT_DICTIONARIES.map((d) => d.code);

export function isV2DefaultDictionaryCode(code: string): boolean {
	return FACTORY_DICTIONARY_CODE_SET.has(code);
}

export function findV2DefaultDictionaryDef(code: string) {
	return findDefaultDictionaryDef(code, V2_DEFAULT_DICTIONARIES);
}
