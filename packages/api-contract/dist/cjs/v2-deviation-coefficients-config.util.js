"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE = exports.V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID = void 0;
exports.createDefaultDeviationCoefficientsConfig = createDefaultDeviationCoefficientsConfig;
exports.isDeviationCoefficientsConfigLogicRule = isDeviationCoefficientsConfigLogicRule;
exports.parseDeviationCoefficientsConfigFromLogic = parseDeviationCoefficientsConfigFromLogic;
exports.buildDeviationCoefficientsConfigLogicRule = buildDeviationCoefficientsConfigLogicRule;
exports.mergeDeviationCoefficientsConfigIntoLogic = mergeDeviationCoefficientsConfigIntoLogic;
exports.resolveSourceCountCoefficient = resolveSourceCountCoefficient;
exports.resolveAlgorithmTypeCoefficient = resolveAlgorithmTypeCoefficient;
exports.resolveDeploymentChannelCoefficient = resolveDeploymentChannelCoefficient;
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
exports.V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID = "__v2_deviation_coefficients_config__";
exports.V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE = "deviation_coefficients_config";
const DEFAULT_MODEL_WORK_NAMES = {
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[0]]: "01. Постановка задачи",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[1]]: "02. Поиск данных",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[2]]: "04. Построение витрины для разработки",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[3]]: "05A. Разработка пилотной модели (MVP)",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[4]]: "05. Разработка модели",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[5]]: "AutoML: разработка",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[6]]: "05B. Пилотирование модели",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[7]]: "07. Разработка витрины для применения модели",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[8]]: "09. Адаптация и внедрение модели",
    [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS[9]]: "AutoML: внедрение",
};
function isPlainRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function createDefaultDeviationCoefficientsConfig() {
    return {
        version: 1,
        modelsCountIncrement: 0.75,
        readyPromYesCoefficient: 0.5,
        productionReportsIncrement: 0.75,
        sourceCountSteps: [
            { count: 1, coefficient: 1 },
            { count: 2, coefficient: 1.2 },
            { count: 3, coefficient: 1.4 },
            { count: 4, coefficient: 1.6 },
            { count: 5, coefficient: 1.8 },
            { count: 6, coefficient: 2 },
            { count: 7, coefficient: 2.2 },
            { count: 8, coefficient: 2.4 },
            { count: 9, coefficient: 2.6 },
            { count: 10, coefficient: 3 },
        ],
        algorithmTypeCoefficients: [
            { label: "Табличные", coefficient: 0.75 },
            { label: "Табличные данные", coefficient: 0.75 },
            { label: "Временные ряды", coefficient: 1 },
            { label: "NLP", coefficient: 1.25 },
            { label: "Текстовая аналитика_Классические модели", coefficient: 1.25 },
            { label: "Текстовая аналитика — Классические модели", coefficient: 1.25 },
            { label: "Текстовая аналитика_LLM", coefficient: 1.4 },
            { label: "Текстовая аналитика — LLM", coefficient: 1.4 },
            { label: "Аудио Аналитика", coefficient: 1.6 },
            { label: "Аудио аналитика", coefficient: 1.6 },
            { label: "Аудио-аналитика", coefficient: 1.6 },
            { label: "Компьютерное зрение_CV", coefficient: 1.8 },
            { label: "Компьютерное зрение", coefficient: 1.8 },
            { label: "CV", coefficient: 1.8 },
            { label: "RL", coefficient: 2.5 },
            { label: "Оптимизационная задача", coefficient: 2.5 },
            { label: "Гео-аналитика", coefficient: 3 },
            { label: "Графовая аналитика", coefficient: 3.5 },
        ],
        deploymentChannelCoefficients: [
            { label: "Батч", coefficient: 0.5 },
            { label: "Батч+загрузка данных потребителю", coefficient: 0.75 },
            { label: "Батч + Онлайн", coefficient: 1.2 },
            { label: "Онлайн", coefficient: 1 },
            { label: "Онлайн gpu", coefficient: 1.25 },
            { label: "Стриминг", coefficient: 1.5 },
            { label: "Мобильные устройства", coefficient: 1.75 },
            { label: "LLM", coefficient: 2 },
            { label: "Гео-сервисы", coefficient: 2.25 },
            { label: "Внедрение в облаке", coefficient: 2.5 },
            { label: "Графовая платформа", coefficient: 3 },
            { label: "Требуется", coefficient: 1 },
        ],
        works: v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_FACTORY_WORK_IDS.map((workId) => ({
            workId,
            workName: DEFAULT_MODEL_WORK_NAMES[workId] ?? workId,
            enabled: true,
        })),
    };
}
function isDeviationCoefficientsConfigLogicRule(rule) {
    if (rule.id === exports.V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID)
        return true;
    const payload = rule.payload;
    return (isPlainRecord(payload) &&
        payload.role === exports.V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE);
}
function asLabelCoefficients(value) {
    if (!Array.isArray(value))
        return null;
    const out = [];
    for (const item of value) {
        if (!isPlainRecord(item))
            continue;
        const label = String(item.label ?? "").trim();
        const coefficient = Number(item.coefficient);
        if (!label || !Number.isFinite(coefficient))
            continue;
        out.push({ label, coefficient });
    }
    return out.length > 0 ? out : null;
}
function asCountSteps(value) {
    if (!Array.isArray(value))
        return null;
    const out = [];
    for (const item of value) {
        if (!isPlainRecord(item))
            continue;
        const count = Number(item.count);
        const coefficient = Number(item.coefficient);
        if (!Number.isFinite(count) || !Number.isFinite(coefficient))
            continue;
        out.push({ count, coefficient });
    }
    return out.length > 0 ? out : null;
}
function asWorks(value) {
    if (!Array.isArray(value))
        return null;
    const out = [];
    for (const item of value) {
        if (!isPlainRecord(item))
            continue;
        const workId = String(item.workId ?? "").trim();
        if (!workId)
            continue;
        out.push({
            workId,
            workName: String(item.workName ?? "").trim() ||
                DEFAULT_MODEL_WORK_NAMES[workId] ||
                workId,
            enabled: item.enabled !== false,
        });
    }
    return out.length > 0 ? out : null;
}
function parseDeviationCoefficientsConfigFromLogic(rules) {
    const defaults = createDefaultDeviationCoefficientsConfig();
    const rule = (rules ?? []).find(isDeviationCoefficientsConfigLogicRule);
    const payload = rule?.payload;
    if (!isPlainRecord(payload))
        return defaults;
    const src = isPlainRecord(payload.config) ? payload.config : payload;
    const modelsCountIncrement = Number(src.modelsCountIncrement);
    const readyPromYesCoefficient = Number(src.readyPromYesCoefficient);
    const productionReportsIncrement = Number(src.productionReportsIncrement);
    return {
        version: 1,
        modelsCountIncrement: Number.isFinite(modelsCountIncrement)
            ? modelsCountIncrement
            : defaults.modelsCountIncrement,
        readyPromYesCoefficient: Number.isFinite(readyPromYesCoefficient)
            ? readyPromYesCoefficient
            : defaults.readyPromYesCoefficient,
        productionReportsIncrement: Number.isFinite(productionReportsIncrement)
            ? productionReportsIncrement
            : defaults.productionReportsIncrement,
        sourceCountSteps: asCountSteps(src.sourceCountSteps) ?? defaults.sourceCountSteps,
        algorithmTypeCoefficients: asLabelCoefficients(src.algorithmTypeCoefficients) ??
            defaults.algorithmTypeCoefficients,
        deploymentChannelCoefficients: asLabelCoefficients(src.deploymentChannelCoefficients) ??
            defaults.deploymentChannelCoefficients,
        works: asWorks(src.works) ?? defaults.works,
    };
}
function buildDeviationCoefficientsConfigLogicRule(config) {
    return {
        id: exports.V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID,
        kind: "computed",
        targetPath: "/summary",
        dependencies: [],
        condition: true,
        description: "Коэффициенты отклонений СФЕРА / панель итогов (модели, источники, алгоритмы, каналы, список работ).",
        payload: {
            role: exports.V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE,
            version: 1,
            config: { ...config, version: 1 },
        },
    };
}
function mergeDeviationCoefficientsConfigIntoLogic(rules, config) {
    const preserved = rules.filter((r) => !isDeviationCoefficientsConfigLogicRule(r));
    return [...preserved, buildDeviationCoefficientsConfigLogicRule(config)];
}
function resolveSourceCountCoefficient(config, dataSourceCount) {
    if (dataSourceCount <= 0)
        return 1;
    const exact = config.sourceCountSteps.find((s) => s.count === dataSourceCount);
    if (exact)
        return exact.coefficient;
    const sorted = [...config.sourceCountSteps].sort((a, b) => a.count - b.count);
    let fallback = 1;
    for (const step of sorted) {
        if (step.count <= dataSourceCount)
            fallback = step.coefficient;
    }
    return fallback;
}
function resolveAlgorithmTypeCoefficient(config, algorithmTypes) {
    const map = Object.fromEntries(config.algorithmTypeCoefficients.map((row) => [row.label, row.coefficient]));
    return algorithmTypes.reduce((total, type) => {
        if (!type || !(type in map))
            return total;
        return total + (map[type] ?? 0);
    }, 0);
}
function resolveDeploymentChannelCoefficient(config, channels) {
    const map = Object.fromEntries(config.deploymentChannelCoefficients.map((row) => [
        row.label,
        row.coefficient,
    ]));
    return channels.reduce((total, channel) => total + (map[channel] ?? 0), 0);
}
