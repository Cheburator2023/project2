import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import {
	createAnketaModalCustomValidate,
	isAnketaModalFormValid,
	isFilledRequiredValue,
	listUnfilledRequiredLabelsInBlock,
	omitUnsetOptionalFields,
} from "./anketaModalFormValidation.util";

const nameSchema: RJSFSchema = {
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"],
};

const sourceLikeSchema: RJSFSchema = {
	type: "object",
	properties: {
		name: { type: "string", title: "Название источника" },
		type: {
			type: "string",
			title: "Тип системы-источника",
			enum: ["Внутренний", "Внешний"],
		},
		risk: {
			type: "string",
			title: "Риск",
			enum: ["Низкий", "Средний", "Высокий"],
		},
	},
	required: ["name"],
};

describe("anketaModalFormValidation.util", () => {
	it("treats empty string as unfilled required value", () => {
		expect(isFilledRequiredValue("")).toBe(false);
		expect(isFilledRequiredValue("   ")).toBe(false);
		expect(isFilledRequiredValue("x")).toBe(true);
	});

	it("blocks save when required field was cleared to empty string", () => {
		expect(
			isAnketaModalFormValid({ name: "CRM" }, nameSchema, {}),
		).toBe(true);
		expect(isAnketaModalFormValid({ name: "" }, nameSchema, {})).toBe(false);
		expect(isAnketaModalFormValid({}, nameSchema, {})).toBe(false);
	});

	it("customValidate adds error only for empty existing keys", () => {
		const customValidate = createAnketaModalCustomValidate(nameSchema);

		const missingKey = validatorRu.validateFormData({}, nameSchema, customValidate);
		expect(missingKey.errorSchema?.name?.__errors).toEqual([
			"Поле обязательно для заполнения",
		]);

		const emptyString = validatorRu.validateFormData(
			{ name: "" },
			nameSchema,
			customValidate,
		);
		expect(emptyString.errorSchema?.name?.__errors).toEqual([
			"Поле обязательно для заполнения",
		]);
	});

	it("does not duplicate required error for missing or empty name", () => {
		const customValidate = createAnketaModalCustomValidate(nameSchema);

		for (const formData of [{}, { name: "" }] as const) {
			const { errorSchema } = validatorRu.validateFormData(
				formData,
				nameSchema,
				customValidate,
			);
			const fieldErrors = errorSchema?.name?.__errors ?? [];
			expect(fieldErrors, JSON.stringify(formData)).toEqual([
				"Поле обязательно для заполнения",
			]);
		}
	});

	it("omits empty optional strings but keeps required empties", () => {
		expect(
			omitUnsetOptionalFields(
				{ name: "CRM", type: "", risk: "   " },
				sourceLikeSchema,
			),
		).toEqual({ name: "CRM" });
		expect(
			omitUnsetOptionalFields({ name: "", type: "" }, sourceLikeSchema),
		).toEqual({ name: "" });
		expect(
			omitUnsetOptionalFields(
				{ name: "CRM", type: null, risk: undefined },
				sourceLikeSchema,
			),
		).toEqual({ name: "CRM" });
	});

	it("always persists boolean fields as false when unset", () => {
		const schema: RJSFSchema = {
			type: "object",
			properties: {
				name: { type: "string" },
				readyPromReports: { type: "boolean" },
			},
			required: ["name"],
		};
		expect(omitUnsetOptionalFields({ name: "Модель 1" }, schema)).toEqual({
			name: "Модель 1",
			readyPromReports: false,
		});
		expect(
			omitUnsetOptionalFields(
				{ name: "Модель 1", readyPromReports: true },
				schema,
			),
		).toEqual({ name: "Модель 1", readyPromReports: true });
	});

	it("allows save when required name is set and optional enums are empty strings", () => {
		expect(
			isAnketaModalFormValid(
				{
					name: "CRM",
					type: "",
					risk: "",
				},
				sourceLikeSchema,
				{},
			),
		).toBe(true);
		expect(
			isAnketaModalFormValid(
				{ name: "CRM", type: "Внутренний" },
				sourceLikeSchema,
				{},
			),
		).toBe(true);
		expect(
			isAnketaModalFormValid(
				{ name: "", type: "Внутренний" },
				sourceLikeSchema,
				{},
			),
		).toBe(false);
	});

	it("lists unfilled required fields in a block including nested objects", () => {
		const blockSchema: RJSFSchema = {
			type: "object",
			properties: {
				name: { type: "string", title: "Название" },
				nested: {
					type: "object",
					title: "Вложенный",
					properties: {
						code: { type: "string", title: "Код" },
					},
					required: ["code"],
				},
			},
			required: ["name", "nested"],
		};
		expect(listUnfilledRequiredLabelsInBlock(blockSchema, {}, {})).toEqual([
			"Название",
			"Вложенный",
		]);
		expect(
			listUnfilledRequiredLabelsInBlock(
				blockSchema,
				{ name: "A", nested: {} },
				{},
			),
		).toEqual(["Вложенный: Код"]);
		expect(
			listUnfilledRequiredLabelsInBlock(
				blockSchema,
				{ name: "A", nested: { code: "x" } },
				{},
			),
		).toEqual([]);
	});

	it("skips hidden required fields when listing unfilled in block", () => {
		expect(
			listUnfilledRequiredLabelsInBlock(
				nameSchema,
				{},
				{ name: { "ui:widget": "hidden" } },
			),
		).toEqual([]);
	});
});
