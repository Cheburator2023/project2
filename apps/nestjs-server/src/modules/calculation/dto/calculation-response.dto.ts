import { ApiProperty } from "@nestjs/swagger";

export class CalculationResponseDto {
	@ApiProperty({ example: "uuid" })
	id: string;

	@ApiProperty({ example: "Оценка проекта для бизнеса" })
	name: string;

	@ApiProperty({
		example: {
			generalUncertainty: {},
			pilotSupportRequired: "Да",
		},
		description: "Данные анкеты в формате JSON",
	})
	questionnaireData: Record<string, any>;

	@ApiProperty({ example: 1.8 })
	finalCoefficient: number;

	@ApiProperty({ example: "2024-06-11T14:00:00.000Z" })
	createdAt: Date;
}
