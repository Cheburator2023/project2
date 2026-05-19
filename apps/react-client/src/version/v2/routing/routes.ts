export const routes = {
	home: {
		rootPath: "",
		name: "Реестр",
		disabled: false,
		subRoutes: {},
	},
	calculationCreate: {
		rootPath: "calculation/create",
		name: "Создание анкеты",
		disabled: false,
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
		rootPath: "admin",
		name: "Администрирование",
		disabled: false,
	},
	playground: {
		name: "Песочница",
		rootPath: "playground",
		devOnly: true,
		disabled: false,
	},
};
