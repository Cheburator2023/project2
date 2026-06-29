import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	resolveCanvasCategoryChips,
	resolveCanvasFieldTypeChipLabel,
	resolvePrimitiveFieldTypeVariant,
} from "./propertiesFieldKind";

describe("resolveCanvasFieldTypeChipLabel", () => {
	it("labels dictionary string as строка·справочник", () => {
		const schema: RJSFSchema = { type: "string", title: "Статус" };
		const ui = {
			"ui:options": { dictionaryCode: "status" },
			"ui:widget": "select",
		};

		expect(resolveCanvasFieldTypeChipLabel(schema, ui)).toEqual({
			label: "строка·справочник",
			colorKey: "string-dictionary",
		});
	});

	it("labels dictionary multi-select as мультисправочник", () => {
		const schema: RJSFSchema = {
			type: "array",
			items: { type: "string" },
			uniqueItems: true,
		};
		const ui = {
			"ui:options": { dictionaryCode: "tags", multiple: true },
			"ui:widget": "select",
		};

		expect(resolveCanvasFieldTypeChipLabel(schema, ui)).toEqual({
			label: "мультисправочник",
			colorKey: "dictionary-list",
		});
	});
});

describe("resolveCanvasCategoryChips", () => {
	it("labels arch block as арх компонент", () => {
		const schema: RJSFSchema = { type: "object", properties: {} };
		const ui = { "ui:options": { archComponent: "modelService" } };

		expect(resolveCanvasCategoryChips(schema, ui)).toEqual([
			expect.objectContaining({ label: "арх компонент", title: "Модельный сервис" }),
		]);
	});

	it("labels works block as работы", () => {
		const schema: RJSFSchema = { type: "array", items: { type: "object" } };
		const ui = { "ui:options": { archComponent: "typicalWork" } };

		expect(resolveCanvasCategoryChips(schema, ui)[0]?.label).toBe("работы");
	});
});

describe("resolvePrimitiveFieldTypeVariant", () => {
	it("maps dictionary multi to dictionary-list", () => {
		const schema: RJSFSchema = {
			type: "array",
			items: { type: "string" },
		};
		const ui = { multiple: true, dictionaryCode: "tags" };

		expect(
			resolvePrimitiveFieldTypeVariant(schema, ui, "select"),
		).toBe("dictionary-list");
	});
});
