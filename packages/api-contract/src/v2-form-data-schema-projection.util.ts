/**
 * Проекция formData исходной анкеты на jsonSchema целевой версии схемы:
 * — значения по путям, которых нет в новой схеме, отбрасываются;
 * — отсутствующие / недопустимые значения заполняются schema.default;
 * — boolean без значения → false (через applyBooleanDefaults отдельно на вызывающей стороне).
 */

import { applyBooleanDefaultsToFormData } from "./v2-boolean-form-defaults.util";

export type V2FormDataProjectionReportDto = {
	droppedPaths: string[];
	defaultedPaths: string[];
	/** Краткое сообщение для UI; null если расхождений нет. */
	summary: string | null;
};

export type V2FormDataProjectionResult = {
	formData: Record<string, unknown>;
	report: V2FormDataProjectionReportDto;
};

type JsonSchemaNode = {
	type?: string | string[];
	properties?: Record<string, unknown>;
	items?: unknown;
	default?: unknown;
	enum?: unknown[];
	const?: unknown;
};

/** Корневые ключи, не являющиеся полями опросника схемы. */
const PRESERVED_ROOT_KEYS = new Set(["workflow"]);

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function asSchema(value: unknown): JsonSchemaNode | null {
	return asRecord(value) as JsonSchemaNode | null;
}

function schemaTypeIncludes(
	type: string | string[] | undefined,
	expected: string,
): boolean {
	if (Array.isArray(type)) return type.includes(expected);
	return type === expected;
}

function isObjectSchema(schema: JsonSchemaNode): boolean {
	if (schemaTypeIncludes(schema.type, "object")) return true;
	return Boolean(schema.properties && typeof schema.properties === "object");
}

function isArraySchema(schema: JsonSchemaNode): boolean {
	return schemaTypeIncludes(schema.type, "array");
}

function readItemsSchema(schema: JsonSchemaNode): JsonSchemaNode | null {
	const items = schema.items;
	if (!items || typeof items !== "object" || Array.isArray(items)) return null;
	return items as JsonSchemaNode;
}

function isEmptyValue(value: unknown): boolean {
	return value === undefined || value === null || value === "";
}

function valueAllowedBySchema(value: unknown, schema: JsonSchemaNode): boolean {
	if (isEmptyValue(value)) return false;
	if (schema.const !== undefined) return value === schema.const;
	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		return schema.enum.includes(value);
	}
	return true;
}

function formatProjectionSummary(
	droppedPaths: string[],
	defaultedPaths: string[],
): string | null {
	const parts: string[] = [];
	if (droppedPaths.length > 0) {
		const sample = droppedPaths.slice(0, 8).join(", ");
		const more =
			droppedPaths.length > 8 ? ` и ещё ${droppedPaths.length - 8}` : "";
		parts.push(
			`Не перенесены параметры, отсутствующие в схеме: ${sample}${more}`,
		);
	}
	if (defaultedPaths.length > 0) {
		const sample = defaultedPaths.slice(0, 8).join(", ");
		const more =
			defaultedPaths.length > 8 ? ` и ещё ${defaultedPaths.length - 8}` : "";
		parts.push(`Установлены значения по умолчанию: ${sample}${more}`);
	}
	return parts.length > 0 ? parts.join(". ") : null;
}

type VisitResult = {
	value: unknown;
	/** true если значение нужно записать в родителя */
	present: boolean;
};

function visit(
	data: unknown,
	schema: JsonSchemaNode,
	path: string,
	dropped: string[],
	defaulted: string[],
): VisitResult {
	if (isObjectSchema(schema)) {
		const src = asRecord(data) ?? {};
		const props = asRecord(schema.properties) ?? {};
		const out: Record<string, unknown> = {};

		for (const key of Object.keys(src)) {
			const childPath = path ? `${path}.${key}` : key;
			const propSchema = asSchema(props[key]);
			if (!propSchema) {
				dropped.push(childPath);
				continue;
			}
			const child = visit(src[key], propSchema, childPath, dropped, defaulted);
			if (child.present) out[key] = child.value;
		}

		for (const [key, rawProp] of Object.entries(props)) {
			if (Object.prototype.hasOwnProperty.call(out, key)) continue;
			const propSchema = asSchema(rawProp);
			if (!propSchema) continue;
			const childPath = path ? `${path}.${key}` : key;
			if (isObjectSchema(propSchema) || isArraySchema(propSchema)) {
				const child = visit(
					undefined,
					propSchema,
					childPath,
					dropped,
					defaulted,
				);
				if (!child.present) continue;
				const nested = asRecord(child.value);
				if (nested && Object.keys(nested).length === 0) continue;
				out[key] = child.value;
				continue;
			}
			if (propSchema.default !== undefined) {
				out[key] = propSchema.default;
				defaulted.push(childPath);
			}
		}

		return { value: out, present: true };
	}

	if (isArraySchema(schema)) {
		const itemsSchema = readItemsSchema(schema);
		if (!Array.isArray(data)) {
			if (schema.default !== undefined) {
				defaulted.push(path || "(root)");
				return { value: schema.default, present: true };
			}
			return { value: [], present: true };
		}
		if (!itemsSchema) {
			return { value: data, present: true };
		}
		const next = data.map((item, index) => {
			const childPath = `${path}[${index}]`;
			const child = visit(item, itemsSchema, childPath, dropped, defaulted);
			return child.present ? child.value : {};
		});
		return { value: next, present: true };
	}

	// leaf
	if (valueAllowedBySchema(data, schema)) {
		return { value: data, present: true };
	}
	if (schema.default !== undefined) {
		defaulted.push(path || "(root)");
		return { value: schema.default, present: true };
	}
	if (!isEmptyValue(data) && Array.isArray(schema.enum)) {
		// было значение, но его нет в enum новой схемы
		dropped.push(path || "(root)");
	}
	return { value: undefined, present: false };
}

/**
 * Переносит значения source на структуру jsonSchema целевой версии схемы.
 * `workflow` и прочие preserved-ключи копируются как есть (caller сбрасывает workflow).
 */
export function projectFormDataOntoJsonSchema(
	source: Record<string, unknown>,
	jsonSchema: unknown,
): V2FormDataProjectionResult {
	const rootSchema = asSchema(jsonSchema);
	const droppedPaths: string[] = [];
	const defaultedPaths: string[] = [];

	const preserved: Record<string, unknown> = {};
	for (const key of PRESERVED_ROOT_KEYS) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			preserved[key] = source[key];
		}
	}

	if (!rootSchema) {
		return {
			formData: { ...source },
			report: {
				droppedPaths: [],
				defaultedPaths: [],
				summary: null,
			},
		};
	}

	const questionnaireSource: Record<string, unknown> = { ...source };
	for (const key of PRESERVED_ROOT_KEYS) {
		delete questionnaireSource[key];
	}

	const projected = visit(
		questionnaireSource,
		rootSchema,
		"",
		droppedPaths,
		defaultedPaths,
	);
	const projectedRecord = asRecord(projected.value) ?? {};

	const formData: Record<string, unknown> = {
		...projectedRecord,
		...preserved,
	};

	droppedPaths.sort();
	defaultedPaths.sort();

	return {
		formData,
		report: {
			droppedPaths,
			defaultedPaths,
			summary: formatProjectionSummary(droppedPaths, defaultedPaths),
		},
	};
}

/** Проекция + boolean-defaults по схеме. */
export function projectAndDefaultFormDataOntoJsonSchema(
	source: Record<string, unknown>,
	jsonSchema: unknown,
): V2FormDataProjectionResult {
	const projected = projectFormDataOntoJsonSchema(source, jsonSchema);
	const withBooleans = applyBooleanDefaultsToFormData(
		projected.formData,
		jsonSchema,
	);
	return {
		formData: withBooleans,
		report: projected.report,
	};
}
