import { describe, expect, it } from "vitest";
import {
	formatSchemaEditorSnapshotJson,
	parseSchemaEditorSnapshotJson,
} from "./schemaEditorSnapshotJson";

describe("schemaEditorSnapshotJson", () => {
	it("round-trips snapshot shape", () => {
		const text = formatSchemaEditorSnapshotJson({
			jsonSchema: { type: "object", properties: {} },
			uiSchema: { "ui:order": [] },
			logic: { rules: [{ id: "r1" }] },
		});
		expect(text).toContain("\t");
		const parsed = parseSchemaEditorSnapshotJson(text);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value.jsonSchema).toEqual({
			type: "object",
			properties: {},
		});
		expect(parsed.value.uiSchema).toEqual({ "ui:order": [] });
		expect(parsed.value.logic).toEqual({ rules: [{ id: "r1" }] });
	});

	it("ignores extra top-level keys on parse", () => {
		const parsed = parseSchemaEditorSnapshotJson(
			JSON.stringify({
				jsonSchema: { type: "object" },
				uiSchema: {},
				logic: { rules: [] },
				dictionariesSnapshot: { items: [] },
			}),
		);
		expect(parsed.ok).toBe(true);
	});

	it("rejects bare schema without wrapper", () => {
		const parsed = parseSchemaEditorSnapshotJson(
			JSON.stringify({ type: "object", properties: {} }),
		);
		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.error).toMatch(/jsonSchema/);
	});
});
