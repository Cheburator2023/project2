import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import type { WorkSchemaParamDef } from "./v2-work-schema-params-match.util";
import {
	findWorkSchemaParameter,
	resolveWorkSchemaParamForRule,
} from "./v2-work-schema-params-match.util";
import type { TypicalWorkRuleLike } from "./v2-works-catalog-match.util";
import {
	catalogValueMatchesTriggerRule,
	isBrokenTypicalWorkTriggerRef,
	isControlTypeTriggerParam,
	isMethodologyPresenceTriggerRule,
	isPresenceOnlyTriggerRule,
	isSourceTypeTriggerParam,
} from "./v2-works-catalog-match.util";

type JsonSchemaNode = {
	type?: string | string[];
	title?: string;
	enum?: unknown[];
	enumNames?: string[];
	properties?: Record<string, JsonSchemaNode>;
	items?: JsonSchemaNode | JsonSchemaNode[];
};

function schemaNodeType(node: JsonSchemaNode | undefined): string | null {
	if (!node) return null;
	if (typeof node.type === "string") return node.type;
	if (Array.isArray(node.type)) {
		return node.type.find((value) => value !== "null") ?? node.type[0] ?? null;
	}
	if (Array.isArray(node.enum) && node.enum.length > 0) return "string";
	return null;
}

function objectItemsSchema(node: JsonSchemaNode): JsonSchemaNode | null {
	if (schemaNodeType(node) !== "array") return null;
	const items = node.items;
	if (!items) return null;
	if (Array.isArray(items)) return items[0] ?? null;
	return schemaNodeType(items) === "object" ? items : null;
}

function readUiBranch(
	uiSchema: Record<string, unknown> | undefined,
	segments: string[],
): Record<string, unknown> | undefined {
	if (!uiSchema) return undefined;
	let cur: unknown = uiSchema;
	for (const segment of segments) {
		if (segment === "items") {
			cur = (cur as Record<string, unknown> | undefined)?.items;
			continue;
		}
		cur = (cur as Record<string, unknown> | undefined)?.[segment];
	}
	return cur && typeof cur === "object" && !Array.isArray(cur)
		? (cur as Record<string, unknown>)
		: undefined;
}

function valuesFromSchemaNode(
	node: JsonSchemaNode | undefined,
): Array<{ code: string; label: string }> {
	if (!node) return [];
	const enumValues = Array.isArray(node.enum)
		? node.enum.filter((value): value is string => typeof value === "string")
		: [];
	if (enumValues.length === 0) return [];
	const enumNames = Array.isArray(node.enumNames)
		? node.enumNames.filter((value): value is string => typeof value === "string")
		: [];
	return enumValues.map((code, index) => ({
		code,
		label: enumNames[index] ?? code,
	}));
}

function isLeafWorkSchemaField(node: JsonSchemaNode | undefined): boolean {
	const type = schemaNodeType(node);
	if (!type) return false;
	if (type === "object") return false;
	if (type === "array") return false;
	if (valuesFromSchemaNode(node).length > 0) return true;
	return ["string", "number", "integer", "boolean"].includes(type);
}

function walkSchemaFields(
	schema: JsonSchemaNode,
	uiSchema: Record<string, unknown> | undefined,
	pointer: string,
	segments: string[],
	out: WorkSchemaParamDef[],
): void {
	const node = segments.length
		? segments.reduce<JsonSchemaNode | undefined>((acc, segment) => {
				if (!acc) return undefined;
				if (segment === "items") {
					const items = objectItemsSchema(acc);
					return items ?? undefined;
				}
				return acc.properties?.[segment];
			}, schema)
		: schema;

	if (!node) return;

	if (isLeafWorkSchemaField(node)) {
		const key = segments.at(-1);
		if (!key) return;
		const title = typeof node.title === "string" ? node.title.trim() : key;
		const uiBranch = readUiBranch(uiSchema, segments);
		const uiOptions = uiBranch?.["ui:options"];
		let schemaFieldUid: string | null = null;
		let dictionaryCode: string | null = null;
		if (uiOptions && typeof uiOptions === "object" && !Array.isArray(uiOptions)) {
			const options = uiOptions as Record<string, unknown>;
			if (typeof options.schemaFieldUid === "string") {
				schemaFieldUid = options.schemaFieldUid.trim() || null;
			}
			if (typeof options.dictionaryCode === "string") {
				dictionaryCode = options.dictionaryCode.trim() || null;
			}
		}
		out.push({
			code: key,
			name: title,
			description: pointer,
			schemaFieldUid,
			schemaPointer: pointer,
			sourceKeys: [key],
			values: valuesFromSchemaNode(node),
			...(dictionaryCode ? { dictionaryCode } : {}),
		} as WorkSchemaParamDef & { dictionaryCode?: string });
		return;
	}

	if (schemaNodeType(node) === "object" && node.properties) {
		for (const [key, child] of Object.entries(node.properties)) {
			const childPointer =
				pointer === "/" ? `/${key}` : `${pointer.replace(/\/$/, "")}/${key}`;
			walkSchemaFields(schema, uiSchema, childPointer, [...segments, key], out);
		}
	}

	const itemsSchema = objectItemsSchema(node);
	if (itemsSchema?.properties) {
		for (const [key, child] of Object.entries(itemsSchema.properties)) {
			const childPointer = `${pointer.replace(/\/$/, "")}/items/${key}`;
			walkSchemaFields(
				schema,
				uiSchema,
				childPointer,
				[...segments, "items", key],
				out,
			);
		}
	}
}

/** Строит список полей схемы шаблона для сопоставления с legacy-кодами работ. */
export function buildWorkSchemaParamsFromTemplate(params: {
	jsonSchema: Record<string, unknown>;
	uiSchema?: Record<string, unknown>;
}): WorkSchemaParamDef[] {
	const out: WorkSchemaParamDef[] = [];
	walkSchemaFields(
		params.jsonSchema as JsonSchemaNode,
		params.uiSchema,
		"/",
		[],
		out,
	);
	return out.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export type TypicalWorkSchemaConsistencyIssue = {
	workId?: string;
	streamExecutor?: string;
	kind: "trigger" | "labor" | "formula";
	paramCode: string;
	paramName?: string | null;
	message: string;
};

export type TypicalWorkSchemaConsistencyInput = {
	schemaParams: WorkSchemaParamDef[];
	rules: TypicalWorkRuleLike[];
	laborParamCodes: Array<{
		paramCode: string;
		paramName?: string | null;
		schemaFieldUid?: string | null;
	}>;
	formulaParamCodes?: string[];
};

export function enrichWorkSchemaParamsWithCatalogAliases<
	T extends WorkSchemaParamDef,
>(
	schemaParams: T[],
	catalog: Array<{ code: string; name: string }>,
): T[] {
	return schemaParams.map((schemaParam) => {
		const previousCode = findCatalogPreviousCodeForSchemaParam(
			catalog,
			schemaParam,
		);
		const sourceKeys = new Set(schemaParam.sourceKeys ?? [schemaParam.code]);
		sourceKeys.add(schemaParam.code);
		if (previousCode) sourceKeys.add(previousCode);
		return { ...schemaParam, sourceKeys: [...sourceKeys] };
	});
}

export function schemaEnumValueMatchesRule(
	enumValue: { code: string; label: string },
	rule: { valueCode: string | null; valueLabel: string | null },
): boolean {
	if (
		catalogValueMatchesTriggerRule(enumValue, {
			paramCode: "",
			paramName: null,
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
		})
	) {
		return true;
	}
	if (rule.valueCode?.trim()) {
		const norm = rule.valueCode.trim();
		if (enumValue.code === norm) return true;
		if (enumValue.code.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0) {
			return true;
		}
		if (
			enumValue.label.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0
		) {
			return true;
		}
	}
	if (rule.valueLabel?.trim()) {
		const norm = rule.valueLabel.trim();
		if (enumValue.label === norm) return true;
		if (
			enumValue.label.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0
		) {
			return true;
		}
		if (
			enumValue.code.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0
		) {
			return true;
		}
	}
	return false;
}

function ruleRequiresSchemaBinding(rule: TypicalWorkRuleLike): boolean {
	if (isBrokenTypicalWorkTriggerRef(rule)) return false;
	if (isMethodologyPresenceTriggerRule(rule)) return false;
	if (rule.paramCode?.trim() || rule.paramName?.trim()) return true;
	return (
		isSourceTypeTriggerParam(rule.paramCode, rule.paramName) ||
		isControlTypeTriggerParam(rule.paramCode, rule.paramName)
	);
}

export function collectTypicalWorkSchemaConsistencyIssues(
	input: TypicalWorkSchemaConsistencyInput,
): TypicalWorkSchemaConsistencyIssue[] {
	const issues: TypicalWorkSchemaConsistencyIssue[] = [];
	const seen = new Set<string>();

	const report = (
		kind: TypicalWorkSchemaConsistencyIssue["kind"],
		paramCode: string,
		paramName: string | null | undefined,
		message: string,
	) => {
		const key = `${kind}:${paramCode}:${message}`;
		if (seen.has(key)) return;
		seen.add(key);
		issues.push({ kind, paramCode, paramName, message });
	};

	for (const rule of input.rules) {
		if (!ruleRequiresSchemaBinding(rule)) {
			continue;
		}
		const resolved = resolveWorkSchemaParamForRule(rule, input.schemaParams);
		if (!resolved) {
			if (
				isPresenceOnlyTriggerRule(rule) &&
				(isSourceTypeTriggerParam(rule.paramCode, rule.paramName) ||
					isControlTypeTriggerParam(rule.paramCode, rule.paramName))
			) {
				continue;
			}
			report(
				"trigger",
				rule.paramCode,
				rule.paramName,
				"Триггер ссылается на параметр, которого нет в схеме шаблона",
			);
			continue;
		}
		if (
			rule.valueCode &&
			resolved.values?.length &&
			!resolved.values.some((value) => schemaEnumValueMatchesRule(value, rule))
		) {
			report(
				"trigger",
				rule.paramCode,
				rule.paramName,
				`Значение триггера «${rule.valueLabel ?? rule.valueCode}» отсутствует в поле схемы «${resolved.name}»`,
			);
		}
	}

	for (const labor of input.laborParamCodes) {
		const resolved = resolveWorkSchemaParamForRule(labor, input.schemaParams);
		if (!resolved) {
			if (!labor.schemaFieldUid) {
				continue;
			}
			report(
				"labor",
				labor.paramCode,
				labor.paramName,
				"Параметр трудоёмкости не найден в схеме шаблона",
			);
		}
	}

	for (const paramCode of input.formulaParamCodes ?? []) {
		if (
			!findWorkSchemaParameter(input.schemaParams, paramCode) &&
			!input.laborParamCodes.some((row) => row.paramCode === paramCode)
		) {
			report(
				"formula",
				paramCode,
				null,
				"Формула ссылается на параметр, которого нет в схеме или трудоёмкости",
			);
		}
	}

	return issues;
}

export function findCatalogPreviousCodeForSchemaParam(
	catalog: Array<{ code: string; name: string }>,
	schemaParam: WorkSchemaParamDef,
): string | undefined {
	const normSchemaName = stripParamNameSourceKeys(schemaParam.name)
		.trim()
		.toLowerCase();
	const exact = catalog.find((item) => item.name.trim() === schemaParam.name);
	if (exact) return exact.code;
	return catalog.find(
		(item) =>
			stripParamNameSourceKeys(item.name).trim().toLowerCase() ===
			normSchemaName,
	)?.code;
}
