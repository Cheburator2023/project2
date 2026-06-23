import { Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { SettingsPage } from "@react-client/features/settings/pages/SettingsPage";
import { adminLegacyRedirects, adminRoutes } from "./adminRoutes";
import { playgroundRoutes } from "./playgroundRoutes";
import { commonRoutes } from "./routes";

export { adminRoutes, adminLegacyRedirects } from "./adminRoutes";
export { playgroundRoutes } from "./playgroundRoutes";
export { commonRoutes, navbarGroups } from "./routes";
export * from "./pathHelpers";
export type { AppRouteConfig } from "./types";

export function commonAppRoutes({
	onLogout,
}: {
	onLogout?: () => void;
}): RouteObject[] {
	return [
		{
			path: commonRoutes.settings.rootPath,
			element: <MainLayout onLogout={onLogout} />,
			children: [{ index: true, element: <SettingsPage /> }],
		},
		adminRoutes({ onLogout }),
		playgroundRoutes({ onLogout }),
		...adminLegacyRedirects(),
		{
			path: "/v1/playground",
			element: <Navigate to={commonRoutes.playground.rootPath} replace />,
		},
		{
			path: "/v1/playground/*",
			element: <Navigate to={commonRoutes.playground.rootPath} replace />,
		},
	];
}
