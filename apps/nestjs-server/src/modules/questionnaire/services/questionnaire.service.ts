import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { CoefficientEntity } from "../entities/coefficient.entity";
import { QuestionnaireItemEntity } from "../entities/questionnaire-item.entity";
import { QuestionnaireResponseDto } from "../dto/response/questionnaire-response.dto";

@Injectable()
export class QuestionnaireService {
    constructor(
        @InjectRepository(QuestionnaireItemEntity)
        private readonly questionnaireItemRepository: Repository<QuestionnaireItemEntity>,
        @InjectRepository(CoefficientEntity)
        private readonly coefficientRepository: Repository<CoefficientEntity>,
    ) {}

    async getFullQuestionnaire(): Promise<QuestionnaireResponseDto> {
        // Получаем данные из БД
        const items = await this.questionnaireItemRepository.find({
            where: { isActive: true } as FindOptionsWhere<QuestionnaireItemEntity>,
            order: { order: 'ASC' }
        });

        const coefficients = await this.coefficientRepository.find({
            where: { isActive: true } as FindOptionsWhere<CoefficientEntity>
        });

        // Формируем справочники согласно JSON2
        const dictionaries = {
            setupComplexity: [
                {
                    value: 1,
                    label: "Уровень 1",
                    coefficient: 1.0,
                    hint: "Проведение регулярной валидации Моделей Регулятором не установлено"
                },
                // ... остальные уровни сложности
            ],
            initiativeTimeline: [
                {
                    value: "Менее 1 мес.",
                    coefficient: 0.8,
                    hint: "Краткосрочные проекты"
                },
                // ... остальные временные периоды
            ],
            // Добавляем все остальные справочники из JSON2
            probability: [
                {
                    value: "Не применимо",
                    coefficient: 0.0,
                    hint: "Риск не применим к данному проекту"
                },
                // ... остальные варианты вероятности
            ],
            influence: [
                {
                    value: "Незначительное влияние на вторичные функции в рамках проектной деятельности",
                    coefficient: 0.1,
                    hint: "Минимальное влияние на проект"
                },
                // ... остальные варианты влияния
            ],
            algorithmType: [
                {
                    value: "Табличные данные",
                    coefficient: 0.75,
                    hint: "Работа с структурированными табличными данными"
                },
                // ... остальные типы алгоритмов
            ],
            deploymentChannel: [
                {
                    value: "Батч",
                    coefficient: 0.75,
                    hint: "Пакетная обработка данных"
                },
                // ... остальные каналы внедрения
            ],
            readyPromReports: [
                {
                    value: "Да",
                    coefficient: 0.5,
                    hint: "Готовые пром-витрины доступны"
                },
                {
                    value: "Нет",
                    coefficient: 1.0,
                    hint: "Требуется разработка пром-витрин"
                }
            ],
            assessedInitiativesCount: Array.from({length: 10}, (_, i) => ({
                value: (i + 1).toString(),
                coefficient: 1.0 - (i * 0.05),
                hint: `${i + 1} оцениваем${i === 0 ? 'ая' : 'ые'} инициатив${i === 0 ? 'а' : 'ы'}`
            })),
            dataSourcesCount: Array.from({length: 10}, (_, i) => ({
                value: (i + 1).toString(),
                coefficient: 1.0 + (i * 0.2),
                hint: `${i + 1} источник${i === 0 ? '' : 'а'} данных`
            })),
            pilotModelRequired: [
                {
                    value: "Да",
                    coefficient: 1.0,
                    hint: "Требуется разработка пилотной модели"
                },
                {
                    value: "Не требуется",
                    coefficient: 0.0,
                    hint: "Пилотная модель не требуется"
                }
            ],
            pilotSupportRequired: [
                {
                    value: "Да",
                    coefficient: 1.0,
                    hint: "Требуется поддержка пилота"
                },
                {
                    value: "Не требуется",
                    coefficient: 0.0,
                    hint: "Поддержка пилота не требуется"
                }
            ],
            autoMlRequired: [
                {
                    value: "Да",
                    coefficient: 1.0,
                    hint: "Требуется использование AutoML"
                },
                {
                    value: "Не требуется",
                    coefficient: 0.0,
                    hint: "AutoML не требуется"
                }
            ],
            productionAdditionalReports: [
                {
                    value: "Не требуется",
                    coefficient: 0.0,
                    hint: "Дополнительные витрины не требуются"
                },
                ...Array.from({length: 5}, (_, i) => ({
                    value: (i + 1).toString(),
                    coefficient: 1.0 + (i * 0.75),
                    hint: `${i + 1} дополнительн${i === 0 ? 'ая' : 'ые'} витрин${i === 0 ? 'а' : 'ы'}`
                }))
            ],
            streams: [
                {
                    value: "Data Engineering",
                    hint: "Инженеры данных"
                },
                // ... остальные стримы
            ],
            epics: [
                {
                    value: "01. Постановка задачи",
                    hint: "Этап постановки задачи"
                },
                // ... остальные эпики
            ]
        };

        const streamAverages = {
            "01. Постановка задачи": 15.5,
            "02. Поиск данных": 20.0,
            "03. Построение витрины для разработки": 25.0,
            "05А. Разработка пилотной модели (MVP)": 40.0,
            "05. Разработка модели": 37.0,
            "AML Разработка": 68.0,
            "05В. Пилотирование модели": 34.0,
            "07. Разработка витрины для применения модели": 56.0,
            "09. Адаптация и внедрение модели": 50.0,
            "AML Внедрение": 68.0
        };

        return {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            author: "system",
            dictionaries,
            streamAverages
        };
    }
}