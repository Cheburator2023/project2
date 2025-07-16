import { CreateCalculationDto } from "../../../../../../src/modules/calculation/dto";

describe("CreateCalculationDto", () => {
	it("should be defined", () => {
		const dto = new CreateCalculationDto();
		expect(dto).toBeDefined();
	});

	it("should have required properties", () => {
		const dto = new CreateCalculationDto();
		dto.calcName = "Test Calculation";
		dto.setupComplexity =
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено";
		dto.modelsCount = 1;
		dto.generalUncertainty = [];
		dto.readyPromReports = "Нет";
		dto.dataSourcesCount = "1";
		dto.pilotModelRequired = "Не требуется";
		dto.algorithmComplexity = [{ algorithmType: "Табличные данные" }];
		dto.pilotSupportRequired = "Не требуется";
		dto.autoMlRequired = "Не требуется";
		dto.productionAdditionalReports = "0";
		dto.productionDeploymentChannels = ["Батч"];
		dto.finalCoefficient = 1.0;

		expect(dto.calcName).toBe("Test Calculation");
		expect(dto.modelsCount).toBe(1);
		expect(dto.algorithmComplexity.length).toBe(1);
	});
});
