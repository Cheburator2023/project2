import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	buildSchemaFieldChangeMap,
	describeSchemaFieldChanges,
} from "./schemaFieldTreeChanges";
import {
	buildSchemaFieldTreeModel,
	collectSchemaFieldPointerIds,
} from "./schemaFieldTreeModel";

describe("buildSchemaFieldTreeModel", () => {
	it("includes nested object and array item fields", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				group1: {
					type: "object",
					title: "Группа",
					properties: {
						child1: { type: "string", title: "A" },
					},
				},
				items: {
					type: "array",
					title: "Список",
					items: {
						type: "object",
						properties: {
							row: { type: "string", title: "Row" },
						},
					},
				},
			},
		};

		const pointers = collectSchemaFieldPointerIds(schema);
		expect(pointers).toEqual(
			expect.arrayContaining([
				"/group1",
				"/group1/child1",
				"/items",
				"/items/items/row",
			]),
		);

		const roots = buildSchemaFieldTreeModel(schema);
		expect(roots.map((node) => node.id)).toEqual(
			expect.arrayContaining(["/group1", "/items"]),
		);
		expect(
			roots.find((node) => node.id === "/group1")?.children?.map((node) => node.id),
		).toEqual(["/group1/child1"]);
		expect(
			roots.find((node) => node.id === "/items")?.children?.map((node) => node.id),
		).toEqual(["/items/items/row"]);
	});
});

describe("buildSchemaFieldChangeMap", () => {
	const baselineSchema: RJSFSchema = {
		type: "object",
		properties: {
			name: { type: "string", title: "Имя" },
		},
		required: ["name"],
	};
	const baselineUi: UiSchema = {
		name: { "ui:widget": "TextFieldCustomWidget" },
	};

	it("detects schema, ui and required changes", () => {
		const currentSchema: RJSFSchema = {
			type: "object",
			properties: {
				name: { type: "string", title: "ФИО" },
			},
		};
		const currentUi: UiSchema = {
			name: { "ui:widget": "hidden" },
		};

		const change = describeSchemaFieldChanges(
			{ jsonSchema: baselineSchema, uiSchema: baselineUi },
			{ jsonSchema: currentSchema, uiSchema: currentUi },
			"/name",
		);

		expect(change?.kinds).toEqual(
			expect.arrayContaining(["schema", "ui", "required"]),
		);
		expect(change?.details).toEqual(
			expect.arrayContaining([
				"Заголовок: Имя → ФИО",
				"Виджет: TextFieldCustomWidget → hidden",
				"Снята обязательность",
			]),
		);

		const map = buildSchemaFieldChangeMap(
			{ jsonSchema: baselineSchema, uiSchema: baselineUi },
			{ jsonSchema: currentSchema, uiSchema: currentUi },
		);
		expect(map.get("/name")?.details.length).toBeGreaterThan(0);
	});
});
