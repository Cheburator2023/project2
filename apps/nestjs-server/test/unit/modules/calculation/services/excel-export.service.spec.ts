import * as ExcelJS from "exceljs";
import { ExcelExportService } from "../../../../../src/modules/calculation/services/excel-export.service";
import {
	Calculation,
	CalculationStatus,
} from "../../../../../src/modules/calculation/entities/calculation.entity";
import { CustomLogger } from "../../../../../src/shared/services/logger.service";

const buildCalc = (over: Partial<Calculation> = {}): Calculation =>
	({
		id: "id-1",
		calcName: "Calc",
		rfd: "RFD-1",
		streamExecutor: "Stream",
		department: ["Dep1", "Dep2"],
		customerName: "Cust",
		comment: "Cmnt",
		createdAt: new Date("2025-01-15"),
		author: "Auth",
		finalCoefficient: 1.5,
		status: CalculationStatus.ACTIVE,
		version: "1",
		seriesId: "11111111",
		parentCalcId: null,
		readableId: "Calc-11111111-version-1",
		questionnaireData: {
			calcName: "Calc",
			modelsCount: 2,
			setupComplexity: "1 Сложность",
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "До 45.3 млн.",
			uncertaintyAdjustment: 1,
			readyPromReports: "Нет",
			assessedInitiativesCount: 1,
			dataSourcesCount: "1",
			pilotModelRequired: "Не требуется",
			algorithmComplexity: [
				{ algorithmType: "Табличные данные" },
				{ algorithmType: "Текстовая аналитика_LLM" },
			],
			pilotSupportRequired: "Не требуется",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "0",
			productionDeploymentChannels: [
				{ deploymentChannel: "Батч" },
				"Онлайн",
			] as any,
			generalUncertainty: {
				sanctionsRisk: { probability: "P1", influence: "I1" },
			} as any,
			calculationResult: [
				{ stageName: "01. Постановка задачи", score: 5 },
				{ stageName: "AML Разработка", score: 0, disabled: true },
				{ stageName: "Итоговая оценка", score: 100, offset: 12.345 },
			],
		} as any,
		...over,
	}) as Calculation;

const loadWorkbook = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(buffer as any);
	return wb;
};

// После сериализации/десериализации в exceljs теряются column.key,
// поэтому индексы определяем по заголовкам.
const findColIdx = (ws: ExcelJS.Worksheet, headerSubstring: string): number => {
	const headerRow = ws.getRow(1);
	for (let i = 1; i <= ws.columnCount; i++) {
		const value = headerRow.getCell(i).value;
		if (typeof value === "string" && value.includes(headerSubstring)) {
			return i;
		}
	}
	throw new Error(`column not found: ${headerSubstring}`);
};

describe("ExcelExportService", () => {
	let service: ExcelExportService;
	let logger: jest.Mocked<CustomLogger>;

	beforeEach(() => {
		logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
		} as any;
		service = new ExcelExportService(logger);
	});

	it("returns Buffer with non-empty content", async () => {
		const buf = await service.generateExcelFile([buildCalc()]);
		expect(Buffer.isBuffer(buf)).toBe(true);
		expect(buf.length).toBeGreaterThan(1000);
	});

	it("creates Calculations sheet with columns including base headers and risk columns", async () => {
		const buf = await service.generateExcelFile([buildCalc()]);
		const wb = await loadWorkbook(buf);
		const ws = wb.getWorksheet("Calculations")!;
		expect(ws).toBeDefined();
		const headers = (ws.getRow(1).values as any[]).filter(Boolean) as string[];
		expect(headers).toContain("Название расчета");
		expect(headers).toContain("Идентификатор");
		expect(headers).toContain("Версия");
		expect(headers.some((h) => h.includes("Риск(Вероятность)"))).toBe(true);
		expect(headers.some((h) => h.includes("Канал внедрения:"))).toBe(true);
		expect(headers.some((h) => h.startsWith("Тип алгоритма:"))).toBe(true);
	});

	it("populates calculation values, including deviationPercent and stage scores", async () => {
		const buf = await service.generateExcelFile([buildCalc()]);
		const wb = await loadWorkbook(buf);
		const ws = wb.getWorksheet("Calculations")!;
		const dataRow = ws.getRow(2);

		expect(dataRow.getCell(findColIdx(ws, "Название расчета")).value).toBe(
			"Calc",
		);
		expect(dataRow.getCell(findColIdx(ws, "Статус")).value).toBe("Активная");
		expect(
			dataRow.getCell(findColIdx(ws, "ID родительской анкеты")).value,
		).toBe("Нет");
		expect(dataRow.getCell(findColIdx(ws, "% Отклонение")).value).toBe(
			"12.35%",
		);
		expect(dataRow.getCell(findColIdx(ws, "01. Постановка")).value).toBe(5);
		expect(dataRow.getCell(findColIdx(ws, "AML Разработка")).value).toBe(
			"Не применяется",
		);
	});

	it("handles array form of generalUncertainty", async () => {
		const calc = buildCalc({
			questionnaireData: {
				...buildCalc().questionnaireData,
				generalUncertainty: [
					{ type: "sanctionsRisk", probability: "X", influence: "Y" },
				],
			} as any,
		});
		const buf = await service.generateExcelFile([calc]);
		const wb = await loadWorkbook(buf);
		const ws = wb.getWorksheet("Calculations")!;
		expect(
			ws.getRow(2).getCell(findColIdx(ws, "Риск(Вероятность): Введение")).value,
		).toBe("X");
	});

	it("uses 'Архивная' for archive status and tolerates missing optional fields", async () => {
		const calc = buildCalc({
			status: CalculationStatus.ARCHIVE,
			rfd: undefined as any,
			department: undefined as any,
			customerName: undefined as any,
			comment: undefined as any,
			author: undefined as any,
			questionnaireData: {} as any,
		});
		const buf = await service.generateExcelFile([calc]);
		const wb = await loadWorkbook(buf);
		const ws = wb.getWorksheet("Calculations")!;
		expect(ws.getRow(2).getCell(findColIdx(ws, "Статус")).value).toBe(
			"Архивная",
		);
		// rfd ячейка может быть null или пустой строкой при отсутствии данных
		const rfdValue = ws.getRow(2).getCell(findColIdx(ws, "RFD")).value;
		expect(rfdValue == null || rfdValue === "").toBe(true);
	});

	it("logs and rethrows on generation errors", async () => {
		const original = ExcelJS.Workbook.prototype.addWorksheet;
		(ExcelJS.Workbook.prototype as any).addWorksheet = () => {
			throw new Error("fail");
		};
		await expect(service.generateExcelFile([buildCalc()])).rejects.toThrow(
			"fail",
		);
		expect(logger.error).toHaveBeenCalled();
		(ExcelJS.Workbook.prototype as any).addWorksheet = original;
	});

	it("produces empty body when calculations array is empty", async () => {
		const buf = await service.generateExcelFile([]);
		const wb = await loadWorkbook(buf);
		const ws = wb.getWorksheet("Calculations")!;
		// only header row
		expect(ws.rowCount).toBe(1);
	});
});
