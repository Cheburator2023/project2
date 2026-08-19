import type { V2AnketaGlobalStatus } from "./v2-anketa-workflow.types";

/** Режим отображения версий в реестре анкет. */
export type V2QuestionnaireRegistryVersionMode = "actual" | "approved";

export const V2_QUESTIONNAIRE_REGISTRY_VERSION_MODE_LABELS: Record<
	V2QuestionnaireRegistryVersionMode,
	string
> = {
	actual: "Актуальные",
	approved: "Утверждённые",
};

type VersionFilterRow = {
	id: string;
	seriesId: string;
	version: string;
	status?: string | null;
	workflowGlobalStatus?: V2AnketaGlobalStatus | string | null;
};

function versionNumber(version: string): number {
	const n = Number.parseInt(String(version), 10);
	return Number.isFinite(n) ? n : 0;
}

function isActiveEntity(status: string | null | undefined): boolean {
	return status == null || status === "" || status === "active";
}

function isArchivedEntity(status: string | null | undefined): boolean {
	return status === "archived";
}

/**
 * Выбор серии для режима реестра (одна representative-строка на серию).
 *
 * Актуальные: по каждой серии — активная entity с макс. номером версии.
 * Если активных нет (утверждённую деактивировали) — последняя неархивная,
 * чтобы срез «Неактивная» оставался в реестре.
 *
 * Утверждённые: последняя версия со статусом «Утверждена» по серии,
 * в т.ч. неактивный исторический срез после создания новой версии.
 *
 * Пагинация идёт по этим representative; в ответ потом подмешиваются
 * все версии выбранных серий (`expandV2QuestionnaireRegistrySeriesMembers`).
 */
export function filterV2QuestionnairesByRegistryVersionMode<
	T extends VersionFilterRow,
>(rows: readonly T[], mode: V2QuestionnaireRegistryVersionMode): T[] {
	const bySeries = new Map<string, T[]>();
	for (const row of rows) {
		const seriesId = row.seriesId?.trim() || row.id;
		const list = bySeries.get(seriesId);
		if (list) list.push(row);
		else bySeries.set(seriesId, [row]);
	}

	const picked: T[] = [];
	for (const seriesRows of bySeries.values()) {
		if (mode === "approved") {
			const approved = seriesRows.filter(
				(r) => r.workflowGlobalStatus === "Утверждена",
			);
			if (approved.length === 0) continue;
			approved.sort(
				(a, b) => versionNumber(b.version) - versionNumber(a.version),
			);
			picked.push(approved[0]!);
			continue;
		}

		const visibleRows = seriesRows.filter((r) => !isArchivedEntity(r.status));
		if (visibleRows.length === 0) continue;
		const activeRows = visibleRows.filter((r) => isActiveEntity(r.status));
		const pool = activeRows.length > 0 ? activeRows : visibleRows;
		pool.sort((a, b) => versionNumber(b.version) - versionNumber(a.version));
		picked.push(pool[0]!);
	}

	return picked;
}

/**
 * Все версии серий, попавших на страницу (порядок серий как у `picked`,
 * внутри серии — по номеру версии). Не режет inactive-срезы.
 */
export function expandV2QuestionnaireRegistrySeriesMembers<
	T extends VersionFilterRow,
>(allRows: readonly T[], picked: readonly T[]): T[] {
	const bySeries = new Map<string, T[]>();
	for (const row of allRows) {
		const seriesId = row.seriesId?.trim() || row.id;
		const list = bySeries.get(seriesId);
		if (list) list.push(row);
		else bySeries.set(seriesId, [row]);
	}

	const out: T[] = [];
	const seen = new Set<string>();
	for (const row of picked) {
		const seriesId = row.seriesId?.trim() || row.id;
		if (seen.has(seriesId)) continue;
		seen.add(seriesId);
		const members = [...(bySeries.get(seriesId) ?? [])].sort(
			(a, b) => versionNumber(a.version) - versionNumber(b.version),
		);
		out.push(...members);
	}
	return out;
}
