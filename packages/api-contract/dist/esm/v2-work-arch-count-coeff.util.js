import { V2_ARCH_COMPONENT_LABELS } from "./v2-anketa-section-ui.util";
import { isFilledTypicalWorkSourceRow } from "./v2-typical-works.util";
export const V2_WORK_ARCH_COUNT_LIMITS = {
    model: { min: 1, max: 99 },
    sourceSystem: { min: 1, max: 99 },
    dataMart: { min: 1, max: 99 },
    dataProcess: { min: 1, max: 99 },
    modelService: { min: 1, max: 99 },
};
export { V2_WORK_FORMULA_ARCH_COUNT_KINDS } from "./v2-typical-work.types";
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
        const label = V2_ARCH_COMPONENT_LABELS[kind];
        if (label.toLowerCase() === lower)
            return kind;
    }
    return null;
}
export function formatWorkArchCountKindLabel(kind) {
    return V2_ARCH_COMPONENT_LABELS[kind];
}
export function parseWorkArchCountKindLabel(label) {
    return normalizeArchCountKind(label);
}
export function formatArchCountCoeffSteps(steps) {
    return [...steps]
        .sort((a, b) => a.count - b.count)
        .map((step) => `${step.count}=${String(step.coefficient).replace(".", ",")}`)
        .join("; ");
}
export function parseArchCountCoeffSteps(raw) {
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
export function validateArchCountCoeffSteps(kind, steps) {
    if (steps.length === 0) {
        return "Укажите хотя бы одну пару «количество — коэффициент»";
    }
    const limits = V2_WORK_ARCH_COUNT_LIMITS[kind];
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
export function lookupArchCountCoefficient(steps, count) {
    if (!Number.isFinite(count) || count <= 0)
        return null;
    const exact = steps.find((step) => step.count === count);
    return exact ? exact.coefficient : null;
}
/** Количество арх. компонентов в formData анкеты (не в строке каталога). */
export function resolveWorkArchComponentCount(formData, kind) {
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
                if (rec && isFilledTypicalWorkSourceRow(rec))
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
export function resolveArchCountCoeffFromToken(formData, kind, steps) {
    const count = resolveWorkArchComponentCount(formData, kind);
    return lookupArchCountCoefficient(steps, count) ?? 1;
}
