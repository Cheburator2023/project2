import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import {
	buildPlaceholderCalcName,
	parseMasterRegistryRows,
	V2_MASTER_REGISTRY_SHEET_NAME,
	type V2MasterRegistryImportOverrides,
	type V2MasterRegistryMappedRow,
	type V2MasterRegistryParseStats,
	normMasterText,
} from "../utils/v2-master-registry-import.util";

export type { V2MasterRegistryImportOverrides };
import { V2QuestionnaireService } from "./v2-questionnaire.service";
import { V2TemplateService } from "./v2-template.service";
import { V2TemplateVersionService } from "./v2-template-version.service";

/** Защита от раздутого Excel dimension (часто 1M+ пустых строк). */
const MAX_SHEET_ROWS = 20_000;
const MAX_SHEET_COLS = 64;
export type V2MasterRegistryIssueRowDto = {
	masterRow: number;
	masterNo: string;
	calcName: string;
	code: V2MasterRegistryMappedRow["issues"][number]["code"];
	value?: string;
	suggestions?: string[];
};

export type V2MasterRegistryCandidateDto = {
	masterRow: number;
	masterNo: string;
	calcName: string;
	issues: V2MasterRegistryMappedRow["issues"];
};

export type V2MasterRegistryImportResultDto = {
	dryRun: boolean;
	sheetName: string;
	budgetCampaignColumn: number | null;
	stats: V2MasterRegistryParseStats;
	appliedOverrides: V2MasterRegistryImportOverrides;
	/** Справочники схемы для ручного выбора в UI (полный список). */
	catalog: {
		departments: string[];
	};
	/** Все строки файла-кандидаты (для мультивыбора загрузки). */
	candidates: V2MasterRegistryCandidateDto[];
	created: Array<{ masterRow: number; masterNo: string; id: string; calcName: string }>;
	failed: Array<{ masterRow: number; masterNo: string; calcName: string; message: string }>;
	/** Все проблемы маппинга (по одной строке на issue). */
	issues: V2MasterRegistryIssueRowDto[];
	preview: Array<{
		masterRow: number;
		masterNo: string;
		calcName: string;
		formData: V2MasterRegistryMappedRow["formData"];
		issues: V2MasterRegistryMappedRow["issues"];
	}>;
};

type TUserLike = {
	preferred_username?: string;
	username?: string;
	groups?: string[];
};

@Injectable()
export class V2MasterRegistryImportService {
	private readonly logger = new Logger(V2MasterRegistryImportService.name);

	constructor(
		private readonly questionnaireService: V2QuestionnaireService,
		private readonly templateService: V2TemplateService,
		private readonly templateVersionService: V2TemplateVersionService,
	) {}

	async importFromXlsx(
		buffer: Buffer,
		options: {
			dryRun: boolean;
			templateId?: string;
			previewLimit?: number;
			overrides?: V2MasterRegistryImportOverrides;
			/** Если задано — создать только эти строки Excel (1-based). */
			masterRows?: number[];
		},
		user?: TUserLike | null,
	): Promise<V2MasterRegistryImportResultDto> {
		/** Отдельный scope — workbook/ExcelJS отпускаются до create-цикла. */
		const { sheetName, matrix, extraDeptLabels } =
			await this.loadInitiativeMatrix(buffer);

		const schemaDeptLabels = await this.loadBusinessCustomerEnums(
			options.templateId,
		);
		const appliedOverrides = normalizeOverrides(options.overrides);

		const parsed = parseMasterRegistryRows(matrix, {
			schemaDeptLabels,
			extraDeptLabels,
			overrides: appliedOverrides,
			/**
			 * В БД — только точные имена/маппинг + явные overrides;
			 * несовпавшие справочные поля остаются пустыми.
			 */
			strictMatching: !options.dryRun,
		});

		const previewLimit = options.previewLimit ?? 20;
		const preview = parsed.rows
			.filter((r) => r.calcName)
			.slice(0, previewLimit)
			.map((r) => ({
				masterRow: r.masterRow,
				masterNo: r.masterNo,
				calcName: r.calcName,
				formData: r.formData,
				issues: r.issues,
			}));

		const issues: V2MasterRegistryIssueRowDto[] = [];
		for (const row of parsed.rows) {
			for (const issue of row.issues) {
				issues.push({
					masterRow: row.masterRow,
					masterNo: row.masterNo,
					calcName: row.calcName,
					code: issue.code,
					...(issue.value != null ? { value: issue.value } : {}),
					...(issue.suggestions?.length
						? { suggestions: issue.suggestions }
						: {}),
				});
			}
		}

		const candidates: V2MasterRegistryCandidateDto[] = parsed.rows.map(
			(row) => ({
				masterRow: row.masterRow,
				masterNo: row.masterNo,
				calcName: row.calcName,
				issues: row.issues,
			}),
		);

		const created: V2MasterRegistryImportResultDto["created"] = [];
		const failed: V2MasterRegistryImportResultDto["failed"] = [];
		const masterRowFilter =
			options.masterRows && options.masterRows.length > 0
				? new Set(
						options.masterRows.filter(
							(n) => Number.isFinite(n) && n > 0,
						),
					)
				: null;

		if (!options.dryRun) {
			/** Endpoint уже ограничен appadmin/sacfg — create-роль не требуем. */
			const createUser = {
				preferred_username:
					user?.preferred_username || user?.username || "import",
				groups: [] as string[],
			};
			/** Один раз на весь импорт — не грузим схему на каждую строку. */
			const resolved =
				await this.questionnaireService.resolveTemplateForCreatePublic(
					options.templateId,
				);

			for (const row of parsed.rows) {
				if (masterRowFilter && !masterRowFilter.has(row.masterRow)) {
					continue;
				}
				const calcName =
					row.calcName ||
					buildPlaceholderCalcName({
						masterRow: row.masterRow,
						masterNo: row.masterNo,
					});
				try {
					const dto = await this.questionnaireService.createWithoutHydration(
						{
							calcName,
							templateId: options.templateId ?? resolved.template.id,
							formData: {
								...row.formData,
								meta: {
									...row.formData.meta,
									name:
										(row.formData.meta?.name as string | undefined) ||
										calcName,
								},
							},
						},
						createUser,
						resolved,
					);
					created.push({
						masterRow: row.masterRow,
						masterNo: row.masterNo,
						id: dto.id,
						calcName: dto.calcName,
					});
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Не удалось создать анкету";
					this.logger.warn(
						`Master registry import row ${row.masterRow}: ${message}`,
					);
					failed.push({
						masterRow: row.masterRow,
						masterNo: row.masterNo,
						calcName: row.calcName,
						message,
					});
				}
			}
		}

		return {
			dryRun: options.dryRun,
			sheetName,
			budgetCampaignColumn: parsed.budgetCampaignColumn,
			stats: parsed.stats,
			appliedOverrides,
			catalog: {
				departments: [...schemaDeptLabels],
			},
			candidates,
			created,
			failed,
			issues,
			preview,
		};
	}

	private async loadInitiativeMatrix(buffer: Buffer): Promise<{
		sheetName: string;
		matrix: unknown[][];
		extraDeptLabels: string[];
	}> {
		const workbook = new ExcelJS.Workbook();
		try {
			await workbook.xlsx.load(buffer as never);
		} catch {
			throw new BadRequestException("Не удалось прочитать XLSX-файл");
		}

		const sheet = this.findInitiativeSheet(workbook);
		if (!sheet) {
			throw new BadRequestException(
				`Лист «${V2_MASTER_REGISTRY_SHEET_NAME}» не найден (скрытые листы пропускаются)`,
			);
		}

		const sheetName = sheet.name;
		const extraDeptLabels = this.readDeptLabelsFromWorkbook(workbook);
		const matrix = this.sheetToMatrix(sheet);
		return { sheetName, matrix, extraDeptLabels };
	}

	private findInitiativeSheet(
		workbook: ExcelJS.Workbook,
	): ExcelJS.Worksheet | null {
		const needle = V2_MASTER_REGISTRY_SHEET_NAME.toLocaleLowerCase("ru");
		for (const ws of workbook.worksheets) {
			if (this.isHiddenSheet(ws)) continue;
			if (ws.name.trim().toLocaleLowerCase("ru") === needle) return ws;
		}
		for (const ws of workbook.worksheets) {
			if (this.isHiddenSheet(ws)) continue;
			const name = ws.name.toLocaleLowerCase("ru");
			if (name.includes("оценк") && name.includes("инициатив")) return ws;
		}
		return null;
	}

	private isHiddenSheet(ws: ExcelJS.Worksheet): boolean {
		const state = String(
			(ws as ExcelJS.Worksheet & { state?: string }).state ?? "visible",
		).toLowerCase();
		return state === "hidden" || state === "veryhidden";
	}

	/**
	 * Читает только реально заполненные ячейки (не ws.rowCount из dimension,
	 * который у больших xlsx часто = 1 048 576 → OOM).
	 */
	private sheetToMatrix(ws: ExcelJS.Worksheet): unknown[][] {
		let maxRow = 0;
		let maxCol = 0;
		ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
			if (rowNumber > MAX_SHEET_ROWS) return;
			maxRow = Math.max(maxRow, rowNumber);
			row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
				if (colNumber <= MAX_SHEET_COLS) {
					maxCol = Math.max(maxCol, colNumber);
				}
			});
		});

		if (maxRow === 0) return [];

		const colCount = Math.min(Math.max(maxCol, 20), MAX_SHEET_COLS);
		const rowCount = Math.min(maxRow, MAX_SHEET_ROWS);
		if ((ws.rowCount || 0) > MAX_SHEET_ROWS) {
			this.logger.warn(
				`Sheet «${ws.name}»: dimension rowCount=${ws.rowCount}, читаем только ${rowCount} строк`,
			);
		}

		const matrix: unknown[][] = [];
		for (let r = 1; r <= rowCount; r += 1) {
			const row = ws.getRow(r);
			const cells: unknown[] = [];
			for (let c = 1; c <= colCount; c += 1) {
				cells.push(this.cellToPlain(row.getCell(c).value));
			}
			matrix.push(cells);
		}
		return matrix;
	}

	private cellToPlain(value: ExcelJS.CellValue): unknown {
		if (value == null) return "";
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return value;
		}
		if (value instanceof Date) return value.toISOString();
		if (typeof value === "object") {
			const rich = value as { text?: string; result?: unknown; richText?: Array<{ text?: string }> };
			if (typeof rich.text === "string") return rich.text;
			if (Array.isArray(rich.richText)) {
				return rich.richText.map((p) => p.text ?? "").join("");
			}
			if (rich.result != null) return this.cellToPlain(rich.result as ExcelJS.CellValue);
		}
		return String(value);
	}

	private readDeptLabelsFromWorkbook(workbook: ExcelJS.Workbook): string[] {
		const sheet = workbook.worksheets.find(
			(ws) =>
				!this.isHiddenSheet(ws) &&
				ws.name.trim().toLocaleLowerCase("ru") === "департаменты",
		);
		if (!sheet) return [];
		const labels: string[] = [];
		sheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;
			if (rowNumber > MAX_SHEET_ROWS) return;
			const a = normMasterText(this.cellToPlain(row.getCell(1).value));
			const b = normMasterText(this.cellToPlain(row.getCell(2).value));
			const label = b || a;
			if (label) labels.push(label);
		});
		return labels;
	}

	private async loadBusinessCustomerEnums(
		templateId?: string,
	): Promise<string[]> {
		try {
			const version = await this.resolvePublishedVersion(templateId);
			const schema = version.jsonSchema as {
				properties?: {
					generalInfo?: {
						properties?: {
							businessCustomer?: { items?: { enum?: unknown[] } };
						};
					};
				};
			};
			const enums =
				schema?.properties?.generalInfo?.properties?.businessCustomer?.items
					?.enum ?? [];
			return enums.filter((v): v is string => typeof v === "string");
		} catch {
			return [];
		}
	}

	private async resolvePublishedVersion(templateId?: string) {
		const templates = await this.templateService.findAll();
		const template =
			(templateId
				? templates.find((t) => t.id === templateId)
				: undefined) ??
			templates.find((t) => t.currentVersionId) ??
			templates[0];
		if (!template?.currentVersionId) {
			throw new BadRequestException(
				"Не найдена опубликованная схема для импорта",
			);
		}
		return this.templateVersionService.findOne(template.currentVersionId);
	}
}

function normalizeOverrides(
	raw?: V2MasterRegistryImportOverrides | null,
): V2MasterRegistryImportOverrides {
	const cleanMap = (input?: Record<string, string>) => {
		const out: Record<string, string> = {};
		if (!input || typeof input !== "object") return out;
		for (const [from, to] of Object.entries(input)) {
			const key = normMasterText(from);
			const value = normMasterText(to);
			if (key && value) out[key] = value;
		}
		return out;
	};
	return {
		departments: cleanMap(raw?.departments),
		streams: cleanMap(raw?.streams),
		production: cleanMap(raw?.production),
	};
}
