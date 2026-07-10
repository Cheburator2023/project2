import type { V2QuestionnaireDto } from "./v2-questionnaire.types";
import {
	buildV2QuestionnaireRegistryExportColumns,
	type V2RegistryExportColumn,
	type V2RegistrySchemaColumnOptions,
} from "./v2-questionnaire-registry-columns.util";

export function formatV2RegistryExportCellValue(value: unknown): string {
	if (value == null || value === "") return "";
	if (typeof value === "boolean") return value ? "Да" : "Нет";
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) {
		return value
			.map((item) =>
				typeof item === "object" && item != null
					? JSON.stringify(item)
					: String(item),
			)
			.join("; ");
	}
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

export { buildV2QuestionnaireRegistryExportColumns };

export function buildV2QuestionnaireRegistryExportRow(
	row: V2QuestionnaireDto,
	columns: V2RegistryExportColumn[] = buildV2QuestionnaireRegistryExportColumns(),
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const col of columns) {
		const raw = col.valueGetter(row);
		if (col.key === "createdAt" || col.key === "updatedAt") {
			out[col.key] = raw ? new Date(String(raw)).toLocaleString("ru-RU") : "";
			continue;
		}
		out[col.key] = formatV2RegistryExportCellValue(raw);
	}
	return out;
}
