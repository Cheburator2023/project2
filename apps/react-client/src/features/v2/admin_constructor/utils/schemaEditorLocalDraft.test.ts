import { describe, expect, it } from "vitest";
import {
	normalizeSchemaEditorDraftSnapshot,
	schemaEditorDraftSnapshotsEqual,
	schemaEditorLocalDraftStorageKey,
} from "./schemaEditorLocalDraft";

describe("schemaEditorLocalDraft", () => {
	it("builds stable storage key per template and version", () => {
		expect(schemaEditorLocalDraftStorageKey("tpl-1", "ver-1")).toBe(
			"smart-anketa:v2-schema-editor-draft:tpl-1:ver-1",
		);
	});

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
});
