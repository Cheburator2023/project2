"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildV2QuestionnaireRegistryExportColumns = void 0;
exports.formatV2RegistryExportCellValue = formatV2RegistryExportCellValue;
exports.buildV2QuestionnaireRegistryExportRow = buildV2QuestionnaireRegistryExportRow;
const v2_questionnaire_registry_columns_util_1 = require("./v2-questionnaire-registry-columns.util");
Object.defineProperty(exports, "buildV2QuestionnaireRegistryExportColumns", { enumerable: true, get: function () { return v2_questionnaire_registry_columns_util_1.buildV2QuestionnaireRegistryExportColumns; } });
function formatV2RegistryExportCellValue(value) {
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
function buildV2QuestionnaireRegistryExportRow(row, columns = (0, v2_questionnaire_registry_columns_util_1.buildV2QuestionnaireRegistryExportColumns)()) {
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
