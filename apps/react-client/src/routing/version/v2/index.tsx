import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { AnketaCreatePageV2 } from "@react-client/features/v2/anketaCRUD/pages/AnketaCreatePage";
import { routes } from "@react-client/routing/version/v2/routes";
import { Page404 } from "@react-client/routing/version/v2/Page404";
import { AnketaPreviewPageV2 } from "@react-client/features/v2/anketaCRUD/pages/AnketaPreviewPageV2";
import { V2RegistryPage } from "@react-client/version/v2/src/features/home/pages/V2RegistryPage";
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
						<AnketaCreatePageV2 />
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
				path: "*",
				element: <Page404 />,
			},
		],
	};
};
