import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";
import { patchV2TypicalWorksLogicRules } from "@smart-anketa/api-contract";

import {
	buildDefaultDictionariesFromJsonSchema,
	buildDictionariesFromUiSchemaReferences,
	collectDictionaryCodesFromUiSchema,
} from "../utils/v2-schema-dictionary.util";

/**
 * Эталон схемы: заводской шаблон «Новая схема», версия 35 (export smart-anketa-v2).
 * Файл: `v2-default-anketa.snapshot.json` — копия v35 без изменений.
 * Обновление: `npm run sync:factory-snapshot -- /path/to/export.json` (из apps/nestjs-server).
 */
const SNAPSHOT_FILENAME = "v2-default-anketa.snapshot.json";

type SnapshotFile = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
	logic?: unknown;
	dictionariesSnapshot?: V2DictionariesSnapshotDto;
};

function resolveSnapshotPath(): string {
	return join(__dirname, SNAPSHOT_FILENAME);
}

function loadSnapshotPayload(): SnapshotFile {
	const snapshotPath = resolveSnapshotPath();
	const raw = readFileSync(snapshotPath, "utf-8");
	return JSON.parse(raw) as SnapshotFile;
}

function asJsonSchema(value: unknown): V2JsonSchemaDto {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const { $schema: _omit, ...rest } = value as Record<string, unknown>;
		return rest as V2JsonSchemaDto;
	}
	return { type: "object", properties: {} };
}

function asUiSchema(value: unknown): V2UiSchemaDto {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return structuredClone(value) as V2UiSchemaDto;
	}
	return {};
}

function asLogic(value: unknown): V2LogicGraphDto {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as V2LogicGraphDto;
	}
	return { rules: [] };
}

const file = loadSnapshotPayload();

/** Как в v35 export — без applyDictionaryBindings / enrichAnketaLayout. */
export const V2_DEFAULT_TEMPLATE_SNAPSHOT = {
	jsonSchema: asJsonSchema(file.jsonSchema),
	uiSchema: asUiSchema(file.uiSchema),
	logic: patchV2TypicalWorksLogicRules(asLogic(file.logic)),
	dictionariesSnapshot: (file.dictionariesSnapshot ??
		({
			referencedDictionaryCodes: collectDictionaryCodesFromUiSchema(
				asUiSchema(file.uiSchema),
			),
		} satisfies V2DictionariesSnapshotDto)) as V2DictionariesSnapshotDto,
	releaseNotes:
		"Заводская схема V2 — эталон шаблона «Новая схема» (export smart-anketa-v2, v35)",
};

const { jsonSchema, uiSchema, dictionariesSnapshot } =
	V2_DEFAULT_TEMPLATE_SNAPSHOT;

/** Заводские справочники (enum схемы + ui-only привязки из uiSchema v35). */
const schemaDictionaries = buildDefaultDictionariesFromJsonSchema(jsonSchema);
const uiDictionaryAllowlist = dictionariesSnapshot.referencedDictionaryCodes
	?.length
	? new Set(dictionariesSnapshot.referencedDictionaryCodes)
	: undefined;
const uiReferencedDictionaries = buildDictionariesFromUiSchemaReferences(
	jsonSchema,
	uiSchema,
	new Set(schemaDictionaries.map((d) => d.code)),
	uiDictionaryAllowlist,
);
export const V2_DEFAULT_DICTIONARIES = [
	...schemaDictionaries,
	...uiReferencedDictionaries,
];

/** Коды справочников, привязанных к заводской uiSchema. */
export const V2_DEFAULT_REFERENCED_DICTIONARY_CODES =
	dictionariesSnapshot.referencedDictionaryCodes ??
	collectDictionaryCodesFromUiSchema(uiSchema);
