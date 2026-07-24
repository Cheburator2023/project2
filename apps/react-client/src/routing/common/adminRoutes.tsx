import { Navigate, useLocation, useParams } from "react-router";
import type { RouteObject } from "react-router";
import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import {
	AdminLayout,
	AdminV2AuditJournalPage,
	AdminV2DictionariesPage,
	AdminV2DictionaryDetailPage,
	AdminV2GuidePage,
	AdminV2HistoryPage,
	AdminV2SchemasPage,
	AdminV2SettingsPage,
	AdminV2StreamsPage,
	AdminV2TemplateHistoryPage,
	AdminV2TypicalWorkDetailPage,
	AdminV2TypicalWorksPage,
	AdminV2FormulaRegistryPage,
	V2TemplatePreviewPage,
	V2TemplateSchemaEditorPage,
} from "@react-client/routing/lazyPages";
import { RedirectV2TemplateLogicToEdit } from "./RedirectV2TemplateLogicToEdit";
import { commonRoutes } from "./routes";

function adminChildRoutes(): RouteObject[] {
	return [
		{
			path: "audit",
			element: (
				<PermissionGuard
					check={(p) => p.canAccessAudit || p.canAccessAdminPanel}
					message="У вас нет прав на просмотр журнала аудита"
				>
					<AdminV2AuditJournalPage />
				</PermissionGuard>
			),
		},
		{
			element: (
				<PermissionGuard
					check={(p) => p.canAccessAdminPanel}
					message="У вас нет прав на доступ к панели администрирования"
				>
					<AdminLayout />
				</PermissionGuard>
			),
			children: [
				{ index: true, element: <Navigate to="schemas" replace /> },
				{
					path: "templates",
					element: <Navigate to={commonRoutes.adminV2Schemas.rootPath} replace />,
				},
				{
					path: "schemas/:templateId/history",
					element: <AdminV2TemplateHistoryPage />,
				},
				{ path: "schemas", element: <AdminV2SchemasPage /> },
				{ path: "guide", element: <AdminV2GuidePage /> },
				{ path: "dictionaries", element: <AdminV2DictionariesPage /> },
				{
					path: "dictionaries/:dictionaryId",
					element: <AdminV2DictionaryDetailPage />,
				},
				{ path: "streams", element: <AdminV2StreamsPage /> },
				{ path: "typical-works", element: <AdminV2TypicalWorksPage /> },
				{ path: "formulas", element: <AdminV2FormulaRegistryPage /> },
				{
					path: "typical-works/:workId",
					element: <AdminV2TypicalWorkDetailPage />,
				},
				{ path: "history", element: <AdminV2HistoryPage /> },
				{ path: "settings", element: <AdminV2SettingsPage /> },
				{
					path: "templates/:templateId/read",
					element: <V2TemplatePreviewPage />,
				},
				{
					path: "templates/:templateId/logic",
					element: <RedirectV2TemplateLogicToEdit />,
				},
				{
					path: "templates/:templateId/edit",
					element: <V2TemplateSchemaEditorPage />,
				},
			],
		},
	];
}

/** Админка v2: `/admin/...` с общим сайдбаром. */
export function adminRoutes({ onLogout }: { onLogout?: () => void }): RouteObject {
	return {
		path: commonRoutes.admin.rootPath,
		element: <MainLayout onLogout={onLogout} />,
		children: adminChildRoutes(),
	};
}

function LegacyAdminTemplateRedirect({ suffix }: { suffix: string }) {
	const { templateId = "" } = useParams<{ templateId: string }>();
	return (
		<Navigate
			to={`${commonRoutes.admin.rootPath}/templates/${encodeURIComponent(templateId)}${suffix}`}
			replace
		/>
	);
}

function LegacyAdminDictionaryRedirect() {
	const { dictionaryId = "" } = useParams<{ dictionaryId: string }>();
	return (
		<Navigate
			to={pathForAdminDictionaryLegacy(dictionaryId)}
			replace
		/>
	);
}

function pathForAdminDictionaryLegacy(dictionaryId: string) {
	return commonRoutes.adminV2DictionaryDetail.rootPath.replace(
		":dictionaryId",
		encodeURIComponent(dictionaryId),
	);
}

function LegacyAdminSchemaHistoryRedirect() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	return (
		<Navigate
			to={`${commonRoutes.admin.rootPath}/schemas/${encodeURIComponent(templateId)}/history`}
			replace
		/>
	);
}

function RedirectV2AdminPrefixToAdmin() {
	const { pathname } = useLocation();
	const rest = pathname.replace(/^\/v2\/admin\/?/, "");
	const target = rest
		? `${commonRoutes.admin.rootPath}/${rest}`
		: commonRoutes.adminV2Schemas.rootPath;
	return <Navigate to={target} replace />;
}

/** Редиректы со старых URL. */
export function adminLegacyRedirects(): RouteObject[] {
	return [
		{
			path: "/v2/admin",
			element: <RedirectV2AdminPrefixToAdmin />,
		},
		{
			path: "/v2/admin/*",
			element: <RedirectV2AdminPrefixToAdmin />,
		},
		{
			path: "/admin/v2/schemas",
			element: <Navigate to={commonRoutes.adminV2Schemas.rootPath} replace />,
		},
		{
			path: "/admin/v2/schemas/:templateId/history",
			element: <LegacyAdminSchemaHistoryRedirect />,
		},
		{
			path: "/admin/v2/guide",
			element: <Navigate to={commonRoutes.adminV2Guide.rootPath} replace />,
		},
		{
			path: "/admin/v2/dictionaries",
			element: <Navigate to={commonRoutes.adminV2Dictionaries.rootPath} replace />,
		},
		{
			path: "/admin/v2/streams",
			element: <Navigate to={commonRoutes.adminV2Streams.rootPath} replace />,
		},
		{
			path: "/admin/v2/dictionaries/:dictionaryId",
			element: <LegacyAdminDictionaryRedirect />,
		},
		{
			path: "/admin/v2/history",
			element: <Navigate to={commonRoutes.adminV2History.rootPath} replace />,
		},
		{
			path: "/admin/v2/settings",
			element: <Navigate to={commonRoutes.adminV2Settings.rootPath} replace />,
		},
		{
			path: "/admin/v2/templates/:templateId/read",
			element: <LegacyAdminTemplateRedirect suffix="/read" />,
		},
		{
			path: "/admin/v2/templates/:templateId/logic",
			element: <RedirectV2TemplateLogicToEdit />,
		},
		{
			path: "/admin/v2/templates/:templateId/edit",
			element: <LegacyAdminTemplateRedirect suffix="/edit" />,
		},
	];
}
