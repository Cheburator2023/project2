import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeploymentChannelDto {
	@ApiProperty({
		example: "Батч + Онлайн",
		description:
			"Канал развертывания модели (выбирается из фиксированного списка)",
		enum: [
			"Батч",
			"Батч+загрузка данных потребителю",
			"Батч + Онлайн",
			"Онлайн",
			"Онлайн gpu",
			"Стриминг",
			"Мобильные устройства",
			"LLM",
			"Гео-сервисы",
			"Внедрение в облаке",
			"Графовая платформа",
		],
	})
	@IsString({ message: "deploymentChannel must be a string" })
	@IsNotEmpty({ message: "deploymentChannel should not be empty" })
	deploymentChannel: string;
}
