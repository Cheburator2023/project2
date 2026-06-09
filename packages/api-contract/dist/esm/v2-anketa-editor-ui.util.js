import { readV2AnketaSectionUiOptions, resolveV2AnketaArchComponent, } from "./v2-anketa-section-ui.util";
const MODAL_OBJECT_ARCH_COMPONENTS = [
    "modelService",
    "dataProcess",
    "dataMart",
];
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readUiOptions(uiNode) {
    return readRecord(readRecord(uiNode)?.["ui:options"]) ?? {};
}
function isUiReadonly(uiNode) {
    return readRecord(uiNode)?.["ui:readonly"] === true;
}
function readArrayToolbar(uiNode) {
    const opts = readUiOptions(uiNode);
    return {
        addable: typeof opts.addable === "boolean" ? opts.addable : undefined,
        removable: typeof opts.removable === "boolean" ? opts.removable : undefined,
    };
}
function resolveSchemaType(node) {
    if (!node)
        return undefined;
    const t = node.type;
    if (typeof t === "string")
        return t;
    if (Array.isArray(t)) {
        return t.find((x) => x !== "null");
    }
    if (node.properties)
        return "object";
    if (node.items)
        return "array";
    return undefined;
}
function pointerToDotPath(pointer) {
    return pointer.split("/").filter(Boolean).join(".");
}
function listOrderedPropertyKeys(schemaNode, uiBranch) {
    const props = readRecord(schemaNode.properties);
    const keys = props ? Object.keys(props) : [];
    const order = uiBranch?.["ui:order"];
    if (!Array.isArray(order))
        return keys;
    const seen = new Set();
    const result = [];
    for (const entry of order) {
        if (typeof entry === "string" && keys.includes(entry) && !seen.has(entry)) {
            result.push(entry);
            seen.add(entry);
        }
    }
    for (const key of keys) {
        if (!seen.has(key))
            result.push(key);
    }
    return result;
}
/** Скрытое поле/секция (ui:widget hidden, ui:hidden или ui:options.hidden). */
export function isV2AnketaHiddenUiNode(uiNode) {
    const node = readRecord(uiNode);
    if (!node)
        return false;
    if (node["ui:widget"] === "hidden" || node["ui:hidden"] === true)
        return true;
    return readV2AnketaSectionUiOptions(uiNode).hidden === true;
}
/** Метка на холсте конструктора: скрытая или системная (readonly-блок, panel). */
export function resolveV2AnketaCanvasUiKind(uiNode) {
    if (isV2AnketaHiddenUiNode(uiNode))
        return "hidden";
    if (readUiOptions(uiNode).layoutGroup === true)
        return "utility";
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (opts.sectionRole === "panel")
        return "utility";
    const node = readRecord(uiNode);
    if (isUiReadonly(uiNode) && Array.isArray(node?.["ui:order"])) {
        return "utility";
    }
    return null;
}
export function isV2AnketaModalObjectArch(arch) {
    return (arch !== null &&
        MODAL_OBJECT_ARCH_COMPONENTS.includes(arch));
}
/** Корневые поля анкеты, помеченные hidden в uiSchema. */
export function listV2AnketaHiddenRootKeys(uiSchema) {
    const order = uiSchema["ui:order"];
    const rootKeys = Array.isArray(order)
        ? order.filter((k) => typeof k === "string")
        : Object.keys(uiSchema).filter((k) => !k.startsWith("ui:"));
    const hidden = [];
    for (const key of rootKeys) {
        if (isV2AnketaHiddenUiNode(uiSchema[key]))
            hidden.push(key);
    }
    return hidden;
}
function isReadonlyGeneratedArray(uiNode, schemaNode) {
    if (isUiReadonly(uiNode))
        return true;
    if (schemaNode?.readOnly === true)
        return true;
    const { addable, removable } = readArrayToolbar(uiNode);
    return addable === false && removable === false;
}
function isModalEditableArray(uiNode, schemaNode, fieldKey, arch) {
    if (resolveSchemaType(schemaNode) !== "array")
        return false;
    if (isReadonlyGeneratedArray(uiNode, schemaNode))
        return false;
    if (arch === "sourceSystem" || arch === "atypicalWork")
        return true;
    if (fieldKey === "modelsList" ||
        fieldKey === "trainingSources" ||
        fieldKey === "applicationSources") {
        return true;
    }
    const { addable } = readArrayToolbar(uiNode);
    if (addable === true)
        return true;
    if (/[Aa]typical/.test(fieldKey) || fieldKey === "atypicalTasks") {
        return true;
    }
    return false;
}
function modalKindForArrayField(_fieldKey, _arch) {
    return "rjsfObject";
}
function modalKindForObjectArch(_arch) {
    return "rjsfObject";
}
function walkAnketaEditorUi(schemaNode, uiBranch, pointer, acc) {
    if (!schemaNode || pointer === "/")
        return;
    const dotPath = pointerToDotPath(pointer);
    const fieldKey = pointer.split("/").filter(Boolean).at(-1) ?? "";
    const arch = resolveV2AnketaArchComponent(uiBranch);
    const schemaType = resolveSchemaType(schemaNode);
    if (schemaType === "array" && dotPath) {
        if (isReadonlyGeneratedArray(uiBranch, schemaNode)) {
            acc.readonlyArrayTablePaths.push(dotPath);
        }
        else if (isModalEditableArray(uiBranch, schemaNode, fieldKey, arch)) {
            acc.modalArrayPaths.push(dotPath);
            const kind = modalKindForArrayField(fieldKey, arch);
            if (kind)
                acc.modalKindByPath[dotPath] = kind;
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
    }
    const childKeys = listOrderedPropertyKeys(schemaNode, uiBranch);
    for (const key of childKeys) {
        const childSchema = readRecord(readRecord(schemaNode.properties)?.[key]);
        const childUi = readRecord(uiBranch?.[key]);
        walkAnketaEditorUi(childSchema, childUi, pointer === "/" ? `/${key}` : `${pointer}/${key}`, acc);
    }
    if (schemaType === "array") {
        const itemsSchema = readRecord(schemaNode.items);
        const itemsUi = readRecord(uiBranch?.items);
        if (itemsSchema?.properties) {
            for (const key of listOrderedPropertyKeys(itemsSchema, itemsUi)) {
                const childSchema = readRecord(readRecord(itemsSchema.properties)?.[key]);
                const childUi = readRecord(itemsUi?.[key]);
                walkAnketaEditorUi(childSchema, childUi, `${pointer}/items/${key}`, acc);
            }
        }
    }
}
/** Обход jsonSchema + uiSchema: модалки, компактные таблицы, скрытые поля тела. */
export function resolveV2AnketaEditorBindings(jsonSchema, uiSchema) {
    const acc = {
        modalArrayPaths: [],
        readonlyArrayTablePaths: [],
        modalObjectPaths: [],
        bodyHiddenDotPaths: [],
        modalKindByPath: {},
    };
    const root = readRecord(jsonSchema);
    const props = readRecord(root?.properties);
    if (props) {
        for (const key of listOrderedPropertyKeys(root, uiSchema)) {
            walkAnketaEditorUi(readRecord(props[key]), readRecord(uiSchema[key]), `/${key}`, acc);
        }
    }
    return {
        hiddenRootKeys: listV2AnketaHiddenRootKeys(uiSchema),
        ...acc,
    };
}
export function modalKindForPathFromBindings(path, bindings) {
    return bindings.modalKindByPath[path] ?? null;
}
