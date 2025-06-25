export const routes = {
	home: {
		rootPath: "/",
		name: "Главная",
		disabled: false,
		subRoutes: {},
	},
	calculationCreate: {
		rootPath: "/calculation/create",
		name: "Создание расчета",
		disabled: false,
	},
	calculationPreview: {
		rootPath: "/calculation/preview/:id",
		name: "Просмотр расчета",
		disabled: false,
	},
	calculationCompare: {
		rootPath: "/calculation/compare",
		name: "Сравнение расчетов",
		disabled: false,
	},
	admin: {
		rootPath: "/admin",
		name: "Администрирование",
		disabled: true,
	},
	playground: {
		name: "Песочница",
		rootPath: "/playground",
		devOnly: true,
		disabled: false,
	},
};
