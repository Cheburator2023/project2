import { Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { adminLegacyRedirects, adminRoutes } from "./adminRoutes";
import { playgroundRoutes } from "./playgroundRoutes";
import { trackerRoutes } from "./trackerRoutes";
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
		adminRoutes({ onLogout }),
		trackerRoutes({ onLogout }),
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
