import type { AppRouteConfig } from "./types";

export const navbarGroups = {
	adminV2: { title: "Администрирование" },
	dev: { title: "Разработка" },
} as const;

/** Общие маршруты: админка v2 (контент) и playground. Не привязаны к /v1 или /v2. */
export const commonRoutes = {
	admin: {
		rootPath: "/admin",
		name: "Администрирование",
		disabled: false,
	},
	adminV2Schemas: {
		rootPath: "/admin/schemas",
		name: "Схемы",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 0 },
	},
	adminV2Guide: {
		rootPath: "/admin/guide",
		name: "Справка",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 3 },
	},
	adminV2Dictionaries: {
		rootPath: "/admin/dictionaries",
		name: "Словари",
		disabled: false,
		showInNavbar: true,
		navbar: { group: "adminV2", order: 5 },
	},
	adminV2DictionaryDetail: {
		rootPath: "/admin/dictionaries/:dictionaryId",
		name: "Справочник",
		shortName: "Справочник",
		disabled: false,
	},
	adminV2History: {
		rootPath: "/admin/history",
		name: "История сохранений",
		disabled: false,
		showInNavbar: false,
	},
	adminV2TemplateHistory: {
		rootPath: "/admin/schemas/:templateId/history",
		name: "История изменений шаблона",
		shortName: "История",
		disabled: false,
	},
	adminV2TemplateEditor: {
		rootPath: "/admin/templates/:templateId/edit",
		name: "Редактор JSON-схемы",
		shortName: "Редактор",
		disabled: false,
	},
	adminV2TemplateRead: {
		rootPath: "/admin/templates/:templateId/read",
		name: "Предпросмотр формы",
		shortName: "Просмотр",
		disabled: false,
	},
	adminV2TemplateLogic: {
		rootPath: "/admin/templates/:templateId/logic",
		name: "Редактор логики",
		shortName: "Логика",
		disabled: false,
	},
	playground: {
		name: "Песочница",
		rootPath: "/playground",
		devOnly: true,
		disabled: false,
		showInNavbar: true,
		navbar: { group: "dev", order: 0 },
	},
	taskTracker: {
		rootPath: "/playground/tasks",
		name: "Таск-трекер",
		devOnly: true,
		disabled: false,
		showInNavbar: true,
		navbar: { group: "dev", order: 1 },
	},
	playgroundV2: {
		rootPath: "/playground/v2",
		name: "V2",
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
