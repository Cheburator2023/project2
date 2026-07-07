import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { routes } from "@react-client/routing/version/v2/routes";
import {
	AnketaCreatePageV2,
	AnketaNewVersionPageV2,
	AnketaPreviewPageV2,
	Page404,
	V2RegistryPage,
} from "@react-client/routing/lazyPages";

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
				path: routes.calculationNewVersion.rootPath,
				element: (
					<PermissionGuard
						check={(p) => p.canCreateCalculation}
						message="У вас нет прав на создание версии анкеты"
					>
						<AnketaNewVersionPageV2 />
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
