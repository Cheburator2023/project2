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
 * Select/MUI/RJSF кладут `""` / `null` в formData для незаполненных optional.
 * AJV тогда падает («Выберите одно из значений» / type) и Save остаётся disabled.
 * Required-ключи с пустой строкой оставляем — их ловит customValidate.
 */
export function isUnsetOptionalValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string" && value.trim().length === 0) return true;
	return false;
}

export function omitUnsetOptionalFields(
	formData: Record<string, unknown>,
	schema: RJSFSchema,
): Record<string, unknown> {
	const required = new Set(collectRequiredFieldKeys(schema));
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(formData)) {
		if (!required.has(key) && isUnsetOptionalValue(value)) {
			continue;
		}
		next[key] = value;
	}
	return next;
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
	const sanitized = omitUnsetOptionalFields(formData, schema);
	if (
		collectRequiredFieldKeys(schema).some(
			(key) => !isFilledRequiredValue(sanitized[key]),
		)
	) {
		return false;
	}

	const customValidate = createAnketaModalCustomValidate(schema);
	const { errors } = validatorRu.validateFormData(
		sanitized,
		schema,
		customValidate,
		undefined,
		uiSchema,
	);
	if (errors.length === 0) return true;

	/**
	 * Запасной путь: иногда schema/uiSchema тянут dependentRequired /
	 * лишние ключи. Для Save достаточно required + валидность явно
	 * заполненных optional (без «пустых» значений).
	 */
	const props =
		schema.properties && typeof schema.properties === "object"
			? (schema.properties as Record<string, RJSFSchema>)
			: {};
	const lean: RJSFSchema = {
		type: "object",
		properties: props,
		required: collectRequiredFieldKeys(schema),
	};
	const { errors: leanErrors } = validatorRu.validateFormData(
		sanitized,
		lean,
		customValidate,
	);
	return leanErrors.length === 0;
}
