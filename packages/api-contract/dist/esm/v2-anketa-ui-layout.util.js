import { V2_ANKETA_MAIN_SECTION_IDS } from "./v2-anketa-workflow.types";
import { V2_ANKETA_STREAM_SECTION_IDS } from "./v2-anketa-section-ui.util";
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readSchemaProperties(schemaNode) {
    const node = readRecord(schemaNode);
    const props = readRecord(node?.properties);
    return props ?? {};
}
function readSchemaType(schemaNode) {
    const node = readRecord(schemaNode);
    const type = node?.type;
    if (typeof type === "string")
        return type;
    if (Array.isArray(type)) {
        const nonNull = type.find((t) => t !== "null");
        return typeof nonNull === "string" ? nonNull : undefined;
    }
    return node?.properties ? "object" : undefined;
}
function ensureUiNode(ui, segments) {
    let cur = ui;
    for (const seg of segments) {
        const prev = readRecord(cur[seg]) ?? {};
        cur[seg] = prev;
        cur = prev;
    }
    return cur;
}
function mergeUiOptions(node, patch) {
    const prev = readRecord(node["ui:options"]) ?? {};
    node["ui:options"] = { ...prev, ...patch };
}
/**
 * Проставляет layout-метаданные (`ui:options.sectionRole`, defaultExpanded, …)
 * по структуре jsonSchema (заводская схема и кастомные шаблоны).
 */
export function enrichAnketaLayoutUiSchema(uiSchema, jsonSchema) {
    const ui = structuredClone(uiSchema);
    const rootProps = readSchemaProperties(jsonSchema);
    for (const sectionId of V2_ANKETA_MAIN_SECTION_IDS) {
        if (!rootProps[sectionId])
            continue;
        const node = ensureUiNode(ui, [sectionId]);
        mergeUiOptions(node, {
            sectionRole: "main",
            workflowSectionId: sectionId,
            defaultExpanded: sectionId === V2_ANKETA_MAIN_SECTION_IDS[0],
            ...(sectionId === "detailInfo" ? { titleVariant: "h5" } : {}),
        });
    }
    for (const streamId of V2_ANKETA_STREAM_SECTION_IDS) {
        if (!rootProps[streamId])
            continue;
        const streamProps = readSchemaProperties(rootProps[streamId]);
        for (const [key, childSchema] of Object.entries(streamProps)) {
            if (readSchemaType(childSchema) !== "object")
                continue;
            const node = ensureUiNode(ui, [streamId, key]);
            mergeUiOptions(node, {
                sectionRole: "subsection",
                showFilledCount: true,
            });
        }
    }
    return ui;
}
