import type { V2LogicGraphDto } from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	isLayoutGroupUi,
	readLeafUiOptions,
} from "../schemaEditor/propertiesFieldKind";
import {
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "./coerceV2TemplateSnapshot";
import {
	listSchemaFields,
	patchUiOptionsAtPointer,
	readUiSchemaBranchAtPointer,
	stripUiObjectFieldTemplatesFromUi,
} from "./schemaMutators";

export type SchemaEditorDraftSnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: V2LogicGraphDto;
	formData: Record<string, unknown>;
};

export function normalizeSchemaEditorDraftSnapshot(input: {
	jsonSchema?: unknown;
	uiSchema?: unknown;
	logic?: unknown;
	formData?: Record<string, unknown>;
}): SchemaEditorDraftSnapshot {
	const jsonSchema = coerceJsonSchema(input.jsonSchema);
	const uiSchema = stripUiObjectFieldTemplatesFromUi(
		coerceUiSchema(input.uiSchema, jsonSchema) as Record<string, unknown>,
	) as UiSchema;

	return {
		jsonSchema,
		uiSchema,
		logic: coerceLogicGraph(input.logic),
		formData:
			input.formData &&
			typeof input.formData === "object" &&
			!Array.isArray(input.formData)
				? (input.formData as Record<string, unknown>)
				: {},
	};
}

export function serializeSchemaEditorDraftSnapshot(
	snapshot: SchemaEditorDraftSnapshot,
): string {
	const normalized = normalizeSchemaEditorDraftSnapshot(snapshot);
	return JSON.stringify({
		jsonSchema: normalized.jsonSchema,
		uiSchema: normalized.uiSchema,
		logic: normalized.logic,
		formData: normalized.formData,
	});
}

export function schemaEditorDraftSnapshotsEqual(
	a: SchemaEditorDraftSnapshot,
	b: SchemaEditorDraftSnapshot,
): boolean {
	return (
		serializeSchemaEditorDraftSnapshot(a) ===
		serializeSchemaEditorDraftSnapshot(b)
	);
}

export function snapshotFromTemplateVersion(version: {
	jsonSchema: unknown;
	uiSchema: unknown;
	logic: unknown;
}): SchemaEditorDraftSnapshot {
	return ensureSchemaFieldUidsInSnapshot(
		normalizeSchemaEditorDraftSnapshot({
			jsonSchema: version.jsonSchema,
			uiSchema: version.uiSchema,
			logic: version.logic,
			formData: {},
		}),
	);
}

function readSchemaFieldUid(
	uiBranch: Record<string, unknown> | undefined,
): string | null {
	const opts = uiBranch?.["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
	const uid = (opts as Record<string, unknown>).schemaFieldUid;
	return typeof uid === "string" && uid.trim() ? uid.trim() : null;
}

function readArchComponent(
	uiBranch: Record<string, unknown> | undefined,
): string | null {
	const opts = uiBranch?.["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
	const arch = (opts as Record<string, unknown>).archComponent;
	return typeof arch === "string" && arch.trim() ? arch.trim() : null;
}

function readArchBlockUid(
	uiBranch: Record<string, unknown> | undefined,
): string | null {
	const opts = uiBranch?.["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
	const uid = (opts as Record<string, unknown>).archBlockUid;
	return typeof uid === "string" && uid.trim() ? uid.trim() : null;
}

/** Добавляет schemaFieldUid / archBlockUid legacy-полям до фиксации baseline. */
export function ensureSchemaFieldUidsInSnapshot(
	snapshot: SchemaEditorDraftSnapshot,
): SchemaEditorDraftSnapshot {
	const { jsonSchema } = snapshot;
	let ui = snapshot.uiSchema as Record<string, unknown>;
	let changed = false;

	for (const row of listSchemaFields(jsonSchema, "/", 0, ui as UiSchema)) {
		const leaf = readUiSchemaBranchAtPointer(ui, row.pointer);
		if (isLayoutGroupUi(readLeafUiOptions(leaf))) continue;

		const patch: Record<string, unknown> = {};
		if (!readSchemaFieldUid(leaf)) {
			patch.schemaFieldUid = `field_${crypto.randomUUID()}`;
		}
		if (readArchComponent(leaf) && !readArchBlockUid(leaf)) {
			patch.archBlockUid = `block_${crypto.randomUUID()}`;
		}
		if (Object.keys(patch).length === 0) continue;

		ui = patchUiOptionsAtPointer(ui, row.pointer, patch);
		changed = true;
	}

	if (!changed) return snapshot;

	return {
		...snapshot,
		uiSchema: ui as UiSchema,
	};
}
