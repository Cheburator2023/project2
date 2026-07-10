import * as ExcelJS from "exceljs";
import {
	buildV2QuestionnaireRegistryExportColumns,
	buildV2QuestionnaireRegistryExportRow,
	type V2QuestionnaireDto,
} from "@smart-anketa/api-contract";

import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../constants/v2-default-template-snapshot";

export async function buildV2QuestionnaireRegistryXlsx(
	rows: V2QuestionnaireDto[],
): Promise<Buffer> {
	const columns = buildV2QuestionnaireRegistryExportColumns(
		V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema as Record<string, unknown>,
		V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema as Record<string, unknown>,
	);
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
