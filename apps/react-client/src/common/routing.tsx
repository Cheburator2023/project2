import { useRoutes, Navigate } from "react-router-dom";
import { v1Routes } from "@react-client/version/v1/routing";
import { v2Routes } from "@react-client/version/v2/routing";

export default function AppRoutes({ onLogout }: { onLogout?: () => void }) {
	return useRoutes([
		{
			path: "/",
			element: <Navigate to="/v1" replace />,
		},
		v1Routes({ onLogout }),
		v2Routes({ onLogout }),
	]);
}
