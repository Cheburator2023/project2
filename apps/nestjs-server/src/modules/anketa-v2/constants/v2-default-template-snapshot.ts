import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

import {
	applyDictionaryBindingsToUiSchema,
	buildDefaultDictionariesFromJsonSchema,
	buildDictionariesFromUiSchemaReferences,
	buildDictionaryBindingsFromSchema,
	collectDictionaryCodesFromUiSchema,
} from "../utils/v2-schema-dictionary.util";
import { V35_FACTORY_DICTIONARY_CODE_SET } from "./v35-factory-dictionary-codes";
import { enrichAnketaLayoutUiSchema } from "../utils/v2-anketa-ui-layout.util";

/**
 * Эталон схемы: шаблон «Новая схема» v35 (экспорт smart-anketa-v2).
 * Файл рядом с этим модулем: `v2-default-anketa.snapshot.json`.
 * Обновление: `npm run sync:v35-factory-snapshot` (из apps/nestjs-server).
 */
const SNAPSHOT_FILENAME = "v2-default-anketa.snapshot.json";

type SnapshotFile = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
	logic?: unknown;
};

function resolveSnapshotPath(): string {
	const local = join(__dirname, SNAPSHOT_FILENAME);
	try {
		readFileSync(local);
		return local;
	} catch {
		return join(
			__dirname,
			"..",
			"..",
			"..",
			"..",
			"modules",
			"anketa-v2",
			"constants",
			SNAPSHOT_FILENAME,
		);
	}
}

function loadSnapshotPayload(): SnapshotFile {
	const snapshotPath = resolveSnapshotPath();
	const raw = readFileSync(snapshotPath, "utf-8");
	return JSON.parse(raw) as SnapshotFile;
}

function stripDraft07Schema(schema: Record<string, unknown>): V2JsonSchemaDto {
	const { $schema: _omit, ...rest } = schema;
	return rest as V2JsonSchemaDto;
}

const file = loadSnapshotPayload();
const rawSchema =
	file.jsonSchema &&
	typeof file.jsonSchema === "object" &&
	!Array.isArray(file.jsonSchema)
		? (file.jsonSchema as Record<string, unknown>)
		: { type: "object", properties: {} };

const jsonSchema = stripDraft07Schema(rawSchema);

const rawUi =
	typeof file.uiSchema === "object" &&
	file.uiSchema !== null &&
	!Array.isArray(file.uiSchema)
		? structuredClone(file.uiSchema)
		: {};

const dictionaryBindings = buildDictionaryBindingsFromSchema(jsonSchema);

const uiSchema = enrichAnketaLayoutUiSchema(
	applyDictionaryBindingsToUiSchema(rawUi as V2UiSchemaDto, dictionaryBindings),
	jsonSchema,
);

const logic =
	typeof file.logic === "object" &&
	file.logic !== null &&
	!Array.isArray(file.logic)
		? (file.logic as V2LogicGraphDto)
		: ({ rules: [] } satisfies V2LogicGraphDto);

/** Заводские справочники (enum схемы + ui-only привязки из uiSchema). */
const schemaDictionaries = buildDefaultDictionariesFromJsonSchema(jsonSchema);
const uiReferencedDictionaries = buildDictionariesFromUiSchemaReferences(
	jsonSchema,
	uiSchema,
	new Set(schemaDictionaries.map((d) => d.code)),
	V35_FACTORY_DICTIONARY_CODE_SET,
);
export const V2_DEFAULT_DICTIONARIES = [
	...schemaDictionaries,
	...uiReferencedDictionaries,
];

/** Коды справочников, привязанных к заводской uiSchema. */
export const V2_DEFAULT_REFERENCED_DICTIONARY_CODES =
	collectDictionaryCodesFromUiSchema(uiSchema);

export const V2_DEFAULT_TEMPLATE_SNAPSHOT = {
	jsonSchema,
	uiSchema,
	logic,
	dictionariesSnapshot: {
		referencedDictionaryCodes: V2_DEFAULT_REFERENCED_DICTIONARY_CODES,
	} satisfies V2DictionariesSnapshotDto,
	releaseNotes:
		"Заводская схема V2 — эталон шаблона «Новая схема» v35 (smart-anketa-v2 export)",
};
