import { coerceBinaryBooleanFormValue } from "./v2-binary-boolean-schema.util";

type JsonSchemaNode = {
	type?: string | string[];
	properties?: Record<string, unknown>;
	items?: unknown;
	additionalProperties?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function schemaTypeIncludes(
	type: string | string[] | undefined,
	expected: string,
): boolean {
	if (Array.isArray(type)) return type.includes(expected);
	return type === expected;
}

function isBooleanSchema(schema: JsonSchemaNode | null | undefined): boolean {
	return schemaTypeIncludes(schema?.type, "boolean");
}

function isObjectSchema(schema: JsonSchemaNode | null | undefined): boolean {
	if (!schema) return false;
	if (schemaTypeIncludes(schema.type, "object")) return true;
	return Boolean(schema.properties && typeof schema.properties === "object");
}

function isArraySchema(schema: JsonSchemaNode | null | undefined): boolean {
	return schemaTypeIncludes(schema?.type, "array");
}

function coerceToBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return value;
	const fromBinary = coerceBinaryBooleanFormValue(value);
	if (fromBinary !== undefined) return fromBinary;
	return false;
}

function readItemsSchema(
	schema: JsonSchemaNode,
): JsonSchemaNode | null {
	const items = schema.items;
	if (!items || typeof items !== "object" || Array.isArray(items)) return null;
	return items as JsonSchemaNode;
}

/**
 * Boolean-поля без третьего состояния: отсутствующие / null / "" → `false`,
 * legacy «Да»/«Нет» → boolean. Не трогает «заполненность» строки через
 * schema.default (RJSF), а нормализует уже существующий formData.
 * Возвращает тот же объект, если изменений нет.
 */
export function applyBooleanDefaultsToFormData(
	formData: unknown,
	schema: unknown,
): Record<string, unknown> {
	const rootData = asRecord(formData) ?? {};
	const rootSchema = asRecord(schema) as JsonSchemaNode | null;
	if (!rootSchema) return rootData;
	const { value, changed } = visitObject(rootData, rootSchema);
	return changed ? value : rootData;
}

function visitObject(
	data: Record<string, unknown>,
	schema: JsonSchemaNode,
): { value: Record<string, unknown>; changed: boolean } {
	const props = asRecord(schema.properties) ?? {};
	let changed = false;
	const next: Record<string, unknown> = { ...data };

	for (const [key, rawProp] of Object.entries(props)) {
		const propSchema = asRecord(rawProp) as JsonSchemaNode | null;
		if (!propSchema) continue;

		if (isBooleanSchema(propSchema)) {
			const current = next[key];
			if (current === undefined || current === null || current === "") {
				next[key] = false;
				changed = true;
			} else {
				const coerced = coerceToBoolean(current);
				if (coerced !== current) {
					next[key] = coerced;
					changed = true;
				}
			}
			continue;
		}

		if (isArraySchema(propSchema)) {
			const itemsSchema = readItemsSchema(propSchema);
			const current = next[key];
			if (!itemsSchema || !Array.isArray(current)) continue;
			let arrayChanged = false;
			const mapped = current.map((item) => {
				const row = asRecord(item);
				if (!row) return item;
				if (isObjectSchema(itemsSchema) || itemsSchema.properties) {
					const nested = visitObject(row, itemsSchema);
					if (nested.changed) arrayChanged = true;
					return nested.value;
				}
				if (isBooleanSchema(itemsSchema)) {
					const coerced = coerceToBoolean(item);
					if (coerced !== item) arrayChanged = true;
					return coerced;
				}
				return item;
			});
			if (arrayChanged) {
				next[key] = mapped;
				changed = true;
			}
			continue;
		}

		if (isObjectSchema(propSchema) || propSchema.properties) {
			const current = asRecord(next[key]);
			if (!current) {
				// Не создаём пустые object-ветки только ради boolean defaults —
				// иначе арх. блоки выглядят «заполненными».
				continue;
			}
			const nested = visitObject(current, propSchema);
			if (nested.changed) {
				next[key] = nested.value;
				changed = true;
			}
		}
	}

	return { value: changed ? next : data, changed };
}

/** Заполняет boolean-поля в одной строке/объекте по schema.properties / items. */
export function applyBooleanDefaultsToObject(
	values: Record<string, unknown>,
	schema: unknown,
): Record<string, unknown> {
	const propSchema = asRecord(schema) as JsonSchemaNode | null;
	if (!propSchema) return { ...values };
	if (isArraySchema(propSchema)) {
		const items = readItemsSchema(propSchema);
		if (!items) return { ...values };
		return visitObject({ ...values }, items).value;
	}
	return visitObject({ ...values }, propSchema).value;
}
