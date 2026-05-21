export const dashboardMock = {
	parameters: [{ label: "Сложность", value: "Повышенная x1.5" }],
	sources: [
		{ id: 1, name: "CRM Retail", type: "Внутренний", status: "Разработка" },
	],
	models: [{ id: 1, name: "scoring.pkl", role: "Оркестратор" }],
	metrics: { base: 452, adjusted: 74.7, deviation: -83.47 },
};
