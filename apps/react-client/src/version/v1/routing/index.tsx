import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { CompareReportsPage } from "@react-client/features/v1/anketaCompare/pages/CompareReportsPage";
import { AnketaCreatePage } from "@react-client/features/v1/anketaCRUD/pages/AnketaCreatePage";
import { AnketaNewVersionPage } from "@react-client/features/v1/anketaCRUD/pages/AnketaNewVersionPage";
import { AnketaClonePage } from "@react-client/features/v1/anketaCRUD/pages/AnketaClonePage";
import { AnketaPreviewPage } from "@react-client/features/v1/anketaCRUD/pages/AnketaPreviewPage";
import { HomePage } from "@react-client/features/v1/home/pages/HomePage";
import { Navigate, Route } from "react-router";
import { routes } from "@react-client/routing/version/v1/routes";
import { Page404 } from "@react-client/routing/version/v1/Page404";
import { MainLayout } from "@react-client/common/layouts/MainLayout";

export const v1Routes = ({ onLogout }: { onLogout?: () => void }) => {
	return {
		path: "/v1",
		element: <MainLayout onLogout={onLogout} />,
		children: [
			{
				index: true,
				element: (
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр списка анкет"
					>
						<HomePage data-test-id="index--HomePage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.home.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр списка анкет"
					>
						<HomePage data-test-id="index--HomePage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.calculationCreate.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание анкеты"
					>
						<AnketaCreatePage data-test-id="index--AnketaCreatePage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.calculationPreview.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр анкеты"
					>
						<AnketaPreviewPage data-test-id="index--AnketaPreviewPage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.calculationNewVersion.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание новой версии анкеты"
					>
						<AnketaNewVersionPage data-test-id="index--AnketaNewVersionPage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.calculationClone.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание шаблона анкеты"
					>
						<AnketaClonePage data-test-id="index--AnketaClonePage-0" />
					</PermissionGuard>
				),
			},
			{
				path: routes.calculationCompare.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canExportReports}
						message="У вас нет прав на сравнение отчетов"
					>
						<CompareReportsPage data-test-id="index--CompareReportsPage-0" />
					</PermissionGuard>
				),
			},
			{
				path: "*",
				element: <Page404 data-test-id="index--Page404-0" />,
			},
		],
	};
};

export const Routing = ({ onLogout }: { onLogout?: () => void }) => (
	<Route path="v1" element={<MainLayout onLogout={onLogout} />}>
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
			path={routes.home.rootPath}
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
			element={
				<PermissionGuard
					check={(p) => p.canViewAllCalculations}
					message="У вас нет прав на просмотр анкеты"
				>
					<AnketaPreviewPage data-test-id="index--AnketaPreviewPage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-2"
		/>
		<Route
			path={routes.calculationNewVersion.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canCreateCalculation}
					message="У вас нет прав на создание новой версии анкеты"
				>
					<AnketaNewVersionPage data-test-id="index--AnketaNewVersionPage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-7"
		/>
		<Route
			path={routes.calculationClone.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canCreateCalculation}
					message="У вас нет прав на создание шаблона анкеты"
				>
					<AnketaClonePage data-test-id="index--AnketaClonePage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-8"
		/>
		<Route
			path={routes.calculationCompare.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canExportReports}
					message="У вас нет прав на сравнение отчетов"
				>
					<CompareReportsPage data-test-id="index--CompareReportsPage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-3"
		/>
		<Route
			path="admin"
			element={<Navigate to="/admin/schemas" replace />}
			data-test-id="index--Route-4"
		/>
		<Route
			path="/v1/*"
			element={<Page404 data-test-id="index--Page404-0" />}
			data-test-id="index--Route-6"
		/>
	</Route>
);

export default Routing;
