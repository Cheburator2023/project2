import * as ExcelJS from "exceljs";
import {
	buildV2QuestionnaireRegistryExportColumns,
	buildV2QuestionnaireRegistryExportRow,
	deriveRegistryColumnOptionsFromRows,
	type V2RegistryExportColumn,
	type V2RegistrySchemaColumnOptions,
	type V2QuestionnaireDto,
	type V2AnketaViewerAccessContext,
} from "@smart-anketa/api-contract";

import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../constants/v2-default-template-snapshot";

type WorkbookWriterCtor = new (options: {
	filename: string;
	useStyles?: boolean;
	useSharedStrings?: boolean;
}) => ExcelJS.Workbook & { commit(): Promise<void> };

const ExcelStreamWriter = (
	ExcelJS as typeof ExcelJS & {
		stream: { xlsx: { WorkbookWriter: WorkbookWriterCtor } };
	}
).stream.xlsx.WorkbookWriter;

export function mergeDerivedRegistryColumnOptions(
	acc: Pick<
		V2RegistrySchemaColumnOptions,
		"arrayIndicesByPath" | "arrayGroupLabelsByPath"
	>,
	next: Pick<
		V2RegistrySchemaColumnOptions,
		"arrayIndicesByPath" | "arrayGroupLabelsByPath"
	>,
): Pick<
	V2RegistrySchemaColumnOptions,
	"arrayIndicesByPath" | "arrayGroupLabelsByPath"
> {
	const arrayIndicesByPath = { ...(acc.arrayIndicesByPath ?? {}) };
	for (const [path, indices] of Object.entries(next.arrayIndicesByPath ?? {})) {
		const merged = new Set([...(arrayIndicesByPath[path] ?? []), ...indices]);
		arrayIndicesByPath[path] = [...merged].sort((a, b) => a - b);
	}
	const arrayGroupLabelsByPath = { ...(acc.arrayGroupLabelsByPath ?? {}) };
	for (const [path, labels] of Object.entries(
		next.arrayGroupLabelsByPath ?? {},
	)) {
		arrayGroupLabelsByPath[path] = {
			...(arrayGroupLabelsByPath[path] ?? {}),
			...labels,
		};
	}
	return { arrayIndicesByPath, arrayGroupLabelsByPath };
}

export function deriveRegistryColumnOptionsFromFormDataBatch(
	formDataRows: Array<Record<string, unknown>>,
): Pick<
	V2RegistrySchemaColumnOptions,
	"arrayIndicesByPath" | "arrayGroupLabelsByPath"
> {
	return deriveRegistryColumnOptionsFromRows(
		formDataRows.map((formData) => ({ formData }) as V2QuestionnaireDto),
	);
}

export function buildRegistryExportColumnsFromSchemas(
	versionSchemas: Array<{
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
	}>,
	columnOptions: V2RegistrySchemaColumnOptions,
): V2RegistryExportColumn[] {
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
	return [...columnsByKey.values()];
}

export async function writeV2QuestionnaireRegistryXlsxFile(
	filePath: string,
	columns: V2RegistryExportColumn[],
	rows: AsyncIterable<V2QuestionnaireDto> | Iterable<V2QuestionnaireDto>,
): Promise<number> {
	const workbook = new ExcelStreamWriter({
		filename: filePath,
		useStyles: true,
		useSharedStrings: false,
	});
	const worksheet = workbook.addWorksheet("Анкеты v2");
	worksheet.columns = columns.map((col) => ({
		header: col.header,
		key: col.key,
		width: Math.min(Math.max(col.header.length + 2, 12), 48),
	}));
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { vertical: "middle", wrapText: true };
	headerRow.commit();

	let count = 0;
	for await (const row of rows) {
		const excelRow = worksheet.addRow(
			buildV2QuestionnaireRegistryExportRow(row, columns),
		);
		excelRow.commit();
		count += 1;
	}

	await workbook.commit();
	return count;
}

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
	const columns = buildRegistryExportColumnsFromSchemas(
		versionSchemas,
		columnOptions,
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
