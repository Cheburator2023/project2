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
		rootPath: "/",
		name: "Главная / Реестр",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "main", order: 0 },
	},
	calculationCreate: {
		rootPath: "/calculation/create",
		name: "Создание анкеты",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "main", order: 10 },
	},
	calculationCompare: {
		rootPath: "/calculation/compare",
		name: "Сравнение расчётов",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "main", order: 20 },
	},
	calculationPreview: {
		rootPath: "/calculation/preview/:id",
		name: "Просмотр анкеты",
		disabled: false,
	},
	calculationNewVersion: {
		rootPath: "/calculation/new_version/:id",
		name: "Создание новой версии анкеты",
		disabled: false,
	},
	calculationClone: {
		rootPath: "/calculation/clone/:id",
		name: "Создание шаблона анкеты",
		disabled: false,
	},
	admin: {
		rootPath: "/admin",
		name: "Администрирование",
		disabled: false,
	},
	adminV2Schemas: {
		rootPath: "/admin/v2/schemas",
		name: "Схемы",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 0 },
	},
	adminV2Dictionaries: {
		rootPath: "/admin/v2/dictionaries",
		name: "Словари",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 5 },
	},
	adminV2DictionaryDetail: {
		rootPath: "/admin/v2/dictionaries/:dictionaryId",
		name: "Справочник",
		shortName: "Справочник",
		disabled: false,
	},
	adminV2History: {
		rootPath: "/admin/v2/history",
		name: "История сохранений",
		disabled: false,
		showInNavbar: false,
	},
	adminV2TemplateHistory: {
		rootPath: "/admin/v2/schemas/:templateId/history",
		name: "История изменений шаблона",
		shortName: "История",
		disabled: false,
	},
	adminV2TemplateEditor: {
		rootPath: "/admin/v2/templates/:templateId/edit",
		name: "Редактор JSON-схемы",
		shortName: "Редактор",
		disabled: false,
	},
	adminV2TemplateRead: {
		rootPath: "/admin/v2/templates/:templateId/read",
		name: "Предпросмотр формы",
		shortName: "Просмотр",
		disabled: false,
	},
	playground: {
		name: "Песочница",
		rootPath: "/playground",
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
} satisfies Record<string, AppRouteConfig>;

/** Сегмент `:templateId` уже закодировать при необходимости. */
export const pathForAdminV2Template = (templateId: string) =>
	routes.adminV2TemplateEditor.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
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

export const pathForPlaygroundV2Template = (templateId: string) =>
	routes.playgroundV2TemplateEditor.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
	);

export const pathForAdminV2TemplateRead = (templateId: string) =>
	routes.adminV2TemplateRead.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
	);

export const pathForPlaygroundV2TemplateRead = (templateId: string) =>
	routes.playgroundV2TemplateRead.rootPath.replace(
		":templateId",
		encodeURIComponent(templateId),
	);

/** @deprecated используйте pathForAdminV2TemplateRead */
export const pathForAdminV2TemplatePreview = pathForAdminV2TemplateRead;

/** @deprecated используйте pathForPlaygroundV2TemplateRead */
export const pathForPlaygroundV2TemplatePreview = pathForPlaygroundV2TemplateRead;
