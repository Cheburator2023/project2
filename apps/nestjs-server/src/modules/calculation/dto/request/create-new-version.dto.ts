import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsArray, IsObject } from "class-validator";

export class CreateNewVersionDto {
    @ApiProperty({
        example: "Название анкеты",
        description: "Название анкеты",
        required: false,
    })
    @IsOptional()
    @IsString()
    calcName?: string;

    @ApiProperty({
        example: "RFD-001",
        description: "RFD",
        required: false,
    })
    @IsOptional()
    @IsString()
    rfd?: string;

    @ApiProperty({
        example: "Исполнитель",
        description: "Стрим-исполнитель",
        required: false,
    })
    @IsOptional()
    @IsString()
    streamExecutor?: string;

    @ApiProperty({
        example: ["Департамент 1", "Департамент 2"],
        description: "Департамент заказчика",
        required: false,
    })
    @IsOptional()
    @IsArray()
    department?: string[];

    @ApiProperty({
        example: "Иванов Иван Иванович",
        description: "ФИО заказчика",
        required: false,
    })
    @IsOptional()
    @IsString()
    customerName?: string;

    @ApiProperty({
        example: "Комментарий к анкете",
        description: "Комментарий",
        required: false,
    })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiProperty({
        description: "Данные опросника",
        required: false,
    })
    @IsOptional()
    @IsObject()
    questionnaireData?: any;
}