import { collectAtypicalWorkArrayPaths } from "./v2-atypical-works-logic.util";
import { collectExecutorStreamBlocks, formatV2StreamBlockSectionTitleFromExecutors, } from "./v2-anketa-section-ui.util";
import { resolveGroupIsActive } from "./v2-group-activation.util";
import { collectGeneratedTypicalWorkArrayPaths } from "./v2-typical-work-output-paths.util";
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
function percentDeviation(base, adjusted) {
    if (!Number.isFinite(base) || !Number.isFinite(adjusted) || base === 0) {
        return null;
    }
    return Math.round(((adjusted - base) / base) * 10000) / 100;
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
export function buildExecutorStreamWorkSummaryRows(data, uiSchema, typicalScoreMultiplier = 1) {
    const blocks = collectExecutorStreamBlocks(uiSchema);
    if (blocks.length === 0)
        return [];
    const typicalPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
    const atypicalPaths = collectAtypicalWorkArrayPaths(uiSchema);
    return blocks
        .filter((block) => resolveGroupIsActive(block.blockKey, uiSchema, data))
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
        const multiplier = Number.isFinite(typicalScoreMultiplier) && typicalScoreMultiplier > 0
            ? typicalScoreMultiplier
            : 1;
        const adjustedTypicalScore = roundUp2(typicalTotal * multiplier);
        return {
            streamName: formatV2StreamBlockSectionTitleFromExecutors(block.streamExecutors),
            blockKey: block.blockKey,
            streamExecutor: block.streamExecutor,
            baseTypicalScore: typicalTotal,
            adjustedTypicalScore,
            deviationPercent: percentDeviation(typicalTotal, adjustedTypicalScore),
            atypicalScore: atypicalTotal,
        };
    });
}
