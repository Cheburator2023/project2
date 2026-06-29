import * as ExcelJS from "exceljs";
import {
	buildV2QuestionnaireRegistryExportColumns,
	buildV2QuestionnaireRegistryExportRow,
	type V2QuestionnaireDto,
} from "@smart-anketa/api-contract";

export async function buildV2QuestionnaireRegistryXlsx(
	rows: V2QuestionnaireDto[],
): Promise<Buffer> {
	const columns = buildV2QuestionnaireRegistryExportColumns();
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Анкеты v2");

	worksheet.columns = columns.map((col) => ({
		header: col.header,
		key: col.key,
		width: Math.min(Math.max(col.header.length + 2, 12), 48),
	}));

	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { vertical: "middle", wrapText: true };

	for (const row of rows) {
		worksheet.addRow(buildV2QuestionnaireRegistryExportRow(row, columns));
	}

	worksheet.views = [{ state: "frozen", ySplit: 1 }];
	return Buffer.from(await workbook.xlsx.writeBuffer());
}
