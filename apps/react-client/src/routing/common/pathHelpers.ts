import { commonRoutes } from "./routes";

/** Query-параметр выбранной версии шаблона на экранах конструктора / логики / предпросмотра. */
export const V2_TEMPLATE_VERSION_QUERY = "versionId";

type V2TemplatePathQuery = {
	versionId?: string | null;
	ruleId?: string | null;
	pointer?: string | null;
};

function appendV2TemplatePathQuery(path: string, query?: V2TemplatePathQuery): string {
	if (!query) return path;
	const params = new URLSearchParams();
	if (query.versionId) {
		params.set(V2_TEMPLATE_VERSION_QUERY, query.versionId);
	}
	if (query.ruleId) params.set("ruleId", query.ruleId);
	if (query.pointer) params.set("pointer", query.pointer);
	const qs = params.toString();
	return qs ? `${path}?${qs}` : path;
}

/** Сегмент `:templateId` уже закодировать при необходимости. */
export const pathForAdminV2Template = (
	templateId: string,
	versionId?: string | null,
) =>
	appendV2TemplatePathQuery(
		commonRoutes.adminV2TemplateEditor.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		{ versionId },
	);

export const pathForAdminV2Dictionary = (dictionaryId: string) =>
	commonRoutes.adminV2DictionaryDetail.rootPath.replace(
		":dictionaryId",
		encodeURIComponent(dictionaryId),
	);

export const pathForAdminV2TypicalWork = (workId: string) =>
	commonRoutes.adminV2TypicalWorkDetail.rootPath.replace(
		":workId",
		encodeURIComponent(workId),
	);

export const pathForAdminV2TemplateHistory = (templateId: string) =>
	commonRoutes.adminV2TemplateHistory.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
	);

export const pathForPlaygroundV2Template = (
	templateId: string,
	versionId?: string | null,
) =>
	appendV2TemplatePathQuery(
		commonRoutes.playgroundV2TemplateEditor.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		{ versionId },
	);

export const pathForAdminV2TemplateRead = (
	templateId: string,
	versionId?: string | null,
) =>
	appendV2TemplatePathQuery(
		commonRoutes.adminV2TemplateRead.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		{ versionId },
	);

export const pathForPlaygroundV2TemplateRead = (
	templateId: string,
	versionId?: string | null,
) =>
	appendV2TemplatePathQuery(
		commonRoutes.playgroundV2TemplateRead.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		{ versionId },
	);

export const pathForAdminV2TemplateLogic = (
	templateId: string,
	query?: Omit<V2TemplatePathQuery, "versionId"> & { versionId?: string | null },
) =>
	appendV2TemplatePathQuery(
		commonRoutes.adminV2TemplateLogic.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		query,
	);

export const pathForPlaygroundV2TemplateLogic = (
	templateId: string,
	query?: Omit<V2TemplatePathQuery, "versionId"> & { versionId?: string | null },
) =>
	appendV2TemplatePathQuery(
		commonRoutes.playgroundV2TemplateLogic.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		query,
	);

/** @deprecated используйте pathForAdminV2TemplateRead */
export const pathForAdminV2TemplatePreview = pathForAdminV2TemplateRead;

/** @deprecated используйте pathForPlaygroundV2TemplateRead */
export const pathForPlaygroundV2TemplatePreview = pathForPlaygroundV2TemplateRead;
