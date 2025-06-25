import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";
import { ProbabilityInfluencePairDto } from "./probability-influence-pair.dto";

export class GeneralUncertaintyDto {
	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Сложность бизнес-процессов",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	businessProcessComplexity: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Дефекты проектного решения",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	projectSolutionDefects: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Влияние смежных проектов",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	adjacentProjectsImpact: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Пробелы в планировании требований",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	planningRequirementGaps: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Проблемы с исполнением подрядчиками",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	contractorPerformanceIssues: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Нехватка квалифицированного персонала",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	qualifiedStaffShortage: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Риск санкций",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	sanctionsRisk: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Пробелы в контрольных процедурах",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	controlProceduresGaps: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Изменения в регулировании",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	regulatoryChanges: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Недоиспользование системы",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	systemUnderutilization: ProbabilityInfluencePairDto;

	@ApiProperty({
		type: ProbabilityInfluencePairDto,
		description: "Изменения IT-архитектуры",
	})
	@ValidateNested()
	@Type(() => ProbabilityInfluencePairDto)
	itArchitectureChanges: ProbabilityInfluencePairDto;
}
