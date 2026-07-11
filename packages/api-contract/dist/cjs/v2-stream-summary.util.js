"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExecutorStreamWorkSummaryRows = buildExecutorStreamWorkSummaryRows;
const v2_atypical_works_logic_util_1 = require("./v2-atypical-works-logic.util");
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_group_activation_util_1 = require("./v2-group-activation.util");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readByDotPath(data, dotPath) {
    const segments = dotPath.split(".").filter(Boolean);
    let current = data;
    for (const segment of segments) {
        const obj = readRecord(current);
        if (!obj)
            return undefined;
        current = obj[segment];
    }
    return current;
}
function roundUp2(value) {
    if (!Number.isFinite(value))
        return 0;
    const rounded = Math.ceil(value * 100 - 1e-9) / 100;
    return rounded === 0 ? 0 : rounded;
}
function sumTaskTotals(tasks) {
    let sum = 0;
    for (const row of tasks) {
        const total = Number(readRecord(row)?.total);
        if (Number.isFinite(total))
            sum += total;
    }
    return roundUp2(sum);
}
function sumAtypicalIncluded(tasks) {
    let sum = 0;
    for (const row of tasks) {
        const item = readRecord(row);
        if (!item || item.includeInCalculation === false)
            continue;
        const total = Number(item.total);
        if (Number.isFinite(total) && total > 0) {
            sum += total;
            continue;
        }
        const estimate = Number(item.estimateHoursPerDay);
        const coefficient = Number(item.coefficient);
        if (Number.isFinite(estimate) && Number.isFinite(coefficient)) {
            sum += estimate * coefficient;
        }
    }
    return roundUp2(sum);
}
function pathsUnderBlock(paths, blockKey) {
    const prefix = `${blockKey}.`;
    return paths.filter((path) => path === blockKey || path.startsWith(prefix));
}
/** Суммы типовых и нетиповых работ по каждому активному стримовому блоку анкеты. */
function buildExecutorStreamWorkSummaryRows(data, uiSchema) {
    const blocks = (0, v2_anketa_section_ui_util_1.collectExecutorStreamBlocks)(uiSchema);
    if (blocks.length === 0)
        return [];
    const typicalPaths = (0, v2_typical_work_output_paths_util_1.collectGeneratedTypicalWorkArrayPaths)(uiSchema);
    const atypicalPaths = (0, v2_atypical_works_logic_util_1.collectAtypicalWorkArrayPaths)(uiSchema);
    return blocks
        .filter((block) => (0, v2_group_activation_util_1.resolveGroupIsActive)(block.blockKey, uiSchema, data))
        .map((block) => {
        const typicalInBlock = pathsUnderBlock(typicalPaths, block.blockKey);
        const atypicalInBlock = pathsUnderBlock(atypicalPaths, block.blockKey);
        let typicalTotal = 0;
        for (const path of typicalInBlock) {
            const rows = readByDotPath(data, path);
            if (Array.isArray(rows))
                typicalTotal += sumTaskTotals(rows);
        }
        let atypicalTotal = 0;
        for (const path of atypicalInBlock) {
            const rows = readByDotPath(data, path);
            if (Array.isArray(rows))
                atypicalTotal += sumAtypicalIncluded(rows);
        }
        typicalTotal = roundUp2(typicalTotal);
        atypicalTotal = roundUp2(atypicalTotal);
        return {
            streamName: (0, v2_anketa_section_ui_util_1.formatV2StreamBlockSectionTitle)(block.streamExecutor),
            blockKey: block.blockKey,
            streamExecutor: block.streamExecutor,
            baseTypicalScore: typicalTotal,
            adjustedTypicalScore: typicalTotal,
            deviationPercent: null,
            atypicalScore: atypicalTotal,
        };
    });
}
