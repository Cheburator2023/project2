import {
	readV2AnketaSectionUiOptions,
	resolveV2AnketaArchComponent,
	type V2ArchComponentType,
} from "./v2-anketa-section-ui.util";

export type V2AnketaModalKind =
	| "dataSource"
	| "modelService"
	| "modelServiceBlock"
	| "nonStandardTask"
	| "rjsfObject";

export type V2AnketaCanvasUiKind = "hidden" | "utility";

const MODAL_OBJECT_ARCH_COMPONENTS: readonly V2ArchComponentType[] = [
	"modelService",
	"dataProcess",
	"dataMart",
];

export type V2AnketaEditorBindings = {
	/** Корневые ключи uiSchema, не показываемые в теле RJSF-формы. */
	hiddenRootKeys: string[];
	modalArrayPaths: string[];
	readonlyArrayTablePaths: string[];
	modalObjectPaths: string[];
	/** Dot-пути полей, скрытых в теле анкеты (модалки арх. объектов). */
	bodyHiddenDotPaths: string[];
	modalKindByPath: Record<string, V2AnketaModalKind>;
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readUiOptions(uiNode: unknown): Record<string, unknown> {
	return readRecord(readRecord(uiNode)?.["ui:options"]) ?? {};
}

function isUiReadonly(uiNode: unknown): boolean {
	return readRecord(uiNode)?.["ui:readonly"] === true;
}

function readArrayToolbar(uiNode: unknown): {
	addable?: boolean;
	removable?: boolean;
} {
	const opts = readUiOptions(uiNode);
	return {
		addable: typeof opts.addable === "boolean" ? opts.addable : undefined,
		removable:
			typeof opts.removable === "boolean" ? opts.removable : undefined,
	};
}

function resolveSchemaType(
	node: Record<string, unknown> | undefined,
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

function pointerToDotPath(pointer: string): string {
	return pointer.split("/").filter(Boolean).join(".");
}

function listOrderedPropertyKeys(
	schemaNode: Record<string, unknown>,
	uiBranch: Record<string, unknown> | undefined,
): string[] {
	const props = readRecord(schemaNode.properties);
	const keys = props ? Object.keys(props) : [];
	const order = uiBranch?.["ui:order"];
	if (!Array.isArray(order)) return keys;
	const seen = new Set<string>();
	const result: string[] = [];
	for (const entry of order) {
		if (typeof entry === "string" && keys.includes(entry) && !seen.has(entry)) {
			result.push(entry);
			seen.add(entry);
		}
	}
	for (const key of keys) {
		if (!seen.has(key)) result.push(key);
	}
	return result;
}

/** Скрытое поле/секция (ui:widget hidden, ui:hidden или ui:options.hidden). */
export function isV2AnketaHiddenUiNode(uiNode: unknown): boolean {
	const node = readRecord(uiNode);
	if (!node) return false;
	if (node["ui:widget"] === "hidden" || node["ui:hidden"] === true) return true;
	return readV2AnketaSectionUiOptions(uiNode).hidden === true;
}

/** Метка на холсте конструктора: скрытая или системная (readonly-блок, panel). */
export function resolveV2AnketaCanvasUiKind(
	uiNode: unknown,
): V2AnketaCanvasUiKind | null {
	if (isV2AnketaHiddenUiNode(uiNode)) return "hidden";
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.sectionRole === "panel") return "utility";
	const node = readRecord(uiNode);
	if (isUiReadonly(uiNode) && Array.isArray(node?.["ui:order"])) {
		return "utility";
	}
	return null;
}

export function isV2AnketaModalObjectArch(
	arch: V2ArchComponentType | null,
): boolean {
	return (
		arch !== null &&
		(MODAL_OBJECT_ARCH_COMPONENTS as readonly string[]).includes(arch)
	);
}

/** Корневые поля анкеты, помеченные hidden в uiSchema. */
export function listV2AnketaHiddenRootKeys(
	uiSchema: Record<string, unknown>,
): string[] {
	const order = uiSchema["ui:order"];
	const rootKeys = Array.isArray(order)
		? order.filter((k): k is string => typeof k === "string")
		: Object.keys(uiSchema).filter((k) => !k.startsWith("ui:"));
	const hidden: string[] = [];
	for (const key of rootKeys) {
		if (isV2AnketaHiddenUiNode(uiSchema[key])) hidden.push(key);
	}
	return hidden;
}

function isReadonlyGeneratedArray(
	uiNode: unknown,
	schemaNode: Record<string, unknown> | undefined,
): boolean {
	if (isUiReadonly(uiNode)) return true;
	if (schemaNode?.readOnly === true) return true;
	const { addable, removable } = readArrayToolbar(uiNode);
	return addable === false && removable === false;
}

function isModalEditableArray(
	uiNode: unknown,
	schemaNode: Record<string, unknown> | undefined,
	fieldKey: string,
	arch: V2ArchComponentType | null,
): boolean {
	if (resolveSchemaType(schemaNode) !== "array") return false;
	if (isReadonlyGeneratedArray(uiNode, schemaNode)) return false;
	if (arch === "sourceSystem") return true;
	if (
		fieldKey === "modelsList" ||
		fieldKey === "trainingSources" ||
		fieldKey === "applicationSources"
	) {
		return true;
	}
	const { addable } = readArrayToolbar(uiNode);
	if (addable === true) return true;
	if (/[Aa]typical/.test(fieldKey) || fieldKey === "atypicalTasks") {
		return true;
	}
	return false;
}

function modalKindForArrayField(
	fieldKey: string,
	arch: V2ArchComponentType | null,
): V2AnketaModalKind | null {
	if (
		arch === "sourceSystem" ||
		fieldKey === "trainingSources" ||
		fieldKey === "applicationSources"
	) {
		return "dataSource";
	}
	if (fieldKey === "modelsList") return "modelService";
	if (/[Aa]typical/.test(fieldKey) || fieldKey === "atypicalTasks") {
		return "nonStandardTask";
	}
	return null;
}

function modalKindForObjectArch(
	arch: V2ArchComponentType,
): V2AnketaModalKind {
	return arch === "modelService" ? "modelServiceBlock" : "rjsfObject";
}

type WalkAcc = {
	modalArrayPaths: string[];
	readonlyArrayTablePaths: string[];
	modalObjectPaths: string[];
	bodyHiddenDotPaths: string[];
	modalKindByPath: Record<string, V2AnketaModalKind>;
};

function walkAnketaEditorUi(
	schemaNode: Record<string, unknown> | undefined,
	uiBranch: Record<string, unknown> | undefined,
	pointer: string,
	acc: WalkAcc,
): void {
	if (!schemaNode || pointer === "/") return;

	const dotPath = pointerToDotPath(pointer);
	const fieldKey = pointer.split("/").filter(Boolean).at(-1) ?? "";
	const arch = resolveV2AnketaArchComponent(uiBranch);
	const schemaType = resolveSchemaType(schemaNode);

	if (schemaType === "array" && dotPath) {
		if (isReadonlyGeneratedArray(uiBranch, schemaNode)) {
			acc.readonlyArrayTablePaths.push(dotPath);
		} else if (isModalEditableArray(uiBranch, schemaNode, fieldKey, arch)) {
			acc.modalArrayPaths.push(dotPath);
			const kind = modalKindForArrayField(fieldKey, arch);
			if (kind) acc.modalKindByPath[dotPath] = kind;
		}
	}

	if (schemaType === "object" && dotPath && arch) {
		if (isV2AnketaModalObjectArch(arch)) {
			acc.modalObjectPaths.push(dotPath);
			acc.modalKindByPath[dotPath] = modalKindForObjectArch(arch);
			const props = readRecord(schemaNode.properties);
			if (props) {
				for (const childKey of Object.keys(props)) {
					acc.bodyHiddenDotPaths.push(`${dotPath}.${childKey}`);
				}
			}
		}
		if (arch === "model") {
			const props = readRecord(schemaNode.properties);
			if (props) {
				for (const childKey of Object.keys(props)) {
					if (childKey !== "modelsList") {
						acc.bodyHiddenDotPaths.push(`${dotPath}.${childKey}`);
					}
				}
			}
		}
	}

	const childKeys = listOrderedPropertyKeys(schemaNode, uiBranch);
	for (const key of childKeys) {
		const childSchema = readRecord(readRecord(schemaNode.properties)?.[key]);
		const childUi = readRecord(uiBranch?.[key]);
		walkAnketaEditorUi(
			childSchema,
			childUi,
			pointer === "/" ? `/${key}` : `${pointer}/${key}`,
			acc,
		);
	}

	if (schemaType === "array") {
		const itemsSchema = readRecord(schemaNode.items);
		const itemsUi = readRecord(uiBranch?.items);
		if (itemsSchema?.properties) {
			for (const key of listOrderedPropertyKeys(itemsSchema, itemsUi)) {
				const childSchema = readRecord(
					readRecord(itemsSchema.properties)?.[key],
				);
				const childUi = readRecord(itemsUi?.[key]);
				walkAnketaEditorUi(
					childSchema,
					childUi,
					`${pointer}/items/${key}`,
					acc,
				);
			}
		}
	}
}

/** Обход jsonSchema + uiSchema: модалки, компактные таблицы, скрытые поля тела. */
export function resolveV2AnketaEditorBindings(
	jsonSchema: Record<string, unknown>,
	uiSchema: Record<string, unknown>,
): V2AnketaEditorBindings {
	const acc: WalkAcc = {
		modalArrayPaths: [],
		readonlyArrayTablePaths: [],
		modalObjectPaths: [],
		bodyHiddenDotPaths: [],
		modalKindByPath: {},
	};

	const root = readRecord(jsonSchema);
	const props = readRecord(root?.properties);
	if (props) {
		for (const key of listOrderedPropertyKeys(root!, uiSchema)) {
			walkAnketaEditorUi(
				readRecord(props[key]),
				readRecord(uiSchema[key]),
				`/${key}`,
				acc,
			);
		}
	}

	return {
		hiddenRootKeys: listV2AnketaHiddenRootKeys(uiSchema),
		...acc,
	};
}

export function modalKindForPathFromBindings(
	path: string,
	bindings: V2AnketaEditorBindings,
): V2AnketaModalKind | null {
	return bindings.modalKindByPath[path] ?? null;
}
