"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_WORK_FORMULA_ARCH_COUNT_KINDS = exports.V2_WORK_ARCH_COUNT_LIMITS = void 0;
exports.formatWorkArchCountKindLabel = formatWorkArchCountKindLabel;
exports.parseWorkArchCountKindLabel = parseWorkArchCountKindLabel;
exports.formatArchCountCoeffSteps = formatArchCountCoeffSteps;
exports.parseArchCountCoeffSteps = parseArchCountCoeffSteps;
exports.validateArchCountCoeffSteps = validateArchCountCoeffSteps;
exports.lookupArchCountCoefficient = lookupArchCountCoefficient;
exports.resolveWorkArchComponentCount = resolveWorkArchComponentCount;
exports.resolveArchCountCoeffFromToken = resolveArchCountCoeffFromToken;
exports.encodeTriggerArchCountSteps = encodeTriggerArchCountSteps;
exports.decodeTriggerArchCountCondition = decodeTriggerArchCountCondition;
exports.isTriggerArchCountConfigured = isTriggerArchCountConfigured;
exports.formatTriggerArchCountConditionLabel = formatTriggerArchCountConditionLabel;
exports.validateTriggerArchCountCondition = validateTriggerArchCountCondition;
exports.archCountTriggerMatches = archCountTriggerMatches;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_typical_works_util_1 = require("./v2-typical-works.util");
exports.V2_WORK_ARCH_COUNT_LIMITS = {
    model: { min: 1, max: 99 },
    sourceSystem: { min: 1, max: 99 },
    dataMart: { min: 1, max: 99 },
    dataProcess: { min: 1, max: 99 },
    modelService: { min: 1, max: 99 },
};
var v2_typical_work_types_1 = require("./v2-typical-work.types");
Object.defineProperty(exports, "V2_WORK_FORMULA_ARCH_COUNT_KINDS", { enumerable: true, get: function () { return v2_typical_work_types_1.V2_WORK_FORMULA_ARCH_COUNT_KINDS; } });
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readArray(value) {
    return Array.isArray(value) ? value : [];
}
function isFilledArchComponentObject(row) {
    return Object.values(row).some((value) => {
        if (value == null || value === "")
            return false;
        if (typeof value === "boolean")
            return value;
        if (typeof value === "number")
            return Number.isFinite(value) && value !== 0;
        if (Array.isArray(value))
            return value.length > 0;
        if (typeof value === "object") {
            return Object.values(value).some((nested) => nested != null && nested !== "");
        }
        return true;
    });
}
function countFilledArchObjects(candidates) {
    let count = 0;
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            for (const item of candidate) {
                const row = readRecord(item);
                if (row && isFilledArchComponentObject(row))
                    count += 1;
            }
            continue;
        }
        const row = readRecord(candidate);
        if (row && isFilledArchComponentObject(row))
            count += 1;
    }
    return count;
}
function normalizeArchCountKind(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const lower = trimmed.toLowerCase();
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
        const label = v2_anketa_section_ui_util_1.V2_ARCH_COMPONENT_LABELS[kind];
        if (label.toLowerCase() === lower)
            return kind;
    }
    return null;
}
function formatWorkArchCountKindLabel(kind) {
    return v2_anketa_section_ui_util_1.V2_ARCH_COMPONENT_LABELS[kind];
}
function parseWorkArchCountKindLabel(label) {
    return normalizeArchCountKind(label);
}
function formatArchCountCoeffSteps(steps) {
    return [...steps]
        .sort((a, b) => a.count - b.count)
        .map((step) => `${step.count}=${String(step.coefficient).replace(".", ",")}`)
        .join("; ");
}
function parseArchCountCoeffSteps(raw) {
    const input = raw.trim();
    if (!input)
        return null;
    const steps = [];
    for (const chunk of input.split(";")) {
        const part = chunk.trim();
        if (!part)
            continue;
        const eq = part.indexOf("=");
        if (eq <= 0)
            return null;
        const count = Number(part.slice(0, eq).trim());
        const coefficient = Number(part.slice(eq + 1).trim().replace(",", "."));
        if (!Number.isFinite(count) ||
            !Number.isInteger(count) ||
            count < 1 ||
            !Number.isFinite(coefficient) ||
            coefficient <= 0) {
            return null;
        }
        steps.push({ count, coefficient });
    }
    return steps.length > 0 ? steps : null;
}
function validateArchCountCoeffSteps(kind, steps) {
    if (steps.length === 0) {
        return "Укажите хотя бы одну пару «количество — коэффициент»";
    }
    const limits = exports.V2_WORK_ARCH_COUNT_LIMITS[kind];
    const seen = new Set();
    for (const step of steps) {
        if (!Number.isInteger(step.count)) {
            return "Количество должно быть целым числом";
        }
        if (step.count < limits.min || step.count > limits.max) {
            return `Количество для «${formatWorkArchCountKindLabel(kind)}» должно быть от ${limits.min} до ${limits.max}`;
        }
        if (!Number.isFinite(step.coefficient) || step.coefficient <= 0) {
            return "Коэффициент должен быть положительным числом";
        }
        if (seen.has(step.count)) {
            return `Повторяющееся количество ${step.count}`;
        }
        seen.add(step.count);
    }
    return null;
}
function lookupArchCountCoefficient(steps, count) {
    if (!Number.isFinite(count) || count <= 0)
        return null;
    const exact = steps.find((step) => step.count === count);
    return exact ? exact.coefficient : null;
}
/** Количество арх. компонентов в formData анкеты (не в строке каталога). */
function resolveWorkArchComponentCount(formData, kind) {
    const detailInfo = readRecord(formData.detailInfo);
    const generalInfo = readRecord(formData.generalInfo);
    const streamModelControl = readRecord(formData.streamModelControl);
    const streamDataSources = readRecord(formData.streamDataSources);
    const data = readRecord(formData.data);
    switch (kind) {
        case "model": {
            const modelsList = readArray(detailInfo?.modelsList).length > 0
                ? readArray(detailInfo?.modelsList)
                : readArray(readRecord(streamModelControl?.models)?.modelsList).length > 0
                    ? readArray(readRecord(streamModelControl?.models)?.modelsList)
                    : readArray(readRecord(data?.models)?.modelsList);
            if (modelsList.length > 0) {
                return Math.min(99, Math.max(1, modelsList.length));
            }
            const detailParams = readRecord(detailInfo?.model) ?? readRecord(detailInfo?.parameters);
            const modelsCount = Number(detailParams?.modelsCount);
            if (Number.isFinite(modelsCount) && modelsCount >= 1) {
                return Math.min(99, Math.floor(modelsCount));
            }
            return 0;
        }
        case "sourceSystem": {
            const rows = [
                ...readArray(detailInfo?.sourceSystems),
                ...readArray(streamDataSources?.sourceSystems),
            ];
            let filled = 0;
            for (const row of rows) {
                const rec = readRecord(row);
                if (rec && (0, v2_typical_works_util_1.isFilledTypicalWorkSourceRow)(rec))
                    filled += 1;
            }
            return filled;
        }
        case "dataMart":
            return countFilledArchObjects([
                detailInfo?.dataMart,
                readRecord(streamModelControl?.dataObjects)?.dataMart,
                readRecord(data?.dataObjects)?.dataMart,
            ]);
        case "dataProcess":
            return countFilledArchObjects([
                detailInfo?.dataProcess,
                streamModelControl?.dataProcessing,
                data?.dataProcessing,
            ]);
        case "modelService":
            return countFilledArchObjects([
                generalInfo?.modelService,
                detailInfo?.modelService,
            ]);
        default:
            return 0;
    }
}
function resolveArchCountCoeffFromToken(formData, kind, steps) {
    const count = resolveWorkArchComponentCount(formData, kind);
    return lookupArchCountCoefficient(steps, count) ?? 1;
}
const TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT = {
    ">=": 1,
    "=": -1,
    "<=": -2,
    ">": -3,
    "<": -4,
};
const TRIGGER_ARCH_COUNT_COEFFICIENT_OPERATOR = Object.fromEntries(Object.entries(TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT).map(([operator, coefficient]) => [String(coefficient), operator]));
function encodeTriggerArchCountSteps(operator, threshold) {
    return [
        {
            count: threshold,
            coefficient: TRIGGER_ARCH_COUNT_OPERATOR_COEFFICIENT[operator],
        },
    ];
}
function decodeTriggerArchCountCondition(steps) {
    if (!steps.length)
        return null;
    const step = steps[0];
    const encodedOperator = TRIGGER_ARCH_COUNT_COEFFICIENT_OPERATOR[String(step.coefficient)];
    if (encodedOperator) {
        return { operator: encodedOperator, threshold: step.count };
    }
    const threshold = Math.min(...steps.map((row) => row.count));
    return { operator: ">=", threshold };
}
function isTriggerArchCountConfigured(triggerArchCount) {
    return Boolean(triggerArchCount?.kind &&
        decodeTriggerArchCountCondition(triggerArchCount.steps ?? []));
}
function formatTriggerArchCountConditionLabel(kind, steps) {
    const condition = decodeTriggerArchCountCondition(steps);
    if (!condition)
        return formatWorkArchCountKindLabel(kind);
    return `${formatWorkArchCountKindLabel(kind)} ${condition.operator} ${condition.threshold}`;
}
function validateTriggerArchCountCondition(kind, steps) {
    const condition = decodeTriggerArchCountCondition(steps);
    if (!condition)
        return "Укажите порог количества компонентов";
    const limits = exports.V2_WORK_ARCH_COUNT_LIMITS[kind];
    if (!Number.isFinite(condition.threshold) ||
        condition.threshold < limits.min ||
        condition.threshold > limits.max) {
        return `Количество должно быть в диапазоне ${limits.min}–${limits.max}`;
    }
    return null;
}
/** Триггер по количеству компонентов (оператор сравнения + порог). */
function archCountTriggerMatches(formData, kind, steps) {
    const condition = decodeTriggerArchCountCondition(steps);
    if (!condition)
        return false;
    const count = resolveWorkArchComponentCount(formData, kind);
    if (!Number.isFinite(count) || count < 0)
        return false;
    const { operator, threshold } = condition;
    switch (operator) {
        case ">=":
            return count >= threshold;
        case "<=":
            return count <= threshold;
        case "=":
            return count === threshold;
        case ">":
            return count > threshold;
        case "<":
            return count < threshold;
        default:
            return count >= threshold;
    }
}
