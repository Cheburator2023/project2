import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { collectSelectedVersionRows } from "./v2QuestionnaireGridValue";

export function collectVersionIdsFromGridRows(
	rows: readonly V2QuestionnaireGridRow[],
): string[] {
	const ids: string[] = [];
	for (const row of rows) {
		if (row.rowKind === "series") {
			for (const child of row.children) ids.push(child.id);
			continue;
		}
		ids.push(row.id);
	}
	return ids;
}

/** Обновляет выбор: id текущей страницы добавляются/убираются, остальные страницы сохраняются. */
export function mergeVisibleSelection(
	previousIds: ReadonlySet<string>,
	visibleIds: readonly string[],
	selectedVisibleIds: readonly string[],
): Set<string> {
	const selectedVisible = new Set(selectedVisibleIds);
	const next = new Set(previousIds);
	for (const id of visibleIds) {
		if (selectedVisible.has(id)) next.add(id);
		else next.delete(id);
	}
	return next;
}

export function selectedVisibleIdsFromGridRows(
	selectedRows: readonly V2QuestionnaireGridRow[],
): string[] {
	return collectSelectedVersionRows(selectedRows).map((row) => row.id);
}

export function shouldSelectGridRow(
	row: V2QuestionnaireGridRow,
	selectedIds: ReadonlySet<string>,
): boolean {
	if (row.rowKind === "version") return selectedIds.has(row.id);
	return (
		row.children.length > 0 &&
		row.children.every((child) => selectedIds.has(child.id))
	);
}
