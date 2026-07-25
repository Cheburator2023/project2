"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_STREAM_SECTION_IDS = exports.V2_STREAM_BLOCK_TITLE_PREFIX = exports.V2_ARCH_COMPONENT_LABELS = exports.V2_ARCH_COMPONENT_TYPES = exports.V2_ANKETA_SECTION_ROLE_VALUES = void 0;
exports.isV2ArchComponentType = isV2ArchComponentType;
exports.readV2AnketaSectionUiOptions = readV2AnketaSectionUiOptions;
exports.readStreamBlockRolesFromSectionUi = readStreamBlockRolesFromSectionUi;
exports.readStreamExecutorsFromSectionUi = readStreamExecutorsFromSectionUi;
exports.resolveV2AnketaStreamBlockOptions = resolveV2AnketaStreamBlockOptions;
exports.isV2AnketaStreamBlockRoot = isV2AnketaStreamBlockRoot;
exports.hasV2StreamBlockTitlePrefix = hasV2StreamBlockTitlePrefix;
exports.formatV2StreamBlockSectionTitle = formatV2StreamBlockSectionTitle;
exports.formatV2StreamBlockSectionTitleFromExecutors = formatV2StreamBlockSectionTitleFromExecutors;
exports.resolveV2AnketaSectionDisplayTitle = resolveV2AnketaSectionDisplayTitle;
exports.collectExecutorStreamBlocks = collectExecutorStreamBlocks;
exports.collectPresentExecutorStreamLabels = collectPresentExecutorStreamLabels;
exports.isExecutorStreamPresentInSchema = isExecutorStreamPresentInSchema;
exports.resolveModelStreamUmbrellaBlockPointer = resolveModelStreamUmbrellaBlockPointer;
exports.resolveStreamExecutorForTypicalWorkOutputPath = resolveStreamExecutorForTypicalWorkOutputPath;
exports.resolvePrimaryStreamExecutorForTypicalWorkOutputPath = resolvePrimaryStreamExecutorForTypicalWorkOutputPath;
exports.resolveTypicalWorkCatalogStreamLabel = resolveTypicalWorkCatalogStreamLabel;
exports.resolveStreamBlockRolesForTypicalWorkOutputPath = resolveStreamBlockRolesForTypicalWorkOutputPath;
exports.resolveV2AnketaArchComponent = resolveV2AnketaArchComponent;
exports.isV2AnketaMainSectionId = isV2AnketaMainSectionId;
exports.isV2AnketaStreamSectionId = isV2AnketaStreamSectionId;
exports.resolveV2AnketaSectionRole = resolveV2AnketaSectionRole;
exports.resolveV2AnketaDefaultExpanded = resolveV2AnketaDefaultExpanded;
exports.resolveV2AnketaWorkflowSectionId = resolveV2AnketaWorkflowSectionId;
exports.resolveAnketaSectionWorkflowBinding = resolveAnketaSectionWorkflowBinding;
exports.resolveV2AnketaSectionTitleVariant = resolveV2AnketaSectionTitleVariant;
exports.collectRequiredWorkflowTargets = collectRequiredWorkflowTargets;
const v2_stream_block_role_util_1 = require("./v2-stream-block-role.util");
const v2_stream_block_executor_util_1 = require("./v2-stream-block-executor.util");
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
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
            const raw = opts.streamExecutor;
            const executors = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(raw);
            if (executors.length > 0) {
                return (0, v2_stream_block_executor_util_1.serializeStreamBlockExecutors)(executors);
            }
            /** Umbrella не нормализуется в код — сохраняем mother-label. */
            if (typeof raw === "string" && (0, v2_model_stream_typical_works_constants_1.isV2ModelStreamUmbrellaLabel)(raw)) {
                return v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR;
            }
            return (0, v2_stream_block_executor_util_1.serializeStreamBlockExecutors)(executors);
        })(),
        streamBlockRoles: (() => {
            const roles = (0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(opts.streamBlockRoles);
            return (0, v2_stream_block_role_util_1.serializeStreamBlockRoles)(roles);
        })(),
    };
}
function readStreamBlockRolesFromSectionUi(uiNode) {
    return (0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(readV2AnketaSectionUiOptions(uiNode).streamBlockRoles);
}
function readStreamExecutorsFromSectionUi(uiNode) {
    return (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(readV2AnketaSectionUiOptions(uiNode).streamExecutor);
}
/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
function resolveV2AnketaStreamBlockOptions(uiNode, blockKey) {
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
        let streamExecutors = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(opts.streamExecutor);
        /** Umbrella «Модельный стрим» не нормализуется в код — раскрываем в 5 дочерних. */
        if (streamExecutors.length === 0 &&
            typeof opts.streamExecutor === "string" &&
            (0, v2_model_stream_typical_works_constants_1.isV2ModelStreamUmbrellaLabel)(opts.streamExecutor)) {
            streamExecutors = [...v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES];
        }
        return {
            streamBlock: true,
            streamExecutors,
            streamExecutor: streamExecutors[0] ?? null,
            streamBlockRoles: (0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(opts.streamBlockRoles),
        };
    }
    const legacy = blockKey != null ? (0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)(blockKey) : null;
    if (legacy) {
        return {
            streamBlock: true,
            streamExecutors: [legacy],
            streamExecutor: legacy,
            streamBlockRoles: (0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(opts.streamBlockRoles),
        };
    }
    return {
        streamBlock: false,
        streamExecutor: null,
        streamExecutors: [],
        streamBlockRoles: [],
    };
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
    const codes = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(trimmed);
    if (codes.length > 1) {
        return `Стрим «${(0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorsLabel)(codes)}»`;
    }
    if ((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(trimmed) || (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(trimmed)) {
        return `Стрим «${(0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorLabel)(trimmed)}»`;
    }
    if ((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(trimmed)) {
        return `Стрим «${trimmed}»`;
    }
    return `${exports.V2_STREAM_BLOCK_TITLE_PREFIX}${trimmed}`;
}
function formatV2StreamBlockSectionTitleFromExecutors(executors) {
    if (executors.length === 0)
        return "Стрим";
    const label = (0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorsLabel)(executors);
    return label ? `Стрим «${label}»` : "Стрим";
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
    const executors = streamOpts.streamExecutors;
    if (executors.length > 0 && (!trimmed || trimmed === executor)) {
        return formatV2StreamBlockSectionTitleFromExecutors(executors);
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
function collectPresentExecutorStreamLabels(uiSchema) {
    return new Set(collectExecutorStreamBlocks(uiSchema).flatMap((block) => block.streamExecutors));
}
/** Есть ли в конструкторе корневой streamBlock для стрима (код или legacy-имя БД). */
function isExecutorStreamPresentInSchema(uiSchema, stream, catalog) {
    const trimmed = stream.trim();
    if (!trimmed)
        return false;
    const present = collectPresentExecutorStreamLabels(uiSchema);
    if ((0, v2_model_stream_typical_works_constants_1.isV2ModelStreamUmbrellaLabel)(trimmed)) {
        return v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES.some((code) => present.has(code));
    }
    const streamCode = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(trimmed, catalog);
    if (streamCode && present.has(streamCode))
        return true;
    for (const code of present) {
        if ((0, v2_executor_streams_util_1.typicalWorkAssignedToExecutorStream)([trimmed], code, catalog)) {
            return true;
        }
    }
    const area = (0, v2_executor_streams_util_1.resolveExecutorStreamAreaLabel)(trimmed);
    const areaCode = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(area, catalog);
    return areaCode != null && present.has(areaCode);
}
/** Pointer корневого umbrella / model-stream блока (detailInfo и т.п.). */
function resolveModelStreamUmbrellaBlockPointer(uiSchema) {
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
            (0, v2_model_stream_typical_works_constants_1.isV2ModelStreamUmbrellaLabel)(opts.streamExecutor)) {
            return `/${blockKey}`;
        }
    }
    for (const block of collectExecutorStreamBlocks(uiSchema)) {
        if (block.streamExecutors.some((code) => (0, v2_model_stream_typical_works_constants_1.isV2ModelImplementationStreamCode)(code))) {
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
function resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
    const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
    const explicit = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(readV2AnketaSectionUiOptions(leaf).streamExecutor);
    if (explicit.length > 0)
        return explicit;
    const rootKey = outputPath.split(".")[0]?.trim();
    if (!rootKey)
        return [];
    const rootBranch = readRecord(readRecord(uiSchema)?.[rootKey]);
    return resolveV2AnketaStreamBlockOptions(rootBranch, rootKey).streamExecutors;
}
/** Первый стрим-исполнитель для блока typicalWork (legacy single-stream API). */
function resolvePrimaryStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) {
    return (resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath)[0] ??
        null);
}
/**
 * Подпись стрима для UI / worksCatalogStream:
 * сохраняет legacy «Модельный стрим» и мапит коды implementationStream в имена БД.
 */
function resolveTypicalWorkCatalogStreamLabel(uiSchema, outputPath) {
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
        if (candidate === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR ||
            candidate === "Модельные стримы") {
            return v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR;
        }
    }
    const primary = resolvePrimaryStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath);
    if (primary)
        return (0, v2_stream_block_executor_util_1.resolveLogicStreamDbExecutor)(primary);
    return candidates[0] ?? null;
}
/** Роли платформы для блока typicalWork: явные ui:options.streamBlockRoles или корневой streamBlock. */
function resolveStreamBlockRolesForTypicalWorkOutputPath(uiSchema, outputPath) {
    const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
    const explicit = (0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(readV2AnketaSectionUiOptions(leaf).streamBlockRoles);
    if (explicit.length > 0)
        return explicit;
    const rootKey = outputPath.split(".")[0]?.trim();
    if (!rootKey)
        return [];
    return resolveV2AnketaStreamBlockOptions(readRecord(readRecord(uiSchema)?.[rootKey]), rootKey).streamBlockRoles;
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
            (0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)(root)) {
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
function collectRequiredWorkflowTargets(uiSchema, formData) {
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
