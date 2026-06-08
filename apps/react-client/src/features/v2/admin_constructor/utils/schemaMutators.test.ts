import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	applyGroupFieldOrdersToSchema,
	applyGroupFieldOrdersToUiSchema,
	buildOrdersForFieldMove,
	buildFieldTypeTransitionPatch,
	insertChildPropertyAt,
	isObjectFieldGroup,
	listOrderedChildKeys,
	listSchemaFields,
	removeUiSchemaAtPointer,
	resolveFieldPointerForListKey,
	updatePropertyAtPointer,
} from "./schemaMutators";
import { pointerSegments } from "./schemaPaths";

const ROOT_SCHEMA: RJSFSchema = {
	type: "object",
	properties: {
		meta: { type: "object", title: "Мета", properties: {} },
		summary: { type: "object", title: "Итоговая оценка", properties: {} },
		workflow: { type: "object", title: "Статусы", properties: {} },
		generalInfo: { type: "object", title: "Общая информация", properties: {} },
	},
};

const ROOT_UI: UiSchema = {
	"ui:order": ["workflow", "meta", "generalInfo", "summary"],
};

describe("listOrderedChildKeys", () => {
	it("uses ui:order at root like RJSF preview", () => {
		expect(listOrderedChildKeys(ROOT_SCHEMA, "/", ROOT_UI)).toEqual([
			"workflow",
			"meta",
			"generalInfo",
			"summary",
		]);
	});
});

describe("listSchemaFields", () => {
	it("walks fields in ui:order", () => {
		const rows = listSchemaFields(ROOT_SCHEMA, "/", 0, ROOT_UI);
		expect(rows.map((r) => r.key)).toEqual([
			"workflow",
			"meta",
			"generalInfo",
			"summary",
		]);
	});
});

describe("buildFieldTypeTransitionPatch", () => {
	it("strips enum when converting string to array", () => {
		const current: RJSFSchema = {
			type: "string",
			enum: ["a", "b"],
			title: "Dept",
		};
		const patch = buildFieldTypeTransitionPatch(current, "array");
		const next = updatePropertyAtPointer(
			{
				type: "object",
				properties: { dept: current },
			},
			pointerSegments("/dept"),
			patch,
		);
		const field = next?.properties?.dept as RJSFSchema;
		expect(field?.type).toBe("array");
		expect(field?.enum).toBeUndefined();
		expect(field?.items).toBeDefined();
		expect(field?.title).toBe("Dept");
	});
});

describe("isObjectFieldGroup", () => {
	it("does not treat a string field with stale properties as a container", () => {
		expect(
			isObjectFieldGroup({
				type: "string",
				properties: {
					ghost: { type: "string" },
				},
			}),
		).toBe(false);
	});
});

describe("removeUiSchemaAtPointer", () => {
	it("removes ui branch and parent ui:order entry", () => {
		const next = removeUiSchemaAtPointer(
			{
				group: {
					"ui:order": ["a", "b"],
					a: { "ui:widget": "text" },
					b: { "ui:widget": "select" },
				},
			},
			"/group/a",
		);

		expect(next).toEqual({
			group: {
				"ui:order": ["b"],
				b: { "ui:widget": "select" },
			},
		});
	});
});

describe("insertChildPropertyAt", () => {
	it("does not turn scalar fields into object containers", () => {
		const next = insertChildPropertyAt(
			{
				type: "object",
				properties: {
					name: { type: "string" },
				},
			},
			["name"],
			"child",
			{ type: "string" },
			0,
		);

		expect(next).toBeNull();
	});
});

describe("applyGroupFieldOrdersToSchema", () => {
	it("moves a field between groups without dropping siblings", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				left: {
					type: "object",
					properties: {
						a: { type: "string" },
					},
				},
				right: {
					type: "object",
					properties: {
						b: { type: "string" },
					},
				},
			},
		};
		const initial = {
			"schema-root": ["left", "right"],
			"schema-group:/left": ["a"],
			"schema-group:/right": ["b"],
		};
		const final = {
			"schema-root": ["left", "right"],
			"schema-group:/left": [],
			"schema-group:/right": ["b", "a"],
		};
		const next = applyGroupFieldOrdersToSchema(schema, initial, final);

		const left = next?.properties?.left as RJSFSchema;
		const right = next?.properties?.right as RJSFSchema;
		expect(Object.keys(left.properties ?? {})).toEqual([]);
		expect(Object.keys(right.properties ?? {})).toEqual(["b", "a"]);
	});

	it("moves a layout group with nested fields without losing children", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				layout1: {
					type: "object",
					title: "Разметка",
					properties: {
						child1: { type: "string", title: "A" },
						child2: { type: "string", title: "B" },
					},
				},
				group1: {
					type: "object",
					title: "Группа",
					properties: {},
				},
			},
		};

		const initial = {
			"schema-root": ["layout1", "group1"],
			"schema-group:/layout1": ["child1", "child2"],
			"schema-group:/group1": [],
		};
		const final = buildOrdersForFieldMove(
			initial,
			"layout1",
			"schema-root",
			"schema-group:/group1",
			0,
		);
		const next = applyGroupFieldOrdersToSchema(schema, initial, final);

		const group = next?.properties?.group1 as RJSFSchema;
		const layout = group?.properties?.layout1 as RJSFSchema;
		expect(Object.keys(layout?.properties ?? {})).toEqual(["child1", "child2"]);
		expect(next?.properties?.layout1).toBeUndefined();
	});
});

describe("applyGroupFieldOrdersToUiSchema", () => {
	it("relocates ui branches when a field moves between parents", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				layout1: {
					type: "object",
					properties: {
						child1: { type: "string" },
					},
				},
				group1: { type: "object", properties: {} },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["layout1", "group1"],
			layout1: {
				"ui:options": { layoutGroup: true, gridColumns: 2 },
				"ui:order": ["child1"],
				child1: { "ui:widget": "text" },
			},
			group1: { "ui:order": [] },
		};

		const initial = {
			"schema-root": ["layout1", "group1"],
			"schema-group:/layout1": ["child1"],
			"schema-group:/group1": [],
		};
		const final = buildOrdersForFieldMove(
			initial,
			"layout1",
			"schema-root",
			"schema-group:/group1",
			0,
		);
		const nextUi = applyGroupFieldOrdersToUiSchema(ui, schema, initial, final);

		expect(nextUi.layout1).toBeUndefined();
		const groupUi = nextUi.group1 as Record<string, unknown>;
		const layoutUi = groupUi.layout1 as Record<string, unknown>;
		expect(layoutUi["ui:options"]).toEqual({
			layoutGroup: true,
			gridColumns: 2,
		});
		expect((layoutUi.child1 as Record<string, unknown>)["ui:widget"]).toBe(
			"text",
		);
		expect(groupUi["ui:order"]).toEqual(["layout1"]);
	});
});

describe("buildOrdersForFieldMove", () => {
	it("remaps nested group order keys when moving a layout group into another group", () => {
		const initial = {
			"schema-root": ["layout1", "group1"],
			"schema-group:/layout1": ["child1", "child2"],
			"schema-group:/group1": [],
		};

		const final = buildOrdersForFieldMove(
			initial,
			"layout1",
			"schema-root",
			"schema-group:/group1",
			0,
		);

		expect(final["schema-root"]).toEqual(["group1"]);
		expect(final["schema-group:/group1"]).toEqual(["layout1"]);
		expect(final["schema-group:/layout1"]).toBeUndefined();
		expect(final["schema-group:/group1/layout1"]).toEqual([
			"child1",
			"child2",
		]);
	});
});

describe("resolveFieldPointerForListKey", () => {
	it("falls back to the actual schema path during cross-group drag preview", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				layout1: { type: "object", properties: { child1: { type: "string" } } },
				group1: { type: "object", properties: {} },
			},
		};

		expect(resolveFieldPointerForListKey("layout1", "/group1", schema)).toBe(
			"/layout1",
		);
	});
});
