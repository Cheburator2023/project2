import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { CompareReportsPage } from "@react-client/features/v1/anketaCompare/pages/CompareReportsPage";
import { AnketaCreatePage } from "@react-client/features/v1/anketaCRUD/pages/AnketaCreatePage";
import { AnketaNewVersionPage } from "@react-client/features/v1/anketaCRUD/pages/AnketaNewVersionPage";
import { AnketaClonePage } from "@react-client/features/v1/anketaCRUD/pages/AnketaClonePage";
import { routes } from "@react-client/routing/version/v2/routes";
import { Page404 } from "@react-client/routing/version/v2/Page404";
import { AnketaPreviewPageV2 } from "@react-client/features/v2/anketaCRUD/pages/AnketaPreviewPageV2";
import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { V2RegistryPage } from "@react-client/features/v2/home/pages/V2RegistryPage";

export const v2Routes = ({ onLogout }: { onLogout?: () => void }) => {
	return {
		path: "/v2",
		element: <MainLayout onLogout={onLogout} />,
		children: [
			{
				index: true,
				element: (
					<PermissionGuard
						check={(p) => p.canViewAllCalculations}
						message="У вас нет прав на просмотр списка анкет"
					>
						<V2RegistryPage />
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
						<AnketaPreviewPageV2 />
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
						<AnketaPreviewPageV2 />
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
						<AnketaNewVersionPage />
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
						<AnketaClonePage />
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
						<CompareReportsPage />
					</PermissionGuard>
				),
			},
			{
				path: "*",
				element: <Page404 />,
			},
		],
	};
};
