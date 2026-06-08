import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
} from "../utils/schemaMutators";

export type PropertiesFieldKind =
	| "primitive"
	| "object"
	| "layout"
	| "general-uncertainty"
	| "arch-object"
	| "array"
	| "arch-array";

const WORK_ARCH_TYPES: ReadonlySet<V2ArchComponentType> = new Set([
	"typicalWork",
	"atypicalWork",
]);

export function resolveSchemaNodeType(
	node: RJSFSchema | undefined,
): string | undefined {
	if (!node) return undefined;
	const t = node.type;
	if (typeof t === "string") return t;
	if (Array.isArray(t)) {
		return t.find((x) => x !== "null") as string | undefined;
	}
	if (node.properties) return "object";
	if (node.items) return "array";
	return undefined;
}

export function readLeafUiOptions(
	uiNode: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	const opts = uiNode?.["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return undefined;
	return opts as Record<string, unknown>;
}

export function isLayoutGroupUi(
	uiOptions: Record<string, unknown> | undefined,
): boolean {
	return uiOptions?.layoutGroup === true;
}

export function isDictionaryMultiField(
	resolvedField: RJSFSchema | undefined,
	uiOptions: Record<string, unknown> | undefined,
): boolean {
	if (uiOptions?.multiple !== true) return false;
	if (resolveSchemaNodeType(resolvedField) !== "array") return false;
	const items = resolvedField?.items as RJSFSchema | undefined;
	return resolveSchemaNodeType(items) === "string";
}

export function isGeneralUncertaintyField(
	uiWidget: string | undefined,
	resolvedField: RJSFSchema | undefined,
): boolean {
	return (
		uiWidget === "GeneralUncertaintyWidget" &&
		resolveSchemaNodeType(resolvedField) === "array"
	);
}

export function resolvePropertiesFieldKind(
	resolvedField: RJSFSchema | undefined,
	archComponent: V2ArchComponentType | null | undefined,
	uiOptions?: Record<string, unknown>,
	uiWidget?: string,
): PropertiesFieldKind | null {
	if (!resolvedField) return null;

	const type = resolveSchemaNodeType(resolvedField);

	if (isDictionaryMultiField(resolvedField, uiOptions)) {
		return "primitive";
	}
	if (isGeneralUncertaintyField(uiWidget, resolvedField)) {
		return "general-uncertainty";
	}
	if (type === "array") {
		return archComponent ? "arch-array" : "array";
	}
	if (isObjectFieldGroup(resolvedField) || type === "object") {
		if (isLayoutGroupUi(uiOptions)) {
			return "layout";
		}
		return archComponent ? "arch-object" : "object";
	}
	return "primitive";
}

/** Справочник — для строки или массива строк с множественным выбором. */
export function canBindDictionaryToField(
	resolvedField: RJSFSchema | undefined,
	uiOptions?: Record<string, unknown>,
): boolean {
	const type = resolveSchemaNodeType(resolvedField);
	if (type === "string") return true;
	if (type === "array") {
		const items = resolvedField?.items as RJSFSchema | undefined;
		if (resolveSchemaNodeType(items) !== "string") return false;
		const hasDict =
			typeof uiOptions?.dictionaryCode === "string" &&
			uiOptions.dictionaryCode.trim().length > 0;
		return uiOptions?.multiple === true || hasDict;
	}
	return false;
}

export function isWorkArchComponent(
	arch: V2ArchComponentType | null | undefined,
): boolean {
	return arch != null && WORK_ARCH_TYPES.has(arch);
}

export function describeArrayItems(
	node: RJSFSchema | undefined,
): string | null {
	if (!node || resolveSchemaNodeType(node) !== "array") return null;
	const items = node.items;
	if (!items || typeof items !== "object" || Array.isArray(items)) {
		return "элемент не задан";
	}
	const itemsSchema = items as RJSFSchema;
	const itemsType = resolveSchemaNodeType(itemsSchema);
	if (itemsType === "object") {
		const count = Object.keys(
			(itemsSchema.properties ?? {}) as Record<string, unknown>,
		).length;
		const obj = getObjectItemsSchema(node);
		return obj
			? `объект · ${count} ${count === 1 ? "поле" : count < 5 ? "поля" : "полей"}`
			: "объект";
	}
	return itemsType ?? "?";
}

export function readArrayToolbarOptions(
	uiNode: Record<string, unknown> | undefined,
): {
	addable?: boolean;
	removable?: boolean;
	orderable?: boolean;
} {
	const opts = uiNode?.["ui:options"];
	if (!opts || typeof opts !== "object" || Array.isArray(opts)) return {};
	const o = opts as Record<string, unknown>;
	return {
		addable: typeof o.addable === "boolean" ? o.addable : undefined,
		removable: typeof o.removable === "boolean" ? o.removable : undefined,
		orderable: typeof o.orderable === "boolean" ? o.orderable : undefined,
	};
}
