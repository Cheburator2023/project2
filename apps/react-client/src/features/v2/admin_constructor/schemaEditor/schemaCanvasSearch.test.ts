import type { NodeModel } from "@minoru/react-dnd-treeview";
import { describe, expect, it } from "vitest";
import {
	buildCanvasFieldSearchOptions,
	filterCanvasFieldSearchOptions,
	listCanvasAncestorNodeIds,
	listCanvasExpandNodeIds,
	substringMatchIndexes,
} from "./schemaCanvasSearch";
import {
	SCHEMA_CANVAS_ROOT_ID,
	type SchemaCanvasNodeData,
} from "./schemaCanvasTree";

function fieldNode(
	id: string,
	parent: string,
	text: string,
	fieldKey: string,
): NodeModel<SchemaCanvasNodeData> {
	return {
		id,
		parent,
		text,
		droppable: false,
		data: {
			kind: "field",
			fieldPointer: id,
			fieldKey,
			parentPointer: parent === SCHEMA_CANVAS_ROOT_ID ? "/" : String(parent),
		},
	};
}

describe("schemaCanvasSearch", () => {
	it("builds breadcrumb chain with title and id for each ancestor", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/group1", SCHEMA_CANVAS_ROOT_ID, "Группа", "group1"),
			fieldNode("/group1/name", "/group1", "Название", "name"),
		];

		const options = buildCanvasFieldSearchOptions(tree);
		expect(options).toHaveLength(2);
		expect(options[1]?.breadcrumbs).toEqual([
			{ title: "Группа", id: "group1" },
			{ title: "Название", id: "name" },
		]);
		expect(options[1]?.searchLabel).toContain("Группа");
		expect(options[1]?.searchLabel).toContain("name");
		expect(options[1]?.pointer).toBe("/group1/name");
	});

	it("lists ancestor node ids from root to target", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/group1", SCHEMA_CANVAS_ROOT_ID, "Группа", "group1"),
			fieldNode("/group1/name", "/group1", "Название", "name"),
		];

		expect(listCanvasAncestorNodeIds(tree, "/group1/name")).toEqual([
			"/group1",
			"/group1/name",
		]);
	});

	it("lists only expandable ancestor ids for nested target", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/group1", SCHEMA_CANVAS_ROOT_ID, "Группа", "group1"),
			fieldNode("/group1/nested", "/group1", "Вложенная", "nested"),
			fieldNode("/group1/nested/leaf", "/group1/nested", "Лист", "leaf"),
		];

		expect(listCanvasExpandNodeIds(tree, "/group1/nested/leaf")).toEqual([
			"/group1",
			"/group1/nested",
		]);
	});

	it("opens nested array item path via array parent", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/rows", SCHEMA_CANVAS_ROOT_ID, "Строки", "rows"),
			fieldNode("/rows/items/code", "/rows", "Код", "code"),
		];

		expect(listCanvasExpandNodeIds(tree, "/rows/items/code")).toEqual(["/rows"]);
	});

	it("prioritizes exact id match over partial title match", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/group1", SCHEMA_CANVAS_ROOT_ID, "Группа", "group1"),
			fieldNode("/group1/name", "/group1", "Название", "name"),
			fieldNode("/group1/nameFull", "/group1", "name", "nameFull"),
		];

		const options = buildCanvasFieldSearchOptions(tree);
		const ranked = filterCanvasFieldSearchOptions(options, "name");

		expect(ranked.map((item) => item.fieldKey)).toEqual([
			"name",
			"nameFull",
		]);
	});

	it("finds substring matches in field id before ancestors", () => {
		const tree: NodeModel<SchemaCanvasNodeData>[] = [
			fieldNode("/group1", SCHEMA_CANVAS_ROOT_ID, "streamData", "streamData"),
			fieldNode("/group1/code", "/group1", "Код", "code"),
		];

		const options = buildCanvasFieldSearchOptions(tree);
		const ranked = filterCanvasFieldSearchOptions(options, "code");

		expect(ranked).toHaveLength(1);
		expect(ranked[0]?.fieldKey).toBe("code");
	});

	it("highlights direct substring indexes", () => {
		expect(substringMatchIndexes("platformStream1", "Stream")).toEqual([
			8, 9, 10, 11, 12, 13,
		]);
	});
});
