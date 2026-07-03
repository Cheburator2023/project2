import { buildV2QuestionnaireRegistryExportColumns, } from "./v2-questionnaire-registry-columns.util";
export function formatV2RegistryExportCellValue(value) {
    if (value == null || value === "")
        return "";
    if (typeof value === "boolean")
        return value ? "Да" : "Нет";
    if (typeof value === "number")
        return String(value);
    if (Array.isArray(value)) {
        return value
            .map((item) => typeof item === "object" && item != null
            ? JSON.stringify(item)
            : String(item))
            .join("; ");
    }
    if (typeof value === "object")
        return JSON.stringify(value);
    return String(value);
}
export { buildV2QuestionnaireRegistryExportColumns };
export function buildV2QuestionnaireRegistryExportRow(row, columns = buildV2QuestionnaireRegistryExportColumns()) {
    const out = {};
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
