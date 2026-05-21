type NavbarGroupKey = keyof typeof navbarGroups;

export type AppRouteConfig = {
	rootPath: string;
	name: string;
	disabled?: boolean;
	devOnly?: boolean;
	/** Пункт основного сайдменю */
	showInNavbar?: boolean;
	navbar?: {
		group?: NavbarGroupKey;
		order?: number;
	};
	/** Короткий заголовок для крошек на вложенных экранах */
	shortName?: string;
};

export const navbarGroups = {
	main: { title: "Разделы" },
	adminV2: { title: "Администрирование" },
} as const;

export const routes = {
	home: {
		rootPath: "",
		name: "Главная / Реестр",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "main", order: 0 },
	},
	calculationCreate: {
		rootPath: "calculation/create",
		name: "Создание анкеты",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "main", order: 10 },
	},
	calculationPreview: {
		rootPath: "calculation/preview/:id",
		name: "Просмотр анкеты",
		disabled: false,
	},
	calculationNewVersion: {
		rootPath: "calculation/new_version/:id",
		name: "Создание новой версии анкеты",
		disabled: false,
	},
	calculationClone: {
		rootPath: "calculation/clone/:id",
		name: "Создание шаблона анкеты",
		disabled: false,
	},
	calculationCompare: {
		rootPath: "calculation/compare",
		name: "Сравнение расчетов",
		disabled: false,
	},
	admin: {
		rootPath: "/v2/admin",
		name: "Администрирование",
		disabled: true,
		showInNavbar: false,
	},
	adminV2Schemas: {
		rootPath: "/v2/admin/schemas",
		name: "Схемы",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 0 },
	},
	adminV2Guide: {
		rootPath: "/v2/admin/guide",
		name: "Справка",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 3 },
	},
	adminV2Dictionaries: {
		rootPath: "/v2/admin/dictionaries",
		name: "Словари",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 5 },
	},
	adminV2DictionaryDetail: {
		rootPath: "/v2/admin/dictionaries/:dictionaryId",
		name: "Справочник",
		shortName: "Справочник",
		disabled: false,
	},
	adminV2History: {
		rootPath: "/v2/admin/history",
		name: "История сохранений",
		disabled: false,
		showInNavbar: false,
	},
	adminV2TemplateHistory: {
		rootPath: "/v2/admin/schemas/:templateId/history",
		name: "История изменений шаблона",
		shortName: "История",
		disabled: false,
	},
	adminV2TemplateEditor: {
		rootPath: "/v2/admin/templates/:templateId/edit",
		name: "Редактор JSON-схемы",
		shortName: "Редактор",
		disabled: false,
	},
	adminV2TemplateRead: {
		rootPath: "/v2/admin/templates/:templateId/read",
		name: "Предпросмотр формы",
		shortName: "Просмотр",
		disabled: false,
	},
	adminV2TemplateLogic: {
		rootPath: "/v2/admin/templates/:templateId/logic",
		name: "Редактор логики",
		shortName: "Логика",
		disabled: false,
	},
	playground: {
		name: "Песочница",
		rootPath: "playground",
		devOnly: true,
		disabled: false,
		showInNavbar: true,
	},
	playgroundV2: {
		rootPath: "/playground/v2",
		name: "V2 шаблоны",
		devOnly: true,
		disabled: false,
	},
	playgroundV2TemplateEditor: {
		rootPath: "/playground/v2/templates/:templateId/edit",
		name: "V2 конструктор (песочница)",
		shortName: "Конструктор",
		devOnly: true,
		disabled: false,
	},
	playgroundV2TemplateRead: {
		rootPath: "/playground/v2/templates/:templateId/read",
		name: "Предпросмотр формы (песочница)",
		shortName: "Просмотр",
		devOnly: true,
		disabled: false,
	},
	playgroundV2TemplateLogic: {
		rootPath: "/playground/v2/templates/:templateId/logic",
		name: "Редактор логики (песочница)",
		shortName: "Логика",
		devOnly: true,
		disabled: false,
	},
} satisfies Record<string, AppRouteConfig>;

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
		routes.adminV2TemplateEditor.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		{ versionId },
	);

export const pathForAdminV2Dictionary = (dictionaryId: string) =>
	routes.adminV2DictionaryDetail.rootPath.replace(
		":dictionaryId",
		encodeURIComponent(dictionaryId),
	);

export const pathForAdminV2TemplateHistory = (templateId: string) =>
	routes.adminV2TemplateHistory.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
	);

export const pathForPlaygroundV2Template = (
	templateId: string,
	versionId?: string | null,
) =>
	appendV2TemplatePathQuery(
		routes.playgroundV2TemplateEditor.rootPath.replace(
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
		routes.adminV2TemplateRead.rootPath.replace(
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
		routes.playgroundV2TemplateRead.rootPath.replace(
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
		routes.adminV2TemplateLogic.rootPath.replace(
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
		routes.playgroundV2TemplateLogic.rootPath.replace(
			":templateId",
			encodeURIComponent(templateId),
		),
		query,
	);

/** @deprecated используйте pathForAdminV2TemplateRead */
export const pathForAdminV2TemplatePreview = pathForAdminV2TemplateRead;

/** @deprecated используйте pathForPlaygroundV2TemplateRead */
export const pathForPlaygroundV2TemplatePreview = pathForPlaygroundV2TemplateRead;
