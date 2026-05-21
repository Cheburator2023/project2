import { Navigate, useParams } from "react-router";
import { PermissionGuard } from "@react-client/common/primitives/PermissionGuard";
import { AdminLayout } from "@react-client/features/v2/admin/layouts/AdminLayout";
import { AdminV2DictionariesPage } from "@react-client/features/v2/admin/pages/AdminV2DictionariesPage";
import { AdminV2DictionaryDetailPage } from "@react-client/features/v2/admin/pages/AdminV2DictionaryDetailPage";
import { AdminV2GuidePage } from "@react-client/features/v2/admin/pages/AdminV2GuidePage";
import { AdminV2HistoryPage } from "@react-client/features/v2/admin/pages/AdminV2HistoryPage";
import { AdminV2SchemasPage } from "@react-client/features/v2/admin/pages/AdminV2SchemasPage";
import { AdminV2TemplateHistoryPage } from "@react-client/features/v2/admin/pages/AdminV2TemplateHistoryPage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { V2TemplateLogicPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplateLogicPage";
import { V2TemplatePreviewPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplatePreviewPage";
import { V2TemplateSchemaEditorPage } from "@react-client/features/v2/admin_constructor/pages/V2TemplateSchemaEditorPage";
import { routes } from "@react-client/routing/version/v1/routing/routes";
import type { RouteObject } from "react-router";

/** Дочерние маршруты админки под `/v2/admin` (внутри MainLayout). */
export function adminV2ChildRoutes(): RouteObject[] {
	return [
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
					element: <Navigate to={routes.adminV2Schemas.rootPath} replace />,
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
				{ path: "history", element: <AdminV2HistoryPage /> },
				{
					path: "templates/:templateId/read",
					element: <V2TemplatePreviewPage />,
				},
				{
					path: "templates/:templateId/logic",
					element: <V2TemplateLogicPage />,
				},
				{
					path: "templates/:templateId/edit",
					element: <V2TemplateSchemaEditorPage />,
				},
			],
		},
	];
}

function LegacyAdminTemplateRedirect({ suffix }: { suffix: string }) {
	const { templateId = "" } = useParams<{ templateId: string }>();
	return (
		<Navigate
			to={`/v2/admin/templates/${encodeURIComponent(templateId)}${suffix}`}
			replace
		/>
	);
}

function LegacyAdminDictionaryRedirect() {
	const { dictionaryId = "" } = useParams<{ dictionaryId: string }>();
	return (
		<Navigate
			to={`/v2/admin/dictionaries/${encodeURIComponent(dictionaryId)}`}
			replace
		/>
	);
}

function LegacyAdminSchemaHistoryRedirect() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	return (
		<Navigate
			to={`/v2/admin/schemas/${encodeURIComponent(templateId)}/history`}
			replace
		/>
	);
}

/** Редиректы со старых URL /admin/v2/... */
export function adminV2LegacyRedirects(): RouteObject[] {
	return [
		{
			path: "/admin",
			element: <Navigate to={routes.adminV2Schemas.rootPath} replace />,
		},
		{
			path: "/admin/v2/schemas",
			element: <Navigate to={routes.adminV2Schemas.rootPath} replace />,
		},
		{
			path: "/admin/v2/schemas/:templateId/history",
			element: <LegacyAdminSchemaHistoryRedirect />,
		},
		{
			path: "/admin/v2/guide",
			element: <Navigate to={routes.adminV2Guide.rootPath} replace />,
		},
		{
			path: "/admin/v2/dictionaries",
			element: <Navigate to={routes.adminV2Dictionaries.rootPath} replace />,
		},
		{
			path: "/admin/v2/dictionaries/:dictionaryId",
			element: <LegacyAdminDictionaryRedirect />,
		},
		{
			path: "/admin/v2/history",
			element: <Navigate to={routes.adminV2History.rootPath} replace />,
		},
		{
			path: "/admin/v2/templates/:templateId/read",
			element: <LegacyAdminTemplateRedirect suffix="/read" />,
		},
		{
			path: "/admin/v2/templates/:templateId/logic",
			element: <LegacyAdminTemplateRedirect suffix="/logic" />,
		},
		{
			path: "/admin/v2/templates/:templateId/edit",
			element: <LegacyAdminTemplateRedirect suffix="/edit" />,
		},
	];
}

export function playgroundRoutes(): RouteObject[] {
	return [
		{ path: routes.playground.rootPath, element: <PlaygroundPage /> },
		{
			path: routes.playgroundV2TemplateRead.rootPath,
			element: <V2TemplatePreviewPage />,
		},
		{
			path: routes.playgroundV2TemplateLogic.rootPath,
			element: <V2TemplateLogicPage />,
		},
		{
			path: routes.playgroundV2TemplateEditor.rootPath,
			element: <V2TemplateSchemaEditorPage />,
		},
	];
}
