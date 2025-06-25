import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ProbabilityInfluencePairDto {
	@ApiProperty({
		example: "Реализация 1 раз в 1-3 года",
		description:
			"Вероятность возникновения риска (выбирается из фиксированного списка)",
		enum: [
			"Не применимо",
			"Реализация не чаще 1 раза в 10 лет",
			"Реализация 1 раз в 3-10 лет",
			"Реализация 1 раз в 1-3 года",
			"Реализация 1 раз в год",
			"Реализация 1 раз в 6 мес. или чаще",
		],
	})
	@IsString({ message: "probability must be a string" })
	@IsNotEmpty({ message: "probability should not be empty" })
	probability: string;

	@ApiProperty({
		example:
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
		description:
			"Влияние риска на проект (выбирается из фиксированного списка)",
		enum: [
			"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			"Незначительное влияние на задачи и сроки достижения целей проекта",
			"Реализация проекта с контролируемыми отклонениями от изначальных целей",
			"Значительный негативный эффект на возможность достижения целей проекта",
			"Критичное отклонение качества реализации проекта",
		],
	})
	@IsString({ message: "influence must be a string" })
	@IsNotEmpty({ message: "influence should not be empty" })
	influence: string;
}
