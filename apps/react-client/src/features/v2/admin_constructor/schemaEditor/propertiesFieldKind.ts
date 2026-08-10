import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";
import {
	resolveStreamBlockExecutorsLabel,
	resolveV2AnketaArchComponent,
	resolveV2AnketaStreamBlockOptions,
	V2_ARCH_COMPONENT_LABELS,
} from "@smart-anketa/api-contract";
import {
	ARCH_COMPONENT_CHIP_COLORS,
	CANVAS_CATEGORY_CHIP_COLORS,
	ruSchemaTypeLabel,
	type PrimitiveFieldTypeVariant,
} from "./constants";
import { pointerSegments } from "../utils/schemaPaths";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
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

export function isDictionaryStringField(
	resolvedField: RJSFSchema | undefined,
	uiOptions: Record<string, unknown> | undefined,
	uiWidget?: string,
): boolean {
	if (resolveSchemaNodeType(resolvedField) !== "string") return false;
	const dictionaryCode =
		typeof uiOptions?.dictionaryCode === "string"
			? uiOptions.dictionaryCode.trim()
			: "";
	return dictionaryCode.length > 0 || uiWidget === "select";
}

export function isTextareaStringField(
	resolvedField: RJSFSchema | undefined,
	uiWidget?: string,
): boolean {
	if (resolveSchemaNodeType(resolvedField) !== "string") return false;
	return uiWidget === "textarea";
}

export function resolvePrimitiveFieldTypeVariant(
	resolvedField: RJSFSchema | undefined,
	uiOptions: Record<string, unknown> | undefined,
	uiWidget?: string,
): PrimitiveFieldTypeVariant {
	if (isDictionaryMultiField(resolvedField, uiOptions)) {
		return "dictionary-list";
	}
	if (isDictionaryStringField(resolvedField, uiOptions, uiWidget)) {
		return "string-dictionary";
	}
	if (isTextareaStringField(resolvedField, uiWidget)) {
		return "string-textarea";
	}
	const type = resolveSchemaNodeType(resolvedField);
	if (
		type === "integer" ||
		type === "number" ||
		type === "boolean" ||
		type === "string"
	) {
		return type;
	}
	return "string";
}

export function resolveCanvasFieldTypeChipLabel(
	resolvedField: RJSFSchema | undefined,
	uiBranch: Record<string, unknown> | undefined,
): { label: string; colorKey: string } {
	const uiOptions = readLeafUiOptions(uiBranch);
	const uiWidget =
		typeof uiBranch?.["ui:widget"] === "string" ? uiBranch["ui:widget"] : "";

	if (isDictionaryMultiField(resolvedField, uiOptions)) {
		return { label: "мультисправочник", colorKey: "dictionary-list" };
	}
	if (isDictionaryStringField(resolvedField, uiOptions, uiWidget)) {
		return { label: "строка·справочник", colorKey: "string-dictionary" };
	}
	if (isTextareaStringField(resolvedField, uiWidget)) {
		return { label: "строка·textarea", colorKey: "string-textarea" };
	}

	const type =
		typeof resolvedField?.type === "string"
			? resolvedField.type
			: Array.isArray(resolvedField?.type)
				? resolvedField.type.join(" | ")
				: "?";

	return { label: ruSchemaTypeLabel(type), colorKey: type };
}

export type CanvasCategoryChip = {
	label: string;
	title?: string;
	color: string;
};

/** Категорийные чипы холста: арх компонент, работы, разметка и т.д. */
export function resolveCanvasCategoryChips(
	resolvedField: RJSFSchema | undefined,
	uiBranch: Record<string, unknown> | undefined,
	blockKey?: string,
): CanvasCategoryChip[] {
	const chips: CanvasCategoryChip[] = [];
	const uiOptions = readLeafUiOptions(uiBranch);
	const uiWidget =
		typeof uiBranch?.["ui:widget"] === "string" ? uiBranch["ui:widget"] : "";
	const arch = resolveV2AnketaArchComponent(uiBranch);
	const streamBlock = resolveV2AnketaStreamBlockOptions(uiBranch, blockKey);

	if (streamBlock.streamBlock && streamBlock.streamExecutors.length > 0) {
		chips.push({
			label: resolveStreamBlockExecutorsLabel(streamBlock.streamExecutors),
			title: "Стримовый блок",
			color: "#2563eb",
		});
	}

	if (isLayoutGroupUi(uiOptions)) {
		chips.push({
			label: "разметка",
			color: CANVAS_CATEGORY_CHIP_COLORS.layout,
		});
	}
	if (isGeneralUncertaintyField(uiWidget, resolvedField)) {
		chips.push({
			label: "расчёт",
			title: "Расчёт общей неопределённости",
			color: CANVAS_CATEGORY_CHIP_COLORS.calculation,
		});
	}
	if (arch) {
		if (isWorkArchComponent(arch)) {
			chips.push({
				label: "работы",
				title: V2_ARCH_COMPONENT_LABELS[arch],
				color: ARCH_COMPONENT_CHIP_COLORS[arch],
			});
		} else {
			chips.push({
				label: "арх компонент",
				title: V2_ARCH_COMPONENT_LABELS[arch],
				color: ARCH_COMPONENT_CHIP_COLORS[arch],
			});
		}
	}

	return chips;
}

export function isGeneralUncertaintyField(
	uiWidget: string | undefined,
	resolvedField: RJSFSchema | undefined,
): boolean {
	if (uiWidget === "V2UncertaintyModalWidget") return true;
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

/** archComponent с предка (для полей внутри арх. блока / items). */
export function resolveArchComponentAtPointer(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
	pointer: string,
): V2ArchComponentType | null {
	if (!uiSchema || !pointer) return null;
	const segs = pointerSegments(pointer);
	for (let len = segs.length; len > 0; len -= 1) {
		const partial = `/${segs.slice(0, len).join("/")}`;
		const branch = readUiSchemaBranchAtPointer(uiSchema, partial);
		const arch = resolveV2AnketaArchComponent(branch);
		if (arch) return arch;
	}
	return null;
}

/** Арх-компонент поля с человекочитаемым названием и стабильным id блока. */
export type ArchComponentRef = {
	type: V2ArchComponentType;
	label: string;
	/** archBlockUid, а при его отсутствии — schemaFieldUid самого блока. */
	blockUid: string | null;
	blockTitle: string | null;
	blockPointer: string;
};

export function resolveArchComponentRefAtPointer(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
	pointer: string,
	jsonSchema?: RJSFSchema,
): ArchComponentRef | null {
	if (!uiSchema || !pointer) return null;
	const segs = pointerSegments(pointer);
	for (let len = segs.length; len > 0; len -= 1) {
		const blockPointer = `/${segs.slice(0, len).join("/")}`;
		const branch = readUiSchemaBranchAtPointer(uiSchema, blockPointer);
		const type = resolveV2AnketaArchComponent(branch);
		if (!type) continue;

		const options = branch?.["ui:options"] as
			| Record<string, unknown>
			| undefined;
		const archBlockUid = options?.archBlockUid;
		const schemaFieldUid = options?.schemaFieldUid;
		const blockUid =
			(typeof archBlockUid === "string" && archBlockUid.trim()) ||
			(typeof schemaFieldUid === "string" && schemaFieldUid.trim()) ||
			null;
		const node = jsonSchema
			? resolveSchemaNode(jsonSchema, segs.slice(0, len))
			: undefined;
		const title = typeof node?.title === "string" ? node.title.trim() : "";

		return {
			type,
			label: V2_ARCH_COMPONENT_LABELS[type] ?? type,
			blockUid,
			blockTitle: title || null,
			blockPointer,
		};
	}
	return null;
}

/** «Модельный сервис · modelService · block_a1b2c3» для подписей в работах. */
export function formatArchComponentRef(
	ref: ArchComponentRef | null | undefined,
): string | null {
	if (!ref) return null;
	return [ref.label, ref.type, ref.blockUid].filter(Boolean).join(" · ");
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
