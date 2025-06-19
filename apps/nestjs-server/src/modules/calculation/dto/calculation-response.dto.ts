import { ApiProperty } from "@nestjs/swagger";

export class CalculationResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "Test Calculation" })
	name: string;

	@ApiProperty({
		example: {
			name: "Test Calculation",
			modelsCount: 5,
			setupComplexity: 3,
			initiativeTimeline: "4-10 мес.",
			initiativeCost: "45.3-438 млн.",
			generalUncertainty: {
				businessProcessComplexity: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				projectSolutionDefects: {
					probability: "Реализация 1 раз в год",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				adjacentProjectsImpact: {
					probability: "Реализация не чаще 1 раза в 10 лет",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				planningRequirementGaps: {
					probability: "Реализация 1 раз в 6 мес. или чаще",
					influence:
						"Значительный негативный эффект на возможность достижения целей проекта",
				},
				contractorPerformanceIssues: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				qualifiedStaffShortage: {
					probability: "Реализация 1 раз в год",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				sanctionsRisk: {
					probability: "Не применимо",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				controlProceduresGaps: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				regulatoryChanges: {
					probability: "Реализация 1 раз в 3-10 лет",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				systemUnderutilization: {
					probability: "Реализация не чаще 1 раза в 10 лет",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				itArchitectureChanges: {
					probability: "Реализация 1 раз в 6 мес. или чаще",
					influence:
						"Значительный негативный эффект на возможность достижения целей проекта",
				},
			},
			readyPromReports: "Да",
			assessedInitiativesCount: "3",
			dataSourcesCount: "5",
			pilotModelRequired: "Да",
			algorithmComplexity: [{ algorithmType: "Текстовая аналитика_LLM" }],
			pilotSupportRequired: "Да",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "2",
			productionDeploymentChannels: [{ deploymentChannel: "Батч + Онлайн" }],
		},
		description: "Данные анкеты в формате JSON",
	})
	questionnaireData: Record<string, any>;

	@ApiProperty({ example: 1.5 })
	finalCoefficient: number;

	@ApiProperty({ example: "2024-06-11T14:00:00.000Z" })
	createdAt: Date;
}
