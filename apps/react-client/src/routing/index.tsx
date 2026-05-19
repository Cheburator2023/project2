import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { AdminLayout } from "@react-client/features/admin/layouts/AdminLayout";
import { AdminV2DictionariesPage } from "@react-client/features/admin/pages/AdminV2DictionariesPage";
import { AdminV2DictionaryDetailPage } from "@react-client/features/admin/pages/AdminV2DictionaryDetailPage";
import { AdminV2GuidePage } from "@react-client/features/admin/pages/AdminV2GuidePage";
import { AdminV2HistoryPage } from "@react-client/features/admin/pages/AdminV2HistoryPage";
import { AdminV2SchemasPage } from "@react-client/features/admin/pages/AdminV2SchemasPage";
import { AdminV2TemplateHistoryPage } from "@react-client/features/admin/pages/AdminV2TemplateHistoryPage";
import { CompareReportsPage } from "@react-client/features/anketaCompare/pages/CompareReportsPage";
import { AnketaCreatePage } from "@react-client/features/anketaCRUD/pages/AnketaCreatePage";
import { AnketaNewVersionPage } from "@react-client/features/anketaCRUD/pages/AnketaNewVersionPage";
import { AnketaClonePage } from "@react-client/features/anketaCRUD/pages/AnketaClonePage";
import { AnketaPreviewPage } from "@react-client/features/anketaCRUD/pages/AnketaPreviewPage";
import { HomePage } from "@react-client/features/home/pages/HomePage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { V2TemplatePreviewPage } from "@react-client/features/v2_constructor/pages/V2TemplatePreviewPage";
import { V2TemplateSchemaEditorPage } from "@react-client/features/v2_constructor/pages/V2TemplateSchemaEditorPage";
import { Navigate, Route, Routes } from "react-router";
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
			path={routes.admin.rootPath}
			element={
				<PermissionGuard
					check={(p) => p.canAccessAdminPanel}
					message="У вас нет прав на доступ к панели администрирования"
				>
					<AdminLayout data-test-id="index--AdminLayout-0" />
				</PermissionGuard>
			}
			data-test-id="index--Route-4-admin"
		>
			<Route
				index
				element={<Navigate to="v2/schemas" replace />}
				data-test-id="index--Route-admin-redirect"
			/>
			<Route
				path="v2/templates"
				element={<Navigate to="/admin/v2/schemas" replace />}
				data-test-id="index--Route-admin-templates-legacy-redirect"
			/>
			<Route
				path="v2/schemas/:templateId/history"
				element={<AdminV2TemplateHistoryPage data-test-id="index--AdminV2TemplateHistoryPage-0" />}
				data-test-id="index--Route-admin-schema-history"
			/>
			<Route
				path="v2/schemas"
				element={<AdminV2SchemasPage data-test-id="index--AdminV2SchemasPage-0" />}
				data-test-id="index--Route-admin-schemas"
			/>
			<Route
				path="v2/guide"
				element={<AdminV2GuidePage data-test-id="index--AdminV2GuidePage-0" />}
				data-test-id="index--Route-admin-guide"
			/>
			<Route
				path="v2/dictionaries"
				element={
					<AdminV2DictionariesPage data-test-id="index--AdminV2DictionariesPage-0" />
				}
				data-test-id="index--Route-admin-dictionaries"
			/>
			<Route
				path="v2/dictionaries/:dictionaryId"
				element={
					<AdminV2DictionaryDetailPage data-test-id="index--AdminV2DictionaryDetailPage-0" />
				}
				data-test-id="index--Route-admin-dictionary-detail"
			/>
			<Route
				path="v2/history"
				element={<AdminV2HistoryPage data-test-id="index--AdminV2HistoryPage-0" />}
				data-test-id="index--Route-admin-history"
			/>
			<Route
				path="v2/templates/:templateId/read"
				element={<V2TemplatePreviewPage data-test-id="index--V2TemplatePreviewPage-0" />}
				data-test-id="index--Route-admin-v2-read"
			/>
			<Route
				path="v2/templates/:templateId/edit"
				element={<V2TemplateSchemaEditorPage data-test-id="index--V2TemplateSchemaEditorPage-0" />}
				data-test-id="index--Route-admin-v2-edit"
			/>
		</Route>

		<Route
			path={routes.playground.rootPath}
			element={<PlaygroundPage data-test-id="index--PlaygroundPage-0" />}
			data-test-id="index--Route-5"
		/>
		<Route
			path={routes.playgroundV2TemplateRead.rootPath}
			element={<V2TemplatePreviewPage data-test-id="index--V2TemplatePreviewPlayground-0" />}
			data-test-id="index--Route-playground-v2-read"
		/>
		<Route
			path={routes.playgroundV2TemplateEditor.rootPath}
			element={<V2TemplateSchemaEditorPage data-test-id="index--V2TemplateSchemaEditorPlayground-0" />}
			data-test-id="index--Route-playground-v2-editor"
		/>
		<Route
			path="*"
			element={<Page404 data-test-id="index--Page404-0" />}
			data-test-id="index--Route-6"
		/>
	</Routes>
);
