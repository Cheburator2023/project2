import { V2_ANKETA_MAIN_SECTION_TITLES } from "./v2-anketa-workflow.util";
import { V2_ANKETA_MAIN_SECTION_IDS, } from "./v2-anketa-workflow.types";
import { isV2AnketaHiddenUiNode } from "./v2-anketa-editor-ui.util";
const UNCERTAINTY_ROOT = "uncertaintyCalculation";
const SUMMARY_ROOT = "summary";
/** Подписи группы рисков (из jsonSchema.title заводской схемы). */
export const V2_UNCERTAINTY_RISK_GROUP_LABELS = {
    businessComplexity: "Изменение, недостаточная проработка или сложности бизнес процессов Банка",
    defectsInSolution: "Наличие дефектов во внедряемом решении/ ПО в рамках проекта",
    adjacentProjectsImpact: "Негативное влияние смежных проектов на показатели проекта",
    laborCostIncrease: "Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
    thirdPartyNegligence: "Недобросовестное исполнение услуг со стороны привлеченных контрагентов/ подрядчиков",
    staffShortage: "Отсутствие квалифицированного персонала или ошибок персонала",
    sanctions: "Введение санкционных мер и других ограничений",
    controlProceduresLack: "Недостаток или отсутствие контрольных процедур",
    regulatoryChanges: "Изменение регуляторных требований",
    isNotUsedAfterProject: "Неиспользование ИС после завершения проекта",
    itArchitectureChanges: "Изменения целевой ИТ архитектуры Банка",
};
const SOURCE_SYSTEM_FIELDS = [
    ["name", "Название"],
    ["type", "Тип"],
    ["daptRegistry", "Реестр ДАПТ"],
    ["requirements", "Требования"],
    ["additionalUncertainty", "Доп. неопр."],
    ["integrationReadiness", "Готовность ПД"],
    ["dataCoeff", "Коэф. данных"],
    ["nda", "НДА"],
];
const TRAINING_SOURCE_FIELDS = [
    ["name", "Название"],
    ["frequency", "Признаков"],
    ["development", "Доработка"],
    ["integration", "Интеграция"],
    ["dataCondition", "Условие данных"],
    ["usedModels", "Модели"],
    ["controlKD", "Контрольный КД"],
];
const MODEL_FIELDS = [
    ["name", "Название"],
    ["class", "Класс"],
    ["taskType", "Тип задачи"],
    ["algorithm", "Алгоритм"],
    ["autoML", "AutoML"],
    ["role", "Роль"],
];
const PLATFORM_STREAM_FIELDS = [
    ["streamName", "Стрим"],
    ["baseTypicalScore", "Базовая (типовые)"],
    ["adjustedTypicalScore", "С поправкой"],
    ["deviationPercent", "Отклонение %"],
    ["atypicalScore", "Нетиповые"],
];
const E2E_STAGE_FIELDS = [
    ["stageName", "Этап E2E"],
    ["baseScore", "Базовая"],
    ["complexityCoeff", "С поправкой"],
    ["deviationFromBase", "Отклонение %"],
];
const DEFAULT_ARRAY_MAX_ITEMS = 3;
export function registryFormColumnId(formPath) {
    return `form.${formPath}`;
}
/** Ширина колонки по длине заголовка — заголовок помещается без обрезки. */
export function estimateRegistryColumnWidth(header) {
    return Math.max(96, Math.min(420, Math.ceil(header.length * 7.5) + 36));
}
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
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
function readFieldTitle(schemaNode, key) {
    const title = schemaNode?.title;
    if (typeof title === "string" && title.trim())
        return title.trim();
    return V2_UNCERTAINTY_RISK_GROUP_LABELS[key] ?? key;
}
function resolveValueType(schemaNode) {
    const type = resolveSchemaType(schemaNode);
    if (type === "number" || type === "integer")
        return "number";
    if (type === "boolean")
        return "boolean";
    return "text";
}
function isScalarSchemaNode(node) {
    const type = resolveSchemaType(node);
    return (type === "string" ||
        type === "number" ||
        type === "integer" ||
        type === "boolean");
}
function isReadonlyGeneratedArray(schemaNode, uiNode) {
    if (schemaNode.readOnly === true)
        return true;
    if (uiNode?.["ui:readonly"] === true)
        return true;
    const opts = readRecord(uiNode?.["ui:options"]);
    if (opts?.addable === false && opts?.removable === false) {
        const title = schemaNode.title;
        if (typeof title === "string" && title.includes("Локальные параметры")) {
            return true;
        }
    }
    return false;
}
function formLeaf(formPath, header, valueType = "text") {
    return {
        type: "leaf",
        id: registryFormColumnId(formPath),
        header,
        kind: "form",
        formPath,
        valueType,
    };
}
function metaLeaf(id, header, metaKey, valueType = "text") {
    return {
        type: "leaf",
        id,
        header,
        kind: "meta",
        metaKey,
        valueType,
    };
}
function sectionStatusLeaf(sectionId) {
    return {
        type: "leaf",
        id: `workflowSection.${sectionId}`,
        header: `${V2_ANKETA_MAIN_SECTION_TITLES[sectionId]} — статус`,
        kind: "sectionStatus",
        sectionId,
        valueType: "text",
    };
}
function group(header, children, opts) {
    return {
        type: "group",
        header,
        openByDefault: opts?.openByDefault,
        children,
    };
}
function arrayItemGroupFromSchema(groupHeader, basePath, index, itemSchema, itemUi) {
    const fields = [];
    const props = readRecord(itemSchema.properties);
    if (!props) {
        return group(`${groupHeader} ${index + 1}`, []);
    }
    for (const key of listOrderedPropertyKeys(itemSchema, itemUi)) {
        const fieldSchema = readRecord(props[key]);
        if (!fieldSchema || !isScalarSchemaNode(fieldSchema))
            continue;
        const fieldUi = readRecord(itemUi?.[key]);
        if (fieldUi && isV2AnketaHiddenUiNode(fieldUi))
            continue;
        fields.push(formLeaf(`${basePath}[${index}].${key}`, readFieldTitle(fieldSchema, key), resolveValueType(fieldSchema)));
    }
    return group(`${groupHeader} ${index + 1}`, fields);
}
function collectSchemaSectionColumns(sectionSchema, sectionUi, sectionDotPath, options) {
    const nodes = [];
    const maxItems = options.arrayMaxItems ?? DEFAULT_ARRAY_MAX_ITEMS;
    for (const key of listOrderedPropertyKeys(sectionSchema, sectionUi)) {
        const childSchema = readRecord(readRecord(sectionSchema.properties)?.[key]);
        const childUi = readRecord(sectionUi?.[key]);
        if (!childSchema)
            continue;
        if (childUi && isV2AnketaHiddenUiNode(childUi))
            continue;
        const childPath = sectionDotPath === "" ? key : `${sectionDotPath}.${key}`;
        const childType = resolveSchemaType(childSchema);
        if (isScalarSchemaNode(childSchema)) {
            nodes.push(formLeaf(childPath, readFieldTitle(childSchema, key), resolveValueType(childSchema)));
            continue;
        }
        if (childType === "object") {
            const nestedProps = readRecord(childSchema.properties);
            if (!nestedProps)
                continue;
            for (const nestedKey of listOrderedPropertyKeys(childSchema, childUi)) {
                const nestedSchema = readRecord(nestedProps[nestedKey]);
                const nestedUi = readRecord(childUi?.[nestedKey]);
                if (!nestedSchema || !isScalarSchemaNode(nestedSchema))
                    continue;
                if (nestedUi && isV2AnketaHiddenUiNode(nestedUi))
                    continue;
                nodes.push(formLeaf(`${childPath}.${nestedKey}`, readFieldTitle(nestedSchema, nestedKey), resolveValueType(nestedSchema)));
            }
            continue;
        }
        if (childType === "array") {
            const itemsSchema = readRecord(childSchema.items);
            if (!itemsSchema)
                continue;
            const itemProps = readRecord(itemsSchema.properties);
            if (!itemProps || Object.keys(itemProps).length === 0)
                continue;
            if (childSchema.readOnly === true)
                continue;
            if (isReadonlyGeneratedArray(childSchema, childUi))
                continue;
            const itemsUi = readRecord(childUi?.items);
            const groupHeader = typeof childSchema.title === "string" && childSchema.title.trim()
                ? childSchema.title.trim()
                : key;
            for (let index = 0; index < maxItems; index += 1) {
                nodes.push(arrayItemGroupFromSchema(groupHeader, childPath, index, itemsSchema, itemsUi));
            }
        }
    }
    return nodes;
}
function collectUncertaintyColumns(schema, ui) {
    const nodes = [];
    const props = readRecord(schema.properties);
    if (!props)
        return nodes;
    for (const key of listOrderedPropertyKeys(schema, ui)) {
        const fieldSchema = readRecord(props[key]);
        const fieldUi = readRecord(ui?.[key]);
        if (!fieldSchema)
            continue;
        if (fieldUi && isV2AnketaHiddenUiNode(fieldUi))
            continue;
        if (key === "riskGroup") {
            const riskProps = readRecord(fieldSchema.properties);
            if (!riskProps)
                continue;
            for (const riskKey of listOrderedPropertyKeys(fieldSchema, fieldUi)) {
                const riskSchema = readRecord(riskProps[riskKey]);
                if (!riskSchema || !isScalarSchemaNode(riskSchema))
                    continue;
                nodes.push(formLeaf(`${UNCERTAINTY_ROOT}.riskGroup.${riskKey}`, readFieldTitle(riskSchema, riskKey), resolveValueType(riskSchema)));
            }
            continue;
        }
        if (!isScalarSchemaNode(fieldSchema))
            continue;
        nodes.push(formLeaf(`${UNCERTAINTY_ROOT}.${key}`, readFieldTitle(fieldSchema, key), resolveValueType(fieldSchema)));
    }
    return nodes;
}
function collectSummaryColumns(schema, ui, options) {
    const nodes = [];
    const props = readRecord(schema.properties);
    if (!props)
        return nodes;
    const maxItems = options.arrayMaxItems ?? DEFAULT_ARRAY_MAX_ITEMS;
    const scalarFields = [];
    for (const key of listOrderedPropertyKeys(schema, ui)) {
        const fieldSchema = readRecord(props[key]);
        if (!fieldSchema)
            continue;
        if (resolveSchemaType(fieldSchema) !== "string" &&
            resolveSchemaType(fieldSchema) !== "number" &&
            resolveSchemaType(fieldSchema) !== "integer") {
            continue;
        }
        if (!isScalarSchemaNode(fieldSchema))
            continue;
        scalarFields.push(formLeaf(`${SUMMARY_ROOT}.${key}`, readFieldTitle(fieldSchema, key), resolveValueType(fieldSchema)));
    }
    if (scalarFields.length) {
        nodes.push(group("Итоговая оценка", scalarFields));
    }
    const platformStreams = readRecord(props.platformStreams);
    const platformUi = readRecord(ui?.platformStreams);
    if (platformStreams && resolveSchemaType(platformStreams) === "array") {
        const itemsSchema = readRecord(platformStreams.items);
        if (itemsSchema) {
            const itemsUi = readRecord(platformUi?.items);
            nodes.push(group("Платформенные стримы", Array.from({ length: maxItems + 1 }, (_, index) => arrayItemGroupFromSchema("Стрим", `${SUMMARY_ROOT}.platformStreams`, index, itemsSchema, itemsUi))));
        }
    }
    const detailedCalculation = readRecord(props.detailedCalculation);
    const detailedUi = readRecord(ui?.detailedCalculation);
    if (detailedCalculation && resolveSchemaType(detailedCalculation) === "array") {
        const itemsSchema = readRecord(detailedCalculation.items);
        if (itemsSchema) {
            const itemsUi = readRecord(detailedUi?.items);
            nodes.push(group("E2E этапы", Array.from({ length: maxItems + 2 }, (_, index) => arrayItemGroupFromSchema("Этап", `${SUMMARY_ROOT}.detailedCalculation`, index, itemsSchema, itemsUi))));
        }
    }
    return nodes;
}
function buildMetaRegistryGroup() {
    return group("Реестр", [
        metaLeaf("calcName", "Анкета", "calcName"),
        metaLeaf("readableId", "ID анкеты", "readableId"),
        metaLeaf("version", "Версия", "version"),
        metaLeaf("status", "Статус записи", "status"),
        metaLeaf("workflowGlobalStatus", "Статус анкеты", "workflowGlobalStatus"),
        metaLeaf("author", "Автор", "author"),
        metaLeaf("templateName", "Шаблон", "templateName"),
        metaLeaf("schemaBindingStatus", "Привязка схемы", "schemaBinding.status"),
        metaLeaf("finalCoefficient", "Итоговый коэф.", "finalCoefficient", "number"),
        metaLeaf("createdAt", "Дата создания", "createdAt", "date"),
        metaLeaf("updatedAt", "Дата последнего изменения", "updatedAt", "date"),
    ], { openByDefault: true });
}
function mainSectionGroupFromNodes(sectionId, children, openByDefault) {
    return group(V2_ANKETA_MAIN_SECTION_TITLES[sectionId], [
        sectionStatusLeaf(sectionId),
        ...children,
    ], { openByDefault });
}
function arrayItemCols(groupHeader, basePath, index, fields) {
    return group(`${groupHeader} ${index + 1}`, fields.map(([key, label]) => formLeaf(`${basePath}[${index}].${key}`, label)));
}
/** Статический набор колонок (fallback без схемы). */
export function buildStaticV2QuestionnaireRegistryColumnTree() {
    const generalInfoChildren = [
        formLeaf("generalInfo.calcName", "Название анкеты (инициативы)"),
        formLeaf("generalInfo.businessCustomer", "Заказчик"),
        formLeaf("generalInfo.implementationStream", "Стрим-исполнитель"),
        formLeaf("generalInfo.complexity", "Сложность"),
        formLeaf("generalInfo.channels", "Каналы"),
        formLeaf("generalInfo.overallUncertainty", "Неопределённость"),
        formLeaf("generalInfo.createIS", "Создание ИС", "boolean"),
        formLeaf("generalInfo.createService", "Создание сервиса", "boolean"),
        formLeaf("generalInfo.pilotNeed", "Пилот"),
        formLeaf("uncertaintyCalculation.initiativeTimeline", "Сроки инициативы"),
        formLeaf("uncertaintyCalculation.initiativeCost", "Стоимость инициативы", "number"),
        formLeaf("uncertaintyCalculation.uncertaintyAdjustment", "Поправка неопределённости", "number"),
        ...Object.entries(V2_UNCERTAINTY_RISK_GROUP_LABELS).map(([key, header]) => formLeaf(`uncertaintyCalculation.riskGroup.${key}`, header)),
    ];
    return [
        buildMetaRegistryGroup(),
        mainSectionGroupFromNodes("generalInfo", generalInfoChildren, true),
        mainSectionGroupFromNodes("detailInfo", [
            formLeaf("detailInfo.parameters.streamsOutsideDADM", "Стримы вне ДАДМ", "boolean"),
            formLeaf("detailInfo.parameters.streamNames", "Названия стримов"),
            formLeaf("detailInfo.model.modelsCount", "Кол-во моделей", "number"),
            formLeaf("detailInfo.model.algorithmType", "Тип алгоритма"),
            formLeaf("detailInfo.model.algorithmCoeff", "Коэф. алгоритма", "number"),
            formLeaf("detailInfo.model.autoML", "AutoML", "boolean"),
            formLeaf("detailInfo.model.specialist", "Специалист"),
            formLeaf("detailInfo.model.cascadeEnsemble", "Каскад/ансамбль"),
            ...[0, 1, 2].map((index) => arrayItemCols("Источник", "detailInfo.sourceSystems", index, SOURCE_SYSTEM_FIELDS)),
        ]),
        mainSectionGroupFromNodes("streamDataSources", [
            formLeaf("streamDataSources.sourceTypicalTasks[0].name", "Типовая задача 1"),
            formLeaf("streamDataSources.sourceTypicalTasks[0].total", "Итог задачи 1", "number"),
            formLeaf("streamDataSources.sourceTypicalTasks[1].name", "Типовая задача 2"),
            formLeaf("streamDataSources.sourceTypicalTasks[1].total", "Итог задачи 2", "number"),
            formLeaf("streamDataSources.atypicalTasks[0].name", "Нетиповая задача 1"),
            formLeaf("streamDataSources.atypicalTasks[0].total", "Итог нетиповой 1", "number"),
        ]),
        mainSectionGroupFromNodes("streamModelControl", [
            formLeaf("streamModelControl.dataProcessing.sourcesRDS", "Источников RDS", "number"),
            formLeaf("streamModelControl.dataProcessing.consumers", "Приёмников", "number"),
            formLeaf("streamModelControl.dataProcessing.otherMicroservices", "Микросервисов", "number"),
            formLeaf("streamModelControl.dataProcessing.filters", "Фильтров", "number"),
            formLeaf("streamModelControl.dataProcessing.yaspArtifact", "ЯСП"),
            ...[0, 1].map((index) => arrayItemCols("Витрина обучения", "streamModelControl.dataObjects.trainingSources", index, TRAINING_SOURCE_FIELDS)),
            arrayItemCols("Витрина применения", "streamModelControl.dataObjects.applicationSources", 0, [
                ["name", "Название"],
                ["mode", "Режим"],
                ["updateFrequency", "Обновление"],
                ["development", "Доработка"],
                ["controlKD", "Контрольный КД"],
                ["usedModels", "Модели"],
            ]),
            formLeaf("streamModelControl.models.cascadeEnsemble", "Каскад/ансамбль"),
            formLeaf("streamModelControl.models.recalibrationType", "Рекалибровка"),
            ...[0, 1].map((index) => arrayItemCols("Модель", "streamModelControl.models.modelsList", index, MODEL_FIELDS)),
        ]),
        group("Итоговая оценка", [
            formLeaf("summary.total", "Общая стоимость", "number"),
            formLeaf("summary.baseScoreStream", "Базовая (СФЕРА)", "number"),
            formLeaf("summary.scoreWithComplexityCoeff", "С поправкой сложности", "number"),
            formLeaf("summary.deviationFromBaseline", "Отклонение %", "number"),
        ]),
        group("Платформенные стримы", [0, 1, 2, 3].map((index) => arrayItemCols("Стрим", "summary.platformStreams", index, PLATFORM_STREAM_FIELDS))),
        group("E2E этапы", [0, 1, 2, 3, 4].map((index) => arrayItemCols("Этап", "summary.detailedCalculation", index, E2E_STAGE_FIELDS))),
    ];
}
/** Колонки реестра из версии jsonSchema/uiSchema шаблона. */
export function buildV2QuestionnaireRegistryColumnTree(jsonSchema, uiSchema, options = {}) {
    if (!jsonSchema || !uiSchema) {
        return buildStaticV2QuestionnaireRegistryColumnTree();
    }
    const rootSchema = readRecord(jsonSchema);
    const rootUi = readRecord(uiSchema);
    const rootProps = readRecord(rootSchema?.properties);
    if (!rootProps) {
        return buildStaticV2QuestionnaireRegistryColumnTree();
    }
    const tree = [buildMetaRegistryGroup()];
    for (const sectionId of V2_ANKETA_MAIN_SECTION_IDS) {
        const sectionSchema = readRecord(rootProps[sectionId]);
        if (!sectionSchema)
            continue;
        const sectionUi = readRecord(rootUi?.[sectionId]);
        const sectionColumns = collectSchemaSectionColumns(sectionSchema, sectionUi, sectionId, options);
        if (sectionId === "generalInfo") {
            const uncertaintySchema = readRecord(rootProps[UNCERTAINTY_ROOT]);
            const uncertaintyUi = readRecord(rootUi?.[UNCERTAINTY_ROOT]);
            if (uncertaintySchema) {
                sectionColumns.push(...collectUncertaintyColumns(uncertaintySchema, uncertaintyUi));
            }
        }
        tree.push(mainSectionGroupFromNodes(sectionId, sectionColumns, sectionId === "generalInfo"));
    }
    const summarySchema = readRecord(rootProps[SUMMARY_ROOT]);
    const summaryUi = readRecord(rootUi?.[SUMMARY_ROOT]);
    if (summarySchema) {
        tree.push(...collectSummaryColumns(summarySchema, summaryUi, options));
    }
    return tree;
}
export function flattenV2RegistryColumnTree(nodes) {
    const leaves = [];
    const walk = (node, groupHeader) => {
        if (node.type === "leaf") {
            leaves.push(groupHeader
                ? {
                    ...node,
                    header: `${groupHeader} — ${node.header}`,
                }
                : node);
            return;
        }
        for (const child of node.children) {
            if (child.type === "group") {
                walk(child, child.header);
                continue;
            }
            walk(child, groupHeader);
        }
    };
    for (const node of nodes)
        walk(node);
    return leaves;
}
export function getByFormPath(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== "object")
            return undefined;
        const match = /^(\w+)\[(\d+)\]$/.exec(part);
        if (match) {
            const [, key, indexStr] = match;
            const container = current[key];
            if (!Array.isArray(container))
                return undefined;
            current = container[Number.parseInt(indexStr, 10)];
        }
        else {
            current = current[part];
        }
    }
    return current;
}
function metaValue(row, metaKey) {
    if (metaKey === "readableId")
        return row.readableId ?? row.id;
    if (metaKey === "schemaBinding.status")
        return row.schemaBinding.status;
    if (metaKey === "workflowGlobalStatus")
        return row.workflowGlobalStatus ?? "";
    return row[metaKey];
}
export function buildV2QuestionnaireRegistryExportColumns(jsonSchema, uiSchema, options) {
    const tree = buildV2QuestionnaireRegistryColumnTree(jsonSchema, uiSchema, options);
    const leaves = flattenV2RegistryColumnTree(tree);
    return leaves.map((leaf) => {
        if (leaf.kind === "meta") {
            return {
                key: leaf.id,
                header: leaf.header,
                valueGetter: (row) => metaValue(row, leaf.metaKey ?? leaf.id),
            };
        }
        if (leaf.kind === "sectionStatus") {
            const sectionId = leaf.sectionId;
            return {
                key: leaf.id,
                header: leaf.header,
                valueGetter: (row) => row.workflowSectionStatuses?.[sectionId] ?? "",
            };
        }
        return {
            key: leaf.id,
            header: leaf.header,
            valueGetter: (row) => getByFormPath(row.formData ?? {}, leaf.formPath),
        };
    });
}
