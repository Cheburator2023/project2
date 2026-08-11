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
 * Актуальные: по каждой серии — единственная активная entity
 * (макс. номер версии среди status=active). Без активных — серия не показывается.
 *
 * Утверждённые: последняя версия со статусом «Утверждена» по серии,
 * в т.ч. неактивный исторический срез после создания новой версии.
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

		const activeRows = seriesRows.filter((r) => isActiveEntity(r.status));
		if (activeRows.length === 0) continue;
		activeRows.sort(
			(a, b) => versionNumber(b.version) - versionNumber(a.version),
		);
		picked.push(activeRows[0]!);
	}

	return picked;
}
