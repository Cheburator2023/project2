import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { AdminPage } from "@react-client/features/admin/AdminPage";
import { CompareReportsPage } from "@react-client/features/anketaCompare/pages/CompareReportsPage";
import { AnketaCreatePage } from "@react-client/features/anketaCRUD/pages/AnketaCreatePage";
import { AnketaPreviewPage } from "@react-client/features/anketaCRUD/pages/AnketaPreviewPage";
import { HomePage } from "@react-client/features/home/pages/HomePage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { Route, Routes } from "react-router";
import { Page404 } from "./Page404";
import { routes } from "./routes";

export const Routing = () => (
	<Routes data-test-id="index--Routes-0">
		<Route
			index
			element={
				<PermissionGuard
					check={(p) => p.canViewAllCalculations}
					message="У вас нет прав на просмотр списка анкет"
				>
					<HomePage data-test-id="index--HomePage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-0"
		/>
		<Route
			path={routes.calculationCreate.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canCreateCalculation}
					message="У вас нет прав на создание анкеты"
				>
					<AnketaCreatePage data-test-id="index--AnketaCreatePage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-1"
		/>
		<Route
			path={routes.calculationPreview.rootPath}
			element={<AnketaPreviewPage data-test-id="index--AnketaPreviewPage-0" />}
			data-test-id="index--Route-2"
		/>
		<Route
			path={routes.calculationCompare.rootPath}
			element={
				<CompareReportsPage data-test-id="index--CompareReportsPage-0" />
			}
			data-test-id="index--Route-3"
		/>
		<Route
			path={routes.admin.rootPath}
			element={<AdminPage data-test-id="index--AdminPage-0" />}
			data-test-id="index--Route-4"
		/>
		<Route
			path={routes.playground.rootPath}
			element={<PlaygroundPage data-test-id="index--PlaygroundPage-0" />}
			data-test-id="index--Route-5"
		/>
		<Route
			path="*"
			element={<Page404 data-test-id="index--Page404-0" />}
			data-test-id="index--Route-6"
		/>
	</Routes>
);
