import {ApiProperty} from "@nestjs/swagger";
import {Type} from "class-transformer";
import {
    CalculationBaseDto,
    DATA_SOURCES_COUNT_VALUES,
    YES_NO_REQUIRED_VALUES,
    YES_NO_VALUES,
} from "../base/calculation-base.dto";
import {AlgorithmTypeItemDto} from "../common/algorithm-type.dto";
import {SimpleProbabilityInfluencePairDto} from "../common/probability-influence.dto";

export class CalculationQuestionnaireDataDto extends CalculationBaseDto {
    @ApiProperty({
        example: 2,
        description: "Количество моделей",
    })
    modelsCount: number;

    @ApiProperty({
        example: 3,
        description: "Корректировка неопределенности",
    })
    uncertaintyAdjustment?: number;

    @ApiProperty({
        description: "Факторы общей неопределенности",
        type: "object",
        additionalProperties: {
            type: "object",
            properties: {
                probability: {type: "string"},
                influence: {type: "string"},
            },
        },
    })
    generalUncertainty: Record<string, SimpleProbabilityInfluencePairDto>;

    @ApiProperty({
        example: "Нет",
        description: "Наличие готовых промоделированных отчетов",
        enum: YES_NO_VALUES,
    })
    readyPromReports: (typeof YES_NO_VALUES)[number];

    @ApiProperty({
        example: "3",
        description: "Количество оцененных инициатив",
    })
    assessedInitiativesCount?: string;

    @ApiProperty({
        example: "4",
        description: "Количество источников данных",
        enum: DATA_SOURCES_COUNT_VALUES,
    })
    dataSourcesCount: (typeof DATA_SOURCES_COUNT_VALUES)[number];

    @ApiProperty({
        example: "Да",
        description: "Требуется ли пилотная модель",
        enum: YES_NO_REQUIRED_VALUES,
    })
    pilotModelRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

    @ApiProperty({
        type: [AlgorithmTypeItemDto],
        description: "Сложность алгоритмов",
    })
    @Type(() => AlgorithmTypeItemDto)
    algorithmComplexity: AlgorithmTypeItemDto[];

    @ApiProperty({
        example: "Да",
        description: "Требуется ли поддержка пилота",
        enum: YES_NO_REQUIRED_VALUES,
    })
    pilotSupportRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

    @ApiProperty({
        example: "Да",
        description: "Требуется ли AutoML",
        enum: YES_NO_REQUIRED_VALUES,
    })
    autoMlRequired: (typeof YES_NO_REQUIRED_VALUES)[number];

    @ApiProperty({
        example: "4",
        description: "Дополнительные отчеты для продакшена",
    })
    productionAdditionalReports?: string;

    @ApiProperty({
        type: [Object],
        description: "Каналы развертывания в продакшен",
        example: [
            {deploymentChannel: "Батч"},
            {deploymentChannel: "Батч+загрузка данных потребителю"},
        ],
    })
    productionDeploymentChannels: Array<{ deploymentChannel: string }>;
}

export class CalculationResponseDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Уникальный идентификатор расчета",
    })
    id: string;

    @ApiProperty({
        example: "Оценка проекта для бизнеса",
        description: "Название анкеты",
    })
    name: string;

    @ApiProperty({
        example: "Отсутствует",
        description: "RFD (Reference Data)",
    })
    rfd: string;

    @ApiProperty({
        example: "Стрим 2",
        description: "Исполнительный стрим",
    })
    streamExecutor: string;

    @ApiProperty({
        example: ["Департамент аналитики"],
        description: "Департамент заказчика",
        type: [String],
    })
    department: string[];

    @ApiProperty({
        example: "Иванов Иван Иванович",
        description: "ФИО заказчика",
    })
    customerName: string;

    @ApiProperty({
        example: "Дополнительные комментарии",
        description: "Комментарий",
    })
    comment: string;

    @ApiProperty({
        type: CalculationQuestionnaireDataDto,
        description: "Данные анкеты расчета",
    })
    @Type(() => CalculationQuestionnaireDataDto)
    questionnaireData: CalculationQuestionnaireDataDto;

    @ApiProperty({
        example: 1.8,
        description: "Финальный коэффициент расчета",
    })
    finalCoefficient: number;

    @ApiProperty({
        example: "2024-01-15T10:30:00.000Z",
        description: "Дата создания расчета",
    })
    createdAt: Date;

    @ApiProperty({
        example: "Иванов Иван Иванович",
        description: "Автор расчета",
    })
    author: string;
}
