import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	buildPaletteDragNode,
	buildSchemaCanvasTree,
	getPresetIdFromPaletteDragSource,
	PALETTE_DRAG_TYPE,
	SCHEMA_CANVAS_ROOT_ID,
	treeToGroupOrders,
} from "./schemaCanvasTree";

describe("palette drag helpers", () => {
	it("builds NodeModel drag item and resolves preset id", () => {
		const node = buildPaletteDragNode("string", "Строка");
		expect(node.parent).toBe(SCHEMA_CANVAS_ROOT_ID);
		expect(node.text).toBe("Строка");
		expect(getPresetIdFromPaletteDragSource(node)).toBe("string");
		expect(getPresetIdFromPaletteDragSource({
			type: PALETTE_DRAG_TYPE,
			presetId: "number",
			text: "Число",
		})).toBe("number");
	});
});

describe("buildSchemaCanvasTree", () => {
	it("builds root and nested group nodes", () => {
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
				name: { type: "string", title: "Имя" },
			},
		};

		const tree = buildSchemaCanvasTree(schema);
		const byId = new Map(tree.map((n) => [String(n.id), n]));

		expect(byId.get("/group1")?.parent).toBe(SCHEMA_CANVAS_ROOT_ID);
		expect(byId.get("/group1")?.droppable).toBe(true);
		expect(byId.get("/group1/child1")?.parent).toBe("/group1");
		expect(byId.get("/name")?.parent).toBe(SCHEMA_CANVAS_ROOT_ID);
	});

	it("adds array items section node", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
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

		const tree = buildSchemaCanvasTree(schema);
		expect(tree.some((n) => n.id === "/items/@items")).toBe(true);
		const row = tree.find((n) => n.data?.fieldKey === "row");
		expect(row?.id).toBe("/items/items/row");
		expect(row?.parent).toBe("/items/@items");
	});
});

describe("treeToGroupOrders", () => {
	it("maps tree siblings back to group orders", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				left: {
					type: "object",
					properties: {},
				},
				right: {
					type: "object",
					properties: { b: { type: "string" }, a: { type: "string" } },
				},
			},
		};
		const ui: UiSchema = {
			"ui:order": ["left", "right"],
			left: { "ui:order": [] },
			right: { "ui:order": ["b", "a"] },
		};

		const tree = buildSchemaCanvasTree(schema, ui);
		const orders = treeToGroupOrders(tree);

		expect(orders["schema-root"]).toEqual(["left", "right"]);
		expect(orders["schema-group:/left"]).toEqual([]);
		expect(orders["schema-group:/right"]).toEqual(["b", "a"]);
	});
});
