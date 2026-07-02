import { inferLegacyStreamExecutorForBlockKey, isV2ExecutorStreamLabel, } from "./v2-executor-streams.util";
import { V2_ANKETA_MAIN_SECTION_IDS, } from "./v2-anketa-workflow.types";
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
export function resolveV2AnketaSectionTitleVariant(uiNode, fallback = "h6") {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    return opts.titleVariant ?? fallback;
}
export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
