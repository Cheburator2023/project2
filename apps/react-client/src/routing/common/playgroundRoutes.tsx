import type { RouteObject } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { TaskTrackerPage } from "@react-client/features/task-tracker/pages/TaskTrackerPage";
import { V2TemplateLogicPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplateLogicPage";
import { V2TemplatePreviewPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplatePreviewPage";
import { V2TemplateSchemaEditorPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplateSchemaEditorPage";
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
				path: "tasks",
				element: <TaskTrackerPage />,
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
