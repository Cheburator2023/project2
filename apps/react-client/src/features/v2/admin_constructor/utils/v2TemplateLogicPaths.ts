import {
	V2_TEMPLATE_VERSION_QUERY,
	pathForAdminV2TemplateLogic,
	pathForPlaygroundV2TemplateLogic,
} from "@react-client/routing/common/pathHelpers";
import { commonRoutes } from "@react-client/routing/common/routes";

export function resolveV2TemplateLogicPath(
	templateId: string,
	pathname = window.location.pathname,
	versionId?: string | null,
): string {
	const adminRoot = commonRoutes.admin.rootPath;
	const isAdmin =
		pathname.startsWith(adminRoot) ||
		pathname.includes(`${adminRoot}/`) ||
		pathname.startsWith("/v2/admin");
	return isAdmin
		? pathForAdminV2TemplateLogic(templateId, { versionId })
		: pathForPlaygroundV2TemplateLogic(templateId, { versionId });
}

export function openV2TemplateLogicPage(opts: {
	templateId: string;
	versionId?: string | null;
	ruleId?: string;
	pointer?: string;
	pathname?: string;
}): void {
	const params = new URLSearchParams();
	if (opts.versionId) params.set(V2_TEMPLATE_VERSION_QUERY, opts.versionId);
	if (opts.ruleId) params.set("ruleId", opts.ruleId);
	if (opts.pointer) params.set("pointer", opts.pointer);
	const base = resolveV2TemplateLogicPath(
		opts.templateId,
		opts.pathname ?? window.location.pathname,
		opts.versionId,
	);
	const qs = params.toString();
	const url = `${window.location.origin}${base}${qs ? `?${qs}` : ""}`;
	window.open(url, "_blank", "noopener,noreferrer");
}
