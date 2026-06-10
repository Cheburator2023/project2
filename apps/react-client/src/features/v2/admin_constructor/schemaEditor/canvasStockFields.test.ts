import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	isCanvasStockField,
	resolveArrayPointerFromItemField,
} from "./canvasStockFields";

describe("canvasStockFields", () => {
	const ui: UiSchema = {
		detailAtypicalTasks: {
			"ui:options": { archComponent: "atypicalWork" },
		},
	};

	it("detects stock keys for atypical work items", () => {
		expect(
			isCanvasStockField(ui, "/detailAtypicalTasks/items/workType"),
		).toBe(true);
		expect(
			isCanvasStockField(ui, "/detailAtypicalTasks/items/customField"),
		).toBe(false);
	});

	it("resolves array pointer from item field", () => {
		expect(
			resolveArrayPointerFromItemField("/detailAtypicalTasks/items/name"),
		).toBe("/detailAtypicalTasks");
	});

	it("returns false for fields outside arch array items", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				group: {
					type: "object",
					properties: { name: { type: "string" } },
				},
			},
		};
		void schema;
		expect(isCanvasStockField(ui, "/group/name")).toBe(false);
	});
});
