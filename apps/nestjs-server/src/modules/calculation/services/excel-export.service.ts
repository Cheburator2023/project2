import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { Calculation, CalculationStatus } from "../entities/calculation.entity";
import {
	UNCERTAINTY_TYPE_NAMES,
	DEPLOYMENT_CHANNEL_VALUES,
	ALGORITHM_TYPE_VALUES,
} from "../dto/base/calculation-base.dto";
import { v4 as uuidv4 } from "uuid";
import { CustomLogger } from "src/shared/services/logger.service";


@Injectable()
export class ExcelExportService {
	constructor(
		private readonly customLogger: CustomLogger,
	) {}

	async generateExcelFile(calculations: Calculation[]): Promise<Buffer> {
		const eventId = uuidv4();
		try {
			this.customLogger.log(
				"Start generating Excel file",
				"ExcelExportService.generateExcelFile",
				{
					eventId,
					count: calculations.length,
				},
			);

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
			this.customLogger.log(
				"Excel file generated successfully",
				"ExcelExportService.generateExcelFile",
				{
					eventId,
					count: calculations.length,
				},
			);
			return Buffer.from(excelBuffer);
		} catch (error) {
			this.customLogger.error(
				"Error generating Excel file",
				error.stack,
				"ExcelExportService.generateExcelFile",
				{
					eventId,
					error: error.message,
				},
			);
			throw error;
		}
	}

	private getWorksheetColumns() {
		const columns = [
			// Базовые колонки
			{ header: "Название расчета", key: "calcName", width: 30 },
			{ header: "Идентификатор", key: "id", width: 36 },
			{ header: "Идентификатор серии", key: "seriesId", width: 25 },
			{ header: "Версия", key: "version", width: 15 },
			{ header: "Статус", key: "status", width: 15 },
			{ header: "ID родительской анкеты", key: "parentId", width: 36 },
			{ header: "Cоставной читаемый идентификатор ", key: "readableId", width: 30 },
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
			...this.getRiskColumns(),

			// Остальные параметры
			{ header: "Наличие готовых промышленных витрин", key: "readyPromReports", width: 25 },
			{ header: "Количество оцениваемых инициатив", key: "assessedInitiativesCount", width: 30 },
			{ header: "Кол-во источников для проработки", key: "dataSourcesCount", width: 30 },
			{ header: "Необходимость реализации пилотной модели", key: "pilotModelRequired", width: 35 },

			// Типы алгоритмов
			...ALGORITHM_TYPE_VALUES.map(type => ({
				header: `Тип алгоритма: ${type}`,
				key: `algorithm_${type?.replace(/[^a-zA-Z0-9]/g, "_") ?? "unknown"}`,
				width: 35
			})),

			{ header: "Необходимость поддержки проведения пилота", key: "pilotSupportRequired", width: 40 },
			{ header: "Необходимость AutoML", key: "autoMlRequired", width: 25 },
			{ header: "Необходимость продуктивизации и количество дополнительных витрин",
				key: "productionAdditionalReports", width: 50 },

			// Каналы внедрения
			...DEPLOYMENT_CHANNEL_VALUES.map(channel => ({
				header: `Канал внедрения: ${channel}`,
				key: this.getDeploymentChannelKey(channel),
				width: 35
			}))
		];

		return columns;
	}

	private getRiskColumns() {
		return Object.entries(UNCERTAINTY_TYPE_NAMES).flatMap(([type, name]) => [
			{
				header: `Риск(Вероятность): ${name}`,
				key: `${type}_probability`,
				width: 40,
			},
			{
				header: `Риск(Влияние): ${name}`,
				key: `${type}_influence`,
				width: 40,
			}
		]);
	}

	private createBaseRowData(calculation: Calculation) {
		const row: Record<string, any> = {
			// Базовые данные расчета
			calcName: calculation.calcName,
			id: calculation.id,
			rfd: calculation.rfd || "",
			streamExecutor: calculation.streamExecutor || "",
			department: calculation.department?.join("; ") || "",
			customerName: calculation.customerName || "",
			comment: calculation.comment || "",
			createdAt: calculation.createdAt,
			author: calculation.author || "",
			finalCoefficient: calculation.finalCoefficient,
			deviationPercent: "",
			modelsCount: calculation.questionnaireData?.modelsCount || 0,
			generalUncertainty: this.getGeneralUncertaintySummary(calculation),

			// Основные параметры анкеты
			setupComplexity: calculation.questionnaireData?.setupComplexity || "",
			initiativeTimeline: calculation.questionnaireData?.initiativeTimeline || "",
			initiativeCost: calculation.questionnaireData?.initiativeCost || "",
			uncertaintyAdjustment: calculation.questionnaireData?.uncertaintyAdjustment || 0,

			// Данные по витринам и источникам
			readyPromReports: calculation.questionnaireData?.readyPromReports || "Нет",
			assessedInitiativesCount: calculation.questionnaireData?.assessedInitiativesCount || "0",
			dataSourcesCount: calculation.questionnaireData?.dataSourcesCount || "0",
			pilotModelRequired: calculation.questionnaireData?.pilotModelRequired || "Не требуется",

			// Данные по алгоритмам
			algorithmComplexity: this.getAlgorithmComplexitySummary(calculation),

			// Данные по пилотированию и продуктивизации
			pilotSupportRequired: calculation.questionnaireData?.pilotSupportRequired || "Не требуется",
			autoMlRequired: calculation.questionnaireData?.autoMlRequired || "Не требуется",
			productionAdditionalReports: calculation.questionnaireData?.productionAdditionalReports || "0",

			// Инициализация полей этапов расчета
			stage01: "",
			stage02: "",
			stage04: "",
			stage05a: "",
			stage05: "",
			amlDevelopment: "",
			stage05b: "",
			stage07: "",
			stage09: "",
			amlImplementation: "",
		};

		// Добавление информации о версии и серии
		row.seriesId = calculation.seriesId;
		row.version = calculation.version;
		row.status = calculation.status === CalculationStatus.ACTIVE ? 'Активная' : 'Архивная';
		row.parentId = calculation.parentCalcId || 'Нет';
		row.readableId = calculation.readableId || 'Нет данных';


		// Инициализация полей рисков
		Object.keys(UNCERTAINTY_TYPE_NAMES).forEach(type => {
			row[`${type}_probability`] = "Нет данных";
			row[`${type}_influence`] = "Нет данных";
		});

		// Инициализация полей типов алгоритмов
		ALGORITHM_TYPE_VALUES.forEach(type => {
			const key = `algorithm_${type?.replace(/[^a-zA-Z0-9]/g, "_") || "unknown"}`;
			row[key] = "Нет";
		});

		// Инициализация полей каналов внедрения
		DEPLOYMENT_CHANNEL_VALUES.forEach(channel => {
			const key = `deployment_${channel?.replace(/[^a-zA-Z0-9]/g, "_") || "unknown"}`;
			row[key] = "Нет";
		});

		return row;
	}

	private getAlgorithmComplexitySummary(calculation: Calculation): string {
		if (!calculation.questionnaireData?.algorithmComplexity)
			return "Выбрано типов алгоритмов: 0 из 0";

		const algorithms = calculation.questionnaireData.algorithmComplexity;
		const totalCount = algorithms.length;
		const nonEmptyCount = algorithms.filter(
			(alg: any) => alg.algorithmType && alg.algorithmType.trim() !== "",
		).length;
		return `Выбрано типов алгоритмов: ${nonEmptyCount} из ${totalCount}`;
	}

	private getGeneralUncertaintySummary(calculation: Calculation): string {
		if (!calculation.questionnaireData?.generalUncertainty) return "Нет данных";

		const uncertainties = Array.isArray(
			calculation.questionnaireData.generalUncertainty
		)
			? calculation.questionnaireData.generalUncertainty
			: Object.entries(calculation.questionnaireData.generalUncertainty);

		if (uncertainties.length === 0) return "Нет данных";

		const riskCount = uncertainties.length;

		return `Количество рисков: ${riskCount}`;
	}

	private processUncertainties(row: any, calculation: Calculation) {
		if (!calculation.questionnaireData?.generalUncertainty) return;

		const uncertainties = Array.isArray(calculation.questionnaireData.generalUncertainty)
			? calculation.questionnaireData.generalUncertainty
			: Object.entries(calculation.questionnaireData.generalUncertainty).map(
				([type, value]) => ({
					type,
					probability: value?.probability || "Нет данных",
					influence: value?.influence || "Нет данных",
				})
			);

		// Инициализация всех возможных рисков как "Нет данных"
		Object.keys(UNCERTAINTY_TYPE_NAMES).forEach(type => {
			row[`${type}_probability`] = "Нет данных";
			row[`${type}_influence`] = "Нет данных";
		});

		// Заполнение фактических значений
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
		ALGORITHM_TYPE_VALUES.forEach((type) => {
			const key = `algorithm_${type.replace(/[^a-zA-Z0-9]/g, "_")}`;
			row[key] = "Нет";
		});

		// Затем отмечаем присутствующие типы как "Да"
		calculation.questionnaireData.algorithmComplexity?.forEach((item) => {
			if (item?.algorithmType) {
				const key = `algorithm_${item.algorithmType.replace(/[^a-zA-Z0-9]/g, "_")}`;
				row[key] = "Да";
			}
		});
	}

	private processDeploymentChannels(row: any, calculation: Calculation) {
		if (!calculation.questionnaireData?.productionDeploymentChannels) return;

		// Сначала помечаем все каналы как "Нет"
		DEPLOYMENT_CHANNEL_VALUES.forEach((channel) => {
			const key = this.getDeploymentChannelKey(channel);
			row[key] = "Нет";
		});

		// Затем отмечаем присутствующие каналы как "Да"
		calculation.questionnaireData.productionDeploymentChannels?.forEach(
			(channel) => {
				const channelName =
					typeof channel === "string" ? channel : channel?.deploymentChannel;
				if (channelName) {
					const key = this.getDeploymentChannelKey(channelName);
					row[key] = "Да";
				}
			},
		);
	}

	private getDeploymentChannelKey(channel: string): string {
		return `deployment_${channel.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}`;
	}

	private processCalculationStages(row: any, calculation: Calculation) {
		if (!calculation.questionnaireData?.calculationResult) return;

		calculation.questionnaireData.calculationResult?.forEach((result) => {
			if (!result?.stageName) return;

			const stageName = result.stageName.replace(/\.$/, "");
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
				case "05A. Разработка MVP":
					row.stage05a = value;
					break;
				case "05. Разработка модели":
					row.stage05 = value;
					break;
				case "AML разработка":
				case "AML Разработка":
					row.amlDevelopment = value;
					break;
				case "05В. Пилотирование модели":
				case "05B. Пилотирование модели":
					row.stage05b = value;
					break;
				case "06. Разработка витрины для применения модели":
				case "07. Разработка витрины для применения модели":
					row.stage07 = value;
					break;
				case "07. Адаптация и внедрение":
				case "09. Адаптация и внедрение":
					row.stage09 = value;
					break;
				case "AML внедрение":
				case "AML Внедрение":
					row.amlImplementation = value;
					break;
			}
		});
	}

	private processDeviationPercent(row: any, calculation: Calculation) {
		if (!calculation.questionnaireData?.calculationResult) return;

		const totalResult = calculation.questionnaireData.calculationResult.find(
			(item) => item.stageName === "Итоговая оценка",
		);

		if (totalResult?.offset !== undefined) {
			row.deviationPercent = `${totalResult.offset.toFixed(2)}%`;
		} else {
			row.deviationPercent = "Нет данных";
		}
	}

	private processDisabledStages(row: any, calculation: Calculation) {
		if (!calculation.questionnaireData?.calculationResult) return;

		calculation.questionnaireData.calculationResult.forEach((result) => {
			if (result.disabled) {
				switch (result.stageName.replace(/\.$/, "")) {
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

			// Подсветка рисков
			if (cell.value?.toString().includes("(Вероятность)")) {
				cell.fill.fgColor = { argb: "FFF0E68C" };
			} else if (cell.value?.toString().includes("(Влияние)")) {
				cell.fill.fgColor = { argb: "FF98FB98" };
			}
		});

		const riskColumns = worksheet.columns.filter(col =>
			col.header?.toString().includes("Риск:")
		);
		riskColumns.forEach(col => {
			col.width = 30;
		});
	}
}
