import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	applyGroupFieldOrdersToSchema,
	applyGroupFieldOrdersToUiSchema,
	buildOrdersForFieldMove,
	buildFieldTypeTransitionPatch,
	duplicateFieldAtPointer,
	buildDictionaryMultiSchemaPatch,
	insertKeyToUiOrderAtPointer,
	insertChildPropertyAt,
	movePropertyAtPointer,
	moveUiSchemaBranchAtPointer,
	setUiDictionaryCodeAtPointer,
	setUiPlaceholderAtPointer,
	setUiTooltipAtPointer,
	syncDictionaryFieldUiAtPointer,
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

describe("pointer-based canvas move", () => {
	it("moves only the exact pointer when duplicate field keys exist", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				left: {
					type: "object",
					properties: {
						name: { type: "object", title: "Left object", properties: {} },
					},
				},
				right: {
					type: "object",
					properties: {
						name: { type: "string", title: "Right string" },
					},
				},
			},
		};

		const next = movePropertyAtPointer(
			schema,
			"/right/name",
			"/",
			2,
		);

		const left = next?.properties?.left as RJSFSchema;
		const leftName = left.properties?.name as RJSFSchema;
		expect(leftName.type).toBe("object");
		expect(leftName.title).toBe("Left object");
		expect((next?.properties?.right as RJSFSchema).properties?.name).toBeUndefined();
		expect((next?.properties?.name as RJSFSchema).title).toBe("Right string");
	});

	it("moves ui branch by exact pointer and updates target order", () => {
		const ui: UiSchema = {
			left: {
				"ui:order": ["name"],
				name: { "ui:title": "left" },
			},
			right: {
				"ui:order": ["name"],
				name: { "ui:title": "right" },
			},
		};

		const next = moveUiSchemaBranchAtPointer(
			ui as Record<string, unknown>,
			"/right/name",
			"/",
			2,
		) as UiSchema;

		expect((next.left as Record<string, unknown>).name).toMatchObject({
			"ui:title": "left",
		});
		expect((next.right as Record<string, unknown>).name).toBeUndefined();
		expect(next.name).toMatchObject({
			"ui:title": "right",
		});
	});
});

describe("insertKeyToUiOrderAtPointer", () => {
	it("inserts new key into ui:order at requested index", () => {
		const ui: UiSchema = {
			group1: {
				"ui:order": ["a", "b", "c"],
			},
		};

		const next = insertKeyToUiOrderAtPointer(
			ui as Record<string, unknown>,
			"/group1",
			"x",
			1,
		) as UiSchema;

		expect((next.group1 as Record<string, unknown>)["ui:order"]).toEqual([
			"a",
			"x",
			"b",
			"c",
		]);
	});
});

describe("buildOrdersForFieldMove", () => {
	it("moves root field into group at placeholder index", () => {
		const initial = {
			"schema-root": ["group1", "x"],
			"schema-group:/group1": ["a", "b", "c"],
		};

		const final = buildOrdersForFieldMove(
			initial,
			"x",
			"schema-root",
			"schema-group:/group1",
			1,
		);

		expect(final["schema-root"]).toEqual(["group1"]);
		expect(final["schema-group:/group1"]).toEqual(["a", "x", "b", "c"]);
	});

	it("reorders within the same group using placeholder index", () => {
		const initial = {
			"schema-root": ["group1"],
			"schema-group:/group1": ["a", "b", "c"],
		};

		const final = buildOrdersForFieldMove(
			initial,
			"c",
			"schema-group:/group1",
			"schema-group:/group1",
			1,
		);

		expect(final["schema-group:/group1"]).toEqual(["a", "c", "b"]);
	});

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

describe("duplicateFieldAtPointer", () => {
	it("copies a primitive field right after the original", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				group1: {
					type: "object",
					properties: {
						name: { type: "string", title: "Имя" },
						age: { type: "number", title: "Возраст" },
					},
					required: ["name"],
				},
			},
		};
		const ui: UiSchema = {
			group1: {
				"ui:order": ["name", "age"],
				name: { "ui:widget": "text" },
				age: { "ui:widget": "updown" },
			},
		};

		const result = duplicateFieldAtPointer(
			schema,
			ui as Record<string, unknown>,
			"/group1/name",
			"name_copy",
		);

		expect(result?.newPointer).toBe("/group1/name_copy");
		expect(listOrderedChildKeys(result!.schema, "/group1", result!.ui)).toEqual([
			"name",
			"name_copy",
			"age",
		]);
		const group = result!.schema.properties!.group1 as RJSFSchema;
		expect((group.properties as Record<string, RJSFSchema>).name_copy).toEqual({
			type: "string",
			title: "Имя",
		});
		expect(group.required).toEqual(["name", "name_copy"]);
		const groupUi = (result!.ui.group1 as Record<string, unknown>).name_copy as
			| Record<string, unknown>
			| undefined;
		expect(groupUi?.["ui:widget"]).toBe("text");
	});

	it("copies a group with nested children and ui branches", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				layout1: {
					type: "object",
					title: "Разметка",
					properties: {
						child1: { type: "string", title: "Поле 1" },
						child2: { type: "string", title: "Поле 2" },
					},
				},
				other: { type: "string" },
			},
		};
		const ui: UiSchema = {
			"ui:order": ["layout1", "other"],
			layout1: {
				"ui:options": { layoutGroup: true },
				"ui:order": ["child2", "child1"],
				child1: { "ui:widget": "textarea" },
				child2: { "ui:widget": "text" },
			},
		};

		const result = duplicateFieldAtPointer(
			schema,
			ui as Record<string, unknown>,
			"/layout1",
			"layout1_copy",
		);

		expect(result?.newPointer).toBe("/layout1_copy");
		expect(listOrderedChildKeys(result!.schema, "/", result!.ui)).toEqual([
			"layout1",
			"layout1_copy",
			"other",
		]);
		const copy = (result!.schema.properties as Record<string, RJSFSchema>)
			.layout1_copy;
		expect(Object.keys(copy.properties ?? {})).toEqual(["child1", "child2"]);
		const copyUi = result!.ui.layout1_copy as Record<string, unknown>;
		expect(copyUi["ui:options"]).toEqual({ layoutGroup: true });
		expect(copyUi["ui:order"]).toEqual(["child2", "child1"]);
		expect(
			(copyUi.child1 as Record<string, unknown>)["ui:widget"],
		).toBe("textarea");
	});

	it("resets dictionary bindings in copied field", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				status: {
					type: "string",
					title: "Статус",
					enum: ["open", "closed"],
					enumNames: ["Открыт", "Закрыт"],
				},
			},
		};
		const ui: UiSchema = {
			status: {
				"ui:widget": "select",
				"ui:options": { dictionaryCode: "v2.test.status" },
			},
		};

		const result = duplicateFieldAtPointer(
			schema,
			ui as Record<string, unknown>,
			"/status",
			"status_copy",
		);

		const copySchema = (result!.schema.properties as Record<string, RJSFSchema>)
			.status_copy;
		expect(copySchema.enum).toBeUndefined();
		expect(copySchema.enumNames).toBeUndefined();

		const copyUi = result!.ui.status_copy as Record<string, unknown>;
		expect(copyUi["ui:widget"]).toBeUndefined();
		expect(copyUi["ui:options"]).toBeUndefined();
	});

	it("resets dictionary bindings in nested copied group fields", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				group1: {
					type: "object",
					properties: {
						tag: {
							type: "array",
							items: {
								type: "string",
								enum: ["a", "b"],
							},
							uniqueItems: true,
						},
					},
				},
			},
		};
		const ui: UiSchema = {
			group1: {
				tag: {
					"ui:widget": "select",
					"ui:options": {
						dictionaryCode: "v2.test.tags",
						multiple: true,
					},
				},
			},
		};

		const result = duplicateFieldAtPointer(
			schema,
			ui as Record<string, unknown>,
			"/group1",
			"group1_copy",
		);

		const copyTag = (
			(result!.schema.properties as Record<string, RJSFSchema>).group1_copy
				.properties as Record<string, RJSFSchema>
		).tag;
		expect((copyTag.items as RJSFSchema).enum).toBeUndefined();

		const copyTagUi = (
			(result!.ui.group1_copy as Record<string, unknown>).tag as Record<
				string,
				unknown
			>
		)["ui:options"];
		expect(copyTagUi).toBeUndefined();
	});
});

describe("setUiPlaceholderAtPointer", () => {
	it("sets and clears ui:placeholder on a field branch", () => {
		const ui: UiSchema = {
			generalInfo: {
				title: { "ui:widget": "text" },
			},
		};

		const withPlaceholder = setUiPlaceholderAtPointer(
			ui as Record<string, unknown>,
			"/generalInfo/title",
			"Название анкеты",
		);
		expect(
			(
				(withPlaceholder.generalInfo as Record<string, unknown>)
					.title as Record<string, unknown>
			)["ui:placeholder"],
		).toBe("Название анкеты");

		const cleared = setUiPlaceholderAtPointer(
			withPlaceholder,
			"/generalInfo/title",
			"  ",
		);
		expect(
			(
				(cleared.generalInfo as Record<string, unknown>).title as
					| Record<string, unknown>
					| undefined
			)?.["ui:placeholder"],
		).toBeUndefined();
	});
});

describe("setUiTooltipAtPointer", () => {
	it("sets and clears ui:options.tooltip on a field branch", () => {
		const ui: UiSchema = {
			generalInfo: {
				title: { "ui:widget": "text" },
			},
		};

		const withTooltip = setUiTooltipAtPointer(
			ui as Record<string, unknown>,
			"/generalInfo/title",
			"Подсказка для поля",
		);
		expect(
			(
				(
					(withTooltip.generalInfo as Record<string, unknown>)
						.title as Record<string, unknown>
				)["ui:options"] as Record<string, unknown>
			).tooltip,
		).toBe("Подсказка для поля");

		const cleared = setUiTooltipAtPointer(
			withTooltip,
			"/generalInfo/title",
			"  ",
		);
		expect(
			(
				(cleared.generalInfo as Record<string, unknown>).title as
					| Record<string, unknown>
					| undefined
			)?.["ui:options"],
		).toBeUndefined();
	});
});

describe("dictionary field ui sync", () => {
	it("replaces text widget with select when binding dictionary", () => {
		const ui: UiSchema = {
			generalInfo: {
				businessCustomer: {
					"ui:widget": "text",
				},
			},
		};

		const next = setUiDictionaryCodeAtPointer(
			ui as Record<string, unknown>,
			"/generalInfo/businessCustomer",
			"v2.generalInfo.businessCustomer",
		);

		const leaf = (next.generalInfo as Record<string, unknown>)
			.businessCustomer as Record<string, unknown>;
		expect(leaf["ui:widget"]).toBe("select");
		expect(
			(leaf["ui:options"] as Record<string, unknown>).dictionaryCode,
		).toBe("v2.generalInfo.businessCustomer");
	});

	it("keeps select widget when enabling dictionary multiple", () => {
		const ui: UiSchema = {
			generalInfo: {
				businessCustomer: {
					"ui:widget": "text",
					"ui:options": {
						dictionaryCode: "v2.generalInfo.businessCustomer",
					},
				},
			},
		};

		const next = syncDictionaryFieldUiAtPointer(
			ui as Record<string, unknown>,
			"/generalInfo/businessCustomer",
			{ multiple: true },
		);

		const leaf = (next.generalInfo as Record<string, unknown>)
			.businessCustomer as Record<string, unknown>;
		expect(leaf["ui:widget"]).toBe("select");
		expect((leaf["ui:options"] as Record<string, unknown>).multiple).toBe(true);
	});

	it("switches schema type for dictionary multiple toggle", () => {
		expect(buildDictionaryMultiSchemaPatch(true)).toEqual({
			type: "array",
			items: { type: "string" },
			uniqueItems: true,
			enum: undefined,
			enumNames: undefined,
		});
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
