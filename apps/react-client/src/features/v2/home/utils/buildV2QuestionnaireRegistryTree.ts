import {
	filterV2QuestionnairesByRegistryVersionMode,
	type V2QuestionnaireRegistryVersionMode,
} from "@smart-anketa/api-contract";
import type {
	V2QuestionnaireSeriesRow,
	V2QuestionnaireVersionRow,
} from "../types/v2QuestionnaireGrid.types";

function versionNumber(version: string): number {
	const n = Number.parseInt(String(version), 10);
	return Number.isFinite(n) ? n : 0;
}

function formatAnketaVersionLabel(version: string): string {
	const n = versionNumber(version);
	return n > 0 ? `v${n}` : `v${String(version).trim() || "?"}`;
}

/**
 * Дерево реестра: группа (серия) → версии, отобранные режимом.
 * Актуальные / Утверждённые — по одной версии на серию
 * (`filterV2QuestionnairesByRegistryVersionMode`).
 * `includeAllVersions` — без фильтра режимов (фича ДАДМ выкл.).
 * Имя группы — calcName первой версии серии (мин. номер среди всех).
 */
export function buildV2QuestionnaireRegistryTree(
	versions: readonly V2QuestionnaireVersionRow[],
	mode: V2QuestionnaireRegistryVersionMode,
	options?: { includeAllVersions?: boolean },
): V2QuestionnaireSeriesRow[] {
	const bySeries = new Map<string, V2QuestionnaireVersionRow[]>();
	for (const row of versions) {
		const seriesId = row.seriesId?.trim() || row.id;
		const list = bySeries.get(seriesId);
		if (list) list.push(row);
		else bySeries.set(seriesId, [row]);
	}

	const pickedIds = new Set(
		options?.includeAllVersions
			? versions.map((row) => row.id)
			: filterV2QuestionnairesByRegistryVersionMode(versions, mode).map(
					(row) => row.id,
				),
	);

	const groups: V2QuestionnaireSeriesRow[] = [];
	for (const [seriesId, seriesVersions] of bySeries) {
		const children = seriesVersions
			.filter((v) => pickedIds.has(v.id))
			.sort((a, b) => versionNumber(a.version) - versionNumber(b.version));
		if (children.length === 0) continue;

		const first = [...seriesVersions].sort(
			(a, b) => versionNumber(a.version) - versionNumber(b.version),
		)[0]!;

		groups.push({
			rowKind: "series",
			seriesId,
			displayLabel: first.calcName?.trim() || first.displayLabel || seriesId,
			calcName: first.calcName,
			children: children.map((v) => ({
				...v,
				displayLabel: formatAnketaVersionLabel(v.version),
			})),
		});
	}

	/** Новые анкеты сверху — по дате создания первой версии серии. */
	groups.sort((a, b) => {
		const seriesA = bySeries.get(a.seriesId) ?? a.children;
		const seriesB = bySeries.get(b.seriesId) ?? b.children;
		const firstA = [...seriesA].sort(
			(x, y) => versionNumber(x.version) - versionNumber(y.version),
		)[0];
		const firstB = [...seriesB].sort(
			(x, y) => versionNumber(x.version) - versionNumber(y.version),
		)[0];
		const aTs = Date.parse(firstA?.createdAt ?? "") || 0;
		const bTs = Date.parse(firstB?.createdAt ?? "") || 0;
		if (bTs !== aTs) return bTs - aTs;
		return a.displayLabel.localeCompare(b.displayLabel, "ru", {
			sensitivity: "base",
		});
	});
	return groups;
}

export function flattenV2QuestionnaireRegistryTree(
	tree: readonly V2QuestionnaireSeriesRow[],
): V2QuestionnaireVersionRow[] {
	return tree.flatMap((g) => g.children);
}
