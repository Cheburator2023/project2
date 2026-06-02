import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

import {
	applyDictionaryBindingsToUiSchema,
	buildDefaultDictionariesFromJsonSchema,
	buildDictionaryBindingsFromSchema,
	collectDictionaryCodesFromUiSchema,
} from "../utils/v2-schema-dictionary.util";
import { enrichAnketaLayoutUiSchema } from "../utils/v2-anketa-ui-layout.util";
import { V2_DEFAULT_LOGIC_GRAPH } from "./v2-default-logic";

/**
 * Эталон схемы по макетам (PNG в `llm/v2_docs/figma/`).
 * Структурный источник: `llm/v2_docs/anketa-schema_default_parser_by_llm.json`
 * Файл рядом с этим модулем: `v2-default-anketa.snapshot.json` (копия эталона для рантайма).
 */
const SNAPSHOT_FILENAME = "v2-default-anketa.snapshot.json";

type SnapshotFile = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
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

/** Заводские справочники (коды и элементы из enum полей эталонной схемы). */
export const V2_DEFAULT_DICTIONARIES =
	buildDefaultDictionariesFromJsonSchema(jsonSchema);

/** Коды справочников, привязанных к заводской uiSchema. */
export const V2_DEFAULT_REFERENCED_DICTIONARY_CODES =
	collectDictionaryCodesFromUiSchema(uiSchema);

export const V2_DEFAULT_TEMPLATE_SNAPSHOT = {
	jsonSchema,
	uiSchema,
	logic: V2_DEFAULT_LOGIC_GRAPH satisfies V2LogicGraphDto,
	dictionariesSnapshot: {
		referencedDictionaryCodes: V2_DEFAULT_REFERENCED_DICTIONARY_CODES,
	},
	releaseNotes:
		"Заводская схема V2 (анкета калькуляции разработки моделей; эталон из llm-парса макетов)",
};
