import {
	pathForAdminV2TemplateLogic,
	pathForPlaygroundV2TemplateLogic,
} from "@react-client/routing/routes";

export function resolveV2TemplateLogicPath(
	templateId: string,
	pathname = window.location.pathname,
): string {
	const isAdmin =
		pathname.includes("/admin/") || pathname.startsWith("/admin");
	return isAdmin
		? pathForAdminV2TemplateLogic(templateId)
		: pathForPlaygroundV2TemplateLogic(templateId);
}

export function openV2TemplateLogicPage(opts: {
	templateId: string;
	ruleId?: string;
	pointer?: string;
	pathname?: string;
}): void {
	const params = new URLSearchParams();
	if (opts.ruleId) params.set("ruleId", opts.ruleId);
	if (opts.pointer) params.set("pointer", opts.pointer);
	const base = resolveV2TemplateLogicPath(
		opts.templateId,
		opts.pathname ?? window.location.pathname,
	);
	const qs = params.toString();
	const url = `${window.location.origin}${base}${qs ? `?${qs}` : ""}`;
	window.open(url, "_blank", "noopener,noreferrer");
}
