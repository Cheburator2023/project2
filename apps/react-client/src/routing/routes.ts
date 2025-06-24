export const routes = {
	home: {
		rootPath: "/",
		name: "Главная",
		subRoutes: {},
	},
	calculationCreate: {
		rootPath: "/calculation/create",
		name: "Создание расчета",
	},
	calculationPreview: {
		rootPath: "/calculation/preview/:id",
		name: "Просмотр расчета",
	},
	calculationCompare: {
		rootPath: "/calculation/compare",
		name: "Сравнение расчетов",
	},
	admin: {
		rootPath: "/admin",
		name: "Администрирование",
	},
	playground: {
		name: "Песочница",
		rootPath: "/playground",
		devOnly: true,
	},
};
