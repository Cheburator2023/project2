import type { AppRouteConfig } from "@react-client/routing/common/types";
import { Permission } from "@react-client/types/roles";

export const navbarGroups = {
	main: { title: "Разделы" },
} as const;

/** Маршруты пользовательского калькулятора v2 (относительно `/v2`). */
export const v2Routes = {
	home: {
		rootPath: "",
		name: "Реестр анкет v2",
		disabled: false,
	},
	calculationCreate: {
		rootPath: "calculation/create",
		name: "Создание анкеты",
		disabled: false,
		permission: Permission.ANKETA_CREATE_CALCULATION,
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

/** @deprecated используйте v2Routes */
export const routes = v2Routes;
