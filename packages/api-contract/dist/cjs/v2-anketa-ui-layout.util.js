"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichAnketaLayoutUiSchema = enrichAnketaLayoutUiSchema;
const v2_anketa_workflow_types_1 = require("./v2-anketa-workflow.types");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
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
function enrichAnketaLayoutUiSchema(uiSchema, jsonSchema) {
    const ui = structuredClone(uiSchema);
    const rootProps = readSchemaProperties(jsonSchema);
    for (const sectionId of v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS) {
        if (!rootProps[sectionId])
            continue;
        const node = ensureUiNode(ui, [sectionId]);
        mergeUiOptions(node, {
            sectionRole: "main",
            workflowSectionId: sectionId,
            defaultExpanded: sectionId === v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS[0],
            ...(sectionId === "detailInfo" ? { titleVariant: "h5" } : {}),
        });
    }
    for (const streamId of v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.filter((id) => id.startsWith("stream"))) {
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
    for (const [blockKey, blockSchema] of Object.entries(rootProps)) {
        if (readSchemaType(blockSchema) !== "object")
            continue;
        const blockUi = ensureUiNode(ui, [blockKey]);
        const streamBlock = (0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(blockUi, blockKey);
        if (!streamBlock.streamBlock)
            continue;
        mergeUiOptions(blockUi, {
            streamBlock: true,
            ...(streamBlock.streamExecutor
                ? { streamExecutor: streamBlock.streamExecutor }
                : {}),
        });
        const blockOpts = (0, v2_anketa_section_ui_util_1.readV2AnketaSectionUiOptions)(blockUi);
        if (blockOpts.workflowSectionId &&
            blockKey !== blockOpts.workflowSectionId) {
            const uiOpts = readRecord(blockUi["ui:options"]) ?? {};
            delete uiOpts.workflowSectionId;
            blockUi["ui:options"] = uiOpts;
        }
        const blockProps = readSchemaProperties(blockSchema);
        for (const [key, childSchema] of Object.entries(blockProps)) {
            if (readSchemaType(childSchema) !== "object")
                continue;
            const node = ensureUiNode(ui, [blockKey, key]);
            mergeUiOptions(node, {
                sectionRole: "subsection",
                showFilledCount: true,
            });
        }
    }
    return ui;
}
