import { Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import {
	PlaygroundPage,
	V2TemplateLogicPage,
	V2TemplatePreviewPage,
	V2TemplateSchemaEditorPage,
} from "@react-client/routing/lazyPages";
import { commonRoutes } from "./routes";

/** Playground: `/playground` и вложенные v2-экраны конструктора. */
export function playgroundRoutes({
	onLogout,
}: {
	onLogout?: () => void;
}): RouteObject {
	return {
		path: commonRoutes.playground.rootPath,
		element: <MainLayout onLogout={onLogout} />,
		children: [
			{ index: true, element: <PlaygroundPage /> },
			{
				path: "kanban-board",
				element: <Navigate to="/tracker/boards" replace />,
			},
			{
				path: "tasks",
				element: <Navigate to="/tracker/tasks" replace />,
			},
			{
				path: "v2/templates/:templateId/read",
				element: <V2TemplatePreviewPage />,
			},
			{
				path: "v2/templates/:templateId/logic",
				element: <V2TemplateLogicPage />,
			},
			{
				path: "v2/templates/:templateId/edit",
				element: <V2TemplateSchemaEditorPage />,
			},
		],
	};
}
