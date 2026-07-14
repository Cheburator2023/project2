"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_STREAM_SECTION_IDS = exports.V2_STREAM_BLOCK_TITLE_PREFIX = exports.V2_ARCH_COMPONENT_LABELS = exports.V2_ARCH_COMPONENT_TYPES = exports.V2_ANKETA_SECTION_ROLE_VALUES = void 0;
exports.isV2ArchComponentType = isV2ArchComponentType;
exports.readV2AnketaSectionUiOptions = readV2AnketaSectionUiOptions;
exports.resolveV2AnketaStreamBlockOptions = resolveV2AnketaStreamBlockOptions;
exports.isV2AnketaStreamBlockRoot = isV2AnketaStreamBlockRoot;
exports.hasV2StreamBlockTitlePrefix = hasV2StreamBlockTitlePrefix;
exports.formatV2StreamBlockSectionTitle = formatV2StreamBlockSectionTitle;
exports.resolveV2AnketaSectionDisplayTitle = resolveV2AnketaSectionDisplayTitle;
exports.collectExecutorStreamBlocks = collectExecutorStreamBlocks;
exports.collectPresentExecutorStreamLabels = collectPresentExecutorStreamLabels;
exports.isExecutorStreamPresentInSchema = isExecutorStreamPresentInSchema;
exports.resolveStreamExecutorForTypicalWorkOutputPath = resolveStreamExecutorForTypicalWorkOutputPath;
exports.resolveV2AnketaArchComponent = resolveV2AnketaArchComponent;
exports.isV2AnketaMainSectionId = isV2AnketaMainSectionId;
exports.isV2AnketaStreamSectionId = isV2AnketaStreamSectionId;
exports.resolveV2AnketaSectionRole = resolveV2AnketaSectionRole;
exports.resolveV2AnketaDefaultExpanded = resolveV2AnketaDefaultExpanded;
exports.resolveV2AnketaWorkflowSectionId = resolveV2AnketaWorkflowSectionId;
exports.resolveAnketaSectionWorkflowBinding = resolveAnketaSectionWorkflowBinding;
exports.resolveV2AnketaSectionTitleVariant = resolveV2AnketaSectionTitleVariant;
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
const v2_anketa_workflow_types_1 = require("./v2-anketa-workflow.types");
const v2_anketa_workflow_util_1 = require("./v2-anketa-workflow.util");
exports.V2_ANKETA_SECTION_ROLE_VALUES = [
    "main",
    "subsection",
    "panel",
    "flat",
];
/**
 * Архитектурные компоненты (глоссарий, §3.4) — типовые структурные элементы
 * функциональных областей анкеты. Состав фиксирован, но расширяем.
 * Параметры арх. компонента одновременно являются триггерами генерации
 * типовых работ из справочника.
 */
exports.V2_ARCH_COMPONENT_TYPES = [
    "modelService",
    "model",
    "sourceSystem",
    "dataMart",
    "dataProcess",
    "deployChannel",
    "modelControl",
    "typicalWork",
    "atypicalWork",
];
/** Человекочитаемые названия арх. компонентов (из глоссария). */
exports.V2_ARCH_COMPONENT_LABELS = {
    modelService: "Модельный сервис",
    model: "Модели",
    sourceSystem: "Система-источник",
    dataMart: "Объект / Витрина данных",
    dataProcess: "Процесс обработки данных",
    deployChannel: "Канал внедрения",
    modelControl: "Контроль модели",
    typicalWork: "Типовые работы",
    atypicalWork: "Нетиповые работы",
};
function isV2ArchComponentType(value) {
    return (typeof value === "string" &&
        exports.V2_ARCH_COMPONENT_TYPES.includes(value));
}
const STREAM_SECTION_IDS = v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.filter((id) => id.startsWith("stream"));
exports.V2_ANKETA_STREAM_SECTION_IDS = STREAM_SECTION_IDS;
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readV2AnketaSectionUiOptions(uiNode) {
    const node = readRecord(uiNode);
    const opts = readRecord(node?.["ui:options"]);
    if (!opts)
        return {};
    return {
        sectionRole: isSectionRole(opts.sectionRole)
            ? opts.sectionRole
            : undefined,
        defaultExpanded: typeof opts.defaultExpanded === "boolean"
            ? opts.defaultExpanded
            : undefined,
        workflowSectionId: isMainSectionId(opts.workflowSectionId)
            ? opts.workflowSectionId
            : undefined,
        showFilledCount: typeof opts.showFilledCount === "boolean"
            ? opts.showFilledCount
            : undefined,
        titleVariant: opts.titleVariant === "h5" || opts.titleVariant === "h6"
            ? opts.titleVariant
            : undefined,
        sectionCaption: typeof opts.sectionCaption === "string" && opts.sectionCaption.trim()
            ? opts.sectionCaption.trim()
            : undefined,
        hidden: opts.hidden === true ? true : undefined,
        archComponent: isV2ArchComponentType(opts.archComponent)
            ? opts.archComponent
            : undefined,
        groupActivatable: opts.groupActivatable === true ? true : undefined,
        groupActive: typeof opts.groupActive === "boolean" ? opts.groupActive : undefined,
        hideTitle: opts.layoutGroup === true
            ? opts.hideTitle !== false
            : opts.hideTitle === true
                ? true
                : undefined,
        streamBlock: opts.streamBlock === true
            ? true
            : opts.streamBlock === false
                ? false
                : undefined,
        streamExecutor: (() => {
            if (typeof opts.streamExecutor !== "string")
                return undefined;
            const trimmed = opts.streamExecutor.trim();
            return (0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(trimmed) ? trimmed : undefined;
        })(),
    };
}
/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
function resolveV2AnketaStreamBlockOptions(uiNode, blockKey) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (opts.streamBlock === false) {
        return { streamBlock: false, streamExecutor: null };
    }
    if (opts.streamBlock === true) {
        return {
            streamBlock: true,
            streamExecutor: opts.streamExecutor ?? null,
        };
    }
    const legacy = blockKey != null ? (0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)(blockKey) : null;
    if (legacy) {
        return { streamBlock: true, streamExecutor: legacy };
    }
    return { streamBlock: false, streamExecutor: null };
}
function isV2AnketaStreamBlockRoot(uiNode, blockKey) {
    return resolveV2AnketaStreamBlockOptions(uiNode, blockKey).streamBlock;
}
exports.V2_STREAM_BLOCK_TITLE_PREFIX = "Стрим ";
/** Уже оформленный заголовок стрима (заводской снепшот: «Стрим «…»», новый: «Стрим …»). */
function hasV2StreamBlockTitlePrefix(title) {
    const trimmed = title.trim();
    return /^Стрим(\s|«)/u.test(trimmed) || trimmed === "Стрим";
}
/** Заголовок стримового object-блока (идемпотентно, в стиле заводского снепшота). */
function formatV2StreamBlockSectionTitle(baseTitle) {
    const trimmed = baseTitle.trim();
    if (!trimmed)
        return "Стрим";
    if (hasV2StreamBlockTitlePrefix(trimmed))
        return trimmed;
    if ((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(trimmed)) {
        return `Стрим «${trimmed}»`;
    }
    return `${exports.V2_STREAM_BLOCK_TITLE_PREFIX}${trimmed}`;
}
/** Заголовок секции с учётом streamBlock (явный, legacy stream* / field_* ключ). */
function resolveV2AnketaSectionDisplayTitle(baseTitle, uiNode, blockKey) {
    const streamOpts = resolveV2AnketaStreamBlockOptions(uiNode, blockKey);
    if (!streamOpts.streamBlock)
        return baseTitle;
    const trimmed = baseTitle.trim();
    if (hasV2StreamBlockTitlePrefix(trimmed))
        return trimmed;
    if (blockKey &&
        v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.includes(blockKey)) {
        const canonical = v2_anketa_workflow_util_1.V2_ANKETA_MAIN_SECTION_TITLES[blockKey];
        if (canonical)
            return canonical;
    }
    const executor = streamOpts.streamExecutor;
    if (executor && (!trimmed || trimmed === executor)) {
        return formatV2StreamBlockSectionTitle(executor);
    }
    return formatV2StreamBlockSectionTitle(trimmed || executor || baseTitle);
}
/** Корневые стримовые блоки анкеты из uiSchema. */
function collectExecutorStreamBlocks(uiSchema) {
    const root = readRecord(uiSchema);
    if (!root)
        return [];
    const blocks = [];
    for (const blockKey of Object.keys(root)) {
        if (blockKey.startsWith("ui:"))
            continue;
        const branch = readRecord(root[blockKey]);
        const { streamBlock, streamExecutor } = resolveV2AnketaStreamBlockOptions(branch, blockKey);
        if (streamBlock && streamExecutor) {
            blocks.push({
                blockKey,
                pointer: `/${blockKey}`,
                streamExecutor,
            });
        }
    }
    return blocks;
}
function collectPresentExecutorStreamLabels(uiSchema) {
    return new Set(collectExecutorStreamBlocks(uiSchema).map((block) => block.streamExecutor));
}
/** Есть ли в конструкторе корневой streamBlock для стрима (legacy-имена БД → область UI). */
function isExecutorStreamPresentInSchema(uiSchema, stream) {
    const area = (0, v2_executor_streams_util_1.resolveExecutorStreamAreaLabel)(stream);
    const present = collectPresentExecutorStreamLabels(uiSchema);
    return (((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(stream) && present.has(stream)) ||
        ((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(area) && present.has(area)));
}
function readUiBranchAtDotPath(uiSchema, dotPath) {
    const segments = dotPath.split(".").filter(Boolean);
    let cur = uiSchema;
    for (const segment of segments) {
        const branch = readRecord(cur);
        if (!branch || !(segment in branch))
            return undefined;
        cur = branch[segment];
    }
    return readRecord(cur);
}
/**
 * Стрим-исполнитель для блока typicalWork: явный ui:options.streamExecutor,
 * иначе стрим корневого streamBlock по пути вывода.
 */
function resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
    const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
    const explicit = readV2AnketaSectionUiOptions(leaf).streamExecutor;
    if (explicit)
        return explicit;
    const rootKey = outputPath.split(".")[0]?.trim();
    if (!rootKey)
        return null;
    const rootBranch = readRecord(readRecord(uiSchema)?.[rootKey]);
    const { streamExecutor } = resolveV2AnketaStreamBlockOptions(rootBranch, rootKey);
    return streamExecutor;
}
/** Тип арх. компонента секции из ui:options, либо null. */
function resolveV2AnketaArchComponent(uiNode) {
    return readV2AnketaSectionUiOptions(uiNode).archComponent ?? null;
}
function isSectionRole(value) {
    return (typeof value === "string" &&
        exports.V2_ANKETA_SECTION_ROLE_VALUES.includes(value));
}
function isV2AnketaMainSectionId(value) {
    return v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.includes(value);
}
function isMainSectionId(value) {
    return typeof value === "string" && isV2AnketaMainSectionId(value);
}
function isV2AnketaStreamSectionId(value) {
    return STREAM_SECTION_IDS.includes(value);
}
const MODAL_OBJECT_ARCH_TYPES = [
    "modelService",
    "dataProcess",
    "dataMart",
];
/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
function resolveV2AnketaSectionRole(uiNode, path) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (opts.sectionRole)
        return opts.sectionRole;
    if (opts.archComponent &&
        (MODAL_OBJECT_ARCH_TYPES.includes(opts.archComponent) ||
            opts.archComponent === "model")) {
        return "subsection";
    }
    const root = path[0] ?? "";
    if (path.length === 1 && isV2AnketaMainSectionId(root))
        return "main";
    if (path.length === 2) {
        if (isV2AnketaStreamSectionId(root) ||
            (0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)(root)) {
            return "subsection";
        }
    }
    if (path.length === 1)
        return "panel";
    return "flat";
}
function resolveV2AnketaDefaultExpanded(uiNode, path, role) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (typeof opts.defaultExpanded === "boolean")
        return opts.defaultExpanded;
    if (role === "main") {
        return path[0] === v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS[0];
    }
    if (role === "panel")
        return true;
    return true;
}
function resolveV2AnketaWorkflowSectionId(uiNode, path) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (opts.workflowSectionId)
        return opts.workflowSectionId;
    const root = path[0] ?? "";
    return path.length === 1 && isV2AnketaMainSectionId(root) ? root : null;
}
/**
 * Привязка секции к workflow: канонические корневые разделы — `workflow.sections`,
 * кастомные streamBlock / скопированные панели — `workflow.panelSections[pathKey]`.
 * Явный `workflowSectionId`, не совпадающий с ключом блока, игнорируется.
 */
function resolveAnketaSectionWorkflowBinding(pathKey, uiOptions) {
    const trimmed = pathKey.trim();
    if (!trimmed)
        return { kind: "none" };
    const rootKey = trimmed.split(".")[0] ?? "";
    if (trimmed === rootKey && isV2AnketaMainSectionId(rootKey)) {
        return { kind: "main", sectionId: rootKey };
    }
    const panelWorkflowEligible = uiOptions.streamBlock === true ||
        uiOptions.groupActivatable === true ||
        uiOptions.sectionRole === "main";
    if (panelWorkflowEligible) {
        return { kind: "panel", pathKey: trimmed };
    }
    if (uiOptions.workflowSectionId &&
        trimmed === uiOptions.workflowSectionId) {
        return { kind: "main", sectionId: uiOptions.workflowSectionId };
    }
    return { kind: "none" };
}
function resolveV2AnketaSectionTitleVariant(uiNode, fallback = "h6") {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    return opts.titleVariant ?? fallback;
}
