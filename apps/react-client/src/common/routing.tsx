import { Navigate, useRoutes } from "react-router";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { NoAccessiblePages } from "@react-client/common/primitives/NoAccessiblePages";
import { useFirstAccessiblePagePath } from "@react-client/routing/accessiblePages";
import { commonAppRoutes } from "@react-client/routing/common";
import { Page404 } from "@react-client/routing/lazyPages";
import { v1Routes } from "@react-client/routing/version/v1";
import { v2Routes } from "@react-client/routing/version/v2";

/** Корень: первая доступная по ролям страница; без доступных — заглушка. */
function RootEntryRedirect() {
	const firstAccessible = useFirstAccessiblePagePath();
	if (!firstAccessible) return <NoAccessiblePages />;
	return <Navigate to={firstAccessible} replace />;
}

export default function AppRoutes({ onLogout }: { onLogout?: () => void }) {
	return useRoutes([
		{
			path: "/",
			/** Layout с сайд-панелью и кнопкой выхода нужен и для заглушки «нет доступных страниц». */
			element: <MainLayout onLogout={onLogout} />,
			children: [{ index: true, element: <RootEntryRedirect /> }],
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
