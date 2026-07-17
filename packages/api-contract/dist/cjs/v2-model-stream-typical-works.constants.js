"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS = exports.V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS = exports.V2_MODEL_STREAM_EXECUTOR = exports.V2_MODEL_STREAM_FACTORY_WORK_IDS = void 0;
exports.isModelStreamAlwaysShownWork = isModelStreamAlwaysShownWork;
exports.isModelStreamAlwaysActiveWork = isModelStreamAlwaysActiveWork;
exports.compareModelStreamTypicalWorkNames = compareModelStreamTypicalWorkNames;
exports.sortModelStreamTypicalWorkRows = sortModelStreamTypicalWorkRows;
exports.dedupeTypicalWorkRowsByWorkId = dedupeTypicalWorkRowsByWorkId;
exports.isModelStreamTypicalWorkVisibleInSummary = isModelStreamTypicalWorkVisibleInSummary;
/** Эталонные id 10 типовых работ модельного стрима (factory registry). */
exports.V2_MODEL_STREAM_FACTORY_WORK_IDS = [
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4002",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4006",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4007",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4009",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4010",
];
exports.V2_MODEL_STREAM_EXECUTOR = "Модельный стрим";
/** Всегда показываются в блоке типовых работ и в «Подробном расчёте». */
exports.V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS = new Set([
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008",
]);
/** Всегда активны (формула считается даже без явных триггеров). */
exports.V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS = new Set([
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
    "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
]);
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
/** Одна работа — одна строка (fan-out по legacy-путям даёт дубли с одним workId). */
function dedupeTypicalWorkRowsByWorkId(rows) {
    const seenWorkIds = new Set();
    const seenFallback = new Set();
    const result = [];
    for (const row of rows) {
        const workId = typeof row.workId === "string" && row.workId.trim()
            ? row.workId.trim()
            : "";
        if (workId) {
            if (seenWorkIds.has(workId))
                continue;
            seenWorkIds.add(workId);
            result.push(row);
            continue;
        }
        const fallbackKey = [
            typeof row.taskCode === "string" ? row.taskCode.trim() : "",
            typeof row.name === "string" ? row.name.trim() : "",
        ].join("|");
        if (fallbackKey && seenFallback.has(fallbackKey))
            continue;
        if (fallbackKey)
            seenFallback.add(fallbackKey);
        result.push(row);
    }
    return result;
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
