import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import { listOrderedChildKeys, listSchemaFields } from "./schemaMutators";

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
