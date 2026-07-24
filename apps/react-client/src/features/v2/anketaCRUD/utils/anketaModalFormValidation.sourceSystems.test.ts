import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import {
	isAnketaModalFormValid,
	omitUnsetOptionalFields,
} from "./anketaModalFormValidation.util";

/** Реалистичный фрагмент items schema систем-источников (preset). */
const sourceSystemItemSchema: RJSFSchema = {
	type: "object",
	title: "Система источник",
	required: ["name"],
	properties: {
		name: { type: "string", title: "Название источника" },
		type: {
			type: "string",
			title: "Тип системы-источника",
			enum: ["Внутренний", "Внешний"],
		},
		"field_-EGYyyJF": {
			type: "boolean",
			title: "Необходим новый тракт данных от источника",
		},
		field_lzP44Urx: {
			type: "string",
			title:
				"Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик",
			enum: ["Да", "Нет", "Неизвестно"],
		},
		field_HuOLfL4K: {
			type: "string",
			title: "Риск появления дополнительных систем-источников",
			enum: ["Есть", "Нет", "Неизвестно"],
		},
	},
};

describe("sourceSystems modal save (regression)", () => {
	it("enables save with name + filled optional enums (user scenario)", () => {
		const formData = {
			name: "CRM",
			type: "Внутренний",
			field_lzP44Urx: "Да",
			field_HuOLfL4K: "Есть",
		};
		expect(isAnketaModalFormValid(formData, sourceSystemItemSchema, {})).toBe(
			true,
		);
	});

	it("enables save when RJSF injects empty strings for untouched selects/bools", () => {
		const formData = {
			name: "CRM",
			type: "Внутренний",
			field_lzP44Urx: "Да",
			field_HuOLfL4K: "Есть",
			"field_-EGYyyJF": "",
			field_other: "",
		};
		expect(isAnketaModalFormValid(formData, sourceSystemItemSchema, {})).toBe(
			true,
		);
	});

	it("enables save with only name when other fields are empty strings/null", () => {
		const formData = {
			name: "CRM",
			type: "",
			field_lzP44Urx: null,
			field_HuOLfL4K: undefined,
			"field_-EGYyyJF": "",
		};
		expect(
			omitUnsetOptionalFields(
				formData as Record<string, unknown>,
				sourceSystemItemSchema,
			),
		).toEqual({ name: "CRM" });
		expect(
			isAnketaModalFormValid(
				formData as Record<string, unknown>,
				sourceSystemItemSchema,
				{},
			),
		).toBe(true);
	});

	it("enables save when many untouched optional enums are null (RJSF default)", () => {
		const formData: Record<string, unknown> = {
			name: "CRM",
			type: "Внутренний",
			field_lzP44Urx: "Да",
			field_HuOLfL4K: "Есть",
		};
		for (const key of [
			"field_-t8JSf3p",
			"field_1ANadh7U",
			"field_3a0vme2u",
			"field_4jxR0E0m",
			"field_DBFG7kIN",
			"field_-EGYyyJF",
			"field_8pFvwc-v",
		]) {
			formData[key] = null;
		}
		expect(isAnketaModalFormValid(formData, sourceSystemItemSchema, {})).toBe(
			true,
		);
	});
});
