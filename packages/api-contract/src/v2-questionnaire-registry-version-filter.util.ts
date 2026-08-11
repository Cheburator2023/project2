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

/**
 * Актуальные: по каждой серии — строка с максимальным номером версии
 * среди активных entity (рабочая или последняя утверждённая, если новой версии нет).
 *
 * Утверждённые: по каждой серии — последняя версия со статусом «Утверждена»
 * (активная entity; неактивные срезы не показываем).
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
		const activeRows = seriesRows.filter((r) => isActiveEntity(r.status));
		const pool = activeRows.length > 0 ? activeRows : seriesRows;

		if (mode === "approved") {
			const approved = pool.filter(
				(r) => r.workflowGlobalStatus === "Утверждена",
			);
			if (approved.length === 0) continue;
			approved.sort(
				(a, b) => versionNumber(b.version) - versionNumber(a.version),
			);
			picked.push(approved[0]!);
			continue;
		}

		pool.sort((a, b) => versionNumber(b.version) - versionNumber(a.version));
		if (pool[0]) picked.push(pool[0]);
	}

	return picked;
}
