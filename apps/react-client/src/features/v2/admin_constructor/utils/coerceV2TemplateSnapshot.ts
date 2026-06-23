import type { UiSchema } from "@rjsf/utils";
import type { RJSFSchema } from "@rjsf/utils";
import type {
	V2DictionariesSnapshotDto,
	V2LogicGraphDto,
	V2LogicRuleDto,
	V2TemplateSnapshotDto,
} from "@smart-anketa/api-contract";
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

/** Виджеты v1 без v2-аналога — подменяем при загрузке шаблона. */
const V2_UI_WIDGET_REPLACEMENTS: Record<string, string> = {
	AlgorithmComplexityWidget: "text",
};

function sanitizeV2UiWidgets(node: unknown): void {
	if (!node || typeof node !== "object" || Array.isArray(node)) return;
	const record = node as Record<string, unknown>;
	const widget = record["ui:widget"];
	if (
		typeof widget === "string" &&
		widget in V2_UI_WIDGET_REPLACEMENTS
	) {
		record["ui:widget"] = V2_UI_WIDGET_REPLACEMENTS[widget];
	}
	for (const value of Object.values(record)) {
		sanitizeV2UiWidgets(value);
	}
}

export function coerceUiSchema(
	input: unknown,
	jsonSchema?: unknown,
): UiSchema {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return {};
	}
	const ui = structuredClone(input) as UiSchema;
	sanitizeV2UiWidgets(ui);
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

export function coerceDictionariesSnapshot(
	input: unknown,
): V2DictionariesSnapshotDto | null {
	if (!input || typeof input !== "object" || Array.isArray(input)) return null;
	const raw = (input as { referencedDictionaryCodes?: unknown })
		.referencedDictionaryCodes;
	return {
		referencedDictionaryCodes: Array.isArray(raw)
			? raw.filter((code): code is string => typeof code === "string")
			: [],
	};
}

export function coerceTemplateSnapshot(input: {
	jsonSchema?: unknown;
	uiSchema?: unknown;
	logic?: unknown;
	dictionariesSnapshot?: unknown;
}): V2TemplateSnapshotDto {
	const jsonSchema = coerceJsonSchema(input.jsonSchema);
	return {
		jsonSchema,
		uiSchema: coerceUiSchema(input.uiSchema, jsonSchema),
		logic: coerceLogicGraph(input.logic),
		dictionariesSnapshot: coerceDictionariesSnapshot(input.dictionariesSnapshot),
	};
}
