import type { CustomValidator, RJSFSchema, UiSchema } from "@rjsf/utils";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";

const REQUIRED_EMPTY_MESSAGE = "Поле обязательно для заполнения";

export function collectRequiredFieldKeys(schema: RJSFSchema): string[] {
	if (!Array.isArray(schema.required)) return [];
	return schema.required.filter((key): key is string => typeof key === "string");
}

/** Значение считается заполненным для required (пустая строка / [] — нет). */
export function isFilledRequiredValue(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

/**
 * AJV `required` проверяет только наличие ключа; пустая строка проходит.
 * Добавляем ошибку только если ключ уже есть в formData — иначе AJV уже
 * показал required, а extraErrors давали дубль из‑за рассинхрона с liveValidate.
 */
export function createAnketaModalCustomValidate(
	schema: RJSFSchema,
): CustomValidator<Record<string, unknown>> {
	return (formData, errors) => {
		if (!formData) return errors;

		for (const key of collectRequiredFieldKeys(schema)) {
			if (!(key in formData)) continue;
			const value = formData[key];
			const isEmptyString =
				typeof value === "string" && value.trim().length === 0;
			const isEmptyArray = Array.isArray(value) && value.length === 0;
			if (!isEmptyString && !isEmptyArray) continue;
			errors[key]?.addError(REQUIRED_EMPTY_MESSAGE);
		}

		return errors;
	};
}

export function isAnketaModalFormValid(
	formData: Record<string, unknown>,
	schema: RJSFSchema,
	uiSchema: UiSchema,
): boolean {
	if (
		collectRequiredFieldKeys(schema).some(
			(key) => !isFilledRequiredValue(formData[key]),
		)
	) {
		return false;
	}

	const customValidate = createAnketaModalCustomValidate(schema);
	const { errors } = validatorRu.validateFormData(
		formData,
		schema,
		customValidate,
		undefined,
		uiSchema,
	);
	return errors.length === 0;
}
