export const routes = {
	home: {
		rootPath: "/v1",
		name: "Главная / Реестр",
		disabled: false,
		subRoutes: {},
	},
	calculationCreate: {
		rootPath: "/v1/calculation/create",
		name: "Создание анкеты",
		disabled: false,
	},
	calculationPreview: {
		rootPath: "/v1/calculation/preview/:id",
		name: "Просмотр анкеты",
		disabled: false,
	},
	calculationNewVersion: {
		rootPath: "/v1/calculation/new_version/:id",
		name: "Создание новой версии анкеты",
		disabled: false,
	},
	calculationClone: {
		rootPath: "/v1/calculation/clone/:id",
		name: "Создание шаблона анкеты",
		disabled: false,
	},
	calculationCompare: {
		rootPath: "/v1/calculation/compare",
		name: "Сравнение расчетов",
		disabled: false,
	},
	admin: {
		rootPath: "/v1/admin",
		name: "Администрирование",
		disabled: true,
	},
	playground: {
		name: "Песочница",
		rootPath: "/v1/playground",
		devOnly: true,
		disabled: true,
	},
};
