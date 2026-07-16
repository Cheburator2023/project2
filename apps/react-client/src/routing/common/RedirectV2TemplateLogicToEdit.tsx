import { Navigate, useLocation, useParams } from "react-router";
import {
	LOGIC_TAB_QUERY,
	WORK_ID_QUERY,
} from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import {
	V2_TEMPLATE_VERSION_QUERY,
	pathForAdminV2Template,
	pathForPlaygroundV2Template,
} from "./pathHelpers";
import { commonRoutes } from "./routes";

function isAdminTemplatePath(pathname: string): boolean {
	const adminRoot = commonRoutes.admin.rootPath;
	return (
		pathname.startsWith(adminRoot) ||
		pathname.includes(`${adminRoot}/`) ||
		pathname.startsWith("/v2/admin")
	);
}

/** Старые URL `/logic` → конструктор с вкладкой «Логика». */
export function RedirectV2TemplateLogicToEdit() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const { pathname, search } = useLocation();
	const isAdmin = isAdminTemplatePath(pathname);

	const params = new URLSearchParams(search);
	params.delete(LOGIC_TAB_QUERY);
	params.delete(WORK_ID_QUERY);

	const versionId = params.get(V2_TEMPLATE_VERSION_QUERY);
	const editPath = isAdmin
		? pathForAdminV2Template(templateId, versionId)
		: pathForPlaygroundV2Template(templateId, versionId);

	const [base, existingQs = ""] = editPath.split("?");
	const merged = new URLSearchParams(existingQs);
	for (const [key, value] of params.entries()) {
		if (key === V2_TEMPLATE_VERSION_QUERY && merged.has(key)) continue;
		merged.set(key, value);
	}
	const qs = merged.toString();
	return <Navigate to={qs ? `${base}?${qs}` : base} replace />;
}
