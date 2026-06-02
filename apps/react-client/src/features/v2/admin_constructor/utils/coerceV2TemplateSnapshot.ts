import type { UiSchema } from "@rjsf/utils";
import type { RJSFSchema } from "@rjsf/utils";
import type { V2LogicGraphDto, V2LogicRuleDto } from "@smart-anketa/api-contract";
import { enrichAnketaLayoutUiSchema } from "@smart-anketa/api-contract";

export const EMPTY_JSON_SCHEMA: RJSFSchema = {
	type: "object",
	properties: {},
	required: [],
};

export function coerceJsonSchema(input: unknown): RJSFSchema {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return structuredClone(EMPTY_JSON_SCHEMA);
	}
	const o = input as Record<string, unknown>;
	const properties =
		o.properties &&
		typeof o.properties === "object" &&
		!Array.isArray(o.properties)
			? (o.properties as RJSFSchema["properties"])
			: {};
	const required = Array.isArray(o.required)
		? (o.required.filter((x): x is string => typeof x === "string") as string[])
		: [];
	return {
		...o,
		type: "object",
		properties,
		required,
	} as RJSFSchema;
}

export function coerceUiSchema(
	input: unknown,
	jsonSchema?: unknown,
): UiSchema {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return {};
	}
	const ui = structuredClone(input) as UiSchema;
	if (jsonSchema) {
		return enrichAnketaLayoutUiSchema(
			ui as Record<string, unknown>,
			coerceJsonSchema(jsonSchema) as Record<string, unknown>,
		) as UiSchema;
	}
	return ui;
}

function isLogicRule(value: unknown): value is V2LogicRuleDto {
	if (!value || typeof value !== "object") return false;
	const r = value as Record<string, unknown>;
	return (
		typeof r.id === "string" &&
		typeof r.kind === "string" &&
		typeof r.targetPath === "string" &&
		Array.isArray(r.dependencies) &&
		r.dependencies.every((d) => typeof d === "string") &&
		r.condition !== undefined
	);
}

export function coerceLogicGraph(input: unknown): V2LogicGraphDto {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return { rules: [] };
	}
	const raw = (input as { rules?: unknown }).rules;
	if (!Array.isArray(raw)) return { rules: [] };
	const rules = raw.filter(isLogicRule);
	return { rules };
}
