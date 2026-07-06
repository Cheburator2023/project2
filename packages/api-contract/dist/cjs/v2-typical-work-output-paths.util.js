"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectGeneratedTypicalWorkArrayPaths = collectGeneratedTypicalWorkArrayPaths;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
function collectGeneratedTypicalWorkArrayPaths(uiSchema, prefix = "") {
    const branch = readRecord(uiSchema);
    if (!branch)
        return [];
    const paths = [];
    const arch = (0, v2_anketa_section_ui_util_1.resolveV2AnketaArchComponent)(branch);
    if (arch === "typicalWork" && prefix) {
        paths.push(prefix);
    }
    for (const key of Object.keys(branch)) {
        if (key.startsWith("ui:"))
            continue;
        paths.push(...collectGeneratedTypicalWorkArrayPaths(branch[key], prefix ? `${prefix}.${key}` : key));
    }
    return [...new Set(paths)];
}
