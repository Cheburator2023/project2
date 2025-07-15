import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CalculationResultItemDto {
    @ApiProperty({ example: "07. Адаптация и внедрение", description: "Название этапа" })
    @IsString()
    stageName: string;

    @ApiProperty({ example: 0, description: "Оценка этапа" })
    @IsNumber()
    score: number;

    @ApiProperty({ example: 50, description: "Базовое значение этапа", required: false })
    @IsNumber()
    @IsOptional()
    stageBaseValue?: number;

    @ApiProperty({ example: 0, description: "Процент от среднего значения", required: false })
    @IsNumber()
    @IsOptional()
    percentFromAverage?: number;

    @ApiProperty({ example: -100, description: "Отклонение от среднего значения", required: false })
    @IsNumber()
    @IsOptional()
    offset?: number;

    @ApiProperty({ example: true, description: "Отключен ли этап", required: false })
    @IsOptional()
    disabled?: boolean;
}