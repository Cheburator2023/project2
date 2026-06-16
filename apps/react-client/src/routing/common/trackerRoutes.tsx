import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { KanbanBoardPage } from "@react-client/features/kanban-board/pages/KanbanBoardPage";
import { KanbanTaskPage } from "@react-client/features/kanban-board/pages/KanbanTaskPage";
import { TrackerAssigneesPage } from "@react-client/features/tracker/pages/TrackerAssigneesPage";
import { TrackerBoardsPage } from "@react-client/features/tracker/pages/TrackerBoardsPage";
import { TrackerProjectsPage } from "@react-client/features/tracker/pages/TrackerProjectsPage";
import { TrackerTasksPage } from "@react-client/features/tracker/pages/TrackerTasksPage";
import { commonRoutes } from "./routes";

export function trackerRoutes({
	onLogout,
}: {
	onLogout?: () => void;
}): RouteObject {
	return {
		path: commonRoutes.tracker.rootPath,
		element: <MainLayout onLogout={onLogout} />,
		children: [
			{ index: true, element: <Navigate to="projects" replace /> },
			{ path: "projects", element: <TrackerProjectsPage /> },
			{ path: "boards", element: <TrackerBoardsPage /> },
			{ path: "tasks", element: <TrackerTasksPage /> },
			{ path: "assignees", element: <TrackerAssigneesPage /> },
			{ path: "tasks/new", element: <KanbanTaskPage mode="create" /> },
			{ path: "boards/:boardId", element: <KanbanBoardPage /> },
			{ path: "boards/:boardId/tasks/:taskId", element: <KanbanTaskPage /> },
		],
	};
}
