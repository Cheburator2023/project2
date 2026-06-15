import type { V2LogicGraphDto } from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "./coerceV2TemplateSnapshot";
import { stripUiObjectFieldTemplatesFromUi } from "./schemaMutators";

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
	return normalizeSchemaEditorDraftSnapshot({
		jsonSchema: version.jsonSchema,
		uiSchema: version.uiSchema,
		logic: version.logic,
		formData: {},
	});
}
