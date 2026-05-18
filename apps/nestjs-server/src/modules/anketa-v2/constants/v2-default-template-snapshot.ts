import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

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

function loadSnapshotPayload(): SnapshotFile {
	const snapshotPath = join(__dirname, SNAPSHOT_FILENAME);
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

export const V2_DEFAULT_TEMPLATE_SNAPSHOT = {
	jsonSchema: stripDraft07Schema(rawSchema),
	uiSchema: (typeof file.uiSchema === "object" &&
	file.uiSchema !== null &&
	!Array.isArray(file.uiSchema)
		? structuredClone(file.uiSchema)
		: {}) as V2UiSchemaDto,

	logic: { rules: [] } satisfies V2LogicGraphDto,

	releaseNotes:
		"Заводская схема V2 (анкета калькуляции разработки моделей; эталон из llm-парса макетов)",
};
