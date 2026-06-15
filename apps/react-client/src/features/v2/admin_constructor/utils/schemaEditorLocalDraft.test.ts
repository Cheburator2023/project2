import { describe, expect, it } from "vitest";
import {
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
});
