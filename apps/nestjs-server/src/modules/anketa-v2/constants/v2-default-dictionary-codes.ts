import { V2_DEFAULT_DICTIONARIES } from "./v2-default-template-snapshot";

/** Коды заводских справочников (из enum эталонной схемы). */
export const V2_DEFAULT_DICTIONARY_CODES: readonly string[] =
	V2_DEFAULT_DICTIONARIES.map((d) => d.code);

const DEFAULT_CODE_SET = new Set(V2_DEFAULT_DICTIONARY_CODES);

export function isV2DefaultDictionaryCode(code: string): boolean {
	return DEFAULT_CODE_SET.has(code);
}

export function findV2DefaultDictionaryDef(code: string) {
	return V2_DEFAULT_DICTIONARIES.find((d) => d.code === code);
}
