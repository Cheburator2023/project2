import { inferLegacyStreamExecutorForBlockKey, isV2ExecutorStreamLabel, resolveExecutorStreamAreaLabel, } from "./v2-executor-streams.util";
import { V2_ANKETA_MAIN_SECTION_IDS, } from "./v2-anketa-workflow.types";
import { V2_ANKETA_MAIN_SECTION_TITLES } from "./v2-anketa-workflow.util";
export const V2_ANKETA_SECTION_ROLE_VALUES = [
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
export const V2_ARCH_COMPONENT_TYPES = [
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
export const V2_ARCH_COMPONENT_LABELS = {
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
export function isV2ArchComponentType(value) {
    return (typeof value === "string" &&
        V2_ARCH_COMPONENT_TYPES.includes(value));
}
const STREAM_SECTION_IDS = V2_ANKETA_MAIN_SECTION_IDS.filter((id) => id.startsWith("stream"));
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
export function readV2AnketaSectionUiOptions(uiNode) {
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
            return isV2ExecutorStreamLabel(trimmed) ? trimmed : undefined;
        })(),
    };
}
/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
export function resolveV2AnketaStreamBlockOptions(uiNode, blockKey) {
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
    const legacy = blockKey != null ? inferLegacyStreamExecutorForBlockKey(blockKey) : null;
    if (legacy) {
        return { streamBlock: true, streamExecutor: legacy };
    }
    return { streamBlock: false, streamExecutor: null };
}
export function isV2AnketaStreamBlockRoot(uiNode, blockKey) {
    return resolveV2AnketaStreamBlockOptions(uiNode, blockKey).streamBlock;
}
export const V2_STREAM_BLOCK_TITLE_PREFIX = "Стрим ";
/** Уже оформленный заголовок стрима (заводской снепшот: «Стрим «…»», новый: «Стрим …»). */
export function hasV2StreamBlockTitlePrefix(title) {
    const trimmed = title.trim();
    return /^Стрим(\s|«)/u.test(trimmed) || trimmed === "Стрим";
}
/** Заголовок стримового object-блока (идемпотентно, в стиле заводского снепшота). */
export function formatV2StreamBlockSectionTitle(baseTitle) {
    const trimmed = baseTitle.trim();
    if (!trimmed)
        return "Стрим";
    if (hasV2StreamBlockTitlePrefix(trimmed))
        return trimmed;
    if (isV2ExecutorStreamLabel(trimmed)) {
        return `Стрим «${trimmed}»`;
    }
    return `${V2_STREAM_BLOCK_TITLE_PREFIX}${trimmed}`;
}
/** Заголовок секции с учётом streamBlock (явный, legacy stream* / field_* ключ). */
export function resolveV2AnketaSectionDisplayTitle(baseTitle, uiNode, blockKey) {
    const streamOpts = resolveV2AnketaStreamBlockOptions(uiNode, blockKey);
    if (!streamOpts.streamBlock)
        return baseTitle;
    const trimmed = baseTitle.trim();
    if (hasV2StreamBlockTitlePrefix(trimmed))
        return trimmed;
    if (blockKey &&
        V2_ANKETA_MAIN_SECTION_IDS.includes(blockKey)) {
        const canonical = V2_ANKETA_MAIN_SECTION_TITLES[blockKey];
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
export function collectExecutorStreamBlocks(uiSchema) {
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
export function collectPresentExecutorStreamLabels(uiSchema) {
    return new Set(collectExecutorStreamBlocks(uiSchema).map((block) => block.streamExecutor));
}
/** Есть ли в конструкторе корневой streamBlock для стрима (legacy-имена БД → область UI). */
export function isExecutorStreamPresentInSchema(uiSchema, stream) {
    const area = resolveExecutorStreamAreaLabel(stream);
    const present = collectPresentExecutorStreamLabels(uiSchema);
    return ((isV2ExecutorStreamLabel(stream) && present.has(stream)) ||
        (isV2ExecutorStreamLabel(area) && present.has(area)));
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
export function resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
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
export function resolveV2AnketaArchComponent(uiNode) {
    return readV2AnketaSectionUiOptions(uiNode).archComponent ?? null;
}
function isSectionRole(value) {
    return (typeof value === "string" &&
        V2_ANKETA_SECTION_ROLE_VALUES.includes(value));
}
export function isV2AnketaMainSectionId(value) {
    return V2_ANKETA_MAIN_SECTION_IDS.includes(value);
}
function isMainSectionId(value) {
    return typeof value === "string" && isV2AnketaMainSectionId(value);
}
export function isV2AnketaStreamSectionId(value) {
    return STREAM_SECTION_IDS.includes(value);
}
const MODAL_OBJECT_ARCH_TYPES = [
    "modelService",
    "dataProcess",
    "dataMart",
];
/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
export function resolveV2AnketaSectionRole(uiNode, path) {
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
            inferLegacyStreamExecutorForBlockKey(root)) {
            return "subsection";
        }
    }
    if (path.length === 1)
        return "panel";
    return "flat";
}
export function resolveV2AnketaDefaultExpanded(uiNode, path, role) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (typeof opts.defaultExpanded === "boolean")
        return opts.defaultExpanded;
    if (role === "main") {
        return path[0] === V2_ANKETA_MAIN_SECTION_IDS[0];
    }
    if (role === "panel")
        return true;
    return true;
}
export function resolveV2AnketaWorkflowSectionId(uiNode, path) {
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
export function resolveAnketaSectionWorkflowBinding(pathKey, uiOptions) {
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
export function resolveV2AnketaSectionTitleVariant(uiNode, fallback = "h6") {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    return opts.titleVariant ?? fallback;
}
export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
