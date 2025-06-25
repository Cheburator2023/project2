import { ApiProperty } from "@nestjs/swagger";
import { QuestionnaireDataDto } from "./questionnaire-data.dto";

export class CalculationResponseDto {
	@ApiProperty({
		example: "550e8400-e29b-41d4-a716-446655440000",
		description: "Уникальный идентификатор расчета (UUID)",
	})
	id: string;

	@ApiProperty({
		type: QuestionnaireDataDto,
		description: "Данные анкеты (структурированный объект)",
	})
	questionnaireData: QuestionnaireDataDto;

	@ApiProperty({
		example: 1.5,
		description: "Финальный коэффициент расчета",
	})
	finalCoefficient: number;

	@ApiProperty({
		example: "2024-06-11T14:00:00.000Z",
		description: "Дата и время создания расчета (ISO 8601)",
	})
	createdAt: Date;
}
