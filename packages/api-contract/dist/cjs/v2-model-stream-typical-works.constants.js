"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS = exports.V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS = exports.V2_MODEL_STREAM_REGISTRY_STREAM_NAMES = exports.V2_MODEL_STREAM_CHILD_DB_NAMES = exports.V2_MODEL_IMPLEMENTATION_STREAM_CODES = exports.V2_MODEL_STREAM_UMBRELLA_CODE = exports.V2_MODEL_STREAM_EXECUTOR = exports.V2_MODEL_STREAM_FACTORY_WORK_IDS = void 0;
exports.isV2ModelImplementationStreamCode = isV2ModelImplementationStreamCode;
exports.isV2ModelStreamUmbrellaLabel = isV2ModelStreamUmbrellaLabel;
exports.resolveModelStreamCatalogScopeDbStreams = resolveModelStreamCatalogScopeDbStreams;
exports.isModelStreamAlwaysShownWork = isModelStreamAlwaysShownWork;
exports.isModelStreamAlwaysActiveWork = isModelStreamAlwaysActiveWork;
exports.compareModelStreamTypicalWorkNames = compareModelStreamTypicalWorkNames;
exports.sortModelStreamTypicalWorkRows = sortModelStreamTypicalWorkRows;
exports.dedupeTypicalWorkRowsByWorkId = dedupeTypicalWorkRowsByWorkId;
exports.isModelStreamTypicalWorkVisibleInSummary = isModelStreamTypicalWorkVisibleInSummary;
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
/** Эталонные id 10 типовых работ модельного стрима (factory registry / anketa boundWorkIds). */
exports.V2_MODEL_STREAM_FACTORY_WORK_IDS = [
    "fbfa5b48-abae-442a-a7a7-6b7ccebe88f7", // 01. Постановка задачи
    "8004b30d-592f-4fb6-81f4-b4e052f56d90", // 02. Поиск данных
    "64e97c0a-8662-4530-9aac-57016cf4f32e", // 04. Построение витрины для разработки
    "9c71a3a2-d980-4d39-a603-ca1d35f9ea31", // 05A. Разработка пилотной модели (MVP)
    "4a349bdc-be66-4c86-b36c-b6733eec8455", // 05. Разработка модели
    "d888922b-f141-4e9c-84bc-2c9dbc5dfee3", // AutoML: разработка
    "278cd153-4188-4dea-bba7-a45edaed7bbf", // 05B. Пилотирование модели
    "5862d9a7-b2d5-4a99-90f8-a042532a62aa", // 07. Разработка витрины для применения модели
    "053b1fbc-25ef-4182-9b78-dc100ce19712", // 09. Адаптация и внедрение модели
    "22c7a066-51de-4b59-b5a1-770733276212", // AutoML: внедрение
];
exports.V2_MODEL_STREAM_EXECUTOR = "Модельный стрим";
/**
 * Код зонтичного стрима в реестре implementationStream (не выбирается в анкете
 * как implementationStream — только каталог / конструктор типовых работ).
 */
exports.V2_MODEL_STREAM_UMBRELLA_CODE = "mdls";
/**
 * Пять модельных стримов-исполнителей (ролевка / implementationStream).
 * Legacy-каталог «Модельный стрим» должен видеть назначения на любой из них.
 */
exports.V2_MODEL_IMPLEMENTATION_STREAM_CODES = [
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL,
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
];
/** DB-имена пяти дочерних стримов (registry `streams` / `normsByStream`). */
exports.V2_MODEL_STREAM_CHILD_DB_NAMES = [
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB],
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB],
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC],
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL],
    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND],
];
/** Mother + 5 children — полный список назначений factory model works. */
exports.V2_MODEL_STREAM_REGISTRY_STREAM_NAMES = [
    exports.V2_MODEL_STREAM_EXECUTOR,
    ...exports.V2_MODEL_STREAM_CHILD_DB_NAMES,
];
function isV2ModelImplementationStreamCode(value) {
    return exports.V2_MODEL_IMPLEMENTATION_STREAM_CODES.includes(value);
}
function isV2ModelStreamUmbrellaLabel(value) {
    const trimmed = value.trim();
    return (trimmed === exports.V2_MODEL_STREAM_EXECUTOR ||
        trimmed === "Модельные стримы" ||
        trimmed === exports.V2_MODEL_STREAM_UMBRELLA_CODE);
}
/** DB-имена + коды + legacy-подпись для каталога типовых работ модельного блока. */
function resolveModelStreamCatalogScopeDbStreams() {
    const result = [exports.V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"];
    for (const code of exports.V2_MODEL_IMPLEMENTATION_STREAM_CODES) {
        if (!result.includes(code))
            result.push(code);
        const label = v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code];
        if (label && !result.includes(label))
            result.push(label);
    }
    return result;
}
/**
 * @deprecated Работы модельного стрима появляются только по триггеру (CSV).
 * Оставлено пустым для обратной совместимости импортов.
 */
exports.V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS = new Set();
/**
 * @deprecated Работы модельного стрима считаются только по триггеру (CSV).
 * Оставлено пустым для обратной совместимости импортов.
 */
exports.V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS = new Set();
const MODEL_STREAM_WORK_ORDER = [
    /^01[\.\s]/i,
    /^02[\.\s]/i,
    /^04[\.\s]/i,
    /^05a[\.\s]/i,
    /^05[\.\s]/i,
    /^automl:\s*разработка/i,
    /^05b[\.\s]/i,
    /^07[\.\s]/i,
    /^09[\.\s]/i,
    /^automl:\s*внедрение/i,
    /постановка задачи/i,
    /поиск данных/i,
    /построение витрины для разработки/i,
    /разработка пилотной модели/i,
    /разработка модели/i,
    /пилотирование модели/i,
    /разработка витрины для применения/i,
    /адаптация и внедрение/i,
];
function isModelStreamAlwaysShownWork(workId) {
    return exports.V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS.has(workId);
}
function isModelStreamAlwaysActiveWork(workId) {
    return exports.V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS.has(workId);
}
/** Порядок строк модельного стрима в итоговой оценке (01 → … → AutoML: внедрение). */
function compareModelStreamTypicalWorkNames(a, b) {
    const rank = (name) => {
        const trimmed = name.trim();
        for (let index = 0; index < MODEL_STREAM_WORK_ORDER.length; index++) {
            if (MODEL_STREAM_WORK_ORDER[index].test(trimmed))
                return index;
        }
        return MODEL_STREAM_WORK_ORDER.length;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0)
        return diff;
    return a.trim().localeCompare(b.trim(), "ru");
}
function sortModelStreamTypicalWorkRows(rows) {
    return [...rows].sort((left, right) => {
        const leftName = typeof left.name === "string" && left.name.trim()
            ? left.name.trim()
            : String(left.workId ?? "");
        const rightName = typeof right.name === "string" && right.name.trim()
            ? right.name.trim()
            : String(right.workId ?? "");
        return compareModelStreamTypicalWorkNames(leftName, rightName);
    });
}
function readFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function typicalWorkRowCollapseKey(row, options) {
    const workId = typeof row.workId === "string" && row.workId.trim()
        ? row.workId.trim()
        : "";
    const sourceName = typeof row.sourceName === "string" ? row.sourceName.trim() : "";
    const sourceSuffix = options?.groupBySourceName && sourceName && !sourceName.startsWith("×")
        ? `|src:${sourceName}`
        : "";
    if (workId)
        return `id:${workId}${sourceSuffix}`;
    return [
        "fb:",
        typeof row.taskCode === "string" ? row.taskCode.trim() : "",
        "|",
        typeof row.name === "string" ? row.name.trim() : "",
        sourceSuffix,
    ].join("");
}
/**
 * Одна работа — одна строка.
 * Fan-out по источникам/компонентам схлопывается: коэффициент и итог суммируются
 * (множитель = число дублей при исходном коэф. 1).
 */
function dedupeTypicalWorkRowsByWorkId(rows, options) {
    const groups = new Map();
    const order = [];
    for (const row of rows) {
        const key = typicalWorkRowCollapseKey(row, options);
        if (!key || key === "fb:|" || key === "fb:||") {
            const uniqKey = `uniq:${order.length}`;
            order.push(uniqKey);
            groups.set(uniqKey, [row]);
            continue;
        }
        if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
        }
        groups.get(key).push(row);
    }
    return order.map((key) => {
        const group = groups.get(key) ?? [];
        const first = group[0];
        if (group.length <= 1)
            return first;
        let coefficientSum = 0;
        let totalSum = 0;
        let hasCoeff = false;
        let hasTotal = false;
        for (const row of group) {
            const coeff = readFiniteNumber(row.coefficient);
            if (coeff != null) {
                coefficientSum += coeff;
                hasCoeff = true;
            }
            const total = readFiniteNumber(row.total);
            if (total != null) {
                totalSum += total;
                hasTotal = true;
            }
        }
        const multiplier = group.length;
        const base = readFiniteNumber(first.estimateHoursPerDay);
        const nextTotal = hasTotal
            ? totalSum
            : hasCoeff && base != null
                ? base * coefficientSum
                : undefined;
        const prevBreakdown = first.formulaBreakdown &&
            typeof first.formulaBreakdown === "object" &&
            !Array.isArray(first.formulaBreakdown)
            ? first.formulaBreakdown
            : null;
        const next = {
            ...first,
            ...(hasCoeff ? { coefficient: coefficientSum } : {}),
            ...(nextTotal != null ? { total: nextTotal } : {}),
            coefficientDisplay: typeof first.coefficientDisplay === "string" &&
                first.coefficientDisplay.trim() &&
                multiplier === 1
                ? first.coefficientDisplay
                : `×${hasCoeff ? String(coefficientSum).replace(".", ",") : multiplier}`,
            sourceName: `×${multiplier}`,
            reason: typeof first.reason === "string" && first.reason.includes(":")
                ? first.reason.replace(/^[^:]+:\s*/, "Сводно: ")
                : first.reason,
            ...(prevBreakdown
                ? {
                    formulaBreakdown: {
                        ...prevBreakdown,
                        ...(hasCoeff ? { coefficient: coefficientSum } : {}),
                        ...(nextTotal != null ? { total: nextTotal } : {}),
                        expanded: base != null && hasCoeff && nextTotal != null
                            ? `${base} × ${coefficientSum} = ${nextTotal} (×${multiplier})`
                            : prevBreakdown.expanded,
                    },
                }
                : {}),
        };
        return next;
    });
}
/** Строка модельного стрима для «Подробного расчёта»: только с ненулевым итогом. */
function isModelStreamTypicalWorkVisibleInSummary(row) {
    if (row.total == null || row.total === "")
        return false;
    const num = typeof row.total === "number"
        ? row.total
        : typeof row.total === "string" && row.total.trim()
            ? Number(row.total.replace(",", "."))
            : Number.NaN;
    return Number.isFinite(num) && num > 0;
}
