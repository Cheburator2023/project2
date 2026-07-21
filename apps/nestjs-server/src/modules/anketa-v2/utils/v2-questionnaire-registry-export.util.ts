import * as ExcelJS from "exceljs";
import {
	buildV2QuestionnaireRegistryExportColumns,
	buildV2QuestionnaireRegistryExportRow,
	deriveRegistryColumnOptionsFromRows,
	type V2RegistryExportColumn,
	type V2QuestionnaireDto,
	type V2AnketaViewerAccessContext,
} from "@smart-anketa/api-contract";

import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../constants/v2-default-template-snapshot";

export async function buildV2QuestionnaireRegistryXlsx(
	rows: V2QuestionnaireDto[],
	versionSchemas: Array<{
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
	}> = [],
	exportOptions?: {
		viewerAccess?: V2AnketaViewerAccessContext;
		applyAccessRules?: boolean;
	},
): Promise<Buffer> {
	const columnOptions = {
		...deriveRegistryColumnOptionsFromRows(rows),
		viewerAccess: exportOptions?.viewerAccess,
		applyAccessRules: exportOptions?.applyAccessRules,
	};
	const schemas =
		versionSchemas.length > 0
			? versionSchemas
			: [
					{
						jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema as Record<
							string,
							unknown
						>,
						uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema as Record<
							string,
							unknown
						>,
					},
				];
	const columnsByKey = new Map<string, V2RegistryExportColumn>();
	for (const schema of schemas) {
		for (const column of buildV2QuestionnaireRegistryExportColumns(
			schema.jsonSchema,
			schema.uiSchema,
			columnOptions,
		)) {
			if (!columnsByKey.has(column.key)) columnsByKey.set(column.key, column);
		}
	}
	const columns = [...columnsByKey.values()];
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
