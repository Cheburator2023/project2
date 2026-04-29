import { CalculationResponseDto } from "../../../../../../src/modules/calculation/dto/response/calculation-response.dto";
import { CalculationStatus } from "../../../../../../src/modules/calculation/entities/calculation.entity";

describe("CalculationResponseDto", () => {
	it("should be defined", () => {
		const dto = new CalculationResponseDto();
		expect(dto).toBeDefined();
	});

	it("should have required properties", () => {
		const dto = new CalculationResponseDto();
		dto.id = "550e8400-e29b-41d4-a716-446655440000";
		dto.calcName = "Test Calculation";
		dto.rfd = "Отсутствует";
		dto.streamExecutor = "Test Stream";
		dto.department = ["Test Department"];
		dto.customerName = "Test Customer";
		dto.comment = "Test Comment";
		dto.questionnaireData = {
			calcName: "Test Calculation",
			setupComplexity:
				"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
			modelDeveloped: "Нет",
			modelsCount: 1,
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "До 45.3 млн.",
			uncertaintyAdjustment: 0,
			generalUncertainty: [],
			readyPromReports: "Нет",
			assessedInitiativesCount: 1,
			dataSourcesCount: "1",
			pilotModelRequired: "Не требуется",
			algorithmComplexity: [{ algorithmType: "Табличные данные" }],
			pilotSupportRequired: "Не требуется",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "0",
			productionDeploymentChannels: ["Батч"],
		};
		dto.finalCoefficient = 1.0;
		dto.createdAt = new Date();
		dto.author = "Test User";
		dto.status = CalculationStatus.ACTIVE;
		dto.version = "1";
		dto.seriesId = "12345678";
		dto.readableId = "Calc-12345678-version-1";

		expect(dto.id).toBe("550e8400-e29b-41d4-a716-446655440000");
		expect(dto.calcName).toBe("Test Calculation");
		expect(dto.questionnaireData.modelsCount).toBe(1);
		expect(dto.questionnaireData.modelDeveloped).toBe("Нет");
		expect(dto.questionnaireData.productionDeploymentChannels).toEqual([
			"Батч",
		]);
		expect(dto.status).toBe(CalculationStatus.ACTIVE);
		expect(dto.version).toBe("1");
	});

	it("should accept optional parentCalcId, parentReadableId and seriesLatestVersion", () => {
		const dto = new CalculationResponseDto();
		dto.parentCalcId = "550e8400-e29b-41d4-a716-446655440099";
		dto.parentReadableId = "Calc-87654321-version-2";
		dto.seriesLatestVersion = "2";

		expect(dto.parentCalcId).toBe("550e8400-e29b-41d4-a716-446655440099");
		expect(dto.parentReadableId).toBe("Calc-87654321-version-2");
		expect(dto.seriesLatestVersion).toBe("2");
	});
});
