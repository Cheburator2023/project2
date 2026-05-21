import { Navigate, useRoutes } from "react-router";
import {
	adminV2LegacyRedirects,
	playgroundRoutes,
} from "@react-client/routing/adminV2Routes";
import { v1Routes } from "@react-client/routing/version/v1";
import { v2Routes } from "@react-client/routing/version/v2";
import { Page404 } from "@react-client/routing/version/v1/Page404";

export default function AppRoutes({ onLogout }: { onLogout?: () => void }) {
	return useRoutes([
		{
			path: "/",
			element: <Navigate to="/v2" replace />,
		},
		v1Routes({ onLogout }),
		v2Routes({ onLogout }),
		...adminV2LegacyRedirects(),
		...playgroundRoutes(),
		{
			path: "*",
			element: <Page404 />,
		},
	]);
}
