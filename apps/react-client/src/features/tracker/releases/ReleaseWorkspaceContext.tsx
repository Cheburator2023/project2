import { createContext, useContext } from "react";
import type { KanbanBoardReleaseDetailDto } from "@smart-anketa/api-contract";

const ReleaseWorkspaceContext =
	createContext<KanbanBoardReleaseDetailDto | null>(null);

export const ReleaseWorkspaceProvider = ReleaseWorkspaceContext.Provider;

export function useReleaseWorkspace() {
	const value = useContext(ReleaseWorkspaceContext);
	if (!value) {
		throw new Error("useReleaseWorkspace must be used inside release page");
	}
	return value;
}
