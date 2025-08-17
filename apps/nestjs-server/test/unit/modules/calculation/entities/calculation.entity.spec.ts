import { Calculation } from "../../../../../src/modules/calculation/entities/calculation.entity";

describe("Calculation Entity", () => {
	it("should be defined", () => {
		const calculation = new Calculation();
		expect(calculation).toBeDefined();
	});

	it("should have id property", () => {
		const calculation = new Calculation();
		calculation.id = "550e8400-e29b-41d4-a716-446655440000";
		expect(calculation.id).toBe("550e8400-e29b-41d4-a716-446655440000");
	});

	it("should have name property", () => {
		const calculation = new Calculation();
		calculation.calcName = "Test Calculation";
		expect(calculation.calcName).toBe("Test Calculation");
	});

	it("should have questionnaireData property", () => {
		const calculation = new Calculation();
		calculation.questionnaireData = {
			calcName: "Test Calculation",
			setupComplexity:
				"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
			modelsCount: 1,
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "До 45.3 млн.",
			uncertaintyAdjustment: 0,
			generalUncertainty: [] as any,
			readyPromReports: "Нет",
			assessedInitiativesCount: 1,
			dataSourcesCount: "1",
			pilotModelRequired: "Не требуется",
			algorithmComplexity: [],
			pilotSupportRequired: "Не требуется",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "0",
			productionDeploymentChannels: [{ deploymentChannel: "Батч" }],
		};
		expect(calculation.questionnaireData.calcName).toBe("Test Calculation");
		expect(calculation.questionnaireData.modelsCount).toBe(1);
	});

	it("should have createdAt property", () => {
		const calculation = new Calculation();
		const testDate = new Date();
		calculation.createdAt = testDate;
		expect(calculation.createdAt).toBe(testDate);
	});
});
