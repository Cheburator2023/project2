import { ApiProperty } from "@nestjs/swagger";

class ProbabilityInfluencePairDto {
	@ApiProperty({
		example: "Реализация 1 раз в 1-3 года",
		description: "Вероятность возникновения риска",
	})
	probability: string;

	@ApiProperty({
		example:
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
		description: "Влияние риска на проект",
	})
	influence: string;
}

class GeneralUncertaintyDto {
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	businessProcessComplexity: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	projectSolutionDefects: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	adjacentProjectsImpact: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	planningRequirementGaps: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	contractorPerformanceIssues: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	qualifiedStaffShortage: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	sanctionsRisk: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	controlProceduresGaps: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	regulatoryChanges: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	systemUnderutilization: ProbabilityInfluencePairDto;
	@ApiProperty({ type: ProbabilityInfluencePairDto })
	itArchitectureChanges: ProbabilityInfluencePairDto;
}

class AlgorithmTypeItemDto {
	@ApiProperty({
		example: "Текстовая аналитика_LLM",
		description: "Тип используемого алгоритма",
	})
	algorithmType: string;
}

class DeploymentChannelDto {
	@ApiProperty({
		example: "Батч + Онлайн",
		description: "Канал развертывания модели",
	})
	deploymentChannel: string;
}

export class CalculationResponseDto {
	@ApiProperty({ example: "ed56739d-ae01-47d8-aeae-bdaede599f27" })
	id: string;

	@ApiProperty({ example: "Оценка проекта для бизнеса" })
	name: string;

	@ApiProperty({ example: 5 })
	modelsCount: number;

	@ApiProperty({ example: 3 })
	setupComplexity: number;

	@ApiProperty({ example: "4-10 мес." })
	initiativeTimeline: string;

	@ApiProperty({ example: "45.3-438 млн." })
	initiativeCost: string;

	@ApiProperty({ type: GeneralUncertaintyDto })
	generalUncertainty: GeneralUncertaintyDto;

	@ApiProperty({ example: "Да" })
	readyPromReports: string;

	@ApiProperty({ example: "3", required: false })
	assessedInitiativesCount?: string;

	@ApiProperty({ example: "5" })
	dataSourcesCount: string;

	@ApiProperty({ example: "Да" })
	pilotModelRequired: string;

	@ApiProperty({ type: [AlgorithmTypeItemDto] })
	algorithmComplexity: AlgorithmTypeItemDto[];

	@ApiProperty({ example: "Да" })
	pilotSupportRequired: string;

	@ApiProperty({ example: "Не требуется" })
	autoMlRequired: string;

	@ApiProperty({ example: "2" })
	productionAdditionalReports: string;

	@ApiProperty({ type: [DeploymentChannelDto] })
	productionDeploymentChannels: DeploymentChannelDto[];

	@ApiProperty({ example: 1.8 })
	finalCoefficient: number;

	@ApiProperty({ example: "2025-06-25T11:56:36.554Z" })
	createdAt: Date;
}
