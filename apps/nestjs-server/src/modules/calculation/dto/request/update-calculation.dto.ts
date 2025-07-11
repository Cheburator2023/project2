import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateCalculationDto {
    @ApiProperty({
        example: "Обновленное название расчета",
        description: "Название расчета",
        required: false,
    })
    @IsString({ message: "name must be a string" })
    @IsOptional()
    name?: string;

    @ApiProperty({
        example: "RFD-20250715-001",
        description: "RFD (Reference Data)",
        required: false,
    })
    @IsString({ message: "rfd must be a string" })
    @IsOptional()
    rfd?: string;

    @ApiProperty({
        example: "Стрим аналитики данных",
        description: "Стрим-исполнитель",
        required: false,
    })
    @IsString({ message: "streamExecutor must be a string" })
    @IsOptional()
    streamExecutor?: string;

    @ApiProperty({
        example: ["Департамент рисков", "Департамент разработки"],
        description: "Департамент заказчика",
        type: [String],
        required: false,
    })
    @IsArray({ message: "department must be an array" })
    @IsString({ each: true, message: "Each department item must be a string" })
    @IsOptional()
    department?: string[];

    @ApiProperty({
        example: "Петров Алексей Владимирович",
        description: "ФИО заказчика",
        required: false,
    })
    @IsString({ message: "customerName must be a string" })
    @IsOptional()
    customerName?: string;

    @ApiProperty({
        example: "Обновленный комментарий к расчету",
        description: "Комментарий",
        required: false,
    })
    @IsString({ message: "comment must be a string" })
    @IsOptional()
    comment?: string;
}