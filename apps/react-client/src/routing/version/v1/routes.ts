import type { AppRouteConfig } from "@react-client/routing/common/types";

export const navbarGroups = {
	main: { title: "Разделы" },
} as const;

/** Маршруты пользовательского калькулятора v1 (относительно `/v1`). */
export const v1Routes = {
	home: {
		rootPath: "",
		name: "Реестр анкет v1",
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
} satisfies Record<string, AppRouteConfig>;

/** @deprecated используйте v1Routes */
export const routes = v1Routes;
