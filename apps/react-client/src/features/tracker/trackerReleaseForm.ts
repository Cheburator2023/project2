import type { TrackerFormField } from "@react-client/features/tracker/components/TrackerFormDialog";
import {
	KANBAN_BOARD_RELEASE_IMAGE_TARGETS,
	normalizeKanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseImageVersions,
} from "@smart-anketa/api-contract";

export function releaseImageVersionFieldName(targetId: string) {
	return `image:${targetId}`;
}

export function releaseImageVersionFields(): TrackerFormField[] {
	return KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => ({
		name: releaseImageVersionFieldName(target.id),
		label: `Образ ${target.label}`,
	}));
}

export function releaseImageVersionsFromForm(
	values: Record<string, string>,
): KanbanBoardReleaseImageVersions {
	return normalizeKanbanBoardReleaseImageVersions(
		Object.fromEntries(
			KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => [
				target.id,
				values[releaseImageVersionFieldName(target.id)] ?? "",
			]),
		),
	);
}

export function releaseImageVersionsToForm(
	versions?: KanbanBoardReleaseImageVersions | null,
): Record<string, string> {
	return Object.fromEntries(
		KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => [
			releaseImageVersionFieldName(target.id),
			versions?.[target.id] ?? "",
		]),
	);
}
