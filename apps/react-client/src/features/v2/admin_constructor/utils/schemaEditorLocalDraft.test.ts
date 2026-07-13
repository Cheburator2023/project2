import { describe, expect, it } from "vitest";
import { buildSchemaFieldChangeMap } from "../schemaEditor/schemaFieldTreeChanges";
import {
	ensureSchemaFieldUidsInSnapshot,
	normalizeSchemaEditorDraftSnapshot,
	schemaEditorDraftSnapshotsEqual,
} from "./schemaEditorLocalDraft";

describe("schemaEditorDraftSnapshot", () => {
	it("compares normalized draft snapshots", () => {
		const a = normalizeSchemaEditorDraftSnapshot({
			jsonSchema: { type: "object", properties: { a: { type: "string" } } },
			uiSchema: { a: { "ui:placeholder": "Подсказка" } },
			logic: { rules: [] },
			formData: { a: "x" },
		});
		const b = normalizeSchemaEditorDraftSnapshot({
			jsonSchema: { type: "object", properties: { a: { type: "string" } } },
			uiSchema: { a: { "ui:placeholder": "Подсказка" } },
			logic: { rules: [] },
			formData: { a: "x" },
		});
		const c = normalizeSchemaEditorDraftSnapshot({
			jsonSchema: { type: "object", properties: { a: { type: "string" } } },
			uiSchema: { a: { "ui:placeholder": "Другая" } },
			logic: { rules: [] },
			formData: {},
		});

		expect(schemaEditorDraftSnapshotsEqual(a, b)).toBe(true);
		expect(schemaEditorDraftSnapshotsEqual(a, c)).toBe(false);
	});

	it("backfills schemaFieldUid before baseline comparison", () => {
		const snapshot = normalizeSchemaEditorDraftSnapshot({
			jsonSchema: {
				type: "object",
				properties: {
					title: { type: "string", title: "Название" },
				},
			},
			uiSchema: {
				title: { "ui:placeholder": "Введите название" },
			},
			logic: { rules: [] },
			formData: {},
		});

		const hydrated = ensureSchemaFieldUidsInSnapshot(snapshot);
		const titleOptions = (
			hydrated.uiSchema.title as Record<string, unknown> | undefined
		)?.["ui:options"] as Record<string, unknown> | undefined;

		expect(typeof titleOptions?.schemaFieldUid).toBe("string");
		expect(
			buildSchemaFieldChangeMap(hydrated, {
				jsonSchema: hydrated.jsonSchema,
				uiSchema: hydrated.uiSchema,
			}).size,
		).toBe(0);
	});
});
