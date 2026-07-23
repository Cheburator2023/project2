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
 * Такие значения нельзя отдавать в AJV и в сохранённую строку.
 */
export function isUnsetOptionalValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string" && value.trim().length === 0) return true;
	return false;
}

function readPropSchema(
	schema: RJSFSchema,
	key: string,
): RJSFSchema | undefined {
	const props = schema.properties;
	if (!props || typeof props !== "object" || Array.isArray(props)) {
		return undefined;
	}
	const prop = (props as Record<string, unknown>)[key];
	if (!prop || typeof prop !== "object" || Array.isArray(prop)) return undefined;
	return prop as RJSFSchema;
}

/** Optional-значение не подходит под enum/type свойства — выкидываем при sanitize. */
export function isInvalidOptionalPropValue(
	value: unknown,
	propSchema: RJSFSchema | undefined,
): boolean {
	if (!propSchema || isUnsetOptionalValue(value)) return false;
	if (Array.isArray(propSchema.enum) && propSchema.enum.length > 0) {
		return !propSchema.enum.some((item) => Object.is(item, value));
	}
	if (propSchema.type === "boolean") {
		return typeof value !== "boolean";
	}
	if (propSchema.type === "number" || propSchema.type === "integer") {
		return typeof value !== "number" || Number.isNaN(value);
	}
	if (propSchema.type === "string") {
		return typeof value !== "string";
	}
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
		if (
			!required.has(key) &&
			isInvalidOptionalPropValue(value, readPropSchema(schema, key))
		) {
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

/**
 * Save в модалке: достаточно заполненных required.
 * Полный AJV по optional (пусто/`null`/несовпадение enum из справочника)
 * раньше держал кнопку disabled даже при валидном «Название».
 */
export function isAnketaModalFormValid(
	formData: Record<string, unknown>,
	schema: RJSFSchema,
	_uiSchema?: UiSchema,
): boolean {
	const sanitized = omitUnsetOptionalFields(formData, schema);
	const requiredKeys = collectRequiredFieldKeys(schema);
	if (requiredKeys.length === 0) {
		// На всякий случай: если required не размечен, требуем хотя бы одно
		// непустое строковое поле `name` при его наличии в schema.
		const nameProp = readPropSchema(schema, "name");
		if (nameProp) return isFilledRequiredValue(sanitized.name);
		return true;
	}
	return requiredKeys.every((key) => isFilledRequiredValue(sanitized[key]));
}

/** Для liveValidate в форме — по-прежнему полный AJV после sanitize. */
export function getAnketaModalFormErrors(
	formData: Record<string, unknown>,
	schema: RJSFSchema,
	uiSchema: UiSchema,
) {
	const sanitized = omitUnsetOptionalFields(formData, schema);
	const customValidate = createAnketaModalCustomValidate(schema);
	return validatorRu.validateFormData(
		sanitized,
		schema,
		customValidate,
		undefined,
		uiSchema,
	);
}
