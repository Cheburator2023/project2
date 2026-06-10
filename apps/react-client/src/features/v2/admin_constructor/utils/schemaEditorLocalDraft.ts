import type { V2LogicGraphDto } from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "./coerceV2TemplateSnapshot";
import { stripUiObjectFieldTemplatesFromUi } from "./schemaMutators";

const STORAGE_PREFIX = "smart-anketa:v2-schema-editor-draft";

export type SchemaEditorDraftSnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	logic: V2LogicGraphDto;
	formData: Record<string, unknown>;
};

export type SchemaEditorLocalDraftRecord = SchemaEditorDraftSnapshot & {
	versionId: string;
	updatedAt: number;
};

export function schemaEditorLocalDraftStorageKey(
	templateId: string,
	versionId: string,
): string {
	return `${STORAGE_PREFIX}:${templateId}:${versionId}`;
}

function safeJsonParse(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

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

export function readSchemaEditorLocalDraft(
	templateId: string,
	versionId: string,
): SchemaEditorLocalDraftRecord | null {
	if (typeof window === "undefined") return null;

	try {
		const raw = window.localStorage.getItem(
			schemaEditorLocalDraftStorageKey(templateId, versionId),
		);
		if (!raw) return null;

		const parsed = safeJsonParse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}

		const row = parsed as Record<string, unknown>;
		if (typeof row.versionId !== "string" || row.versionId !== versionId) {
			return null;
		}

		const snapshot = normalizeSchemaEditorDraftSnapshot({
			jsonSchema: row.jsonSchema,
			uiSchema: row.uiSchema,
			logic: row.logic,
			formData: row.formData as Record<string, unknown> | undefined,
		});

		return {
			...snapshot,
			versionId,
			updatedAt:
				typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt)
					? row.updatedAt
					: Date.now(),
		};
	} catch {
		return null;
	}
}

export function writeSchemaEditorLocalDraft(
	templateId: string,
	versionId: string,
	snapshot: SchemaEditorDraftSnapshot,
): void {
	if (typeof window === "undefined") return;

	const normalized = normalizeSchemaEditorDraftSnapshot(snapshot);
	const payload: SchemaEditorLocalDraftRecord = {
		...normalized,
		versionId,
		updatedAt: Date.now(),
	};

	try {
		window.localStorage.setItem(
			schemaEditorLocalDraftStorageKey(templateId, versionId),
			JSON.stringify(payload),
		);
	} catch {
		// localStorage quota / private mode — не блокируем редактор
	}
}

export function clearSchemaEditorLocalDraft(
	templateId: string,
	versionId: string,
): void {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.removeItem(
			schemaEditorLocalDraftStorageKey(templateId, versionId),
		);
	} catch {
		// ignore
	}
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
