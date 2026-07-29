import { V2_ARCH_COMPONENT_LABELS } from "./v2-anketa-section-ui.util";
import { readFilledArchComponentListRows } from "./v2-typical-works.util";
import { isFilledTypicalWorkSourceRow } from "./v2-typical-works.util";
/** Маркер в formData: принудительный count для arch_count_coeff в per-instance режиме. */
export const V2_PER_INSTANCE_ARCH_COUNT_OVERRIDE_KEY = "__v2PerInstanceArchCountOverride";
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readArray(value) {
    return Array.isArray(value) ? value : [];
}
function readStringField(row, key) {
    const raw = row[key];
    if (typeof raw !== "string")
        return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
}
/**
 * Ключи «названия» экземпляра арх-компонента.
 * В заводской схеме модели/витрины/процессы используют field_* вместо `name`.
 */
const ARCH_INSTANCE_NAME_KEYS = [
    "name",
    "title",
    "label",
    "modelName",
    "sourceName",
    /** Название модели (factory preset) */
    "field_atxiq-UM",
    /** Название объекта/витрины данных */
    "field_zApubb5V",
    /** Название процесса */
    "field_It-B8PfV",
    /** Название модельного сервиса */
    "field_dEVFQVQn",
];
const ARCH_INSTANCE_NON_NAME_KEYS = new Set([
    "workType",
    "type",
    "algorithmType",
    "role",
    "class",
    "taskType",
    "algorithm",
    "autoML",
    "readyPromReports",
    "id",
    "workId",
    "uid",
]);
function instanceLabel(row, index, fallbackPrefix, preferredNameKeys = []) {
    for (const key of preferredNameKeys) {
        const value = readStringField(row, key);
        if (value)
            return value;
    }
    for (const key of ARCH_INSTANCE_NAME_KEYS) {
        const value = readStringField(row, key);
        if (value)
            return value;
    }
    for (const [key, raw] of Object.entries(row)) {
        if (!/name|title|label|назван/i.test(key))
            continue;
        if (typeof raw === "string" && raw.trim())
            return raw.trim();
    }
    // Heuristic: free-text field_* (заводские/кастомные поля названия),
    // предпочитаем более короткие значения (имя vs длинный enum).
    const fieldCandidates = Object.entries(row)
        .filter(([key, raw]) => {
        if (!key.startsWith("field_"))
            return false;
        if (ARCH_INSTANCE_NON_NAME_KEYS.has(key))
            return false;
        return typeof raw === "string" && raw.trim().length > 0;
    })
        .map(([key, raw]) => ({
        key,
        value: String(raw).trim(),
    }))
        .sort((a, b) => a.value.length - b.value.length || a.key.localeCompare(b.key));
    if (fieldCandidates.length === 1) {
        return fieldCandidates[0].value;
    }
    // Если несколько field_* строк — берём самый короткий ≤ 80 символов
    // (название обычно короче enum-описаний вроде algorithmType).
    const short = fieldCandidates.find((row) => row.value.length <= 80);
    if (short)
        return short.value;
    return `${fallbackPrefix} ${index + 1}`;
}
/**
 * Коды полей «Название …» из параметров схемы для данного arch-компонента.
 */
export function resolveArchInstanceNameFieldKeys(schemaParams, kind) {
    if (!kind || kind === "modelService")
        return [];
    const label = V2_ARCH_COMPONENT_LABELS[kind];
    const titleHintByKind = {
        model: /Название модели/i,
        sourceSystem: /Название источника/i,
        dataMart: /Название (объекта|витрины)/i,
        dataProcess: /Название процесса/i,
    };
    const titleHint = titleHintByKind[kind];
    const keys = [];
    for (const param of schemaParams) {
        const arch = param.archComponent?.trim() ?? "";
        const matchesArch = arch === kind ||
            arch === label ||
            resolveArchComponentKindFromType(arch) === kind;
        const title = param.name?.trim() ?? "";
        const matchesTitleHint = titleHint.test(title);
        // modelsList в заводской схеме часто без ui:options.archComponent —
        // тогда опираемся на title «Название модели».
        if (!matchesArch && !matchesTitleHint)
            continue;
        // Не использовать \b: в JS word-boundary не работает с кириллицей
        // («Название модели» не матчится).
        if (!/^(Название|Наименование)(?:\s|$)/i.test(title) && !matchesTitleHint) {
            continue;
        }
        if (param.values && param.values.length > 0)
            continue;
        const code = param.code?.trim();
        if (code)
            keys.push(code);
    }
    return keys;
}
/**
 * Маппинг подписи/типа работы (`Модель`, `Система-источник`, …)
 * → kind для arch_count / списка экземпляров.
 */
export function resolveArchComponentKindFromType(archComponentType) {
    const value = archComponentType?.trim() ?? "";
    if (!value)
        return null;
    const lower = value.toLowerCase();
    const kinds = [
        "model",
        "sourceSystem",
        "dataMart",
        "dataProcess",
        "modelService",
    ];
    for (const kind of kinds) {
        if (kind.toLowerCase() === lower)
            return kind;
        const label = V2_ARCH_COMPONENT_LABELS[kind].toLowerCase();
        if (label === lower)
            return kind;
    }
    if (value.includes("Витрина") || value.includes("Объект"))
        return "dataMart";
    if (value.includes("Процесс"))
        return "dataProcess";
    if (value.includes("Система") || value.includes("Источник")) {
        return "sourceSystem";
    }
    if (value.includes("Модельный сервис") || value === "Модельный") {
        return "modelService";
    }
    if (value === "Модель" || value.startsWith("Модел"))
        return "model";
    return null;
}
function listModelRows(formData) {
    const detailInfo = readRecord(formData.detailInfo);
    const streamModelControl = readRecord(formData.streamModelControl);
    const data = readRecord(formData.data);
    const detailModel = readRecord(detailInfo?.model);
    const candidates = [
        readArray(detailInfo?.modelsList),
        readArray(detailModel?.modelsList),
        readArray(readRecord(streamModelControl?.models)?.modelsList),
        readArray(readRecord(data?.models)?.modelsList),
    ]
        .map((list) => list.filter((item) => item != null && typeof item === "object" && !Array.isArray(item)))
        .filter((list) => list.length > 0);
    if (candidates.length === 0)
        return [];
    const scoreList = (list) => {
        let named = 0;
        for (const row of list) {
            const label = instanceLabel(row, 0, "__unnamed__");
            if (!label.startsWith("__unnamed__"))
                named += 1;
        }
        return named * 1000 + list.length;
    };
    return candidates.sort((a, b) => scoreList(b) - scoreList(a))[0];
}
function listSourceSystemRows(formData) {
    const detailInfo = readRecord(formData.detailInfo);
    const streamDataSources = readRecord(formData.streamDataSources);
    const detailRows = readArray(detailInfo?.sourceSystems);
    const streamRows = readArray(streamDataSources?.sourceSystems);
    const rows = detailRows.length > 0 ? detailRows : streamRows;
    return rows.filter((item) => item != null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        isFilledTypicalWorkSourceRow(item));
}
function listDataMartRows(formData) {
    const detailInfo = readRecord(formData.detailInfo);
    const streamModelControl = readRecord(formData.streamModelControl);
    const data = readRecord(formData.data);
    const candidates = [
        detailInfo?.dataMart,
        readRecord(streamModelControl?.dataObjects)?.dataMart,
        readRecord(data?.dataObjects)?.dataMart,
    ];
    for (const candidate of candidates) {
        const rows = readFilledArchComponentListRows(candidate);
        if (rows.length > 0)
            return rows;
    }
    return [];
}
function listDataProcessRows(formData) {
    const detailInfo = readRecord(formData.detailInfo);
    const streamModelControl = readRecord(formData.streamModelControl);
    const data = readRecord(formData.data);
    const candidates = [
        detailInfo?.dataProcess,
        streamModelControl?.dataProcessing,
        data?.dataProcessing,
    ];
    for (const candidate of candidates) {
        const rows = readFilledArchComponentListRows(candidate);
        if (rows.length > 0)
            return rows;
    }
    return [];
}
/**
 * Экземпляры арх-компонента для per-instance расчёта.
 * `modelService` — без fan-out (один синтетический контекст).
 * Пустой список (кроме modelService) → [] (вклад работы = 0).
 */
export function listArchComponentInstances(formData, archComponentType, options) {
    const kind = resolveArchComponentKindFromType(archComponentType);
    if (kind === "modelService" || kind == null) {
        return [
            {
                sourceLabel: "Контекст",
                row: {},
                index: 0,
            },
        ];
    }
    let rows = [];
    let prefix = "Компонент";
    switch (kind) {
        case "model":
            rows = listModelRows(formData);
            prefix = "Модель";
            break;
        case "sourceSystem":
            rows = listSourceSystemRows(formData);
            prefix = "Источник";
            break;
        case "dataMart":
            rows = listDataMartRows(formData);
            prefix = "Объект данных";
            break;
        case "dataProcess":
            rows = listDataProcessRows(formData);
            prefix = "Процесс";
            break;
        default:
            rows = [];
    }
    const preferredNameKeys = [
        ...(options?.preferredNameKeys ?? []),
        ...(options?.schemaParams
            ? resolveArchInstanceNameFieldKeys(options.schemaParams, kind)
            : []),
    ];
    return rows.map((row, index) => ({
        sourceLabel: instanceLabel(row, index, prefix, preferredNameKeys),
        row,
        index,
    }));
}
export function readPerInstanceArchCountOverride(formData, kind) {
    const raw = formData?.[V2_PER_INSTANCE_ARCH_COUNT_OVERRIDE_KEY];
    const record = readRecord(raw);
    if (!record)
        return null;
    const value = Number(record[kind]);
    if (!Number.isFinite(value) || value < 0)
        return null;
    return value;
}
/** formData с принудительным arch_count для kind итерации (=1). */
export function withPerInstanceArchCountOverride(formData, kind, count = 1) {
    if (!kind)
        return formData;
    return {
        ...formData,
        [V2_PER_INSTANCE_ARCH_COUNT_OVERRIDE_KEY]: {
            ...readRecord(formData[V2_PER_INSTANCE_ARCH_COUNT_OVERRIDE_KEY]),
            [kind]: count,
        },
    };
}
/**
 * formData, где массив итерируемого kind содержит только текущий экземпляр —
 * labor deep-lookup не подтягивает соседние экземпляры.
 */
export function formDataWithSingleArchInstance(formData, kind, instance) {
    if (!kind || kind === "modelService") {
        return withPerInstanceArchCountOverride(formData, kind, 1);
    }
    const detailInfo = { ...readRecord(formData.detailInfo) };
    const generalInfo = { ...readRecord(formData.generalInfo) };
    const streamModelControl = {
        ...readRecord(formData.streamModelControl),
    };
    const streamDataSources = {
        ...readRecord(formData.streamDataSources),
    };
    switch (kind) {
        case "model": {
            detailInfo.modelsList = [instance.row];
            const modelsBlock = {
                ...readRecord(streamModelControl.models),
                modelsList: [instance.row],
            };
            streamModelControl.models = modelsBlock;
            break;
        }
        case "sourceSystem": {
            detailInfo.sourceSystems = [instance.row];
            streamDataSources.sourceSystems = [instance.row];
            break;
        }
        case "dataMart": {
            detailInfo.dataMart = [instance.row];
            const dataObjects = {
                ...readRecord(streamModelControl.dataObjects),
                dataMart: [instance.row],
            };
            streamModelControl.dataObjects = dataObjects;
            break;
        }
        case "dataProcess": {
            detailInfo.dataProcess = [instance.row];
            streamModelControl.dataProcessing = [instance.row];
            break;
        }
        default:
            break;
    }
    return withPerInstanceArchCountOverride({
        ...formData,
        detailInfo,
        generalInfo,
        streamModelControl,
        streamDataSources,
    }, kind, 1);
}
/**
 * Подпись для пустого per-instance расчёта (нет заполненных экземпляров арх. компонента).
 */
export function formatEmptyArchInstanceBreakdown(archComponentType) {
    const kind = resolveArchComponentKindFromType(archComponentType);
    const label = (kind ? V2_ARCH_COMPONENT_LABELS[kind] : null) ||
        archComponentType?.trim() ||
        "арх. компонент";
    return `нет заполненных «${label}» → 0`;
}
export function formatPerInstanceBreakdownExpanded(instances, total) {
    if (instances.length === 0)
        return `0 = ${formatNum(total)}`;
    if (instances.length === 1) {
        const only = instances[0];
        const expanded = only.expanded?.trim() ?? "";
        return expanded.includes("=")
            ? expanded
            : `${expanded || formatNum(only.total)} = ${formatNum(only.total)}`;
    }
    const parts = instances.map((row) => `${formatNum(row.total)} (${row.sourceLabel})`);
    return `${parts.join(" + ")} = ${formatNum(total)}`;
}
function formatNum(value) {
    if (!Number.isFinite(value))
        return "—";
    const rounded = Math.round(value * 10000) / 10000;
    if (Number.isInteger(rounded))
        return String(rounded);
    return String(rounded)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
}
