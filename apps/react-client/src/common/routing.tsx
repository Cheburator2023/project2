import { Navigate, useRoutes } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { commonAppRoutes } from "@react-client/routing/common";
import { Page404 } from "@react-client/routing/common/Page404";
import { v1Routes } from "@react-client/routing/version/v1";
import { v2Routes } from "@react-client/routing/version/v2";

export default function AppRoutes({ onLogout }: { onLogout?: () => void }) {
	return useRoutes([
		{
			path: "/",
			element: <Navigate to="/v2" replace />,
		},
		v1Routes({ onLogout }),
		v2Routes({ onLogout }),
		...commonAppRoutes({ onLogout }),
		{
			path: "*",
			element: <MainLayout onLogout={onLogout} />,
			children: [{ path: "*", element: <Page404 /> }],
		},
	]);
}
