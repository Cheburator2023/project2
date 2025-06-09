export const routes = {
	home: {
		rootPath: "/",
		name: "Главная",
		subRoutes: {},
	},
	anketaCreate: {
		rootPath: "/anketa/create",
		name: "Создание анкеты",
	},
	anketaPreview: {
		rootPath: "/anketa/preview/:id",
		name: "Просмотр анкеты",
	},
	anketaCompare: {
		rootPath: "/anketa/compare",
		name: "Сравнение анкет",
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
