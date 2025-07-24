import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { Calculation } from "../entities/calculation.entity";
import {
    UNCERTAINTY_TYPE_NAMES,
    DEPLOYMENT_CHANNEL_VALUES,
    ALGORITHM_TYPE_VALUES,
} from "../dto/base/calculation-base.dto";

@Injectable()
export class ExcelExportService {
    private readonly logger = new Logger(ExcelExportService.name);

    async generateExcelFile(calculations: Calculation[]): Promise<Buffer> {
        this.logger.log(`Generating Excel file for ${calculations.length} calculations`);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Calculations");

            worksheet.columns = this.getWorksheetColumns();

            calculations.forEach((calculation) => {
                const row = this.createBaseRowData(calculation);

                // Обработка рисков
                this.processUncertainties(row, calculation);

                // Обработка типов алгоритмов
                this.processAlgorithmTypes(row, calculation);

                // Обработка каналов внедрения
                this.processDeploymentChannels(row, calculation);

                // Обработка этапов расчета
                this.processCalculationStages(row, calculation);

                // Добавление отклонения от средней
                this.processDeviationPercent(row, calculation);

                // Обработка статусов отключенных этапов
                this.processDisabledStages(row, calculation);

                worksheet.addRow(row);
            });

            // Форматирование заголовков
            this.formatHeaderRow(worksheet);

            const excelBuffer = await workbook.xlsx.writeBuffer();
            this.logger.log('Successfully generated Excel file');
            return Buffer.from(excelBuffer);
        } catch (error) {
            this.logger.error(
                `Failed to generate Excel file: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    private getWorksheetColumns() {
        return [
            { header: "Название расчета", key: "calcName", width: 30 },
            { header: "Идентификатор", key: "id", width: 36 },
            { header: "RFD", key: "rfd", width: 20 },
            { header: "Стрим исполнитель", key: "streamExecutor", width: 25 },
            { header: "Департамент Заказчика", key: "department", width: 30 },
            { header: "ФИО заказчика", key: "customerName", width: 25 },
            { header: "Комментарий", key: "comment", width: 40 },
            { header: "Дата создания", key: "createdAt", width: 20 },
            { header: "Автор анкеты", key: "author", width: 25 },
            { header: "Итоговая оценка", key: "finalCoefficient", width: 20 },
            { header: "% Отклонение итоговой оценки от средней", key: "deviationPercent", width: 30 },
            { header: "Кол-во моделей", key: "modelsCount", width: 20 },
            { header: "Общая неопределенность", key: "generalUncertainty", width: 40 },

            // Этапы расчета
            { header: "01. Постановка задачи", key: "stage01", width: 20 },
            { header: "02. Поиск данных", key: "stage02", width: 20 },
            { header: "04. Построение витрины для разработки", key: "stage04", width: 30 },
            { header: "05А. Разработка пилотной модели (MVP)", key: "stage05a", width: 35 },
            { header: "05. Разработка модели", key: "stage05", width: 25 },
            { header: "AML Разработка", key: "amlDevelopment", width: 25 },
            { header: "05В. Пилотирование модели", key: "stage05b", width: 25 },
            { header: "07. Разработка витрины для применения модели", key: "stage07", width: 35 },
            { header: "09. Адаптация и внедрение модели", key: "stage09", width: 30 },
            { header: "AML Внедрение", key: "amlImplementation", width: 25 },

            // Основные параметры
            { header: "Сложность постановки", key: "setupComplexity", width: 40 },
            { header: "Сроки инициативы", key: "initiativeTimeline", width: 20 },
            { header: "Стоимость инициативы", key: "initiativeCost", width: 20 },
            { header: "Поправка на общую неопределенность", key: "uncertaintyAdjustment", width: 30 },

            // Риски с вероятностью и влиянием
            ...Object.entries(UNCERTAINTY_TYPE_NAMES).map(([type, name]) => ({
                header: `Риск: ${name} (Вероятность)`,
                key: `${type}_probability`,
                width: 40
            })),
            ...Object.entries(UNCERTAINTY_TYPE_NAMES).map(([type, name]) => ({
                header: `Риск: ${name} (Влияние)`,
                key: `${type}_influence`,
                width: 40
            })),

            // Остальные параметры
            { header: "Наличие готовых пром витрин", key: "readyPromReports", width: 25 },
            { header: "Количество оцениваемых инициатив", key: "assessedInitiativesCount", width: 30 },
            { header: "Кол-во источников для проработки", key: "dataSourcesCount", width: 30 },
            { header: "Необходимость реализации пилотной модели", key: "pilotModelRequired", width: 35 },

            // Типы алгоритмов
            ...ALGORITHM_TYPE_VALUES.map(type => ({
                header: `Тип алгоритма: ${type}`,
                key: `algorithm_${type?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'unknown'}`,
                width: 35
            })),

            { header: "Необходимость поддержки проведения пилота", key: "pilotSupportRequired", width: 40 },
            { header: "Необходимость AutoML", key: "autoMlRequired", width: 25 },
            { header: "Необходимость продуктивизации и количество дополнительных витрин", key: "productionAdditionalReports", width: 50 },

            // Каналы внедрения
            ...DEPLOYMENT_CHANNEL_VALUES.map(channel => ({
                header: `Канал внедрения: ${channel}`,
                key: `deployment_${channel?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'unknown'}`,
                width: 35
            }))
        ];
    }

    private createBaseRowData(calculation: Calculation) {
        return {
            calcName: calculation.calcName,
            id: calculation.id,
            rfd: calculation.rfd,
            streamExecutor: calculation.streamExecutor,
            department: calculation.department?.join(", ") ?? '',
            customerName: calculation.customerName,
            comment: calculation.comment,
            createdAt: calculation.createdAt,
            author: calculation.author,
            finalCoefficient: calculation.finalCoefficient,
            deviationPercent: '',
            modelsCount: calculation.questionnaireData?.modelsCount,
            setupComplexity: calculation.questionnaireData?.setupComplexity,
            initiativeTimeline: calculation.questionnaireData?.initiativeTimeline,
            initiativeCost: calculation.questionnaireData?.initiativeCost,
            uncertaintyAdjustment: calculation.questionnaireData?.uncertaintyAdjustment,
            readyPromReports: calculation.questionnaireData?.readyPromReports,
            assessedInitiativesCount: calculation.questionnaireData?.assessedInitiativesCount,
            dataSourcesCount: calculation.questionnaireData?.dataSourcesCount,
            pilotModelRequired: calculation.questionnaireData?.pilotModelRequired,
            pilotSupportRequired: calculation.questionnaireData?.pilotSupportRequired,
            autoMlRequired: calculation.questionnaireData?.autoMlRequired,
            productionAdditionalReports: calculation.questionnaireData?.productionAdditionalReports,
            generalUncertainty: this.getGeneralUncertaintySummary(calculation),

            // Инициализация полей этапов
            stage01: '',
            stage02: '',
            stage04: '',
            stage05a: '',
            stage05: '',
            amlDevelopment: '',
            stage05b: '',
            stage07: '',
            stage09: '',
            amlImplementation: ''
        };
    }

    private getGeneralUncertaintySummary(calculation: Calculation): string {
        if (!calculation.questionnaireData?.generalUncertainty) return 'Нет данных';

        const uncertainties = Array.isArray(calculation.questionnaireData.generalUncertainty)
            ? calculation.questionnaireData.generalUncertainty
            : Object.entries(calculation.questionnaireData.generalUncertainty).map(([type, value]) => ({
                type,
                probability: value?.probability || 'Нет данных',
                influence: value?.influence || 'Нет данных',
            }));

        if (uncertainties.length === 0) return 'Нет данных';

        return uncertainties.map(u => `${u.type}: ${u.probability} (${u.influence})`).join('; ');
    }

    private processUncertainties(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.generalUncertainty) return;

        const uncertainties = Array.isArray(calculation.questionnaireData.generalUncertainty)
            ? calculation.questionnaireData.generalUncertainty
            : Object.entries(calculation.questionnaireData.generalUncertainty).map(([type, value]) => ({
                type,
                probability: value?.probability || 'Нет данных',
                influence: value?.influence || 'Нет данных',
            }));

        uncertainties.forEach(uncertainty => {
            if (uncertainty?.type) {
                row[`${uncertainty.type}_probability`] = uncertainty.probability;
                row[`${uncertainty.type}_influence`] = uncertainty.influence;
            }
        });
    }

    private processAlgorithmTypes(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.algorithmComplexity) return;

        // Сначала помечаем все типы алгоритмов как "Нет"
        ALGORITHM_TYPE_VALUES.forEach(type => {
            const key = `algorithm_${type.replace(/[^a-zA-Z0-9]/g, '_')}`;
            row[key] = "Нет";
        });

        // Затем отмечаем присутствующие типы как "Да"
        calculation.questionnaireData.algorithmComplexity?.forEach(item => {
            if (item?.algorithmType) {
                const key = `algorithm_${item.algorithmType.replace(/[^a-zA-Z0-9]/g, '_')}`;
                row[key] = "Да";
            }
        });
    }

    private processDeploymentChannels(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.productionDeploymentChannels) return;

        // Сначала помечаем все каналы как "Нет"
        DEPLOYMENT_CHANNEL_VALUES.forEach(channel => {
            const key = `deployment_${channel.replace(/[^a-zA-Z0-9]/g, '_')}`;
            row[key] = "Нет";
        });

        // Затем отмечаем присутствующие каналы как "Да"
        calculation.questionnaireData.productionDeploymentChannels?.forEach(channel => {
            const channelName = typeof channel === "string" ? channel : channel?.deploymentChannel;
            if (channelName) {
                const key = `deployment_${channelName.replace(/[^a-zA-Z0-9]/g, '_')}`;
                row[key] = "Да";
            }
        });
    }

    private processCalculationStages(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.calculationResult) return;

        calculation.questionnaireData.calculationResult?.forEach(result => {
            if (!result?.stageName) return;

            const stageName = result.stageName.replace(/\.$/, '');
            const value = result.disabled ? "Не применяется" : result.score;

            switch (stageName) {
                case "01. Постановка задачи":
                    row.stage01 = value;
                    break;
                case "02. Поиск данных":
                    row.stage02 = value;
                    break;
                case "04. Построение витрины для разработки":
                    row.stage04 = value;
                    break;
                case "05А. Разработка пилотной модели (MVP)":
                    row.stage05a = value;
                    break;
                case "05. Разработка модели":
                    row.stage05 = value;
                    break;
                case "AML Разработка":
                    row.amlDevelopment = value;
                    break;
                case "05В. Пилотирование модели":
                    row.stage05b = value;
                    break;
                case "07. Разработка витрины для применения модели":
                    row.stage07 = value;
                    break;
                case "09. Адаптация и внедрение модели":
                    row.stage09 = value;
                    break;
                case "AML Внедрение":
                    row.amlImplementation = value;
                    break;
            }
        });
    }

    private processDeviationPercent(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.calculationResult) return;

        const totalResult = calculation.questionnaireData.calculationResult.find(
            item => item.stageName === "Итоговая оценка"
        );

        if (totalResult?.offset !== undefined) {
            row.deviationPercent = totalResult.offset;
        } else {
            row.deviationPercent = 'Нет данных';
        }
    }

    private processDisabledStages(row: any, calculation: Calculation) {
        if (!calculation.questionnaireData?.calculationResult) return;

        calculation.questionnaireData.calculationResult.forEach(result => {
            if (result.disabled) {
                switch (result.stageName.replace(/\.$/, '')) {
                    case "AML Разработка":
                        row.amlDevelopment = "Не применяется";
                        break;
                    case "05В. Пилотирование модели":
                        row.stage05b = "Не применяется";
                        break;
                    case "AML Внедрение":
                        row.amlImplementation = "Не применяется";
                        break;
                }
            }
        });
    }

    private formatHeaderRow(worksheet: ExcelJS.Worksheet) {
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD3D3D3" },
            };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });
    }
}
