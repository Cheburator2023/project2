import { CoefficientEntity } from "../src/modules/questionnaire/entities/coefficient.entity";
import { QuestionnaireItemEntity } from "../src/modules/questionnaire/entities/questionnaire-item.entity";
import { StreamAverageEntity } from "../src/modules/questionnaire/entities/stream-average.entity";
import { ArtefactValueEntity } from "../src/modules/questionnaire/entities/artefact-value.entity";
import { CalculationResponseDto } from "../src/modules/calculation/dto";
import {
	Calculation,
	CalculationStatus,
} from "../src/modules/calculation/entities/calculation.entity";

export const testCoefficient: CoefficientEntity = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	name: "Test Coefficient",
	code: "test",
	baseValue: 1.0,
	isActive: true,
	conditions: { default: 2.0 },
	description: "Test description",
	createdAt: new Date(),
	updatedAt: new Date(),
};

export const testQuestionnaireItem: QuestionnaireItemEntity = {
	id: "550e8400-e29b-41d4-a716-446655440001",
	name: "Test Item",
	code: "test_item",
	description: "Test description",
	isRequired: true,
	isActive: true,
	fieldType: "number",
	options: [],
	order: 1,
	createdAt: new Date(),
	updatedAt: new Date(),
};

export const testStreamAverage: StreamAverageEntity = {
	id: "550e8400-e29b-41d4-a716-446655440002",
	epicName: "01. Test Epic",
	averageValue: 10.5,
	description: "Test description",
	createdAt: new Date(),
	updatedAt: new Date(),
};

export const testArtefactValue: ArtefactValueEntity = {
	artefact_value_id: 1,
	artefact_id: 6,
	artefact_value: "Test Value",
	artefact_value_label: "Test Label",
	is_active_flg: "1",
	artefact_parent_value_id: null,
};

export const testCalculation: Calculation = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	calcName: "Test Calculation",
	rfd: "Отсутствует",
	streamExecutor: "Test Stream",
	department: ["Test Department"],
	customerName: "Test Customer",
	comment: "Test Comment",
	questionnaireData: {
		calcName: "Test Calculation",
		setupComplexity:
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
		modelsCount: 1,
		initiativeTimeline: "Менее 1 мес.",
		initiativeCost: "До 45.3 млн.",
		uncertaintyAdjustment: 1,
		generalUncertainty: [] as any,
		readyPromReports: "Нет",
		assessedInitiativesCount: 1,
		dataSourcesCount: "1",
		pilotModelRequired: "Не требуется",
		algorithmComplexity: [{ algorithmType: "Табличные данные" }],
		pilotSupportRequired: "Не требуется",
		autoMlRequired: "Не требуется",
		productionAdditionalReports: "0",
		productionDeploymentChannels: [
			{ deploymentChannel: "Батч" },
			{ deploymentChannel: "Батч+загрузка данных потребителю" },
		],
	},
	finalCoefficient: 1.0,
	createdAt: new Date(),
	author: "Test User",
	status: CalculationStatus.ACTIVE,
	version: "1",
	seriesId: "12345678",
	parentCalcId: null,
	readableId: "Calc-12345678-version-1",
};

// Response mock - возвращается из контроллера (со строками)
export const testCalculationResponse: CalculationResponseDto = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	calcName: "Test Calculation",
	rfd: "Отсутствует",
	streamExecutor: "Test Stream",
	department: ["Test Department"],
	customerName: "Test Customer",
	comment: "Test Comment",
	questionnaireData: {
		calcName: "Test Calculation",
		setupComplexity:
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
		modelDeveloped: "Нет",
		modelsCount: 1,
		initiativeTimeline: "Менее 1 мес.",
		initiativeCost: "До 45.3 млн.",
		uncertaintyAdjustment: 1,
		generalUncertainty: [],
		readyPromReports: "Нет",
		assessedInitiativesCount: 1,
		dataSourcesCount: "1",
		pilotModelRequired: "Не требуется",
		algorithmComplexity: [{ algorithmType: "Табличные данные" }],
		pilotSupportRequired: "Не требуется",
		autoMlRequired: "Не требуется",
		productionAdditionalReports: "0",
		productionDeploymentChannels: ["Батч", "Батч+загрузка данных потребителю"],
	},
	finalCoefficient: 1.0,
	createdAt: new Date(),
	author: "Test User",
	status: CalculationStatus.ACTIVE,
	version: "1",
	seriesId: "12345678",
	parentCalcId: undefined,
	readableId: "Calc-12345678-version-1",
};
