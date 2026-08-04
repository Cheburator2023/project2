import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import {
	KanbanBoardPage,
	KanbanTaskPage,
	TrackerAssigneesPage,
	TrackerBoardHistoryPage,
	TrackerBoardsPage,
	TrackerCustomersPage,
	TrackerGanttPage,
	TrackerProjectsPage,
	TrackerSettingsPage,
	TrackerSprintsPage,
	TrackerStreamsPage,
	TrackerSupersprintsPage,
	TrackerMyTasksPage,
	TrackerTasksPage,
	TrackerTrashPage,
} from "@react-client/routing/lazyPages";
import {
	TrackerLegacyBoardRedirect,
	TrackerLegacyTaskRedirect,
} from "@react-client/features/tracker/components/TrackerLegacyRedirects";
import { commonRoutes } from "./routes";

export function trackerRoutes({
	onLogout,
}: {
	onLogout?: () => void;
}): RouteObject {
	return {
		path: commonRoutes.tracker.rootPath,
		element: (
			<PermissionGuard
				check={(p) => p.canAccessTracker}
				message="У вас нет прав на доступ к трекеру задач"
			>
				<MainLayout onLogout={onLogout} />
			</PermissionGuard>
		),
		children: [
			{ index: true, element: <Navigate to="projects" replace /> },
			{ path: "projects", element: <TrackerProjectsPage /> },
			{ path: "boards", element: <TrackerBoardsPage /> },
			{ path: "my-tasks", element: <TrackerMyTasksPage /> },
			{ path: "tasks", element: <TrackerTasksPage /> },
			{ path: "gantt", element: <TrackerGanttPage /> },
			{ path: "assignees", element: <TrackerAssigneesPage /> },
			{ path: "customers", element: <TrackerCustomersPage /> },
			{ path: "supersprints", element: <TrackerSupersprintsPage /> },
			{ path: "sprints", element: <TrackerSprintsPage /> },
			{ path: "streams", element: <TrackerStreamsPage /> },
			{ path: "settings", element: <TrackerSettingsPage /> },
			{ path: "history", element: <TrackerBoardHistoryPage /> },
			{ path: "trash", element: <TrackerTrashPage /> },
			{ path: "tasks/new", element: <KanbanTaskPage mode="create" /> },
			{ path: "task/new", element: <KanbanTaskPage mode="create" /> },
			{ path: "board/:boardKey", element: <KanbanBoardPage /> },
			{
				path: "board/:boardKey/history",
				element: <TrackerBoardHistoryPage />,
			},
			{
				path: "board/:boardKey/task/new",
				element: <KanbanTaskPage mode="create" />,
			},
			{ path: "task/:taskKey", element: <KanbanTaskPage /> },
			{ path: "boards/:boardId", element: <TrackerLegacyBoardRedirect /> },
			{
				path: "boards/:boardId/tasks/:taskId",
				element: <TrackerLegacyTaskRedirect />,
			},
		],
	};
}
