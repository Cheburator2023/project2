import { collectAtypicalWorkArrayPaths } from "./v2-atypical-works-logic.util";
import {
	collectExecutorStreamBlocks,
	formatV2StreamBlockSectionTitle,
} from "./v2-anketa-section-ui.util";
import { resolveGroupIsActive } from "./v2-group-activation.util";
import { collectGeneratedTypicalWorkArrayPaths } from "./v2-typical-work-output-paths.util";

export type V2StreamWorkSummaryRow = {
	streamName: string;
	blockKey: string;
	streamExecutor: string;
	baseTypicalScore: number;
	adjustedTypicalScore: number;
	deviationPercent: number | null;
	atypicalScore: number;
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readByDotPath(data: Record<string, unknown>, dotPath: string): unknown {
	const segments = dotPath.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return current;
}

function roundUp2(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const rounded = Math.ceil(value * 100 - 1e-9) / 100;
	return rounded === 0 ? 0 : rounded;
}

function percentDeviation(base: number, adjusted: number): number | null {
	if (!Number.isFinite(base) || !Number.isFinite(adjusted) || base === 0) {
		return null;
	}
	return Math.round(((adjusted - base) / base) * 10000) / 100;
}

function sumTaskTotals(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const total = Number(readRecord(row)?.total);
		if (Number.isFinite(total)) sum += total;
	}
	return roundUp2(sum);
}

function sumAtypicalIncluded(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const item = readRecord(row);
		if (!item || item.includeInCalculation === false) continue;
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

function pathsUnderBlock(paths: readonly string[], blockKey: string): string[] {
	const prefix = `${blockKey}.`;
	return paths.filter((path) => path === blockKey || path.startsWith(prefix));
}

/** Суммы типовых и нетиповых работ по каждому активному стримовому блоку анкеты. */
export function buildExecutorStreamWorkSummaryRows(
	data: Record<string, unknown>,
	uiSchema: unknown,
	typicalScoreMultiplier = 1,
): V2StreamWorkSummaryRow[] {
	const blocks = collectExecutorStreamBlocks(uiSchema);
	if (blocks.length === 0) return [];

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
				if (Array.isArray(rows)) typicalTotal += sumTaskTotals(rows);
			}

			let atypicalTotal = 0;
			for (const path of atypicalInBlock) {
				const rows = readByDotPath(data, path);
				if (Array.isArray(rows)) atypicalTotal += sumAtypicalIncluded(rows);
			}

			typicalTotal = roundUp2(typicalTotal);
			atypicalTotal = roundUp2(atypicalTotal);
			const multiplier =
				Number.isFinite(typicalScoreMultiplier) && typicalScoreMultiplier > 0
					? typicalScoreMultiplier
					: 1;
			const adjustedTypicalScore = roundUp2(typicalTotal * multiplier);

			return {
				streamName: formatV2StreamBlockSectionTitle(block.streamExecutor),
				blockKey: block.blockKey,
				streamExecutor: block.streamExecutor,
				baseTypicalScore: typicalTotal,
				adjustedTypicalScore,
				deviationPercent: percentDeviation(
					typicalTotal,
					adjustedTypicalScore,
				),
				atypicalScore: atypicalTotal,
			};
		});
}
