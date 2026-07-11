import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	canAddTypicalWorkUnderParent,
	findTypicalWorkPointerInSubtree,
	isTypicalWorkPaletteDragSource,
	resolveTypicalWorkDragContext,
	TYPICAL_WORK_PRESET_ID,
} from "./typicalWorkCanvasConstraints";
import { buildPaletteDragNode } from "./schemaCanvasTree";

const typicalWorkUi = {
	"ui:options": { archComponent: "typicalWork" },
};

describe("typicalWorkCanvasConstraints", () => {
	const schema: RJSFSchema = {
		type: "object",
		properties: {
			stream: {
				type: "object",
				title: "Стрим",
				properties: {
					nested: {
						type: "object",
						title: "Вложенный",
						properties: {
							work: { type: "array", title: "Типовые работы", items: { type: "object" } },
						},
					},
					other: { type: "string", title: "Другое" },
				},
			},
			rootWork: { type: "array", title: "Корневая работа", items: { type: "object" } },
		},
	};

	const uiSchema: UiSchema = {
		stream: {
			nested: {
				work: typicalWorkUi,
			},
		},
		rootWork: typicalWorkUi,
	};

	it("finds typicalWork in nested object subtree", () => {
		expect(
			findTypicalWorkPointerInSubtree(schema, uiSchema, "/stream"),
		).toBe("/stream/nested/work");
		expect(
			findTypicalWorkPointerInSubtree(schema, uiSchema, "/stream/nested"),
		).toBe("/stream/nested/work");
	});

	it("does not find typicalWork in sibling subtree", () => {
		expect(
			findTypicalWorkPointerInSubtree(schema, uiSchema, "/stream/other"),
		).toBeNull();
	});

	it("excludes dragged pointer when reordering within same parent", () => {
		expect(
			canAddTypicalWorkUnderParent(
				schema,
				uiSchema,
				"/stream/nested",
				"/stream/nested/work",
			),
		).toBe(true);
		expect(
			canAddTypicalWorkUnderParent(schema, uiSchema, "/stream/nested"),
		).toBe(false);
	});

	it("blocks second typicalWork at root subtree", () => {
		expect(canAddTypicalWorkUnderParent(schema, uiSchema, "/")).toBe(false);
	});

	it("detects palette typicalWork drag", () => {
		const node = buildPaletteDragNode(TYPICAL_WORK_PRESET_ID, "Типовая работа");
		expect(isTypicalWorkPaletteDragSource(node)).toBe(true);
		expect(
			resolveTypicalWorkDragContext(node, "schema-editor-palette-preset", {}),
		).toEqual({ isTypicalWorkDrag: true, excludePointer: null });
	});
});
