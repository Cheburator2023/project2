import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	buildPaletteDragNode,
	buildSchemaCanvasTree,
	clampCanvasInsertIndex,
	getPresetIdFromPaletteDragSource,
	listCanvasEditableChildKeys,
	listCanvasOrderedChildKeys,
	PALETTE_DRAG_TYPE,
	SCHEMA_CANVAS_ROOT_ID,
	SCHEMA_CANVAS_SYSTEM_DIVIDER_ID,
	resolveCanvasDropTarget,
	treeToGroupOrders,
} from "./schemaCanvasTree";
import type { DropOptions } from "@minoru/react-dnd-treeview";
import type { SchemaCanvasNodeData } from "./schemaCanvasTree";

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
		expect(tree.some((n) => n.id === "/items/@items")).toBe(false);
		expect(tree.find((n) => n.id === "/items")?.droppable).toBe(true);
		const row = tree.find((n) => n.data?.fieldKey === "row");
		expect(row?.id).toBe("/items/items/row");
		expect(row?.parent).toBe("/items");
	});

	it("renders atypical work item fields as direct children of the array", () => {
		const preset = {
			type: "array",
			title: "Нетиповые работы",
			items: {
				type: "object",
				properties: {
					name: { type: "string", title: "Задача" },
					workType: { type: "string", title: "Тип работ" },
				},
			},
		} satisfies RJSFSchema;
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				detailAtypicalTasks: preset,
			},
		};
		const ui: UiSchema = {
			detailAtypicalTasks: {
				"ui:options": { archComponent: "atypicalWork" },
				items: {
					"ui:order": ["name", "workType"],
				},
			},
		};

		const tree = buildSchemaCanvasTree(schema, ui);
		const arrayId = "/detailAtypicalTasks";
		const name = tree.find((n) => n.id === `${arrayId}/items/name`);
		const workType = tree.find((n) => n.id === `${arrayId}/items/workType`);

		expect(name?.parent).toBe(arrayId);
		expect(workType?.parent).toBe(arrayId);
		expect(name?.data?.kind).toBe("field");
		expect(workType?.data?.kind).toBe("field");
	});
});

describe("resolveCanvasDropTarget", () => {
	it("uses relativeIndex when dropping before a sibling field", () => {
		const options = {
			dropTargetId: "/group1/child2",
			dropTarget: {
				id: "/group1/child2",
				parent: "/group1",
				text: "B",
				droppable: false,
				data: {
					kind: "field",
					fieldPointer: "/group1/child2",
					fieldKey: "child2",
					parentPointer: "/group1",
				},
			},
			relativeIndex: 1,
		} as DropOptions<SchemaCanvasNodeData>;

		expect(resolveCanvasDropTarget(options)).toEqual({
			parentPointer: "/group1",
			index: 1,
		});
	});

	it("redirects drop on array field to items properties", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				tasks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
						},
					},
				},
			},
		};
		const options = {
			dropTargetId: "/tasks",
			dropTarget: {
				id: "/tasks",
				parent: SCHEMA_CANVAS_ROOT_ID,
				text: "Tasks",
				droppable: true,
				data: {
					kind: "field",
					fieldPointer: "/tasks",
					fieldKey: "tasks",
					parentPointer: "/",
				},
			},
			relativeIndex: 0,
		} as DropOptions<SchemaCanvasNodeData>;

		expect(resolveCanvasDropTarget(options, SCHEMA_CANVAS_ROOT_ID, schema)).toEqual(
			{
				parentPointer: "/tasks/items",
				index: 0,
			},
		);
	});
});

describe("buildSchemaCanvasTree system divider", () => {
	it("inserts divider before first root system field", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				generalInfo: { type: "object", properties: {} },
				meta: { type: "object", properties: {} },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["generalInfo", "meta"],
			meta: { "ui:options": { hidden: true, system: true } },
		};

		const tree = buildSchemaCanvasTree(schema, ui);
		const rootChildren = tree
			.filter((node) => node.parent === SCHEMA_CANVAS_ROOT_ID)
			.map((node) => String(node.id));

		expect(rootChildren).toEqual([
			"/generalInfo",
			SCHEMA_CANVAS_SYSTEM_DIVIDER_ID,
			"/meta",
		]);
	});
});

describe("listCanvasEditableChildKeys", () => {
	it("excludes system-marked siblings", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				generalInfo: { type: "object", properties: {} },
				meta: { type: "object", properties: {} },
				workflow: { type: "object", properties: {} },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["workflow", "meta", "generalInfo"],
			meta: { "ui:options": { hidden: true, system: true } },
			workflow: { "ui:options": { hidden: true, system: true } },
		};

		expect(listCanvasEditableChildKeys(schema, "/", ui)).toEqual([
			"generalInfo",
		]);
	});
});

describe("clampCanvasInsertIndex", () => {
	it("clamps insert index before system siblings", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				generalInfo: { type: "object", properties: {} },
				meta: { type: "object", properties: {} },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["generalInfo", "meta"],
			meta: { "ui:options": { hidden: true, system: true } },
		};

		expect(clampCanvasInsertIndex(schema, "/", ui, 99)).toBe(1);
	});
});

describe("listCanvasOrderedChildKeys", () => {
	it("moves system-marked siblings to the end of the canvas list", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				generalInfo: { type: "object", properties: {} },
				meta: { type: "object", properties: {} },
				workflow: { type: "object", properties: {} },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["workflow", "meta", "generalInfo"],
			meta: { "ui:options": { hidden: true, system: true } },
			workflow: { "ui:options": { hidden: true, system: true } },
		};

		expect(listCanvasOrderedChildKeys(schema, "/", ui)).toEqual([
			"generalInfo",
			"workflow",
			"meta",
		]);
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
		const orders = treeToGroupOrders(tree, schema);

		expect(orders["schema-root"]).toEqual(["left", "right"]);
		expect(orders["schema-group:/left"]).toEqual([]);
		expect(orders["schema-group:/right"]).toEqual(["b", "a"]);
	});

	it("maps array item siblings to items parent pointer", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				tasks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							a: { type: "string" },
							b: { type: "string" },
						},
					},
				},
			},
		};
		const ui: UiSchema = {
			tasks: { items: { "ui:order": ["b", "a"] } },
		};

		const tree = buildSchemaCanvasTree(schema, ui);
		const orders = treeToGroupOrders(tree, schema);

		expect(orders["schema-group:/tasks/items"]).toEqual(["b", "a"]);
	});
});
