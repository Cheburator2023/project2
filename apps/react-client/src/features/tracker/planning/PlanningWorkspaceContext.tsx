import { createContext, useContext } from "react";
import type { KanbanBoardPlanningDetailDto } from "@smart-anketa/api-contract";

type PlanningWorkspaceContextValue = {
	planning: KanbanBoardPlanningDetailDto;
};

const PlanningWorkspaceContext = createContext<PlanningWorkspaceContextValue | null>(
	null,
);

export const PlanningWorkspaceProvider = PlanningWorkspaceContext.Provider;

export function usePlanningWorkspace() {
	const value = useContext(PlanningWorkspaceContext);
	if (!value) {
		throw new Error("usePlanningWorkspace must be used inside planning page");
	}
	return value;
}
