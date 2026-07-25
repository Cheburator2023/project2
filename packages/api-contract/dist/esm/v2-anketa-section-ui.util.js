import { normalizeStreamBlockRoles, serializeStreamBlockRoles, } from "./v2-stream-block-role.util";
import { inferLegacyStreamBlockExecutorCode, normalizeStreamBlockExecutor, normalizeStreamBlockExecutors, resolveLogicStreamDbExecutor, resolveStreamBlockExecutorLabel, resolveStreamBlockExecutorsLabel, serializeStreamBlockExecutors, } from "./v2-stream-block-executor.util";
import { isV2ExecutorStreamLabel, resolveExecutorStreamAreaLabel, typicalWorkAssignedToExecutorStream, } from "./v2-executor-streams.util";
import { isV2ImplementationStreamCode } from "./v2-implementation-streams.util";
import { isV2ModelImplementationStreamCode, isV2ModelStreamUmbrellaLabel, V2_MODEL_IMPLEMENTATION_STREAM_CODES, V2_MODEL_STREAM_EXECUTOR, } from "./v2-model-stream-typical-works.constants";
import { V2_ANKETA_MAIN_SECTION_IDS, } from "./v2-anketa-workflow.types";
import { V2_ANKETA_MAIN_SECTION_TITLES, } from "./v2-anketa-workflow.util";
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
            const raw = opts.streamExecutor;
            const executors = normalizeStreamBlockExecutors(raw);
            if (executors.length > 0) {
                return serializeStreamBlockExecutors(executors);
            }
            /** Umbrella не нормализуется в код — сохраняем mother-label. */
            if (typeof raw === "string" && isV2ModelStreamUmbrellaLabel(raw)) {
                return V2_MODEL_STREAM_EXECUTOR;
            }
            return serializeStreamBlockExecutors(executors);
        })(),
        streamBlockRoles: (() => {
            const roles = normalizeStreamBlockRoles(opts.streamBlockRoles);
            return serializeStreamBlockRoles(roles);
        })(),
    };
}
export function readStreamBlockRolesFromSectionUi(uiNode) {
    return normalizeStreamBlockRoles(readV2AnketaSectionUiOptions(uiNode).streamBlockRoles);
}
export function readStreamExecutorsFromSectionUi(uiNode) {
    return normalizeStreamBlockExecutors(readV2AnketaSectionUiOptions(uiNode).streamExecutor);
}
/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
export function resolveV2AnketaStreamBlockOptions(uiNode, blockKey) {
    const opts = readV2AnketaSectionUiOptions(uiNode);
    if (opts.streamBlock === false) {
        return {
            streamBlock: false,
            streamExecutor: null,
            streamExecutors: [],
            streamBlockRoles: [],
        };
    }
    if (opts.streamBlock === true) {
        let streamExecutors = normalizeStreamBlockExecutors(opts.streamExecutor);
        /** Umbrella «Модельный стрим» не нормализуется в код — раскрываем в 5 дочерних. */
        if (streamExecutors.length === 0 &&
            typeof opts.streamExecutor === "string" &&
            isV2ModelStreamUmbrellaLabel(opts.streamExecutor)) {
            streamExecutors = [...V2_MODEL_IMPLEMENTATION_STREAM_CODES];
        }
        return {
            streamBlock: true,
            streamExecutors,
            streamExecutor: streamExecutors[0] ?? null,
            streamBlockRoles: normalizeStreamBlockRoles(opts.streamBlockRoles),
        };
    }
    const legacy = blockKey != null ? inferLegacyStreamBlockExecutorCode(blockKey) : null;
    if (legacy) {
        return {
            streamBlock: true,
            streamExecutors: [legacy],
            streamExecutor: legacy,
            streamBlockRoles: normalizeStreamBlockRoles(opts.streamBlockRoles),
        };
    }
    return {
        streamBlock: false,
        streamExecutor: null,
        streamExecutors: [],
        streamBlockRoles: [],
    };
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
    const codes = normalizeStreamBlockExecutors(trimmed);
    if (codes.length > 1) {
        return `Стрим «${resolveStreamBlockExecutorsLabel(codes)}»`;
    }
    if (isV2ImplementationStreamCode(trimmed) || normalizeStreamBlockExecutor(trimmed)) {
        return `Стрим «${resolveStreamBlockExecutorLabel(trimmed)}»`;
    }
    if (isV2ExecutorStreamLabel(trimmed)) {
        return `Стрим «${trimmed}»`;
    }
    return `${V2_STREAM_BLOCK_TITLE_PREFIX}${trimmed}`;
}
export function formatV2StreamBlockSectionTitleFromExecutors(executors) {
    if (executors.length === 0)
        return "Стрим";
    const label = resolveStreamBlockExecutorsLabel(executors);
    return label ? `Стрим «${label}»` : "Стрим";
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
    const executors = streamOpts.streamExecutors;
    if (executors.length > 0 && (!trimmed || trimmed === executor)) {
        return formatV2StreamBlockSectionTitleFromExecutors(executors);
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
        const { streamBlock, streamExecutors } = resolveV2AnketaStreamBlockOptions(branch, blockKey);
        if (streamBlock && streamExecutors.length > 0) {
            blocks.push({
                blockKey,
                pointer: `/${blockKey}`,
                streamExecutors,
                streamExecutor: streamExecutors[0],
            });
        }
    }
    return blocks;
}
export function collectPresentExecutorStreamLabels(uiSchema) {
    return new Set(collectExecutorStreamBlocks(uiSchema).flatMap((block) => block.streamExecutors));
}
/** Есть ли в конструкторе корневой streamBlock для стрима (код или legacy-имя БД). */
export function isExecutorStreamPresentInSchema(uiSchema, stream, catalog) {
    const trimmed = stream.trim();
    if (!trimmed)
        return false;
    const present = collectPresentExecutorStreamLabels(uiSchema);
    if (isV2ModelStreamUmbrellaLabel(trimmed)) {
        return V2_MODEL_IMPLEMENTATION_STREAM_CODES.some((code) => present.has(code));
    }
    const streamCode = normalizeStreamBlockExecutor(trimmed, catalog);
    if (streamCode && present.has(streamCode))
        return true;
    for (const code of present) {
        if (typicalWorkAssignedToExecutorStream([trimmed], code, catalog)) {
            return true;
        }
    }
    const area = resolveExecutorStreamAreaLabel(trimmed);
    const areaCode = normalizeStreamBlockExecutor(area, catalog);
    return areaCode != null && present.has(areaCode);
}
/** Pointer корневого umbrella / model-stream блока (detailInfo и т.п.). */
export function resolveModelStreamUmbrellaBlockPointer(uiSchema) {
    const root = readRecord(uiSchema);
    if (!root)
        return null;
    for (const blockKey of Object.keys(root)) {
        if (blockKey.startsWith("ui:"))
            continue;
        const branch = readRecord(root[blockKey]);
        const opts = readV2AnketaSectionUiOptions(branch);
        if (opts.streamBlock === true &&
            typeof opts.streamExecutor === "string" &&
            isV2ModelStreamUmbrellaLabel(opts.streamExecutor)) {
            return `/${blockKey}`;
        }
    }
    for (const block of collectExecutorStreamBlocks(uiSchema)) {
        if (block.streamExecutors.some((code) => isV2ModelImplementationStreamCode(code))) {
            return block.pointer;
        }
    }
    return null;
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
 * Стримы-исполнители для блока typicalWork: явный ui:options.streamExecutor,
 * иначе стримы корневого streamBlock по пути вывода.
 */
export function resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
    const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
    const explicit = normalizeStreamBlockExecutors(readV2AnketaSectionUiOptions(leaf).streamExecutor);
    if (explicit.length > 0)
        return explicit;
    const rootKey = outputPath.split(".")[0]?.trim();
    if (!rootKey)
        return [];
    const rootBranch = readRecord(readRecord(uiSchema)?.[rootKey]);
    return resolveV2AnketaStreamBlockOptions(rootBranch, rootKey).streamExecutors;
}
/** Первый стрим-исполнитель для блока typicalWork (legacy single-stream API). */
export function resolvePrimaryStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
    return (resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath)[0] ??
        null);
}
/**
 * Подпись стрима для UI / worksCatalogStream:
 * сохраняет legacy «Модельный стрим» и мапит коды implementationStream в имена БД.
 */
export function resolveTypicalWorkCatalogStreamLabel(uiSchema, outputPath) {
    if (!uiSchema)
        return null;
    const collectRaw = (path) => {
        const branch = readUiBranchAtDotPath(uiSchema, path);
        const raw = readRecord(branch?.["ui:options"])?.streamExecutor;
        if (typeof raw === "string")
            return raw.trim() ? [raw.trim()] : [];
        if (!Array.isArray(raw))
            return [];
        return raw
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
    };
    const candidates = [
        ...collectRaw(outputPath),
        ...collectRaw(outputPath.split(".")[0] ?? ""),
    ];
    for (const candidate of candidates) {
        if (candidate === V2_MODEL_STREAM_EXECUTOR ||
            candidate === "Модельные стримы") {
            return V2_MODEL_STREAM_EXECUTOR;
        }
    }
    const primary = resolvePrimaryStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath);
    if (primary)
        return resolveLogicStreamDbExecutor(primary);
    return candidates[0] ?? null;
}
/** Роли платформы для блока typicalWork: явные ui:options.streamBlockRoles или корневой streamBlock. */
export function resolveStreamBlockRolesForTypicalWorkOutputPath(uiSchema, outputPath) {
    const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
    const explicit = normalizeStreamBlockRoles(readV2AnketaSectionUiOptions(leaf).streamBlockRoles);
    if (explicit.length > 0)
        return explicit;
    const rootKey = outputPath.split(".")[0]?.trim();
    if (!rootKey)
        return [];
    return resolveV2AnketaStreamBlockOptions(readRecord(readRecord(uiSchema)?.[rootKey]), rootKey).streamBlockRoles;
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
            inferLegacyStreamBlockExecutorCode(root)) {
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
function readUiRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
/**
 * Обязательные цели workflow для кнопки «Завершить заполнение анкеты»:
 * корневые секции uiSchema с привязкой к workflow (main/panel),
 * кроме деактивированных `groupActivatable` групп.
 */
export function collectRequiredWorkflowTargets(uiSchema, formData) {
    const root = readUiRecord(uiSchema);
    if (!root)
        return [];
    const activation = readUiRecord(formData?.groupActivation) ?? {};
    const out = [];
    const seen = new Set();
    for (const key of Object.keys(root)) {
        if (key.startsWith("ui:"))
            continue;
        const node = root[key];
        const opts = readV2AnketaSectionUiOptions(node);
        if (opts.groupActivatable) {
            const active = key in activation
                ? activation[key] === true
                : opts.groupActive !== false;
            if (!active)
                continue;
        }
        const binding = resolveAnketaSectionWorkflowBinding(key, opts);
        if (binding.kind === "none")
            continue;
        const dedupeKey = binding.kind === "main"
            ? `main:${binding.sectionId}`
            : `panel:${binding.pathKey}`;
        if (seen.has(dedupeKey))
            continue;
        seen.add(dedupeKey);
        out.push(binding);
    }
    return out;
}
export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
