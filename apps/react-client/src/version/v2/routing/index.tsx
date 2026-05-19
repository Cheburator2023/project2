import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { AdminPage } from "@react-client/features/admin/AdminPage";
import { CompareReportsPage } from "@react-client/features/anketaCompare/pages/CompareReportsPage";
import { AnketaCreatePage } from "@react-client/features/anketaCRUD/pages/AnketaCreatePage";
import { AnketaNewVersionPage } from "@react-client/features/anketaCRUD/pages/AnketaNewVersionPage";
import { AnketaClonePage } from "@react-client/features/anketaCRUD/pages/AnketaClonePage";
import { AnketaPreviewPage } from "@react-client/features/anketaCRUD/pages/AnketaPreviewPage";
import { HomePage } from "@react-client/features/home/pages/HomePage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { Route, Routes } from "react-router";
import {routes as routesV2} from "@react-client/version/v2/routing/routes";
import {Page404} from "@react-client/version/v2/routing/Page404";
import React from "react";
import {routes} from "@react-client/version/v1/routing/routes";
import {MainLayout} from "@react-client/version/v2/layouts/MainLayout";

export const v2Routes = ({onLogout}: { onLogout?: () => void; }) => {
	return {
		path: "/v2",
		element: <MainLayout onLogout={onLogout}/>,
		children: [
			{
				index: true,
				element:
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр списка анкет"
					>
						<HomePage data-test-id="index--HomePage-0" />
					</PermissionGuard>,
			},
			{
				path: routes.home.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр списка анкет"
					>
						<HomePage data-test-id="index--HomePage-0" />
					</PermissionGuard>,
			},
			{
				path: routes.calculationCreate.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание анкеты"
					>
						<AnketaCreatePage data-test-id="index--AnketaCreatePage-0" />
					</PermissionGuard>,
			},
			{
				path: routes.calculationPreview.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр анкеты"
					>
						<AnketaPreviewPage data-test-id="index--AnketaPreviewPage-0" />
					</PermissionGuard>
			},
			{
				path: routes.calculationNewVersion.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание новой версии анкеты"
					>
						<AnketaNewVersionPage data-test-id="index--AnketaNewVersionPage-0" />
					</PermissionGuard>
			},
			{
				path: routes.calculationClone.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание шаблона анкеты"
					>
						<AnketaClonePage data-test-id="index--AnketaClonePage-0" />
					</PermissionGuard>
			},
			{
				path: routes.calculationCompare.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canExportReports}
						message="У вас нет прав на сравнение отчетов"
					>
						<CompareReportsPage data-test-id="index--CompareReportsPage-0" />
					</PermissionGuard>
			},
			{
				path: routes.admin.rootPath,
				element:
					<PermissionGuard
						check={(p) => p.canAccessAdminPanel}
						message="У вас нет прав на доступ к панели администрирования"
					>
						<AdminPage data-test-id="index--AdminPage-0" />
					</PermissionGuard>
			},
			{
				path: routes.playground.rootPath,
				element:
					<PlaygroundPage data-test-id="index--PlaygroundPage-0" />
			},
			{
				path: "*",
				element:
					<Page404 data-test-id="index--Page404-0" />
			},
		],
	}
}

export const RoutingV2 = ({onLogout}: { onLogout?: () => void; }) => (
	<Route path="v2" element={<MainLayout onLogout={onLogout}/>}>
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
			path={routesV2.home.rootPath}
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
			path={routesV2.calculationCreate.rootPath}
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
			path={routesV2.calculationPreview.rootPath}
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
			path={routesV2.calculationNewVersion.rootPath}
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
			path={routesV2.calculationClone.rootPath}
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
			path={routesV2.calculationCompare.rootPath}
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
			path={routesV2.admin.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canAccessAdminPanel}
					message="У вас нет прав на доступ к панели администрирования"
				>
					<AdminPage data-test-id="index--AdminPage-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-4"
		/>
		<Route
			path={routesV2.playground.rootPath}
			element={<PlaygroundPage data-test-id="index--PlaygroundPage-0" />}
			data-test-id="index--Route-5"
		/>
		<Route
			path="/v2/*"
			element={<Page404 data-test-id="index--Page404-0" />}
			data-test-id="index--Route-6"
		/>
	</Route>
);

export default RoutingV2
