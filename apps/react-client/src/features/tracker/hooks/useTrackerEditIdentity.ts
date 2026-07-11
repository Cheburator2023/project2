import { useKanbanBoardSettings } from "@react-client/common/api/queries/kanban-board";

export function useTrackerEditIdentity(): string {
	const { data: settings } = useKanbanBoardSettings();
	return settings?.defaultCurrentUserAssigneeName?.trim() ?? "";
}
